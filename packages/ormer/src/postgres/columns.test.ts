import * as o from "./columns.ts";
import { table } from "../table.ts";
import { describe, it, expect } from "vitest";

describe("postgres columns", () => {
  it("creates a table with all column types", () => {
    const allColumns = table("all_columns", {
      // Numeric types
      col_int2: o.int2(),
      col_int4: o.int4(),
      col_int8: o.int8(),
      col_serial2: o.int2({ autoIncrement: true }),
      col_serial4: o.int4({ autoIncrement: true }),
      col_serial8: o.int8({ autoIncrement: true }),
      col_float4: o.float4(),
      col_float8: o.float8(),
      col_decimal: o.decimal({ precision: 10, scale: 2 }),
      col_money: o.money(),

      // Character types
      col_text: o.text(),
      col_varchar: o.varchar({ maxLength: 255 }),
      col_char: o.char({ length: 10 }),

      // Binary types
      col_bytea: o.bytea(),

      // Date/Time types
      col_timestamp: o.timestamp(),
      col_timestamptz: o.timestamptz(),
      col_date: o.date(),
      col_time: o.time(),
      col_timetz: o.timetz(),
      col_interval: o.interval(),

      // Boolean type
      col_boolean: o.boolean(),

      // UUID type
      col_uuid: o.uuid(),

      // JSON types
      col_jsonb: o.jsonb({ schema: {} as any }),
      col_json: o.json({ schema: {} as any }),

      // Network address types
      col_inet: o.inet(),
      col_cidr: o.cidr(),
      col_macaddr: o.macaddr(),
      col_macaddr8: o.macaddr8(),

      // Bit string types
      col_bit: o.bit({ length: 8 }),
      col_varbit: o.varbit({ maxLength: 255 }),

      // Text search types
      col_tsvector: o.tsvector(),
      col_tsquery: o.tsquery(),

      // XML type
      col_xml: o.xml(),

      // Geometric types
      col_point: o.point(),
      col_line: o.line(),
      col_lseg: o.lseg(),
      col_box: o.box(),
      col_path: o.path(),
      col_polygon: o.polygon(),
      col_circle: o.circle(),

      // System / object identifier types
      col_xmin: o.xmin(),
      col_pg_lsn: o.pg_lsn(),
      col_pg_snapshot: o.pg_snapshot(),

      // Array types
      col_int4_arr: o.int4({ array: "[]" }),
      col_text_arr: o.text({ array: "[]" }),
      col_bool_arr: o.boolean({ array: "[]" }),
      col_varchar_arr: o.varchar({ maxLength: 100, array: "[]" }),
      col_int4_fixed: o.int4({ array: "[3]" }),
      // Multi-dimensional array
      col_int4_2d: o.int4({ array: "[][]" }),
    });

    expect(allColumns.table).toBe("all_columns");

    expect(allColumns.columns.col_int2.type).toBe("int2");
    expect(allColumns.columns.col_int4.type).toBe("int4");
    expect(allColumns.columns.col_int8.type).toBe("int8");
    expect(allColumns.columns.col_serial2.type).toBe("int2");
    expect(allColumns.columns.col_serial4.type).toBe("int4");
    expect(allColumns.columns.col_serial8.type).toBe("int8");
    expect(allColumns.columns.col_float4.type).toBe("float4");
    expect(allColumns.columns.col_float8.type).toBe("float8");
    expect(allColumns.columns.col_decimal.type).toBe("decimal");
    expect(allColumns.columns.col_decimal.precision).toBe(10);
    expect(allColumns.columns.col_decimal.scale).toBe(2);
    expect(allColumns.columns.col_money.type).toBe("money");

    expect(allColumns.columns.col_text.type).toBe("text");
    expect(allColumns.columns.col_varchar.type).toBe("varchar");
    expect(allColumns.columns.col_varchar.maxLength).toBe(255);
    expect(allColumns.columns.col_char.type).toBe("char");
    expect(allColumns.columns.col_char.length).toBe(10);

    expect(allColumns.columns.col_bytea.type).toBe("bytea");

    expect(allColumns.columns.col_timestamp.type).toBe("timestamp");
    expect(allColumns.columns.col_timestamptz.type).toBe("timestamptz");
    expect(allColumns.columns.col_date.type).toBe("date");
    expect(allColumns.columns.col_time.type).toBe("time");
    expect(allColumns.columns.col_timetz.type).toBe("timetz");
    expect(allColumns.columns.col_interval.type).toBe("interval");

    expect(allColumns.columns.col_boolean.type).toBe("boolean");
    expect(allColumns.columns.col_uuid.type).toBe("uuid");

    expect(allColumns.columns.col_jsonb.type).toBe("jsonb");
    expect(allColumns.columns.col_json.type).toBe("json");

    expect(allColumns.columns.col_inet.type).toBe("inet");
    expect(allColumns.columns.col_cidr.type).toBe("cidr");
    expect(allColumns.columns.col_macaddr.type).toBe("macaddr");
    expect(allColumns.columns.col_macaddr8.type).toBe("macaddr8");

    expect(allColumns.columns.col_bit.type).toBe("bit");
    expect(allColumns.columns.col_bit.length).toBe(8);
    expect(allColumns.columns.col_varbit.type).toBe("varbit");
    expect(allColumns.columns.col_varbit.maxLength).toBe(255);

    expect(allColumns.columns.col_tsvector.type).toBe("tsvector");
    expect(allColumns.columns.col_tsquery.type).toBe("tsquery");

    expect(allColumns.columns.col_xml.type).toBe("xml");

    expect(allColumns.columns.col_point.type).toBe("point");
    expect(allColumns.columns.col_line.type).toBe("line");
    expect(allColumns.columns.col_lseg.type).toBe("lseg");
    expect(allColumns.columns.col_box.type).toBe("box");
    expect(allColumns.columns.col_path.type).toBe("path");
    expect(allColumns.columns.col_polygon.type).toBe("polygon");
    expect(allColumns.columns.col_circle.type).toBe("circle");

    expect(allColumns.columns.col_xmin.type).toBe("xmin");
    expect(allColumns.columns.col_pg_lsn.type).toBe("pg_lsn");
    expect(allColumns.columns.col_pg_snapshot.type).toBe("pg_snapshot");

    expect(allColumns.columns.col_int4_arr.type).toBe("int4");
    expect(allColumns.columns.col_int4_arr.array).toBe("[]");
    expect(allColumns.columns.col_text_arr.type).toBe("text");
    expect(allColumns.columns.col_text_arr.array).toBe("[]");
    expect(allColumns.columns.col_bool_arr.type).toBe("boolean");
    expect(allColumns.columns.col_bool_arr.array).toBe("[]");
    expect(allColumns.columns.col_varchar_arr.type).toBe("varchar");
    expect(allColumns.columns.col_varchar_arr.array).toBe("[]");
    expect(allColumns.columns.col_varchar_arr.maxLength).toBe(100);
    expect(allColumns.columns.col_int4_fixed.type).toBe("int4");
    expect(allColumns.columns.col_int4_fixed.array).toBe("[3]");
    expect(allColumns.columns.col_int4_2d.type).toBe("int4");
    expect(allColumns.columns.col_int4_2d.array).toBe("[][]");
  });
});
