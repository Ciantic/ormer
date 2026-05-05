import * as z from "zod";
import { describe, it, expect, expectTypeOf } from "vitest";
import { PGlite, types } from "@electric-sql/pglite";
import { PGLITE_TYPE_MAPPING } from "./pglite.ts";
import type { StandardSchemaV1 } from "@standard-schema/spec";
import { typedValidate } from "../simplevalidation.ts";

describe("pglite raw type mapping", () => {
  it("insert and select all PgliteMapping types round-trip correctly", async () => {
    const pglite = new PGlite();

    await pglite.exec(`
      CREATE TABLE test_pglite (
        -- Numeric types
        test_int2 int2,
        test_int4 int4,
        test_int8 int8,
        test_serial2 serial2,
        test_serial4 serial4,
        test_serial8 bigserial,
        test_decimal decimal(10,2),
        test_float4 float4,
        test_float8 float8,
        test_money money,

        -- Character types
        test_text text,

        -- Binary types
        test_bytea bytea,

        -- Date/Time types
        test_timestamp timestamp,
        test_timestamptz timestamptz,
        test_date date,
        test_time time,
        test_timetz timetz,
        test_interval interval,

        -- Boolean type
        test_boolean boolean,

        -- UUID type
        test_uuid uuid,

        -- JSON types
        test_jsonb jsonb,
        test_json json,

        -- Network address types
        test_inet inet,
        test_cidr cidr,
        test_macaddr macaddr,
        test_macaddr8 macaddr8,

        -- Bit string types
        test_bit bit(8),
        test_varbit varbit(16),

        -- Text search types
        test_tsvector tsvector,
        test_tsquery tsquery,

        -- XML type
        test_xml xml,

        -- Geometric types
        test_point point,
        test_line line,
        test_lseg lseg,
        test_box box,
        test_path path,
        test_polygon polygon,
        test_circle circle,

        -- Object identifier / system types
        test_pg_lsn pg_lsn,
        test_pg_snapshot pg_snapshot,

        -- Array examples
        test_int4_arr int4[],
        test_text_arr text[],
        test_float8_arr float8[],
        test_bool_arr boolean[],
        test_decimal_arr decimal(10,2)[]
      );
    `);

    const insertValue = {
      // Numeric types
      test_int2: 100,
      test_int4: 200000,
      test_int8: 123456789012345678n,
      test_serial2: 1, // auto-generated, value ignored
      test_serial4: 1, // auto-generated, value ignored
      test_serial8: 1, // auto-generated, value ignored
      test_decimal: "12345.67",
      test_float4: 1.5,
      test_float8: 3.141592653589793,
      test_money: "$12.34",

      // Character types
      test_text: "hello world",

      // Binary types
      test_bytea: Uint8Array.from([0xde, 0xad, 0xbe, 0xef]),

      // Date/Time types
      test_timestamp: new Date(),
      test_timestamptz: new Date("2024-06-15T12:34:56Z"),
      test_date: new Date("2024-06-15T00:00:00Z"),
      test_time: "12:34:56",
      test_timetz: "12:34:56+00",
      test_interval: "1 year 2 mons 3 days",

      // Boolean type
      test_boolean: true,

      // UUID type
      test_uuid: "a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11",

      // JSON types
      test_jsonb: { key: "value", num: 42 },
      test_json: { arr: [1, 2, 3] },

      // Network address types
      test_inet: "192.168.1.1",
      test_cidr: "192.168.1.0/24",
      test_macaddr: "08:00:2b:01:02:03",
      test_macaddr8: "08:00:2b:01:02:03:04:05",

      // Bit string types
      test_bit: "10101010",
      test_varbit: "1100110011001100",

      // Text search types
      test_tsvector: "'a' 'cat' 'fat' 'mat' 'on' 'sat'",
      test_tsquery: "'fat' & 'cat'",

      // XML type
      test_xml: "<root><item>test</item></root>",

      // Geometric types
      test_point: "(1,2)",
      test_line: "{1,2,3}",
      test_lseg: "[(1,2),(3,4)]",
      test_box: "(3,4),(1,2)",
      test_path: "[(1,2),(3,4),(5,6)]",
      test_polygon: "((1,2),(3,4),(5,6))",
      test_circle: "<(1,2),3>",

      // Object identifier / system types
      test_pg_lsn: "0/16A8F80",
      test_pg_snapshot: "100:200:",

      // Array examples
      test_int4_arr: [1, 2, 3],
      test_text_arr: ["hello", "world"],
      test_float8_arr: [1.1, 2.2, 3.3],
      test_bool_arr: [true, false, true],
      test_decimal_arr: ["10.50", "20.75"],
    };

    const columns = Object.keys(insertValue);
    const insertValues = Object.values(insertValue);
    const placeholders = insertValues.map((_, i) => `$${i + 1}`).join(", ");
    await pglite.query(
      `INSERT INTO test_pglite (${columns.join(", ")}) VALUES (${placeholders})`,
      insertValues,
    );

    const result = await pglite.query(`SELECT * FROM test_pglite`);
    const row = result.rows[0] as Record<string, any>;

    // Map column names to their PGLITE_TYPE_MAPPING validators
    const scalarValidators: Record<string, StandardSchemaV1<any, any>> = {
      test_int2: PGLITE_TYPE_MAPPING.int2,
      test_int4: PGLITE_TYPE_MAPPING.int4,
      test_int8: PGLITE_TYPE_MAPPING.int8,
      test_serial2: PGLITE_TYPE_MAPPING.serial2,
      test_serial4: PGLITE_TYPE_MAPPING.serial4,
      test_serial8: PGLITE_TYPE_MAPPING.serial8,
      test_decimal: PGLITE_TYPE_MAPPING.decimal({ precision: 10, scale: 2 }),
      test_float4: PGLITE_TYPE_MAPPING.float4,
      test_float8: PGLITE_TYPE_MAPPING.float8,
      test_money: PGLITE_TYPE_MAPPING.money,
      test_text: PGLITE_TYPE_MAPPING.text,
      test_bytea: PGLITE_TYPE_MAPPING.bytea,
      test_timestamp: PGLITE_TYPE_MAPPING.timestamp,
      test_timestamptz: PGLITE_TYPE_MAPPING.timestamptz,
      test_date: PGLITE_TYPE_MAPPING.date,
      test_time: PGLITE_TYPE_MAPPING.time,
      test_timetz: PGLITE_TYPE_MAPPING.timetz,
      test_interval: PGLITE_TYPE_MAPPING.interval,
      test_boolean: PGLITE_TYPE_MAPPING.boolean,
      test_uuid: PGLITE_TYPE_MAPPING.uuid,
      test_jsonb: PGLITE_TYPE_MAPPING.jsonb,
      test_json: PGLITE_TYPE_MAPPING.json,
      test_inet: PGLITE_TYPE_MAPPING.inet,
      test_cidr: PGLITE_TYPE_MAPPING.cidr,
      test_macaddr: PGLITE_TYPE_MAPPING.macaddr,
      test_macaddr8: PGLITE_TYPE_MAPPING.macaddr8,
      test_bit: PGLITE_TYPE_MAPPING.bit({ length: 8 }),
      test_varbit: PGLITE_TYPE_MAPPING.varbit({ maxLength: 16 }),
      test_tsvector: PGLITE_TYPE_MAPPING.tsvector,
      test_tsquery: PGLITE_TYPE_MAPPING.tsquery,
      test_xml: PGLITE_TYPE_MAPPING.xml,
      test_point: PGLITE_TYPE_MAPPING.point,
      test_line: PGLITE_TYPE_MAPPING.line,
      test_lseg: PGLITE_TYPE_MAPPING.lseg,
      test_box: PGLITE_TYPE_MAPPING.box,
      test_path: PGLITE_TYPE_MAPPING.path,
      test_polygon: PGLITE_TYPE_MAPPING.polygon,
      test_circle: PGLITE_TYPE_MAPPING.circle,
      test_pg_lsn: PGLITE_TYPE_MAPPING.pg_lsn,
      test_pg_snapshot: PGLITE_TYPE_MAPPING.pg_snapshot,
    };

    expect(row).toEqual({
      ...insertValue,

      // pglite `timestamp` columns are returned in different value as input
      // values it doesn't take time zone into account, so we just check that
      // it's a Date object here
      test_timestamp: expect.any(Date),
    });

    // Validate each scalar column against its PGLITE_TYPE_MAPPING validator
    for (const [column, schema] of Object.entries(scalarValidators)) {
      const result = typedValidate(schema, row[column]);
      expect(
        result.issues,
        `Column "${column}" validation failed: ${JSON.stringify(result.issues?.[0])}`,
      ).toBeUndefined();
    }

    // Validate array columns element-by-element
    const decimalElement = PGLITE_TYPE_MAPPING.decimal({
      precision: 10,
      scale: 2,
    });
    const arrayColumns: [string, StandardSchemaV1<any, any>][] = [
      ["test_int4_arr", PGLITE_TYPE_MAPPING.int4],
      ["test_text_arr", PGLITE_TYPE_MAPPING.text],
      ["test_float8_arr", PGLITE_TYPE_MAPPING.float8],
      ["test_bool_arr", PGLITE_TYPE_MAPPING.boolean],
      ["test_decimal_arr", decimalElement],
    ];

    for (const [column, elementSchema] of arrayColumns) {
      const arr = row[column];
      expect(Array.isArray(arr), `Column "${column}" should be an array`).toBe(
        true,
      );
      for (let i = 0; i < arr.length; i++) {
        const result = typedValidate(elementSchema, arr[i]);
        expect(
          result.issues,
          `Column "${column}[${i}]" validation failed: ${JSON.stringify(result.issues?.[0])}`,
        ).toBeUndefined();
      }
    }
  });
});
