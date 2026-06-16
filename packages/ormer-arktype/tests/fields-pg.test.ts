import { describe, it, expect } from "vitest";
import { derivePgColumn } from "../src/derive-pg.ts";
import { ALL_ARKTYPE_FIELDS, ALL_PG_FIELDS } from "./fields.ts";

function runtimeTest(arktypeSchema: any, expectedColumn: any) {
  if (expectedColumn === "ERROR") {
    expect(() => derivePgColumn(arktypeSchema)).toThrow();
    return;
  }

  const derived = derivePgColumn(arktypeSchema);

  function getAs(obj: any) {
    // strip internal derive fields that aren't part of the PG column type
    const { dbformat, ...rest } = obj;
    return {
      ...rest,
      schema: rest.schema ? rest.schema.toString() : undefined,
    };
  }

  expect(getAs(derived)).toEqual(getAs(expectedColumn));
}

describe("ALL_ARKTYPE_FIELDS derivePgColumn runtime", () => {
  for (const [key, { arktype: arktypeSchema }] of Object.entries(
    ALL_ARKTYPE_FIELDS,
  )) {
    const expectedColumn = ALL_PG_FIELDS[key as keyof typeof ALL_PG_FIELDS];
    it(`${key}`, () => {
      runtimeTest(arktypeSchema, expectedColumn);
    });
  }
});
