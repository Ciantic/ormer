import { describe, it, expect } from "vitest";
import { deriveDuckDbColumn } from "../src/derive-duckdb.ts";
import { ALL_ARKTYPE_FIELDS, ALL_DUCKDB_FIELDS } from "./fields.ts";
import {
  database,
  createTableSql,
  DUCKDBCOLUMN_TO_SQLTYPE,
  DUCKDB_OPTS,
  type InferKyselyTypes,
  table,
  createDuckDbKyselyDialect,
  type DuckdbUnifiedTypeMapping,
} from "ormer";
import { DuckDBInstance } from "@duckdb/node-api";
import * as duckdbModule from "@duckdb/node-api";
import * as k from "kysely";

function runtimeTest(arktypeSchema: any, expectedColumn: any) {
  if (expectedColumn === "ERROR") {
    expect(() => deriveDuckDbColumn(arktypeSchema)).toThrow();
    return;
  }

  const derived = deriveDuckDbColumn(arktypeSchema);

  function getAs(obj: any) {
    // strip internal derive fields that aren't part of the DuckDB column type
    const { dbformat, ...rest } = obj;
    return {
      ...rest,
      schema: rest.schema ? rest.schema.toString() : undefined,
    };
  }

  expect(getAs(derived)).toEqual(getAs(expectedColumn));
}

describe("ALL_ARKTYPE_FIELDS deriveDuckDbColumn runtime", () => {
  for (const [key, { arktype: arktypeSchema }] of Object.entries(
    ALL_ARKTYPE_FIELDS,
  )) {
    const expectedColumn =
      ALL_DUCKDB_FIELDS[key as keyof typeof ALL_DUCKDB_FIELDS];
    it(`${key}`, () => {
      runtimeTest(arktypeSchema, expectedColumn);
    });
  }
});

describe("ALL_ARKTYPE_FIELDS duckdb round-trip", () => {
  // Fields omitted from the round-trip test:
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
      const ddb = ALL_DUCKDB_FIELDS[key as keyof typeof ALL_DUCKDB_FIELDS];
      return !ROUND_TRIP_OMIT.has(key);
    },
  );

  const roundTripTable = table(
    "round_trip_test_duckdb",
    Object.fromEntries(
      roundTripEntries.map(([key]) => [
        key,
        ALL_DUCKDB_FIELDS[key as keyof typeof ALL_DUCKDB_FIELDS],
      ]),
    ),
  );

  const roundTripDb = database({}, roundTripTable);

  const exampleRow = Object.fromEntries(
    roundTripEntries.map(([key, { example }]) => [key, example]),
  );

  it("validates example inputs, inserts into duckdb, selects back, and compares", async () => {
    // 1. Run table creation SQL
    const instance = await DuckDBInstance.create(":memory:");
    const conn = await instance.connect();

    const sql = createTableSql(
      DUCKDBCOLUMN_TO_SQLTYPE,
      roundTripDb,
      DUCKDB_OPTS,
    );
    const statements = sql.split(";").filter((s) => s.trim().length > 0);
    for (const stmt of statements) {
      await conn.run(stmt.trim() + ";");
    }
    conn.closeSync();

    // 2. Create typed Kysely instance
    type KyselyTypes = InferKyselyTypes<
      typeof roundTripDb,
      DuckdbUnifiedTypeMapping
    >;

    const kyselyDb = new k.Kysely<KyselyTypes>({
      dialect: createDuckDbKyselyDialect(k, duckdbModule, instance),
    });

    // 3. Insert the example row
    await kyselyDb
      .insertInto("round_trip_test_duckdb")
      .values(exampleRow as any)
      .execute();

    // 4. Select back and compare
    const results = await kyselyDb
      .selectFrom("round_trip_test_duckdb")
      .selectAll()
      .execute();

    expect(results).toHaveLength(1);
    expect(results[0]).toEqual(exampleRow);

    instance.closeSync();
  });
});
