import * as s from "../simplevalidation.ts";
import { describe, it, expect } from "vitest";
import { PGlite } from "@electric-sql/pglite";
import { PGLITE_TYPE_MAPPING } from "./pglite.ts";
import type { StandardSchemaV1 } from "@standard-schema/spec";
import { typedValidate } from "../simplevalidation.ts";
import { type PostgresType } from "../drivers/postgres-types.ts";

const TABLE = {
  // Numeric types
  test_int2: { type: "int2", value: 100 },
  test_int4: { type: "int4", value: 200000 },
  test_int8: { type: "int8", value: 123456789012345678n },
  test_serial2: { type: "serial2", value: 1 },
  test_serial4: { type: "serial4", value: 1 },
  test_serial8: { type: "serial8", value: 1 },
  test_float4: { type: "float4", value: 1.5 },
  test_float8: { type: "float8", value: 3.141592653589793 },
  test_money: { type: "money", value: "$12.34" },
  test_decimal: { type: "decimal", value: "12345.67" },

  // Character types
  test_text: { type: "text", value: "hello world" },

  // Binary types
  test_bytea: {
    type: "bytea",
    value: Uint8Array.from([0xde, 0xad, 0xbe, 0xef]),
  },

  // Date/Time types
  test_timestamp: { type: "timestamp", value: new Date() },
  test_timestamptz: {
    type: "timestamptz",
    value: new Date("2024-06-15T12:34:56Z"),
  },
  test_date: { type: "date", value: new Date("2024-06-15T00:00:00Z") },
  test_time: { type: "time", value: "12:34:56" },
  test_timetz: { type: "timetz", value: "12:34:56+00" },
  test_interval: { type: "interval", value: "1 year 2 mons 3 days" },

  // Boolean type
  test_boolean: { type: "boolean", value: true },

  // UUID type
  test_uuid: { type: "uuid", value: "a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11" },

  // JSON types
  test_jsonb: { type: "jsonb", value: { key: "value", num: 42 } },
  test_json: { type: "json", value: { arr: [1, 2, 3] } },

  // Network address types
  test_inet: { type: "inet", value: "192.168.1.1" },
  test_cidr: { type: "cidr", value: "192.168.1.0/24" },
  test_macaddr: { type: "macaddr", value: "08:00:2b:01:02:03" },
  test_macaddr8: { type: "macaddr8", value: "08:00:2b:01:02:03:04:05" },

  // Text search types
  test_tsvector: {
    type: "tsvector",
    value: "'a' 'cat' 'fat' 'mat' 'on' 'sat'",
  },
  test_tsquery: { type: "tsquery", value: "'fat' & 'cat'" },

  // XML type
  test_xml: { type: "xml", value: "<root><item>test</item></root>" },

  // Geometric types
  test_point: { type: "point", value: "(1,2)" },
  test_line: { type: "line", value: "{1,2,3}" },
  test_lseg: { type: "lseg", value: "[(1,2),(3,4)]" },
  test_box: { type: "box", value: "(3,4),(1,2)" },
  test_path: { type: "path", value: "[(1,2),(3,4),(5,6)]" },
  test_polygon: { type: "polygon", value: "((1,2),(3,4),(5,6))" },
  test_circle: { type: "circle", value: "<(1,2),3>" },

  // Object identifier / system types
  test_pg_lsn: { type: "pg_lsn", value: "0/16A8F80" },
  test_pg_snapshot: { type: "pg_snapshot", value: "100:200:" },

  // Variadic types
  test_bit: { type: "bit(3)", value: "101" },
  test_varbit: { type: "varbit(16)", value: "10011010" },
  test_char: { type: "char(512)", value: "a".repeat(512) },
  test_varchar: { type: "varchar(255)", value: "hello" },
  test_decimal_variadic: { type: "decimal(10, 2)", value: "12345.67" },

  // Array examples
  test_int4_arr: { type: "int4[]", value: [1, 2, 3] },
  test_text_arr: { type: "text[]", value: ["hello", "world"] },
  test_float8_arr: { type: "float8[]", value: [1.1, 2.2, 3.3] },
  test_bool_arr: { type: "boolean[]", value: [true, false, true] },
  test_decimal_arr: { type: "decimal(10, 2)[]", value: ["10.50", "20.75"] },
} satisfies Record<string, { type: PostgresType; value: any }>;

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
      Object.entries(TABLE).map(([columnName, { value }]) => [
        columnName,
        value,
      ]),
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

    expect(row).toEqual({
      ...insertValue,

      // pglite `timestamp` columns are returned in different value as input
      // values it doesn't take time zone into account, so we just check that
      // it's a Date object here
      test_timestamp: expect.any(Date),
    });

    Object.entries(TABLE).forEach(([columnName, { type, value }]) => {
      let validator:
        | StandardSchemaV1<any, any>
        | ((p: any) => StandardSchemaV1<any, any>)
        | undefined =
        PGLITE_TYPE_MAPPING[type as keyof typeof PGLITE_TYPE_MAPPING];

      if (type === "decimal") {
        validator = PGLITE_TYPE_MAPPING.decimal();
      } else if (type === "decimal(10, 2)") {
        validator = PGLITE_TYPE_MAPPING.decimal({ precision: 10, scale: 2 });
      } else if (type === "bit(3)") {
        validator = PGLITE_TYPE_MAPPING.bit({ length: 3 });
      } else if (type === "varbit(16)") {
        validator = PGLITE_TYPE_MAPPING.varbit({ maxLength: 16 });
      } else if (type === "char(512)") {
        validator = PGLITE_TYPE_MAPPING.char({ maxLength: 512 });
      } else if (type === "varchar(255)") {
        validator = PGLITE_TYPE_MAPPING.varchar({ maxLength: 255 });
      } else if (type === "int4[]") {
        validator = s.array(PGLITE_TYPE_MAPPING.int4);
      } else if (type === "text[]") {
        validator = s.array(PGLITE_TYPE_MAPPING.text);
      } else if (type === "float8[]") {
        validator = s.array(PGLITE_TYPE_MAPPING.float8);
      } else if (type === "boolean[]") {
        validator = s.array(PGLITE_TYPE_MAPPING.boolean);
      } else if (type === "decimal(10, 2)[]") {
        validator = s.array(
          PGLITE_TYPE_MAPPING.decimal({ precision: 10, scale: 2 }),
        );
      }

      if (!validator || typeof validator === "function") {
        throw new Error(`No validator found for type "${type}"`);
      }

      const result = typedValidate(validator, row[columnName]);
      expect(result.issues).toBeUndefined();
      if (!result.issues) {
        if (type === "timestamp") {
          // Timestamps are naive local datetimes in pglite
          expect(result.value).toBeInstanceOf(Date);
        } else {
          expect(result.value).toEqual(value);
        }
      }
    });
  });
});
