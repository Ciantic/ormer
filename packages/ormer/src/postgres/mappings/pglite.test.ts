import * as s from "../../simplevalidation.ts";
import { describe, it, expect } from "vitest";
import { PGlite } from "@electric-sql/pglite";
import { PGLITE_TYPE_MAPPING } from "./pglite.ts";
import type { StandardSchemaV1 } from "@standard-schema/spec";
import { typedValidate } from "../../simplevalidation.ts";
import { type PostgresType } from "../types.ts";

// prettier-ignore
const TABLE = {
  // Numeric types
  test_int2_n: { type: "int2", input: 100 },
  test_int2_b: { type: "int2", input: 100n, output: 100 },
  test_int2_s: { type: "int2", input: "100", output: 100 },
  
  test_int4_n: { type: "int4", input: 200000 },
  test_int4_b: { type: "int4", input: 200000n, output: 200000 },
  test_int4_s: { type: "int4", input: "200000", output: 200000 },
  
  // Note: Output value type differs based on size of the number
  // Big numbers are returned as bigint, smaller numbers as number
  test_int8_b: { type: "int8", input: 123456789012345678n },
  test_int8_n: { type: "int8", input: 1234 }, 
  test_int8_s: { type: "int8", input: "123456789012345678", output: 123456789012345678n },

  test_serial2_n: { type: "serial2", input: 1234 },
  test_serial2_b: { type: "serial2", input: 1234n, output: 1234 },
  test_serial2_s: { type: "serial2", input: "1234", output: 1234 },

  test_serial4_n: { type: "serial4", input: 12345 },
  test_serial4_b: { type: "serial4", input: 12345n, output: 12345 },
  test_serial4_s: { type: "serial4", input: "12345", output: 12345 },

  // Note: Output value type differs based on size of the number
  // Big numbers are returned as bigint, smaller numbers as number
  test_serial8_n: { type: "serial8", input: 1234 }, 
  test_serial8_b: { type: "serial8", input: 123456789012345678n },
  test_serial8_s: { type: "serial8", input: "123456789012345678", output: 123456789012345678n },

  test_float4_n: { type: "float4", input: 1.5 },
  test_float4_b: { type: "float4", input: 1234n, output: 1234 },
  test_float4_s: { type: "float4", input: "1.5", output: 1.5 },

  test_float8_n: { type: "float8", input: 3.14159 },
  test_float8_b: { type: "float8", input: 1234n, output: 1234 },
  test_float8_s: { type: "float8", input: "3.14159", output: 3.14159 },

  test_decimal_n: { type: "decimal", input: 12345.67, output: "12345.67" },
  test_decimal_s: { type: "decimal", input: "12345.67" },
  test_decimal_b: { type: "decimal", input: 12341234n, output: "12341234" },

  test_money: { type: "money", input: "$12.34" },

  // Character types
  test_text: { type: "text", input: "hello world" },

  // Binary types
  test_bytea: {
    type: "bytea",
    input: Uint8Array.from([0xde, 0xad, 0xbe, 0xef]),
  },

  // Date/Time types
  test_timestamp: {
    type: "timestamp",
    input: new Date("2024-06-15T00:00:00Z"), // NOTE: UTC Value!
    output: new Date("2024-06-15T00:00:00"), // NOTE: Local time value!
  },
  test_timestamptz: {
    type: "timestamptz",
    input: new Date("2024-06-15T12:34:56Z"),
  },
  test_date: { type: "date", input: new Date("2024-06-15T00:00:00Z") },
  test_time: { type: "time", input: "12:34:56" },
  test_timetz: { type: "timetz", input: "12:34:56+00" },
  test_interval: { type: "interval", input: "1 year 2 mons 3 days" },

  // Boolean type
  test_boolean: { type: "boolean", input: true },

  // UUID type
  test_uuid: { type: "uuid", input: "a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11" },

  // JSON types
  test_jsonb: { type: "jsonb", input: { key: "value", num: 42 } },
  test_json: { type: "json", input: { arr: [1, 2, 3] } },

  // Network address types
  test_inet: { type: "inet", input: "192.168.1.1" },
  test_cidr: { type: "cidr", input: "192.168.1.0/24" },
  test_macaddr: { type: "macaddr", input: "08:00:2b:01:02:03" },
  test_macaddr8: { type: "macaddr8", input: "08:00:2b:01:02:03:04:05" },

  // Text search types
  test_tsvector: {
    type: "tsvector",
    input: "'a' 'cat' 'fat' 'mat' 'on' 'sat'",
  },
  test_tsquery: { type: "tsquery", input: "'fat' & 'cat'" },

  // XML type
  test_xml: { type: "xml", input: "<root><item>test</item></root>" },

  // Geometric types
  test_point: { type: "point", input: "(1,2)" },
  test_line: { type: "line", input: "{1,2,3}" },
  test_lseg: { type: "lseg", input: "[(1,2),(3,4)]" },
  test_box: { type: "box", input: "(3,4),(1,2)" },
  test_path: { type: "path", input: "[(1,2),(3,4),(5,6)]" },
  test_polygon: { type: "polygon", input: "((1,2),(3,4),(5,6))" },
  test_circle: { type: "circle", input: "<(1,2),3>" },

  // Object identifier / system types
  test_pg_lsn: { type: "pg_lsn", input: "0/16A8F80" },
  test_pg_snapshot: { type: "pg_snapshot", input: "100:200:" },

  // Variadic types
  test_bit: { type: "bit(3)", input: "101" },
  test_varbit: { type: "varbit(16)", input: "10011010" },
  test_char: { type: "char(5)", input: "a".repeat(5) },
  test_varchar: { type: "varchar(255)", input: "hello" },
  test_decimal_variadic: { type: "decimal(10, 2)", input: "12345.67" },

  // Array examples
  test_int4_arr: { type: "int4[]", input: [1, 2, 3] },
  test_text_arr: { type: "text[]", input: ["hello", "world"] },
  test_float8_arr: { type: "float8[]", input: [1.1, 2.2, 3.3] },
  test_bool_arr: { type: "boolean[]", input: [true, false, true] },
  test_decimal_arr: { type: "decimal(10,2)[]", input: ["10.50", "20.75"] },
  test_point_arr: { type: "point[]", input: ["(1,2)", "(3,4)"] },
  test_circle_arr: { type: "circle[]", input: ["<(1,2),3>", "<(4,5),6>"] },
} satisfies Record<string, { type: PostgresType; input: any; output?: any }>;

describe("pglite raw type mapping", () => {
  it("insert and select all PgliteMapping types round-trip correctly", async () => {
    const pglite = new PGlite();
    const createTableSql = `
      CREATE TABLE test_pglite (
        ${Object.entries(TABLE)
          .map(([columnName, { type }]) => `"${columnName}" ${type} NOT NULL`)
          .join(",\n        ")}
      );
    `;
    await pglite.exec(createTableSql);

    const insertValue = Object.fromEntries(
      Object.entries(TABLE).map(([columnName, { input: value }]) => [
        columnName,
        value,
      ]),
    );
    const expectValue = Object.fromEntries(
      Object.entries(TABLE).map(
        ([columnName, p]: [string, { output?: any; input: any }]) => [
          columnName,
          p.output ?? p.input,
        ],
      ),
    );

    const columns = Object.keys(insertValue);
    const insertValues = Object.values(insertValue);
    const placeholders = insertValues.map((_, i) => `$${i + 1}`).join(", ");
    await pglite.query(
      `INSERT INTO test_pglite (${columns.join(", ")}) VALUES (${placeholders})`,
      insertValues,
    );

    const result = await pglite.query(`SELECT * FROM test_pglite`);
    const row = result.rows[0] as Record<string, any>;

    expect(row).toEqual(expectValue);

    Object.entries(TABLE).forEach(([columnName, { type, input: value }]) => {
      let mapping: (p?: any) => {
        input: StandardSchemaV1<any, any>;
        output: StandardSchemaV1<any, any>;
      } = PGLITE_TYPE_MAPPING[type as keyof typeof PGLITE_TYPE_MAPPING];

      if (type === "decimal(10, 2)") {
        mapping = () =>
          PGLITE_TYPE_MAPPING.decimal({ precision: 10, scale: 2 });
      } else if (type === "bit(3)") {
        mapping = () => PGLITE_TYPE_MAPPING.bit({ length: 3 });
      } else if (type === "varbit(16)") {
        mapping = () => PGLITE_TYPE_MAPPING.varbit({ maxLength: 16 });
      } else if (type === "char(5)") {
        mapping = () => PGLITE_TYPE_MAPPING.char({ length: 5 });
      } else if (type === "varchar(255)") {
        mapping = () => PGLITE_TYPE_MAPPING.varchar({ maxLength: 255 });
      } else if (type === "int4[]") {
        mapping = () => s.ioarray(PGLITE_TYPE_MAPPING.int4());
      } else if (type === "text[]") {
        mapping = () => s.ioarray(PGLITE_TYPE_MAPPING.text());
      } else if (type === "float8[]") {
        mapping = () => s.ioarray(PGLITE_TYPE_MAPPING.float8());
      } else if (type === "boolean[]") {
        mapping = () => s.ioarray(PGLITE_TYPE_MAPPING.boolean());
      } else if (type === "decimal(10,2)[]") {
        mapping = () =>
          s.ioarray(PGLITE_TYPE_MAPPING.decimal({ precision: 10, scale: 2 }));
      } else if (type === "point[]") {
        mapping = () => s.ioarray(PGLITE_TYPE_MAPPING.point());
      } else if (type === "circle[]") {
        mapping = () => s.ioarray(PGLITE_TYPE_MAPPING.circle());
      }

      const inputResult = typedValidate(mapping().input, value);
      expect(
        inputResult.issues,
        `Input validation failed for column "${columnName}"`,
      ).toBeUndefined();

      const result = typedValidate(mapping().output, row[columnName]);
      expect(
        result.issues,
        `Output validation failed for column "${columnName}"`,
      ).toBeUndefined();
    });
  });
});
