import { describe, it, expect, expectTypeOf } from "vitest";
import { z } from "zod";
import { derivePgColumn } from "./zod-derive.ts";
import { ZOD_EXAMPLES } from "./zod-examples.ts";
import "./zod-ext.ts";

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
// We have to replicate each test so that type-level tests are also tested
// (notice toEqualTypeOf), it works by matching the value in ZOD_EXAMPLES.
describe("ZOD_EXAMPLES derivePgColumn types", () => {
  it(getTestName(ZOD_EXAMPLES[0]), () => {
    const [zodSchema, expectedColumn] = ZOD_EXAMPLES[0]();
    const D = () => derivePgColumn(zodSchema);
    expectTypeOf<ReturnType<typeof D>>().toEqualTypeOf<typeof expectedColumn>();
    runtimeTest(zodSchema, expectedColumn);
  });

  it(getTestName(ZOD_EXAMPLES[1]), () => {
    const [zodSchema, expectedColumn] = ZOD_EXAMPLES[1]();
    const D = () => derivePgColumn(zodSchema);
    expectTypeOf<ReturnType<typeof D>>().toEqualTypeOf<typeof expectedColumn>();
    runtimeTest(zodSchema, expectedColumn);
  });

  it(getTestName(ZOD_EXAMPLES[2]), () => {
    const [zodSchema, expectedColumn] = ZOD_EXAMPLES[2]();
    const D = () => derivePgColumn(zodSchema);
    expectTypeOf<ReturnType<typeof D>>().toEqualTypeOf<typeof expectedColumn>();
    runtimeTest(zodSchema, expectedColumn);
  });

  it(getTestName(ZOD_EXAMPLES[3]), () => {
    const [zodSchema, expectedColumn] = ZOD_EXAMPLES[3]();
    const D = () => derivePgColumn(zodSchema);
    expectTypeOf<ReturnType<typeof D>>().toEqualTypeOf<typeof expectedColumn>();
    runtimeTest(zodSchema, expectedColumn);
  });

  it(getTestName(ZOD_EXAMPLES[4]), () => {
    const [zodSchema, expectedColumn] = ZOD_EXAMPLES[4]();
    const D = () => derivePgColumn(zodSchema);
    expectTypeOf<ReturnType<typeof D>>().toEqualTypeOf<typeof expectedColumn>();
    runtimeTest(zodSchema, expectedColumn);
  });

  it(getTestName(ZOD_EXAMPLES[5]), () => {
    const [zodSchema, expectedColumn] = ZOD_EXAMPLES[5]();
    const D = () => derivePgColumn(zodSchema);
    expectTypeOf<ReturnType<typeof D>>().toEqualTypeOf<typeof expectedColumn>();
    runtimeTest(zodSchema, expectedColumn);
  });

  it(getTestName(ZOD_EXAMPLES[6]), () => {
    const [zodSchema, expectedColumn] = ZOD_EXAMPLES[6]();
    const D = () => derivePgColumn(zodSchema);
    expectTypeOf<ReturnType<typeof D>>().toEqualTypeOf<typeof expectedColumn>();
    runtimeTest(zodSchema, expectedColumn);
  });

  it(getTestName(ZOD_EXAMPLES[7]), () => {
    const [zodSchema, expectedColumn] = ZOD_EXAMPLES[7]();
    const D = () => derivePgColumn(zodSchema);
    expectTypeOf<ReturnType<typeof D>>().toEqualTypeOf<typeof expectedColumn>();
    runtimeTest(zodSchema, expectedColumn);
  });

  it(getTestName(ZOD_EXAMPLES[8]), () => {
    const [zodSchema, expectedColumn] = ZOD_EXAMPLES[8]();
    const D = () => derivePgColumn(zodSchema);
    expectTypeOf<ReturnType<typeof D>>().toEqualTypeOf<typeof expectedColumn>();
    runtimeTest(zodSchema, expectedColumn);
  });

  it(getTestName(ZOD_EXAMPLES[9]), () => {
    const [zodSchema, expectedColumn] = ZOD_EXAMPLES[9]();
    const D = () => derivePgColumn(zodSchema);
    expectTypeOf<ReturnType<typeof D>>().toEqualTypeOf<typeof expectedColumn>();
    runtimeTest(zodSchema, expectedColumn);
  });

  it(getTestName(ZOD_EXAMPLES[10]), () => {
    const [zodSchema, expectedColumn] = ZOD_EXAMPLES[10]();
    const D = () => derivePgColumn(zodSchema);
    expectTypeOf<ReturnType<typeof D>>().toEqualTypeOf<typeof expectedColumn>();
    runtimeTest(zodSchema, expectedColumn);
  });

  it(getTestName(ZOD_EXAMPLES[11]), () => {
    const [zodSchema, expectedColumn] = ZOD_EXAMPLES[11]();
    const D = () => derivePgColumn(zodSchema);
    expectTypeOf<ReturnType<typeof D>>().toEqualTypeOf<typeof expectedColumn>();
    runtimeTest(zodSchema, expectedColumn);
  });

  it(getTestName(ZOD_EXAMPLES[12]), () => {
    const [zodSchema, expectedColumn] = ZOD_EXAMPLES[12]();
    const D = () => derivePgColumn(zodSchema);
    expectTypeOf<ReturnType<typeof D>>().toEqualTypeOf<typeof expectedColumn>();
    runtimeTest(zodSchema, expectedColumn);
  });

  it(getTestName(ZOD_EXAMPLES[13]), () => {
    const [zodSchema, expectedColumn] = ZOD_EXAMPLES[13]();
    const D = () => derivePgColumn(zodSchema);
    expectTypeOf<ReturnType<typeof D>>().toEqualTypeOf<typeof expectedColumn>();
    runtimeTest(zodSchema, expectedColumn);
  });

  it(getTestName(ZOD_EXAMPLES[14]), () => {
    const [zodSchema, expectedColumn] = ZOD_EXAMPLES[14]();
    const D = () => derivePgColumn(zodSchema);
    expectTypeOf<ReturnType<typeof D>>().toEqualTypeOf<typeof expectedColumn>();
    runtimeTest(zodSchema, expectedColumn);
  });

  it(getTestName(ZOD_EXAMPLES[15]), () => {
    const [zodSchema, expectedColumn] = ZOD_EXAMPLES[15]();
    const D = () => derivePgColumn(zodSchema);
    expectTypeOf<ReturnType<typeof D>>().toEqualTypeOf<typeof expectedColumn>();
    runtimeTest(zodSchema, expectedColumn);
  });

  it(getTestName(ZOD_EXAMPLES[16]), () => {
    const [zodSchema, expectedColumn] = ZOD_EXAMPLES[16]();
    const D = () => derivePgColumn(zodSchema);
    expectTypeOf<ReturnType<typeof D>>().toEqualTypeOf<typeof expectedColumn>();
    runtimeTest(zodSchema, expectedColumn);
  });

  it(getTestName(ZOD_EXAMPLES[17]), () => {
    const [zodSchema, expectedColumn] = ZOD_EXAMPLES[17]();
    const D = () => derivePgColumn(zodSchema);
    expectTypeOf<ReturnType<typeof D>>().toEqualTypeOf<typeof expectedColumn>();
    runtimeTest(zodSchema, expectedColumn);
  });

  it(getTestName(ZOD_EXAMPLES[18]), () => {
    const [zodSchema, expectedColumn] = ZOD_EXAMPLES[18]();
    const D = () => derivePgColumn(zodSchema);
    expectTypeOf<ReturnType<typeof D>>().toEqualTypeOf<typeof expectedColumn>();
    runtimeTest(zodSchema, expectedColumn);
  });

  it(getTestName(ZOD_EXAMPLES[19]), () => {
    const [zodSchema, expectedColumn] = ZOD_EXAMPLES[19]();
    const D = () => derivePgColumn(zodSchema);
    expectTypeOf<ReturnType<typeof D>>().toEqualTypeOf<typeof expectedColumn>();
    runtimeTest(zodSchema, expectedColumn);
  });

  it(getTestName(ZOD_EXAMPLES[20]), () => {
    const [zodSchema, expectedColumn] = ZOD_EXAMPLES[20]();
    const D = () => derivePgColumn(zodSchema);
    expectTypeOf<ReturnType<typeof D>>().toEqualTypeOf<typeof expectedColumn>();
    runtimeTest(zodSchema, expectedColumn);
  });

  it(getTestName(ZOD_EXAMPLES[21]), () => {
    const [zodSchema, expectedColumn] = ZOD_EXAMPLES[21]();
    const D = () => derivePgColumn(zodSchema);
    expectTypeOf<ReturnType<typeof D>>().toEqualTypeOf<typeof expectedColumn>();
    runtimeTest(zodSchema, expectedColumn);
  });

  it(getTestName(ZOD_EXAMPLES[22]), () => {
    const [zodSchema, expectedColumn] = ZOD_EXAMPLES[22]();
    const D = () => derivePgColumn(zodSchema);
    expectTypeOf<ReturnType<typeof D>>().toEqualTypeOf<typeof expectedColumn>();
    runtimeTest(zodSchema, expectedColumn);
  });

  it(getTestName(ZOD_EXAMPLES[23]), () => {
    const [zodSchema, expectedColumn] = ZOD_EXAMPLES[23]();
    const D = () => derivePgColumn(zodSchema);
    expectTypeOf<ReturnType<typeof D>>().toEqualTypeOf<typeof expectedColumn>();
    runtimeTest(zodSchema, expectedColumn);
  });

  it(getTestName(ZOD_EXAMPLES[24]), () => {
    const [zodSchema, expectedColumn] = ZOD_EXAMPLES[24]();
    const D = () => derivePgColumn(zodSchema);
    expectTypeOf<ReturnType<typeof D>>().toEqualTypeOf<typeof expectedColumn>();
    runtimeTest(zodSchema, expectedColumn);
  });

  it(getTestName(ZOD_EXAMPLES[25]), () => {
    const [zodSchema, expectedColumn] = ZOD_EXAMPLES[25]();
    const D = () => derivePgColumn(zodSchema);
    expectTypeOf<ReturnType<typeof D>>().toEqualTypeOf<typeof expectedColumn>();
    runtimeTest(zodSchema, expectedColumn);
  });

  it(getTestName(ZOD_EXAMPLES[26]), () => {
    const [zodSchema, expectedColumn] = ZOD_EXAMPLES[26]();
    const D = () => derivePgColumn(zodSchema);
    expectTypeOf<ReturnType<typeof D>>().toEqualTypeOf<typeof expectedColumn>();
    runtimeTest(zodSchema, expectedColumn);
  });

  it(getTestName(ZOD_EXAMPLES[27]), () => {
    const [zodSchema, expectedColumn] = ZOD_EXAMPLES[27]();
    const D = () => derivePgColumn(zodSchema);
    expectTypeOf<ReturnType<typeof D>>().toEqualTypeOf<typeof expectedColumn>();
    runtimeTest(zodSchema, expectedColumn);
  });

  it(getTestName(ZOD_EXAMPLES[28]), () => {
    const [zodSchema, expectedColumn] = ZOD_EXAMPLES[28]();
    const D = () => derivePgColumn(zodSchema);
    expectTypeOf<ReturnType<typeof D>>().toEqualTypeOf<typeof expectedColumn>();
    runtimeTest(zodSchema, expectedColumn);
  });

  it(getTestName(ZOD_EXAMPLES[29]), () => {
    const [zodSchema, expectedColumn] = ZOD_EXAMPLES[29]();
    const D = () => derivePgColumn(zodSchema);
    expectTypeOf<ReturnType<typeof D>>().toEqualTypeOf<typeof expectedColumn>();
    runtimeTest(zodSchema, expectedColumn);
  });

  it(getTestName(ZOD_EXAMPLES[30]), () => {
    const [zodSchema, expectedColumn] = ZOD_EXAMPLES[30]();
    const D = () => derivePgColumn(zodSchema);
    expectTypeOf<ReturnType<typeof D>>().toEqualTypeOf<typeof expectedColumn>();
    runtimeTest(zodSchema, expectedColumn);
  });

  it(getTestName(ZOD_EXAMPLES[31]), () => {
    const [zodSchema, expectedColumn] = ZOD_EXAMPLES[31]();
    const D = () => derivePgColumn(zodSchema);
    expectTypeOf<ReturnType<typeof D>>().toEqualTypeOf<typeof expectedColumn>();
    runtimeTest(zodSchema, expectedColumn);
  });

  it(getTestName(ZOD_EXAMPLES[32]), () => {
    const [zodSchema, expectedColumn] = ZOD_EXAMPLES[32]();
    const D = () => derivePgColumn(zodSchema);
    expectTypeOf<ReturnType<typeof D>>().toEqualTypeOf<typeof expectedColumn>();
    runtimeTest(zodSchema, expectedColumn);
  });

  it(getTestName(ZOD_EXAMPLES[33]), () => {
    const [zodSchema, expectedColumn] = ZOD_EXAMPLES[33]();
    const D = () => derivePgColumn(zodSchema);
    expectTypeOf<ReturnType<typeof D>>().toEqualTypeOf<typeof expectedColumn>();
    runtimeTest(zodSchema, expectedColumn);
  });

  it(getTestName(ZOD_EXAMPLES[34]), () => {
    const [zodSchema, expectedColumn] = ZOD_EXAMPLES[34]();
    const D = () => derivePgColumn(zodSchema);
    expectTypeOf<ReturnType<typeof D>>().toEqualTypeOf<typeof expectedColumn>();
    runtimeTest(zodSchema, expectedColumn);
  });

  it(getTestName(ZOD_EXAMPLES[35]), () => {
    const [zodSchema, expectedColumn] = ZOD_EXAMPLES[35]();
    const D = () => derivePgColumn(zodSchema);
    expectTypeOf<ReturnType<typeof D>>().toEqualTypeOf<typeof expectedColumn>();
    runtimeTest(zodSchema, expectedColumn);
  });

  it(getTestName(ZOD_EXAMPLES[36]), () => {
    const [zodSchema, expectedColumn] = ZOD_EXAMPLES[36]();
    const D = () => derivePgColumn(zodSchema);
    expectTypeOf<ReturnType<typeof D>>().toEqualTypeOf<typeof expectedColumn>();
    runtimeTest(zodSchema, expectedColumn);
  });

  it(getTestName(ZOD_EXAMPLES[37]), () => {
    const [zodSchema, expectedColumn] = ZOD_EXAMPLES[37]();
    const D = () => derivePgColumn(zodSchema);
    expectTypeOf<ReturnType<typeof D>>().toEqualTypeOf<typeof expectedColumn>();
    runtimeTest(zodSchema, expectedColumn);
  });

  it(getTestName(ZOD_EXAMPLES[38]), () => {
    const [zodSchema, expectedColumn] = ZOD_EXAMPLES[38]();
    const D = () => derivePgColumn(zodSchema);
    expectTypeOf<ReturnType<typeof D>>().toEqualTypeOf<typeof expectedColumn>();
    runtimeTest(zodSchema, expectedColumn);
  });

  it(getTestName(ZOD_EXAMPLES[39]), () => {
    const [zodSchema, expectedColumn] = ZOD_EXAMPLES[39]();
    const D = () => derivePgColumn(zodSchema);
    expectTypeOf<ReturnType<typeof D>>().toEqualTypeOf<typeof expectedColumn>();
    runtimeTest(zodSchema, expectedColumn);
  });

  it(getTestName(ZOD_EXAMPLES[40]), () => {
    const [zodSchema, expectedColumn] = ZOD_EXAMPLES[40]();
    const D = () => derivePgColumn(zodSchema);
    expectTypeOf<ReturnType<typeof D>>().toEqualTypeOf<typeof expectedColumn>();
    runtimeTest(zodSchema, expectedColumn);
  });

  // @ts-expect-error - If we ever add 41th case, remember to update this value!
  type _NthTest = (typeof ZOD_EXAMPLES)[41];
});
