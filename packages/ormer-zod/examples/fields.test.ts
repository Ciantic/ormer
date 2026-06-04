import { describe, it, expect, expectTypeOf } from "vitest";
import { z } from "zod";
import { derivePgColumn, type DerivePgColumn } from "../src/zod-derive.ts";
import {
  type InferKyselySelectCol,
  type InferKyselyInsertCol,
  type InferKyselyUpdateCol,
  type PgUnifiedTypeMapping,
} from "ormer";
import { ALL_ZOD_FIELDS } from "./fields.ts";
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
  for (const [key, { zod: zodSchema, pg: expectedColumn }] of Object.entries(
    ALL_ZOD_FIELDS,
  )) {
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
        (typeof ALL_ZOD_FIELDS)[K]["pg"] extends "ERROR"
          ? { type: "ERROR" }
          : (typeof ALL_ZOD_FIELDS)[K]["pg"]
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
            expected: (typeof ALL_ZOD_FIELDS)[K]["pg"];
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
      [K in keyof typeof ALL_ZOD_FIELDS]: (typeof ALL_ZOD_FIELDS)[K]["pg"] extends "ERROR"
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
