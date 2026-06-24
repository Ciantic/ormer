import { describe, it, expect, expectTypeOf } from "vitest";
import { Schema } from "effect";
import {
  deriveSqliteColumn,
  type DeriveSqliteColumn,
} from "../src/derive-sqlite.ts";
import { ALL_EFFECT_FIELDS, ALL_SQLITE_FIELDS } from "./fields.ts";
import {
  database,
  createTableSql,
  SQLITECOLUMN_TO_SQLTYPE,
  SQLITE_OPTS,
  type InferKyselyTypes,
  table,
  type SqliteUnifiedTypeMapping,
} from "ormer";
import * as k from "kysely";

function runtimeTest(effectSchema: any, expectedColumn: any) {
  if (expectedColumn === "ERROR") {
    expect(() => deriveSqliteColumn(effectSchema)).toThrow();
    return;
  }

  const derived = deriveSqliteColumn(effectSchema);

  function getAs(obj: any) {
    // strip internal derive fields that aren't part of the SQLite column type
    const { dbformat, ...rest } = obj;
    return {
      ...rest,
      schema: rest.schema ? rest.schema.toString() : undefined,
    };
  }

  expect(getAs(derived)).toEqual(getAs(expectedColumn));
}

describe("ALL_EFFECT_FIELDS deriveSqliteColumn runtime", () => {
  for (const [key, { effect: effectSchema }] of Object.entries(
    ALL_EFFECT_FIELDS,
  )) {
    const expectedColumn =
      ALL_SQLITE_FIELDS[key as keyof typeof ALL_SQLITE_FIELDS];
    it(`${key}`, () => {
      runtimeTest(effectSchema, expectedColumn);
    });
  }
});

describe("ALL_EFFECT_FIELDS deriveSqliteColumn types", () => {
  it("type-level column mapping matches expected SQLite columns", () => {
    type Equal<X, Y> =
      (<T>() => T extends X ? 1 : 2) extends <T>() => T extends Y ? 1 : 2
        ? true
        : false;

    type TestAll = {
      [K in keyof typeof ALL_EFFECT_FIELDS]: Equal<
        DeriveSqliteColumn<(typeof ALL_EFFECT_FIELDS)[K]["effect"]>,
        (typeof ALL_SQLITE_FIELDS)[K] extends "ERROR"
          ? { type: "ERROR" }
          : (typeof ALL_SQLITE_FIELDS)[K]
      >;
    };

    // Hover over FailedTests to see any failed test cases, if it is `never`
    // then all test cases passed
    type FailedTests = {
      [K in keyof TestAll]: TestAll[K] extends true
        ? never
        : {
            key: K;
            derived: DeriveSqliteColumn<
              (typeof ALL_EFFECT_FIELDS)[K]["effect"]
            >;
            expected: (typeof ALL_SQLITE_FIELDS)[K];
          };
    }[keyof TestAll];

    expectTypeOf<never>().toEqualTypeOf<FailedTests>();
  });
});

describe("ALL_EFFECT_FIELDS sqlite round-trip", () => {
  // Fields omitted from the round-trip test:
  // - ERROR fields (bigint, boolean, date, arrays, JSON — excluded automatically)
  // - Extra auto-increment PKs (can't have multiple auto-increment PKs in one table)
  // - FK field referencing a table that doesn't exist in the test
  const ROUND_TRIP_OMIT = new Set(["c_int_pk", "c_int64_pk", "c_int64_fk"]);

  const roundTripEntries = Object.entries(ALL_EFFECT_FIELDS).filter(([key]) => {
    const sl = ALL_SQLITE_FIELDS[key as keyof typeof ALL_SQLITE_FIELDS];
    return !ROUND_TRIP_OMIT.has(key) && sl !== "ERROR";
  });

  const roundTripTable = table(
    "round_trip_test_sqlite",
    Object.fromEntries(
      roundTripEntries.map(([key]) => [
        key,
        ALL_SQLITE_FIELDS[key as keyof typeof ALL_SQLITE_FIELDS],
      ]),
    ),
  );

  const roundTripDb = database({}, roundTripTable);

  const exampleRow = Object.fromEntries(
    roundTripEntries.map(([key, { example }]) => [key, example]),
  );

  // Build an Effect Schema.Struct from the round-trip entries
  const roundTripSchema = Schema.Struct(
    Object.fromEntries(
      roundTripEntries.map(([key, { effect }]) => [key, effect]),
    ),
  );

  it("validates example inputs via effect, inserts into sqlite, selects back, and compares", async () => {
    // 1. Validate the example row via Effect Schema
    const decodedRow = Schema.decodeSync(roundTripSchema)(exampleRow);
    expect(decodedRow).toEqual(exampleRow);

    // 2. Create libsql (SQLite) instance
    const Database = (await import("libsql")).default;
    const sqliteDb = new Database(":memory:", {});

    const sql = createTableSql(
      SQLITECOLUMN_TO_SQLTYPE,
      roundTripDb,
      SQLITE_OPTS,
    );
    const statements = sql.split(";").filter((s) => s.trim().length > 0);
    for (const stmt of statements) {
      sqliteDb.exec(stmt.trim() + ";", {});
    }

    // 3. Create typed Kysely instance
    type KyselyTypes = InferKyselyTypes<
      typeof roundTripDb,
      SqliteUnifiedTypeMapping
    >;

    const kyselyDb = new k.Kysely<KyselyTypes>({
      dialect: new k.SqliteDialect({
        database: sqliteDb,
      }),
    });

    // 4. Insert the example row
    await kyselyDb
      .insertInto("round_trip_test_sqlite")
      .values(decodedRow as any)
      .execute();

    // 5. Select back and compare
    const results = await kyselyDb
      .selectFrom("round_trip_test_sqlite")
      .selectAll()
      .execute();

    expect(results).toHaveLength(1);
    expect(results[0]).toEqual(exampleRow);

    sqliteDb.close();
  });
});
