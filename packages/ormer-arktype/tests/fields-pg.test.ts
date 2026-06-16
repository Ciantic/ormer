import { describe, it, expect } from "vitest";
import { derivePgColumn } from "../src/derive-pg.ts";
import { ALL_ARKTYPE_FIELDS, ALL_PG_FIELDS } from "./fields.ts";
import {
  database,
  createTableSql,
  PGCOLUMN_TO_SQLTYPE,
  POSTGRES_OPTS,
  type InferKyselyTypes,
  table,
  createPgliteParsers,
  type PgUnifiedTypeMapping,
} from "ormer";
import { PGlite } from "@electric-sql/pglite";
import * as k from "kysely";

function runtimeTest(arktypeSchema: any, expectedColumn: any) {
  if (expectedColumn === "ERROR") {
    expect(() => derivePgColumn(arktypeSchema)).toThrow();
    return;
  }

  const derived = derivePgColumn(arktypeSchema);

  function getAs(obj: any) {
    // strip internal derive fields that aren't part of the PG column type
    const { dbformat, ...rest } = obj;
    return {
      ...rest,
      schema: rest.schema ? rest.schema.toString() : undefined,
    };
  }

  expect(getAs(derived)).toEqual(getAs(expectedColumn));
}

describe("ALL_ARKTYPE_FIELDS derivePgColumn runtime", () => {
  for (const [key, { arktype: arktypeSchema }] of Object.entries(
    ALL_ARKTYPE_FIELDS,
  )) {
    const expectedColumn = ALL_PG_FIELDS[key as keyof typeof ALL_PG_FIELDS];
    it(`${key}`, () => {
      runtimeTest(arktypeSchema, expectedColumn);
    });
  }
});

describe("ALL_ARKTYPE_FIELDS pglite round-trip", () => {
  // Fields omitted from the round-trip test:
  // - ERROR fields (uint8/uint16/uint32/uint64/uint128 have no PG mapping)
  // - Extra auto-increment PKs (can't have multiple auto-increment PKs in one table)
  // - FK field referencing a table that doesn't exist in the test
  const ROUND_TRIP_OMIT = new Set([
    "c_int_pk",
    "c_int64_pk",
    "c_int64_fk",
    "c_int64_fk_plain",
  ]);

  const roundTripEntries = Object.entries(ALL_ARKTYPE_FIELDS).filter(
    ([key]) => {
      const pg = ALL_PG_FIELDS[key as keyof typeof ALL_PG_FIELDS];
      return !ROUND_TRIP_OMIT.has(key) && pg !== "ERROR";
    },
  );

  // Build the table from pg column definitions
  const roundTripTable = table(
    "round_trip_test",
    Object.fromEntries(
      roundTripEntries.map(([key]) => [
        key,
        ALL_PG_FIELDS[key as keyof typeof ALL_PG_FIELDS],
      ]),
    ),
  );

  const roundTripDb = database({}, roundTripTable);

  // The example row built from each field's example value
  const exampleRow = Object.fromEntries(
    roundTripEntries.map(([key, { example }]) => [key, example]),
  );

  it("validates example inputs, inserts into pglite, selects back, and compares", async () => {
    // 1. Create PGlite instance and execute schema
    const pglite = new PGlite({
      parsers: createPgliteParsers(),
    });

    const sql = createTableSql(PGCOLUMN_TO_SQLTYPE, roundTripDb, POSTGRES_OPTS);
    await pglite.exec(sql);

    // 2. Create typed Kysely instance
    type KyselyTypes = InferKyselyTypes<
      typeof roundTripDb,
      PgUnifiedTypeMapping
    >;

    const kyselyDb = new k.Kysely<KyselyTypes>({
      dialect: new k.PGliteDialect({
        pglite,
      }),
    });

    // 3. Insert the example row
    await kyselyDb
      .insertInto("round_trip_test")
      .values(exampleRow as any)
      .execute();

    // 4. Select back and compare
    const results = await kyselyDb
      .selectFrom("round_trip_test")
      .selectAll()
      .execute();

    expect(results).toHaveLength(1);
    expect(results[0]).toEqual(exampleRow);

    await pglite.close();
  });
});
