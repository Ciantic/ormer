import * as o from "./columns.ts";
import { table } from "../table.ts";
import { describe, it, expect } from "vitest";

describe("duckdb columns", () => {
  it("creates a table with all column types", () => {
    const allColumns = table("all_columns", {
      // Numeric types
      col_tinyint: o.tinyint(),
      col_int2: o.int2(),
      col_int4: o.int4(),
      col_int8: o.int8(),
      col_hugeint: o.hugeint(),
      col_float4: o.float4(),
      col_float8: o.float8(),
      col_decimal: o.decimal({ precision: 10, scale: 2 }),

      // Character types
      col_text: o.text(),
      col_varchar: o.varchar({ maxLength: 255 }),
      col_char: o.char({ length: 10 }),

      // Binary types
      col_blob: o.blob(),

      // Date/Time types
      col_timestamp: o.timestamp(),
      col_timestamptz: o.timestamptz(),
      col_date: o.date(),
      col_time: o.time(),
      col_interval: o.interval(),

      // Boolean type
      col_boolean: o.boolean(),

      // UUID type
      col_uuid: o.uuid(),

      // JSON type
      col_json: o.json({ schema: {} as any }),

      // Bit string type
      col_bit: o.bit({ length: 8 }),
    });

    expect(allColumns.table).toBe("all_columns");

    expect(allColumns.columns.col_tinyint.type).toBe("tinyint");
    expect(allColumns.columns.col_int2.type).toBe("int2");
    expect(allColumns.columns.col_int4.type).toBe("int4");
    expect(allColumns.columns.col_int8.type).toBe("int8");
    expect(allColumns.columns.col_hugeint.type).toBe("hugeint");
    expect(allColumns.columns.col_float4.type).toBe("float4");
    expect(allColumns.columns.col_float8.type).toBe("float8");
    expect(allColumns.columns.col_decimal.type).toBe("decimal");
    expect(allColumns.columns.col_decimal.precision).toBe(10);
    expect(allColumns.columns.col_decimal.scale).toBe(2);

    expect(allColumns.columns.col_text.type).toBe("text");
    expect(allColumns.columns.col_varchar.type).toBe("varchar");
    expect(allColumns.columns.col_varchar.maxLength).toBe(255);
    expect(allColumns.columns.col_char.type).toBe("char");
    expect(allColumns.columns.col_char.length).toBe(10);

    expect(allColumns.columns.col_blob.type).toBe("blob");

    expect(allColumns.columns.col_timestamp.type).toBe("timestamp");
    expect(allColumns.columns.col_timestamptz.type).toBe("timestamptz");
    expect(allColumns.columns.col_date.type).toBe("date");
    expect(allColumns.columns.col_time.type).toBe("time");
    expect(allColumns.columns.col_interval.type).toBe("interval");

    expect(allColumns.columns.col_boolean.type).toBe("boolean");
    expect(allColumns.columns.col_uuid.type).toBe("uuid");

    expect(allColumns.columns.col_json.type).toBe("json");

    expect(allColumns.columns.col_bit.type).toBe("bit");
    expect(allColumns.columns.col_bit.length).toBe(8);
  });
});
