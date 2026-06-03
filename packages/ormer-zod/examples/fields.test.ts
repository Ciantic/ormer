import { describe, it, expect, expectTypeOf } from "vitest";
import { z } from "zod";
import { derivePgColumn, type DerivePgColumn } from "../src/zod-derive.ts";
import { ALL_ZOD_FIELDS } from "./fields.ts";
import "../src/zod-ext.ts";

function runtimeTest<T extends z.ZodTypeAny, U extends { type: string }>(
  zodSchema: T,
  expectedColumn: U,
) {
  if (expectedColumn.type === "ERROR") {
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
        (typeof ALL_ZOD_FIELDS)[K]["pg"]
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
});
