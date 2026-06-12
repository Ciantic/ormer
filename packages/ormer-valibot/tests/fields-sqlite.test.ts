import { describe, it, expect, expectTypeOf } from "vitest";
import * as v from "valibot";
import {
  deriveSqliteColumn,
  type DeriveSqliteColumn,
} from "../src/derive-sqlite.ts";
import type { AnyValibotSchema } from "../src/derive.ts";
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
import { ALL_VALIBOT_FIELDS, ALL_SQLITE_FIELDS } from "./fields.ts";
import "../src/valibot-ext.ts";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Normalize a SQLite column for stable comparison:
 * - Check functions are compared by existence (they can't be compared
 *   reference-wise since they're generated at runtime).
 * - Object schemas are compared by their entry keys.
 */
function getAs(obj: any): any {
  if (!obj || typeof obj !== "object") return obj;
  const result: Record<string, any> = {};
  for (const key of Object.keys(obj)) {
    if (key === "check" && typeof obj.check === "function") {
      result.check = "function";
    } else if (
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
 * Run deriveSqliteColumn on a valibot schema and compare against the expected
 * SQLite column definition.
 */
function runtimeTest(valibotSchema: AnyValibotSchema, expectedColumn: any) {
  if (expectedColumn === "ERROR") {
    expect(() => deriveSqliteColumn(valibotSchema)).toThrow();
  } else {
    const derived = deriveSqliteColumn(valibotSchema);
    expect(getAs(derived)).toEqual(getAs(expectedColumn));
  }
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("ALL_VALIBOT_FIELDS deriveSqliteColumn runtime", () => {
  for (const [key, { valibot: valibotSchema }] of Object.entries(
    ALL_VALIBOT_FIELDS,
  )) {
    const expectedColumn =
      ALL_SQLITE_FIELDS[key as keyof typeof ALL_SQLITE_FIELDS];
    it(`${key}`, () => {
      runtimeTest(valibotSchema as AnyValibotSchema, expectedColumn);
    });
  }
});

describe("ALL_VALIBOT_FIELDS deriveSqliteColumn types", () => {
  it("ALL_VALIBOT_FIELDS type-level tests", () => {
    type Equal<X, Y> =
      (<T>() => T extends X ? 1 : 2) extends <T>() => T extends Y ? 1 : 2
        ? true
        : false;

    type TestAll = {
      [K in keyof typeof ALL_VALIBOT_FIELDS]: Equal<
        DeriveSqliteColumn<(typeof ALL_VALIBOT_FIELDS)[K]["valibot"]>,
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
              (typeof ALL_VALIBOT_FIELDS)[K]["valibot"]
            >;
            expected: (typeof ALL_SQLITE_FIELDS)[K];
          };
    }[keyof TestAll];

    expectTypeOf<never>().toEqualTypeOf<FailedTests>();
  });

  it("SQLite output and input types are compatible with valibot schema output and input types", () => {
    type Equal<X, Y> =
      (<T>() => T extends X ? 1 : 2) extends <T>() => T extends Y ? 1 : 2
        ? true
        : false;

    type SelectSQLite<Z extends v.GenericSchema> = InferKyselySelectCol<
      DeriveSqliteColumn<Z>,
      SqliteUnifiedTypeMapping
    >;
    type InsertSQLite<Z extends v.GenericSchema> = InferKyselyInsertCol<
      DeriveSqliteColumn<Z>,
      SqliteUnifiedTypeMapping
    >;
    type UpdateSQLite<Z extends v.GenericSchema> = InferKyselyUpdateCol<
      DeriveSqliteColumn<Z>,
      SqliteUnifiedTypeMapping
    >;

    type CompatTest<Z extends v.GenericSchema> = {
      // SQLite SELECT output should be parseable by valibot input
      selectCompat: [SelectSQLite<Z>] extends [never]
        ? false
        : [SelectSQLite<Z>] extends [v.InferInput<Z>]
          ? true
          : { valibotInput: v.InferInput<Z>; sqlite: SelectSQLite<Z> };

      // Valibot output should be insertable into SQLite
      insertCompat: [InsertSQLite<Z>] extends [never]
        ? false
        : [v.InferOutput<Z>] extends [InsertSQLite<Z>]
          ? true
          : {
              valibotOutput: v.InferOutput<Z>;
              sqlite: InsertSQLite<Z>;
            };

      // Valibot output should be usable for SQLite updates
      updateCompat: [UpdateSQLite<Z>] extends [never]
        ? false
        : [v.InferOutput<Z>] extends [UpdateSQLite<Z>]
          ? true
          : {
              valibotOutput: v.InferOutput<Z>;
              sqlite: UpdateSQLite<Z>;
            };
    };

    type TestAll = {
      [K in keyof typeof ALL_VALIBOT_FIELDS]: (typeof ALL_SQLITE_FIELDS)[K] extends "ERROR"
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

describe("ALL_VALIBOT_FIELDS sqlite round-trip", () => {
  // Fields omitted from the round-trip test:
  // - ERROR fields (bigint, boolean, date, arrays, JSON — excluded automatically)
  // - Extra auto-increment PKs (can't have multiple auto-increment PKs in one table)
  // - FK field referencing a table that doesn't exist in the test
  const ROUND_TRIP_OMIT = new Set(["c_int_pk", "c_int64_pk", "c_int64_fk"]);

  const roundTripEntries = Object.entries(ALL_VALIBOT_FIELDS).filter(
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

  it("validates example inputs via valibot, inserts into sqlite, selects back, and compares", async () => {
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
