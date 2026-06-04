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
    type CompatTest<Z extends z.ZodTypeAny> = {
      // PG output (SELECT) should be usable as zod input
      selectCompat: Equal<
        InferKyselySelectCol<DerivePgColumn<Z>, PgUnifiedTypeMapping>,
        never
      > extends true
        ? false
        : z.input<Z> extends InferKyselySelectCol<
              DerivePgColumn<Z>,
              PgUnifiedTypeMapping
            >
          ? true
          : false;

      // Zod output should be insertable into PG
      insertCompat: Equal<
        InferKyselyInsertCol<DerivePgColumn<Z>, PgUnifiedTypeMapping>,
        never
      > extends true
        ? false
        : z.output<Z> extends InferKyselyInsertCol<
              DerivePgColumn<Z>,
              PgUnifiedTypeMapping
            >
          ? true
          : false;

      // Zod output should be usable for PG updates
      updateCompat: Equal<
        InferKyselyUpdateCol<DerivePgColumn<Z>, PgUnifiedTypeMapping>,
        never
      > extends true
        ? false
        : z.output<Z> extends InferKyselyUpdateCol<
              DerivePgColumn<Z>,
              PgUnifiedTypeMapping
            >
          ? true
          : false;
    };

    type TestAll = {
      [K in keyof typeof ALL_ZOD_FIELDS]: (typeof ALL_ZOD_FIELDS)[K]["pg"] extends "ERROR"
        ? { selectCompat: true; insertCompat: true; updateCompat: true }
        : CompatTest<(typeof ALL_ZOD_FIELDS)[K]["zod"]>;
    };

    type AllPassed = {
      [K in keyof TestAll]: TestAll[K] extends {
        selectCompat: true;
        insertCompat: true;
        updateCompat: true;
      }
        ? never
        : {
            key: K;
            failures: {
              [P in keyof TestAll[K]]: TestAll[K][P] extends true ? never : P;
            }[keyof TestAll[K]];
          };
    }[keyof TestAll];

    expectTypeOf<never>().toEqualTypeOf<AllPassed>();
  });
});
