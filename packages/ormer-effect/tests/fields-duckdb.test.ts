import { describe, it, expect, expectTypeOf } from "vitest";
import { Schema } from "effect";
import {
  deriveDuckDbColumn,
  type DeriveDuckDbColumn,
} from "../src/derive-duckdb.ts";
import { ALL_EFFECT_FIELDS, ALL_DUCKDB_FIELDS } from "./fields.ts";
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

function runtimeTest(effectSchema: any, expectedColumn: any) {
  if (expectedColumn === "ERROR") {
    expect(() => deriveDuckDbColumn(effectSchema)).toThrow();
    return;
  }

  const derived = deriveDuckDbColumn(effectSchema);

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

describe("ALL_EFFECT_FIELDS deriveDuckDbColumn runtime", () => {
  for (const [key, { effect: effectSchema }] of Object.entries(
    ALL_EFFECT_FIELDS,
  )) {
    const expectedColumn =
      ALL_DUCKDB_FIELDS[key as keyof typeof ALL_DUCKDB_FIELDS];
    it(`${key}`, () => {
      runtimeTest(effectSchema, expectedColumn);
    });
  }
});

describe("ALL_EFFECT_FIELDS deriveDuckDbColumn types", () => {
  it("type-level column mapping matches expected DuckDB columns", () => {
    type Equal<X, Y> =
      (<T>() => T extends X ? 1 : 2) extends <T>() => T extends Y ? 1 : 2
        ? true
        : false;

    type TestAll = {
      [K in keyof typeof ALL_EFFECT_FIELDS]: Equal<
        DeriveDuckDbColumn<(typeof ALL_EFFECT_FIELDS)[K]["effect"]>,
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
              (typeof ALL_EFFECT_FIELDS)[K]["effect"]
            >;
            expected: (typeof ALL_DUCKDB_FIELDS)[K];
          };
    }[keyof TestAll];

    expectTypeOf<never>().toEqualTypeOf<FailedTests>();
  });
});

describe("ALL_EFFECT_FIELDS duckdb round-trip", () => {
  // Fields omitted from the round-trip test:
  // - Extra auto-increment PKs (can't have multiple auto-increment PKs in one table)
  // - FK field referencing a table that doesn't exist in the test
  const ROUND_TRIP_OMIT = new Set(["c_int_pk", "c_int64_pk", "c_int64_fk"]);

  const roundTripEntries = Object.entries(ALL_EFFECT_FIELDS).filter(([key]) => {
    const ddb = ALL_DUCKDB_FIELDS[key as keyof typeof ALL_DUCKDB_FIELDS];
    return !ROUND_TRIP_OMIT.has(key) && ddb !== "ERROR";
  });

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

  // Build an Effect Schema.Struct from the round-trip entries
  const roundTripSchema = Schema.Struct(
    Object.fromEntries(
      roundTripEntries.map(([key, { effect }]) => [key, effect]),
    ),
  );

  it("validates example inputs via effect, inserts into duckdb, selects back, and compares", async () => {
    // 1. Validate the example row via Effect Schema
    const decodedRow = Schema.decodeSync(roundTripSchema)(exampleRow);
    expect(decodedRow).toEqual(exampleRow);

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
      .values(decodedRow as any)
      .execute();

    // 5. Select back and compare
    const results = await kyselyDb
      .selectFrom("round_trip_test_duckdb")
      .selectAll()
      .execute();

    expect(results).toHaveLength(1);
    expect(results[0]).toEqual(exampleRow);

    instance.closeSync();
  });
});
