import { describe, it, expect, expectTypeOf } from "vitest";
import { z } from "zod";
import {
  deriveDuckDbColumn,
  type DeriveDuckDbColumn,
} from "../src/derive-duckdb.ts";
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
import { ALL_ZOD_FIELDS, ALL_DUCKDB_FIELDS } from "./fields.ts";
import "../src/zod-ext.ts";

function runtimeTest<T extends z.ZodTypeAny, U>(
  zodSchema: T,
  expectedColumn: U,
) {
  if (expectedColumn === "ERROR") {
    expect(() => deriveDuckDbColumn(zodSchema as any)).toThrow();
    return;
  } else {
    const derived = deriveDuckDbColumn(zodSchema as any);

    function getAs(obj: any) {
      return {
        ...obj,
        schema: obj.schema ? obj.schema.toString() : undefined,
      };
    }

    expect(getAs(derived)).toEqual(getAs(expectedColumn));
  }
}

describe("ALL_ZOD_FIELDS deriveDuckDbColumn runtime", () => {
  for (const [key, { zod: zodSchema }] of Object.entries(ALL_ZOD_FIELDS)) {
    const expectedColumn =
      ALL_DUCKDB_FIELDS[key as keyof typeof ALL_DUCKDB_FIELDS];
    it(`${key}`, () => {
      runtimeTest(zodSchema, expectedColumn);
    });
  }
});

describe("ALL_ZOD_FIELDS deriveDuckDbColumn types", () => {
  it("ALL_ZOD_FIELDS type-level tests", () => {
    type Equal<X, Y> =
      (<T>() => T extends X ? 1 : 2) extends <T>() => T extends Y ? 1 : 2
        ? true
        : false;

    type TestAll = {
      [K in keyof typeof ALL_ZOD_FIELDS]: Equal<
        DeriveDuckDbColumn<(typeof ALL_ZOD_FIELDS)[K]["zod"]>,
        (typeof ALL_DUCKDB_FIELDS)[K] extends "ERROR"
          ? { type: "ERROR" }
          : (typeof ALL_DUCKDB_FIELDS)[K]
      >;
    };

    type FailedTests = {
      [K in keyof TestAll]: TestAll[K] extends true
        ? never
        : {
            key: K;
            derived: DeriveDuckDbColumn<(typeof ALL_ZOD_FIELDS)[K]["zod"]>;
            expected: (typeof ALL_DUCKDB_FIELDS)[K];
          };
    }[keyof TestAll];

    expectTypeOf<never>().toEqualTypeOf<FailedTests>();
  });

  it("DuckDB output and input types are compatible with ZodSchema output and input types", () => {
    type SelectDB<Z extends z.ZodTypeAny> = InferKyselySelectCol<
      DeriveDuckDbColumn<Z>,
      DuckdbUnifiedTypeMapping
    >;
    type InsertDB<Z extends z.ZodTypeAny> = InferKyselyInsertCol<
      DeriveDuckDbColumn<Z>,
      DuckdbUnifiedTypeMapping
    >;
    type UpdateDB<Z extends z.ZodTypeAny> = InferKyselyUpdateCol<
      DeriveDuckDbColumn<Z>,
      DuckdbUnifiedTypeMapping
    >;

    type CompatTest<Z extends z.ZodTypeAny> = {
      selectCompat: SelectDB<Z> extends never
        ? false
        : SelectDB<Z> extends z.input<Z>
          ? true
          : { zod: z.input<Z>; duckdb: SelectDB<Z> };

      insertCompat: InsertDB<Z> extends never
        ? false
        : z.output<Z> extends InsertDB<Z>
          ? true
          : { zod: z.output<Z>; duckdb: InsertDB<Z> };

      updateCompat: UpdateDB<Z> extends never
        ? false
        : z.output<Z> extends UpdateDB<Z>
          ? true
          : { zod: z.output<Z>; duckdb: UpdateDB<Z> };
    };

    type TestAll = {
      [K in keyof typeof ALL_ZOD_FIELDS]: (typeof ALL_DUCKDB_FIELDS)[K] extends "ERROR"
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

describe("ALL_ZOD_FIELDS duckdb round-trip", () => {
  // Fields omitted from the round-trip test:
  // - ERROR fields (ZodISODateTime has no mapping)
  // - Extra auto-increment PKs (can't have multiple auto-increment PKs in one table)
  // - FK field referencing a table that doesn't exist in the test
  const ROUND_TRIP_OMIT = new Set(["c_int_pk", "c_int64_pk", "c_int64_fk"]);

  const roundTripEntries = Object.entries(ALL_ZOD_FIELDS).filter(([key]) => {
    const ddb = ALL_DUCKDB_FIELDS[key as keyof typeof ALL_DUCKDB_FIELDS];
    return !ROUND_TRIP_OMIT.has(key) && ddb !== "ERROR";
  });

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

  it("validates example inputs via zod, inserts into duckdb, selects back, and compares", async () => {
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

    // DuckDB JSON columns come back as objects (the mapper parses them),
    // while example has the raw objects. No special handling needed
    // since the DuckDB mapper already parses JSON strings.
    expect(results[0]).toEqual(exampleRow);

    instance.closeSync();
  });
});
