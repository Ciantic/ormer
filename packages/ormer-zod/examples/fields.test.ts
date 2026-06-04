import { describe, it, expect, expectTypeOf } from "vitest";
import { z } from "zod";
import { derivePgColumn, type DerivePgColumn } from "../src/zod-derive.ts";
import {
  type InferKyselySelectCol,
  type InferKyselyInsertCol,
  type InferKyselyUpdateCol,
  type PgUnifiedTypeMapping,
  database,
  createTableSql,
  PGCOLUMN_TO_SQLTYPE,
  POSTGRES_OPTS,
  type InferKyselyTypes,
  table,
  createPgliteParsers,
} from "ormer";
import { PGlite } from "@electric-sql/pglite";
import * as k from "kysely";
import { ALL_ZOD_FIELDS, ALL_PG_FIELDS } from "./fields.ts";
import "../src/zod-ext.ts";

function runtimeTest<T extends z.ZodTypeAny, U>(
  zodSchema: T,
  expectedColumn: U,
) {
  if (expectedColumn === "ERROR") {
    expect(() => derivePgColumn(zodSchema as any)).toThrow();
    return;
  } else {
    const derived = derivePgColumn(zodSchema as any);
    expect(derived).toEqual(expectedColumn);
  }
}

describe("ALL_ZOD_FIELDS derivePgColumn types", () => {
  for (const [key, { zod: zodSchema }] of Object.entries(ALL_ZOD_FIELDS)) {
    const expectedColumn = ALL_PG_FIELDS[key as keyof typeof ALL_PG_FIELDS];
    it(`${key}`, () => {
      runtimeTest(zodSchema, expectedColumn);
    });
  }

  it("ALL_ZOD_FIELDS type-level tests", () => {
    type Equal<X, Y> =
      (<T>() => T extends X ? 1 : 2) extends <T>() => T extends Y ? 1 : 2
        ? true
        : false;

    type TestAll = {
      [K in keyof typeof ALL_ZOD_FIELDS]: Equal<
        DerivePgColumn<(typeof ALL_ZOD_FIELDS)[K]["zod"]>,
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
            derived: DerivePgColumn<(typeof ALL_ZOD_FIELDS)[K]["zod"]>;
            expected: (typeof ALL_PG_FIELDS)[K];
          };
    }[keyof TestAll];

    expectTypeOf<never>().toEqualTypeOf<FailedTests>();
  });

  it("PG output and input types are compatible with ZodSchema output and input types", () => {
    type Equal<X, Y> =
      (<T>() => T extends X ? 1 : 2) extends <T>() => T extends Y ? 1 : 2
        ? true
        : false;

    // For each non-ERROR field, check the three InferKysely* types
    // are compatible with the zod schema's output/input types.
    // Returns true on success, or { zod, pg } showing the mismatched types.
    // Use [X] extends [Y] to prevent distributive conditional types.

    type SelectPG<Z extends z.ZodTypeAny> = InferKyselySelectCol<
      DerivePgColumn<Z>,
      PgUnifiedTypeMapping
    >;
    type InsertPG<Z extends z.ZodTypeAny> = InferKyselyInsertCol<
      DerivePgColumn<Z>,
      PgUnifiedTypeMapping
    >;
    type UpdatePG<Z extends z.ZodTypeAny> = InferKyselyUpdateCol<
      DerivePgColumn<Z>,
      PgUnifiedTypeMapping
    >;

    type CompatTest<Z extends z.ZodTypeAny> = {
      // PG SELECT output should be parseable by zod input
      selectCompat: SelectPG<Z> extends never
        ? false
        : SelectPG<Z> extends z.input<Z> // Select output -> Zod input
          ? true
          : { zod: z.input<Z>; pg: SelectPG<Z> };

      // Zod output should be insertable into PG
      insertCompat: InsertPG<Z> extends never
        ? false
        : z.output<Z> extends InsertPG<Z> // Zod output -> PG INSERT input
          ? true
          : { zod: z.output<Z>; pg: InsertPG<Z> };

      // Zod output should be usable for PG updates
      updateCompat: UpdatePG<Z> extends never
        ? false
        : z.output<Z> extends UpdatePG<Z> // Zod output -> PG UPDATE input
          ? true
          : { zod: z.output<Z>; pg: UpdatePG<Z> };
    };

    type TestAll = {
      [K in keyof typeof ALL_ZOD_FIELDS]: (typeof ALL_PG_FIELDS)[K] extends "ERROR"
        ? { selectCompat: true; insertCompat: true; updateCompat: true }
        : CompatTest<(typeof ALL_ZOD_FIELDS)[K]["zod"]>;
    };

    // Each union member is one failed check: { key, checkName: { zod, pg } }
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

describe("ALL_ZOD_FIELDS pglite round-trip", () => {
  // Fields omitted from the round-trip test:
  // - ERROR fields (uint32/uint64 have no PG mapping)
  // - Extra auto-increment PKs (can't have multiple auto-increment PKs in one table)
  // - FK field referencing a table that doesn't exist in the test
  const ROUND_TRIP_OMIT = new Set(["c_int_pk", "c_int64_pk", "c_int64_fk"]);

  const roundTripEntries = Object.entries(ALL_ZOD_FIELDS).filter(([key]) => {
    const pg = ALL_PG_FIELDS[key as keyof typeof ALL_PG_FIELDS];
    return !ROUND_TRIP_OMIT.has(key) && pg !== "ERROR";
  });

  // Build a zod object schema from all non-problematic fields
  const RoundTripSchema = z.object(
    Object.fromEntries(roundTripEntries.map(([key, { zod }]) => [key, zod])),
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

  it("validates example inputs via zod, inserts into pglite, selects back, and compares", async () => {
    // 1. Validate the example row via zod
    const parsed = RoundTripSchema.parse(exampleRow);
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
