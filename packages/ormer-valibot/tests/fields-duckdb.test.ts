import { describe, it, expect, expectTypeOf } from "vitest";
import * as v from "valibot";
import {
  deriveDuckDbColumn,
  type DeriveDuckDbColumn,
} from "../src/derive-duckdb.ts";
import type { AnyValibotSchema } from "../src/derive.ts";
import {
  type InferKyselySelectCol,
  type InferKyselyInsertCol,
  type InferKyselyUpdateCol,
  type DuckdbUnifiedTypeMapping,
  database,
  createTableSql,
  DUCKDBCOLUMN_TO_SQLTYPE,
  DUCKDB_OPTS,
  type InferKyselyTypes,
  table,
  createDuckDbKyselyDialect,
} from "ormer";
import { DuckDBInstance } from "@duckdb/node-api";
import * as duckdbModule from "@duckdb/node-api";
import * as k from "kysely";
import { ALL_VALIBOT_FIELDS, ALL_DUCKDB_FIELDS } from "./fields.ts";
import "../src/valibot-ext.ts";
import type { ValibotSchema } from "../src/common.ts";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Normalize a DuckDB column for stable comparison:
 * - For json columns, compare schemas by their entry keys (valibot objects
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
 * Run deriveDuckDbColumn on a valibot schema and compare against the expected
 * DuckDB column definition.
 */
function runtimeTest(valibotSchema: ValibotSchema, expectedColumn: any) {
  if (expectedColumn === "ERROR") {
    expect(() => deriveDuckDbColumn(valibotSchema)).toThrow();
  } else {
    const derived = deriveDuckDbColumn(valibotSchema);
    expect(getAs(derived)).toEqual(getAs(expectedColumn));
  }
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("ALL_VALIBOT_FIELDS deriveDuckDbColumn", () => {
  for (const [key, { valibot: valibotSchema }] of Object.entries(
    ALL_VALIBOT_FIELDS,
  )) {
    const expectedColumn =
      ALL_DUCKDB_FIELDS[key as keyof typeof ALL_DUCKDB_FIELDS];
    it(`${key}`, () => {
      runtimeTest(valibotSchema, expectedColumn);
    });
  }

  it("ALL_VALIBOT_FIELDS type-level tests", () => {
    type Equal<X, Y> =
      (<T>() => T extends X ? 1 : 2) extends <T>() => T extends Y ? 1 : 2
        ? true
        : false;

    type TestAll = {
      [K in keyof typeof ALL_VALIBOT_FIELDS]: Equal<
        DeriveDuckDbColumn<(typeof ALL_VALIBOT_FIELDS)[K]["valibot"]>,
        (typeof ALL_DUCKDB_FIELDS)[K] extends "ERROR"
          ? { type: "ERROR" }
          : (typeof ALL_DUCKDB_FIELDS)[K]
      >;
    };

    // Hover over FailedTests to see any failed test cases, if it is `never`
    // then all test cases passed
    type FailedTests = {
      [K in keyof TestAll]: TestAll[K] extends true
        ? never
        : {
            key: K;
            derived: DeriveDuckDbColumn<
              (typeof ALL_VALIBOT_FIELDS)[K]["valibot"]
            >;
            expected: (typeof ALL_DUCKDB_FIELDS)[K];
          };
    }[keyof TestAll];

    expectTypeOf<never>().toEqualTypeOf<FailedTests>();
  });

  it("DuckDB output and input types are compatible with valibot schema output and input types", () => {
    // For each non-ERROR field, check the three InferKysely* types
    // are compatible with the valibot schema's output/input types.

    type SelectDB<Z extends v.GenericSchema> = InferKyselySelectCol<
      DeriveDuckDbColumn<Z>,
      DuckdbUnifiedTypeMapping
    >;
    type InsertDB<Z extends v.GenericSchema> = InferKyselyInsertCol<
      DeriveDuckDbColumn<Z>,
      DuckdbUnifiedTypeMapping
    >;
    type UpdateDB<Z extends v.GenericSchema> = InferKyselyUpdateCol<
      DeriveDuckDbColumn<Z>,
      DuckdbUnifiedTypeMapping
    >;

    type CompatTest<Z extends v.GenericSchema> = {
      // DB SELECT output should be parseable by valibot input
      selectCompat: [SelectDB<Z>] extends [never]
        ? false
        : [SelectDB<Z>] extends [v.InferInput<Z>]
          ? true
          : { valibotInput: v.InferInput<Z>; duckdb: SelectDB<Z> };

      // Valibot output should be insertable into DB
      insertCompat: [InsertDB<Z>] extends [never]
        ? false
        : [v.InferOutput<Z>] extends [InsertDB<Z>]
          ? true
          : {
              valibotOutput: v.InferOutput<Z>;
              duckdb: InsertDB<Z>;
            };

      // Valibot output should be usable for DB updates
      updateCompat: [UpdateDB<Z>] extends [never]
        ? false
        : [v.InferOutput<Z>] extends [UpdateDB<Z>]
          ? true
          : {
              valibotOutput: v.InferOutput<Z>;
              duckdb: UpdateDB<Z>;
            };
    };

    type TestAll = {
      [K in keyof typeof ALL_VALIBOT_FIELDS]: (typeof ALL_DUCKDB_FIELDS)[K] extends "ERROR"
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

describe("ALL_VALIBOT_FIELDS duckdb round-trip", () => {
  // Fields omitted from the round-trip test:
  // - Extra auto-increment PKs (can't have multiple auto-increment PKs in one table)
  // - FK field referencing a table that doesn't exist in the test
  const ROUND_TRIP_OMIT = new Set(["c_int_pk", "c_int64_pk", "c_int64_fk"]);

  const roundTripEntries = Object.entries(ALL_VALIBOT_FIELDS).filter(
    ([key]) => {
      const ddb = ALL_DUCKDB_FIELDS[key as keyof typeof ALL_DUCKDB_FIELDS];
      return !ROUND_TRIP_OMIT.has(key) && ddb !== "ERROR";
    },
  );

  // Build a valibot object schema from all non-problematic fields
  const RoundTripSchema = v.object(
    Object.fromEntries(
      roundTripEntries.map(([key, { valibot }]) => [key, valibot]),
    ),
  );

  // Build the table from DuckDB column definitions
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

  // The example row built from each field's example value
  const exampleRow = Object.fromEntries(
    roundTripEntries.map(([key, { example }]) => [key, example]),
  );

  it("validates example inputs via valibot, inserts into duckdb, selects back, and compares", async () => {
    // 1. Validate the example row via valibot
    const parsed = v.parse(RoundTripSchema, exampleRow);
    expect(parsed).toEqual(exampleRow);

    // 2. Run table creation SQL
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

    // 3. Create typed Kysely instance
    type KyselyTypes = InferKyselyTypes<
      typeof roundTripDb,
      DuckdbUnifiedTypeMapping
    >;

    const kyselyDb = new k.Kysely<KyselyTypes>({
      dialect: createDuckDbKyselyDialect(k, duckdbModule, instance),
    });

    // 4. Insert the example row
    await kyselyDb
      .insertInto("round_trip_test_duckdb")
      .values(exampleRow as any)
      .execute();

    // 5. Select back and compare
    const results = await kyselyDb
      .selectFrom("round_trip_test_duckdb")
      .selectAll()
      .execute();

    expect(results).toHaveLength(1);

    // DuckDB JSON columns come back as objects (the mapper parses them),
    // while example has the raw objects. No special handling needed
    // since the DuckDB mapper already parses JSON strings.
    expect(results[0]).toEqual(exampleRow);

    instance.closeSync();
  });
});
