import { describe, it, expect } from "vitest";
import * as v from "valibot";
import { derivePgColumn } from "../src/derive-pg.ts";
import { type AnyValibotSchema } from "../src/derive.ts";
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
import { ALL_VALIBOT_FIELDS, ALL_PG_FIELDS } from "./fields.ts";
import "../src/valibot-ext.ts";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Normalize a PG column for stable comparison:
 * - For jsonb columns, compare schemas by their entry keys (valibot objects
 *   don't have a simple .toString() like zod).
 */
function getAs(obj: any): any {
  if (!obj || typeof obj !== "object") return obj;
  const result: Record<string, any> = {};
  for (const key of Object.keys(obj)) {
    if (
      key === "schema" &&
      obj.schema &&
      typeof obj.schema.entries === "object"
    ) {
      // Normalize valibot object schema: compare entry keys
      result.schema = {
        $type: "object",
        entries: Object.keys(obj.schema.entries),
      };
    } else {
      result[key] = obj[key];
    }
  }
  return result;
}

/**
 * Run derivePgColumn on a valibot schema and compare against the expected
 * PG column definition.
 */
function runtimeTest(valibotSchema: AnyValibotSchema, expectedColumn: any) {
  if (expectedColumn === "ERROR") {
    expect(() => derivePgColumn(valibotSchema)).toThrow();
  } else {
    const derived = derivePgColumn(valibotSchema);
    expect(getAs(derived)).toEqual(getAs(expectedColumn));
  }
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("ALL_VALIBOT_FIELDS derivePgColumn", () => {
  for (const [key, { valibot: valibotSchema }] of Object.entries(
    ALL_VALIBOT_FIELDS,
  )) {
    const expectedColumn = ALL_PG_FIELDS[key as keyof typeof ALL_PG_FIELDS];
    it(`${key}`, () => {
      runtimeTest(valibotSchema as AnyValibotSchema, expectedColumn);
    });
  }
});

describe("ALL_VALIBOT_FIELDS pglite round-trip", () => {
  // Fields omitted from the round-trip test:
  // - ERROR fields (uint32/uint64 have no PG mapping)
  // - Extra auto-increment PKs (can't have multiple auto-increment PKs in one table)
  // - FK field referencing a table that doesn't exist in the test
  const ROUND_TRIP_OMIT = new Set(["c_int_pk", "c_int64_pk", "c_int64_fk"]);

  const roundTripEntries = Object.entries(ALL_VALIBOT_FIELDS).filter(
    ([key]) => {
      const pg = ALL_PG_FIELDS[key as keyof typeof ALL_PG_FIELDS];
      return !ROUND_TRIP_OMIT.has(key) && pg !== "ERROR";
    },
  );

  // Build a valibot object schema from all non-problematic fields
  const RoundTripSchema = v.object(
    Object.fromEntries(
      roundTripEntries.map(([key, { valibot }]) => [key, valibot]),
    ),
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

  it("validates example inputs via valibot, inserts into pglite, selects back, and compares", async () => {
    // 1. Validate the example row via valibot
    const parsed = v.parse(RoundTripSchema, exampleRow);
    expect(parsed).toEqual(exampleRow);

    // 2. Create PGlite instance and execute schema
    const pglite = new PGlite({
      parsers: createPgliteParsers(),
    });

    const sql = createTableSql(PGCOLUMN_TO_SQLTYPE, roundTripDb, POSTGRES_OPTS);
    await pglite.exec(sql);

    // 3. Create typed Kysely instance
    type KyselyTypes = InferKyselyTypes<
      typeof roundTripDb,
      PgUnifiedTypeMapping
    >;

    const kyselyDb = new k.Kysely<KyselyTypes>({
      dialect: new k.PGliteDialect({
        pglite,
      }),
    });

    // 4. Insert the example row
    await kyselyDb
      .insertInto("round_trip_test")
      .values(exampleRow as any)
      .execute();

    // 5. Select back and compare
    const results = await kyselyDb
      .selectFrom("round_trip_test")
      .selectAll()
      .execute();

    expect(results).toHaveLength(1);
    expect(results[0]).toEqual(exampleRow);

    await pglite.close();
  });
});
