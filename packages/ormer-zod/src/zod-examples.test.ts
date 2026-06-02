import { describe, it, expect } from "vitest";
import { derivePgColumn } from "./zod-derive.ts";
import "./zod-ext.ts";
import { ZOD_EXAMPLES } from "./zod-examples.ts";

describe("ZOD_EXAMPLES derivePgColumn", () => {
  for (const [index, getTestCase] of ZOD_EXAMPLES.entries()) {
    const [zodSchema, expectedColumn] = getTestCase();
    const name = getTestCase
      .toString()
      .replaceAll(/__vite_ssr_import_\d+__\./g, "")
      .replace("() => ", "");
    it(name, () => {
      if ("throws" in expectedColumn) {
        expect(() => derivePgColumn(zodSchema as any)).toThrow(
          expectedColumn.throws,
        );
        return;
      } else {
        const derived = derivePgColumn(zodSchema as any);
        expect(derived).toEqual(expectedColumn);
      }
    });
  }
});
