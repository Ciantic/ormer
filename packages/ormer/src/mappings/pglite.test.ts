import * as z from "zod";
import { describe, it, expect, expectTypeOf } from "vitest";
import { PGlite, types } from "@electric-sql/pglite";
import { PGLITE_TYPE_MAPPING } from "./pglite.ts";
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

    const insertValues = [
      // Numeric types
      100, // test_int2
      200000, // test_int4
      "123456789012345678", // test_int8 (passed as string, PGlite serializes)
      1, // test_serial2 (auto-generated, value ignored)
      1, // test_serial4 (auto-generated, value ignored)
      1, // test_serial8 (auto-generated, value ignored)
      "12345.67", // test_decimal
      1.5, // test_float4
      3.141592653589793, // test_float8
      "12.34", // test_money

      // Character types
      "hello world", // test_text

      // Binary types
      Uint8Array.from([0xde, 0xad, 0xbe, 0xef]), // test_bytea

      // Date/Time types
      "2024-06-15 12:34:56", // test_timestamp
      "2024-06-15 12:34:56+00", // test_timestamptz
      "2024-06-15", // test_date
      "12:34:56", // test_time
      "12:34:56+00", // test_timetz
      "1 year 2 months 3 days", // test_interval

      // Boolean type
      true, // test_boolean

      // UUID type
      "a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11", // test_uuid

      // JSON types
      '{"key": "value", "num": 42}', // test_jsonb
      '{"arr": [1, 2, 3]}', // test_json

      // Network address types
      "192.168.1.1", // test_inet
      "192.168.1.0/24", // test_cidr
      "08:00:2b:01:02:03", // test_macaddr
      "08:00:2b:01:02:03:04:05", // test_macaddr8

      // Bit string types
      "10101010", // test_bit
      "1100110011001100", // test_varbit

      // Text search types
      "a fat cat sat on a mat", // test_tsvector
      "fat & cat", // test_tsquery

      // XML type
      "<root><item>test</item></root>", // test_xml

      // Geometric types
      "(1,2)", // test_point
      "{1,2,3}", // test_line
      "[(1,2),(3,4)]", // test_lseg
      "(1,2),(3,4)", // test_box
      "[(1,2),(3,4),(5,6)]", // test_path
      "((1,2),(3,4),(5,6))", // test_polygon
      "<(1,2),3>", // test_circle

      // Object identifier / system types
      "0/16A8F80", // test_pg_lsn
      "100:200:", // test_pg_snapshot

      // Array examples
      [1, 2, 3], // test_int4_arr
      ["hello", "world"], // test_text_arr
      [1.1, 2.2, 3.3], // test_float8_arr
      [true, false, true], // test_bool_arr
      ["10.50", "20.75"], // test_decimal_arr
    ];

    const placeholders = insertValues.map((_, i) => `$${i + 1}`).join(", ");
    await pglite.query(
      `INSERT INTO test_pglite VALUES (${placeholders})`,
      insertValues,
    );

    const result = await pglite.query(`SELECT * FROM test_pglite`);
    const row = result.rows[0] as Record<string, any>;

    // TODO: Test that row values match with PGLITE_TYPE_MAPPING, i.e. by using the typedValidate
  });
});
