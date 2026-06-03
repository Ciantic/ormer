import { describe, it, expect, expectTypeOf } from "vitest";
import { z } from "zod";
import { derivePgColumn, type DerivePgColumn } from "../src/zod-derive.ts";
import { ZOD_EXAMPLES } from "./fields.ts";
import "../src/zod-ext.ts";

function getTestName<T extends () => readonly [z.ZodTypeAny, any]>(
  testCase: T,
): string {
  return testCase
    .toString()
    .replaceAll(/__vite_ssr_import_\d+__\./g, "")
    .replace("() => ", "");
}

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

describe("ZOD_EXAMPLES derivePgColumn types", () => {
  for (const [index, testCase] of ZOD_EXAMPLES.entries()) {
    it(`${index}: ${getTestName(testCase)}`, () => {
      const [zodSchema, expectedColumn] = testCase();
      runtimeTest(zodSchema, expectedColumn);
    });
  }

  it("ZOD_EXAMPLES type-level tests", () => {
    type Equal<X, Y> =
      (<T>() => T extends X ? 1 : 2) extends <T>() => T extends Y ? 1 : 2
        ? true
        : false;

    type TestAll = {
      [K in keyof typeof ZOD_EXAMPLES & `${number}`]: Equal<
        DerivePgColumn<ReturnType<(typeof ZOD_EXAMPLES)[K]>[0]>,
        ReturnType<(typeof ZOD_EXAMPLES)[K]>[1]
      >;
    };

    // Hover over FailedTests to see any failed test cases, if it is `never`
    // then all test cases passed
    type FailedTests = {
      [K in keyof TestAll]: TestAll[K] extends true
        ? never
        : {
            index: K;
            derived: DerivePgColumn<
              ReturnType<(typeof ZOD_EXAMPLES)[K & `${number}`]>[0]
            >;
            expected: ReturnType<(typeof ZOD_EXAMPLES)[K & `${number}`]>[1];
          };
    }[keyof TestAll];

    expectTypeOf<never>().toEqualTypeOf<FailedTests>();
  });
});
