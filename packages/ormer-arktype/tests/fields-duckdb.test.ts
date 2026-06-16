import { describe, it, expect } from "vitest";
import { deriveDuckDbColumn } from "../src/derive-duckdb.ts";
import { ALL_ARKTYPE_FIELDS, ALL_DUCKDB_FIELDS } from "./fields.ts";

function runtimeTest(arktypeSchema: any, expectedColumn: any) {
  if (expectedColumn === "ERROR") {
    expect(() => deriveDuckDbColumn(arktypeSchema)).toThrow();
    return;
  }

  const derived = deriveDuckDbColumn(arktypeSchema);

  function getAs(obj: any) {
    // strip internal derive fields that aren't part of the DuckDB column type
    const { dbformat, ...rest } = obj;
    return {
      ...rest,
      schema: rest.schema ? rest.schema.toString() : undefined,
    };
  }

  expect(getAs(derived)).toEqual(getAs(expectedColumn));
}

describe("ALL_ARKTYPE_FIELDS deriveDuckDbColumn runtime", () => {
  for (const [key, { arktype: arktypeSchema }] of Object.entries(
    ALL_ARKTYPE_FIELDS,
  )) {
    const expectedColumn =
      ALL_DUCKDB_FIELDS[key as keyof typeof ALL_DUCKDB_FIELDS];
    it(`${key}`, () => {
      runtimeTest(arktypeSchema, expectedColumn);
    });
  }
});
