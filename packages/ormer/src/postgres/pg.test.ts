import * as s from "../simplevalidation.ts";
import { describe, it, expect, beforeAll, afterAll } from "vitest";
import pg from "pg";
import { PG_TYPE_MAPPING } from "./pg.ts";
import type { StandardSchemaV1 } from "@standard-schema/spec";
import { typedValidate } from "../simplevalidation.ts";
import { type PostgresType } from "./postgres-types.ts";
import { execSync } from "node:child_process";

const CONTAINER_NAME = "ormer-pg-test";

let client: pg.Client;

beforeAll(async () => {
  execSync(`podman rm -f ${CONTAINER_NAME} 2>/dev/null || true`);
  execSync(
    `podman run --rm -d --name ${CONTAINER_NAME} -e POSTGRES_PASSWORD=test -e POSTGRES_DB=test -p 5432:5432 docker.io/library/postgres:17`,
    { stdio: "ignore" },
  );

  // Retry connection until PostgreSQL is truly ready
  for (let i = 0; i < 30; i++) {
    try {
      client = await new pg.Client({
        host: "localhost",
        port: 5432,
        user: "postgres",
        password: "test",
        database: "test",
      }).connect();
      return;
    } catch (er) {
      await new Promise((r) => setTimeout(r, 1000));
    }
  }
  throw new Error("Failed to connect to PostgreSQL after multiple attempts");
}, 120000);

afterAll(async () => {
  try {
    await client?.end();
    execSync(`podman rm -f ${CONTAINER_NAME}`, { stdio: "ignore" });
  } catch {
    // ignore
  }
}, 30000);

const TABLE = {
  // Numeric types
  test_int2: { type: "int2", value: 100 },
  test_int4: { type: "int4", value: 200000 },
  test_int8: { type: "int8", value: "123456789012345678" },
  test_serial2: { type: "serial2", value: 1 },
  test_serial4: { type: "serial4", value: 1 },
  test_serial8: { type: "serial8", value: "1" },
  test_float4: { type: "float4", value: 1.5 },
  test_float8: { type: "float8", value: 3.141592653589793 },
  test_money: { type: "money", value: "$12.34" },
  test_decimal: { type: "decimal", value: "12345.67" },
  test_decimal2: { type: "decimal", value: 12345.67 },

  // Character types
  test_text: { type: "text", value: "hello world" },

  // Binary types
  test_bytea: {
    type: "bytea",
    value: Buffer.from([0xde, 0xad, 0xbe, 0xef]),
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
  test_char: { type: "char(5)", value: "a".repeat(5) },
  test_varchar: { type: "varchar(255)", value: "hello" },
  test_decimal_variadic: { type: "decimal(10, 2)", value: "12345.67" },

  // Array examples
  test_int4_arr: { type: "int4[]", value: [1, 2, 3] },
  test_text_arr: { type: "text[]", value: ["hello", "world"] },
  test_float8_arr: { type: "float8[]", value: [1.1, 2.2, 3.3] },
  test_bool_arr: { type: "boolean[]", value: [true, false, true] },
  test_decimal_arr: { type: "decimal(10,2)[]", value: [10.5, 20.75] },
} satisfies Record<string, { type: PostgresType; value: any }>;

describe("pg raw type mapping", () => {
  it("insert and select all PglMapping types round-trip correctly", async () => {
    const createTableSql = `
      CREATE TABLE test_pg (
        ${Object.entries(TABLE)
          .map(([columnName, { type }]) => `"${columnName}" ${type} NOT NULL`)
          .join(",\n        ")}
      );
    `;
    await client.query(createTableSql);

    const insertValue = Object.fromEntries(
      Object.entries(TABLE).map(([columnName, { value }]) => [
        columnName,
        value,
      ]),
    );

    const columns = Object.keys(insertValue);
    const insertValues = Object.values(insertValue);
    const placeholders = insertValues.map((_, i) => `$${i + 1}`).join(", ");
    await client.query(
      `INSERT INTO test_pg (${columns.join(", ")}) VALUES (${placeholders})`,
      insertValues,
    );

    const result = await client.query(`SELECT * FROM test_pg`);
    const row = result.rows[0] as Record<string, any>;
    const matches = {
      ...insertValue,
      // PG returns decimals as strings, even if inserted as numbers
      test_decimal2: "12345.67",
      test_date: expect.any(Date),
      test_timestamp: expect.any(Date),
      test_timestamptz: expect.any(Date),
      test_point: {
        x: 1,
        y: 2,
      },
      test_circle: {
        radius: 3,
        x: 1,
        y: 2,
      },
      test_interval: {
        days: 3,
        months: 2,
        years: 1,
      },
    };

    expect(row).toMatchObject(matches);

    // PG returns local date object (no Z suffix)
    expect(row.test_date.getTime(), "test_date").toBe(
      new Date("2024-06-15T00:00:00").getTime(),
    );

    Object.entries(TABLE).forEach(([columnName, { type, value }]) => {
      let validator: (p?: any) => StandardSchemaV1<any, any> =
        PG_TYPE_MAPPING[type as keyof typeof PG_TYPE_MAPPING];

      if (type === "decimal(10, 2)") {
        validator = () => PG_TYPE_MAPPING.decimal({ precision: 10, scale: 2 });
      } else if (type === "bit(3)") {
        validator = () => PG_TYPE_MAPPING.bit({ length: 3 });
      } else if (type === "varbit(16)") {
        validator = () => PG_TYPE_MAPPING.varbit({ maxLength: 16 });
      } else if (type === "char(5)") {
        validator = () => PG_TYPE_MAPPING.char({ length: 5 });
      } else if (type === "varchar(255)") {
        validator = () => PG_TYPE_MAPPING.varchar({ maxLength: 255 });
      } else if (type === "int4[]") {
        validator = () => s.array(PG_TYPE_MAPPING.int4());
      } else if (type === "text[]") {
        validator = () => s.array(PG_TYPE_MAPPING.text());
      } else if (type === "float8[]") {
        validator = () => s.array(PG_TYPE_MAPPING.float8());
      } else if (type === "boolean[]") {
        validator = () => s.array(PG_TYPE_MAPPING.boolean());
      } else if (type === "decimal(10,2)[]") {
        validator = () =>
          s.array(PG_TYPE_MAPPING.decimal({ precision: 10, scale: 2 }));
      }

      const result = typedValidate(validator(), row[columnName]);
      expect(result.issues, columnName).toBeUndefined();
      // if (!result.issues) {
      //   if (type === "timestamp" || type === "timestamptz" || type === "date") {
      //     // Timestamps are naive local datetimes in pglite
      //     expect(result.value, columnName).toBeInstanceOf(Date);
      //   } else {
      //     expect(result.value, columnName).toEqual(matches[columnName]);
      //   }
      // }
    });
  });
});
