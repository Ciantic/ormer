import { describe, it, expect, expectTypeOf } from "vitest";
import * as v from "valibot";
import { derivePgColumn, type DerivePgColumn } from "../src/derive-pg.ts";
import {
  database,
  createTableSql,
  PGCOLUMN_TO_SQLTYPE,
  POSTGRES_OPTS,
  type InferKyselyTypes,
  type InferKyselySelectCol,
  type InferKyselyInsertCol,
  type InferKyselyUpdateCol,
  table,
  createPgliteParsers,
  type PgUnifiedTypeMapping,
} from "ormer";
import { PGlite } from "@electric-sql/pglite";
import * as k from "kysely";
import { ALL_VALIBOT_FIELDS, ALL_PG_FIELDS } from "./fields.ts";
import "../src/valibot-ext.ts";
import type { ValibotSchema } from "../src/common.ts";

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
function runtimeTest(valibotSchema: ValibotSchema, expectedColumn: any) {
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
      runtimeTest(valibotSchema as ValibotSchema, expectedColumn);
    });
  }

  it("ALL_VALIBOT_FIELDS type-level tests", () => {
    type Equal<X, Y> =
      (<T>() => T extends X ? 1 : 2) extends <T>() => T extends Y ? 1 : 2
        ? true
        : false;

    type TestAll = {
      [K in keyof typeof ALL_VALIBOT_FIELDS]: Equal<
        DerivePgColumn<(typeof ALL_VALIBOT_FIELDS)[K]["valibot"]>,
        (typeof ALL_PG_FIELDS)[K] extends "ERROR"
          ? { type: "ERROR" }
          : (typeof ALL_PG_FIELDS)[K]
      >;
    };

    // Hover over FailedTests to see any failed test cases, if it is `never`
    // then all test cases passed
    type FailedTests = {
      [K in keyof TestAll]: TestAll[K] extends true
        ? never
        : {
            key: K;
            derived: DerivePgColumn<(typeof ALL_VALIBOT_FIELDS)[K]["valibot"]>;
            expected: (typeof ALL_PG_FIELDS)[K];
          };
    }[keyof TestAll];

    expectTypeOf<never>().toEqualTypeOf<FailedTests>();
  });

  it("PG output and input types are compatible with valibot schema output and input types", () => {
    type Equal<X, Y> =
      (<T>() => T extends X ? 1 : 2) extends <T>() => T extends Y ? 1 : 2
        ? true
        : false;

    // For each non-ERROR field, check the three InferKysely* types
    // are compatible with the valibot schema's output/input types.

    type SelectPG<Z extends v.GenericSchema> = InferKyselySelectCol<
      DerivePgColumn<Z>,
      PgUnifiedTypeMapping
    >;
    type InsertPG<Z extends v.GenericSchema> = InferKyselyInsertCol<
      DerivePgColumn<Z>,
      PgUnifiedTypeMapping
    >;
    type UpdatePG<Z extends v.GenericSchema> = InferKyselyUpdateCol<
      DerivePgColumn<Z>,
      PgUnifiedTypeMapping
    >;

    type CompatTest<Z extends v.GenericSchema> = {
      // PG SELECT output should be parseable by valibot input
      selectCompat: [SelectPG<Z>] extends [never]
        ? false
        : [SelectPG<Z>] extends [v.InferInput<Z>]
          ? true
          : { valibotInput: v.InferInput<Z>; pg: SelectPG<Z> };

      // Valibot output should be insertable into PG
      insertCompat: [InsertPG<Z>] extends [never]
        ? false
        : [v.InferOutput<Z>] extends [InsertPG<Z>]
          ? true
          : {
              valibotOutput: v.InferOutput<Z>;
              pg: InsertPG<Z>;
            };

      // Valibot output should be usable for PG updates
      updateCompat: [UpdatePG<Z>] extends [never]
        ? false
        : [v.InferOutput<Z>] extends [UpdatePG<Z>]
          ? true
          : {
              valibotOutput: v.InferOutput<Z>;
              pg: UpdatePG<Z>;
            };
    };

    type TestAll = {
      [K in keyof typeof ALL_VALIBOT_FIELDS]: (typeof ALL_PG_FIELDS)[K] extends "ERROR"
        ? { selectCompat: true; insertCompat: true; updateCompat: true }
        : CompatTest<(typeof ALL_VALIBOT_FIELDS)[K]["valibot"]>;
    };

    // Each union member is one failed check: { key, checkName: { ... } }
    type FailedTests = {
      [K in keyof TestAll]:
        | (TestAll[K]["selectCompat"] extends true
            ? never
            : { key: K; selectCompat: TestAll[K]["selectCompat"] })
        | (TestAll[K]["insertCompat"] extends true
            ? never
            : { key: K; insertCompat: TestAll[K]["insertCompat"] })
        | (TestAll[K]["updateCompat"] extends true
            ? never
            : { key: K; updateCompat: TestAll[K]["updateCompat"] });
    }[keyof TestAll];

    expectTypeOf<never>().toEqualTypeOf<FailedTests>();
  });
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
