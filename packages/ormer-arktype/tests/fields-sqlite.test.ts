import { describe, it, expect, expectTypeOf } from "vitest";
import {
  deriveSqliteColumn,
  type DeriveSqliteColumn,
} from "../src/derive-sqlite.ts";
import { ALL_ARKTYPE_FIELDS, ALL_SQLITE_FIELDS } from "./fields.ts";
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

function runtimeTest(arktypeSchema: any, expectedColumn: any) {
  if (expectedColumn === "ERROR") {
    expect(() => deriveSqliteColumn(arktypeSchema)).toThrow();
    return;
  }

  const derived = deriveSqliteColumn(arktypeSchema);

  function getAs(obj: any) {
    // strip internal derive fields that aren't part of the SQLite column type
    const { dbformat, maxLength, ...rest } = obj;
    return {
      ...rest,
      schema: rest.schema ? rest.schema.toString() : undefined,
    };
  }

  expect(getAs(derived)).toEqual(getAs(expectedColumn));
}

describe("ALL_ARKTYPE_FIELDS deriveSqliteColumn runtime", () => {
  for (const [key, { arktype: arktypeSchema }] of Object.entries(
    ALL_ARKTYPE_FIELDS,
  )) {
    const expectedColumn =
      ALL_SQLITE_FIELDS[key as keyof typeof ALL_SQLITE_FIELDS];
    it(`${key}`, () => {
      runtimeTest(arktypeSchema, expectedColumn);
    });
  }
});

describe("ALL_ARKTYPE_FIELDS deriveSqliteColumn types", () => {
  it("type-level column mapping matches expected SQLite columns", () => {
    type Equal<X, Y> =
      (<T>() => T extends X ? 1 : 2) extends <T>() => T extends Y ? 1 : 2
        ? true
        : false;

    type TestAll = {
      [K in keyof typeof ALL_ARKTYPE_FIELDS]: Equal<
        DeriveSqliteColumn<(typeof ALL_ARKTYPE_FIELDS)[K]["arktype"]>,
        (typeof ALL_SQLITE_FIELDS)[K] extends "ERROR"
          ? { type: "ERROR" }
          : (typeof ALL_SQLITE_FIELDS)[K]
      >;
    };

    type FailedTests = {
      [K in keyof TestAll]: TestAll[K] extends true
        ? never
        : {
            key: K;
            derived: DeriveSqliteColumn<
              (typeof ALL_ARKTYPE_FIELDS)[K]["arktype"]
            >;
            expected: (typeof ALL_SQLITE_FIELDS)[K];
          };
    }[keyof TestAll];

    expectTypeOf<never>().toEqualTypeOf<FailedTests>();
  });
});

describe("ALL_ARKTYPE_FIELDS sqlite round-trip", () => {
  // Fields omitted from the round-trip test:
  // - ERROR fields (bigint, boolean, date, arrays, JSON — excluded automatically)
  // - Extra auto-increment PKs (can't have multiple auto-increment PKs in one table)
  // - FK field referencing a table that doesn't exist in the test
  const ROUND_TRIP_OMIT = new Set(["c_int_pk", "c_int64_pk", "c_int64_fk"]);

  const roundTripEntries = Object.entries(ALL_ARKTYPE_FIELDS).filter(
    ([key]) => {
      const sl = ALL_SQLITE_FIELDS[key as keyof typeof ALL_SQLITE_FIELDS];
      return !ROUND_TRIP_OMIT.has(key) && sl !== "ERROR";
    },
  );

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

  it("validates example inputs, inserts into sqlite, selects back, and compares", async () => {
    // 1. Run table creation SQL
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

    // 2. Create typed Kysely instance
    type KyselyTypes = InferKyselyTypes<
      typeof roundTripDb,
      SqliteUnifiedTypeMapping
    >;

    const kyselyDb = new k.Kysely<KyselyTypes>({
      dialect: new k.SqliteDialect({
        database: sqliteDb,
      }),
    });

    // 3. Insert the example row (SQLite can't bind Date objects — convert to ISO string)
    const insertRow = { ...exampleRow } as Record<string, any>;
    if ("c_date" in insertRow && insertRow.c_date instanceof Date) {
      insertRow.c_date = insertRow.c_date.toISOString();
    }

    await kyselyDb
      .insertInto("round_trip_test_sqlite")
      .values(insertRow as any)
      .execute();

    // 4. Select back and compare
    const results = await kyselyDb
      .selectFrom("round_trip_test_sqlite")
      .selectAll()
      .execute();

    expect(results).toHaveLength(1);

    const row = results[0] as Record<string, any>;
    expect(row).toMatchObject(exampleRow);

    sqliteDb.close();
  });
});
