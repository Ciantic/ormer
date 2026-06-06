import * as o from "./columns.ts";
import { table } from "../table.ts";
import { describe, it, expect } from "vitest";

describe("sqlite columns", () => {
  it("creates a table with all column types", () => {
    const allColumns = table("all_columns", {
      col_integer: o.integer(),
      col_integer_autoinc: o.integer({ autoIncrement: true }),
      col_real: o.real(),
      col_text: o.text(),
      col_text_now: o.text({ default: "now" }),
      col_blob: o.blob(),
      col_any: o.any(),
    });

    expect(allColumns.table).toBe("all_columns");

    expect(allColumns.columns.col_integer.type).toBe("integer");
    expect(allColumns.columns.col_integer_autoinc.type).toBe("integer");
    expect(allColumns.columns.col_integer_autoinc.autoIncrement).toBe(true);
    expect(allColumns.columns.col_real.type).toBe("real");
    expect(allColumns.columns.col_text.type).toBe("text");
    expect(allColumns.columns.col_text_now.type).toBe("text");
    expect(allColumns.columns.col_text_now.default).toBe("now");
    expect(allColumns.columns.col_blob.type).toBe("blob");
    expect(allColumns.columns.col_any.type).toBe("any");
  });
});
