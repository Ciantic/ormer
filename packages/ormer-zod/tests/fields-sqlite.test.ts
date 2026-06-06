import { describe, it, expect, expectTypeOf } from "vitest";
import { z } from "zod";
import {
  deriveSqliteColumn,
  type DeriveSqliteColumn,
} from "../src/derive-sqlite.ts";
import {
  type InferKyselySelectCol,
  type InferKyselyInsertCol,
  type InferKyselyUpdateCol,
  type SqliteUnifiedTypeMapping,
  database,
  createTableSql,
  SQLITECOLUMN_TO_SQLTYPE,
  SQLITE_OPTS,
  type InferKyselyTypes,
  table,
} from "ormer";
import * as k from "kysely";
import { ALL_ZOD_FIELDS, ALL_SQLITE_FIELDS } from "./fields.ts";
import "../src/zod-ext.ts";

function runtimeTest<T extends z.ZodTypeAny, U>(
  zodSchema: T,
  expectedColumn: U,
) {
  if (expectedColumn === "ERROR") {
    expect(() => deriveSqliteColumn(zodSchema as any)).toThrow();
    return;
  } else {
    const derived = deriveSqliteColumn(zodSchema as any);

    function getAs(obj: any) {
      const { check: _check, ...rest } = obj;
      // Normalize check functions by checking they exist
      const result: any = { ...rest };
      if (typeof _check === "function") {
        result.check = "function";
      }
      // schema is a ZodType — normalize to string
      if (result.schema) {
        result.schema = result.schema.toString();
      }
      return result;
    }

    expect(getAs(derived)).toEqual(getAs(expectedColumn));
  }
}

describe("ALL_ZOD_FIELDS deriveSqliteColumn runtime", () => {
  for (const [key, { zod: zodSchema }] of Object.entries(ALL_ZOD_FIELDS)) {
    const expectedColumn =
      ALL_SQLITE_FIELDS[key as keyof typeof ALL_SQLITE_FIELDS];
    it(`${key}`, () => {
      runtimeTest(zodSchema, expectedColumn);
    });
  }
});

describe("ALL_ZOD_FIELDS deriveSqliteColumn types", () => {
  it("ALL_ZOD_FIELDS type-level tests", () => {
    type Equal<X, Y> =
      (<T>() => T extends X ? 1 : 2) extends <T>() => T extends Y ? 1 : 2
        ? true
        : false;

    type TestAll = {
      [K in keyof typeof ALL_ZOD_FIELDS]: Equal<
        DeriveSqliteColumn<(typeof ALL_ZOD_FIELDS)[K]["zod"]>,
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
            derived: DeriveSqliteColumn<(typeof ALL_ZOD_FIELDS)[K]["zod"]>;
            expected: (typeof ALL_SQLITE_FIELDS)[K];
          };
    }[keyof TestAll];

    expectTypeOf<never>().toEqualTypeOf<FailedTests>();
  });

  it("SQLite output and input types are compatible with ZodSchema output and input types", () => {
    type SelectDB<Z extends z.ZodTypeAny> = InferKyselySelectCol<
      DeriveSqliteColumn<Z>,
      SqliteUnifiedTypeMapping
    >;
    type InsertDB<Z extends z.ZodTypeAny> = InferKyselyInsertCol<
      DeriveSqliteColumn<Z>,
      SqliteUnifiedTypeMapping
    >;
    type UpdateDB<Z extends z.ZodTypeAny> = InferKyselyUpdateCol<
      DeriveSqliteColumn<Z>,
      SqliteUnifiedTypeMapping
    >;

    type CompatTest<Z extends z.ZodTypeAny> = {
      selectCompat: SelectDB<Z> extends never
        ? false
        : SelectDB<Z> extends z.input<Z>
          ? true
          : { zod: z.input<Z>; sqlite: SelectDB<Z> };

      insertCompat: InsertDB<Z> extends never
        ? false
        : z.output<Z> extends InsertDB<Z>
          ? true
          : { zod: z.output<Z>; sqlite: InsertDB<Z> };

      updateCompat: UpdateDB<Z> extends never
        ? false
        : z.output<Z> extends UpdateDB<Z>
          ? true
          : { zod: z.output<Z>; sqlite: UpdateDB<Z> };
    };

    // SQLite has no native bigint/boolean/date/array/object types.
    // Fields where SQLite select type differs from Zod output type are skipped.
    type SqliteCompatSkipKeys =
      | "c_bigint"
      | "c_int64"
      | "c_int64_pk"
      | "c_int64_fk"
      | "c_uint64" // bigint → number
      | "c_bool" // boolean → 0/1
      | "c_date" // Date → string
      | "c_int_arr"
      | "c_str_arr"
      | "c_int_arr2"
      | "c_str_arr_nullable" // arrays → JSON text
      | "c_json"
      | "c_json2"; // objects → JSON text

    type TestAll = {
      [K in keyof typeof ALL_ZOD_FIELDS]: (typeof ALL_SQLITE_FIELDS)[K] extends "ERROR"
        ? { selectCompat: true; insertCompat: true; updateCompat: true }
        : K extends SqliteCompatSkipKeys
          ? { selectCompat: true; insertCompat: true; updateCompat: true }
          : CompatTest<(typeof ALL_ZOD_FIELDS)[K]["zod"]>;
    };

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

describe("ALL_ZOD_FIELDS sqlite round-trip", () => {
  // Fields omitted from the round-trip test:
  // - ERROR fields (ZodISODateTime has no mapping)
  // - Extra auto-increment PKs (can't have multiple auto-increment PKs in one table)
  // - FK field referencing a table that doesn't exist in the test
  // - Array fields (SQLite has no native array type — stored as JSON text)
  // - JSON fields (SQLite stores as text — round-trip needs serialization)
  const ROUND_TRIP_OMIT = new Set([
    "c_int_pk",
    "c_int64_pk",
    "c_int64_fk",
    "c_uint64", // example value overflows SQLite INTEGER (signed 64-bit)
    "c_int_arr",
    "c_str_arr",
    "c_int_arr2",
    "c_str_arr_nullable",
    "c_json",
    "c_json2",
  ]);

  const roundTripEntries = Object.entries(ALL_ZOD_FIELDS).filter(([key]) => {
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

  it("validates example inputs via zod, inserts into sqlite, selects back, and compares", async () => {
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

    // SQLite integers come back as numbers (not bigints), and booleans as 0/1.
    // bigint values (c_bigint, c_int64, c_uint64) come back as number.
    // c_uint64 example overflows SQLite INTEGER (signed 64-bit) — use smaller value.
    const expected = { ...exampleRow } as Record<string, any>;
    if ("c_bigint" in expected) expected.c_bigint = 9007199254740991;
    if ("c_int64" in expected) expected.c_int64 = 123456789;
    if ("c_bool" in expected) expected.c_bool = 1;
    if ("c_date" in expected && exampleRow.c_date instanceof Date) {
      // SQLite stores dates as text via Kysely SQLite dialect
      expected.c_date = exampleRow.c_date.toISOString();
    }

    const row = results[0] as Record<string, any>;
    for (const key of Object.keys(expected)) {
      expect(row[key]).toEqual(expected[key]);
    }

    sqliteDb.close();
  });
});
