import { describe, it, expect, beforeAll, afterAll } from "vitest";
import postgres from "postgres";
import { POSTGRES_TYPE_MAPPING } from "./postgres.ts";
import { startContainer } from "./test-container.ts";
import { runMappingTest, type TestTable } from "./test-helper.ts";

let sql: ReturnType<typeof postgres>;

beforeAll(async () => {
  process.env.TZ = "Europe/Helsinki";
  await startContainer();

  // Retry connection until PostgreSQL is truly ready
  for (let i = 0; i < 30; i++) {
    try {
      sql = postgres({
        host: "localhost",
        port: 5432,
        user: "postgres",
        password: "test",
        database: "test",
      });
      await sql`SELECT 1`;
      return;
    } catch (er) {
      await new Promise((r) => setTimeout(r, 1000));
    }
  }
  throw new Error("Failed to connect to PostgreSQL after multiple attempts");
}, 120000);

afterAll(async () => {
  await sql?.end();
}, 30000);

// prettier-ignore
const TABLE = {
  // Numeric types
  test_int2_n: { type: "int2", input: 100 },
  test_int2_b: { type: "int2", input: 100n, output: 100 },
  test_int2_s: { type: "int2", input: "100", output: 100 },

  test_int4_n: { type: "int4", input: 200000 },
  test_int4_b: { type: "int4", input: 200000n, output: 200000 },
  test_int4_s: { type: "int4", input: "200000", output: 200000 },

  test_int8_b: { type: "int8", input: 123456789012345678n, output: "123456789012345678" },
  test_int8_n: { type: "int8", input: 1234, output: "1234" },
  test_int8_s: { type: "int8", input: "123456789012345678", output: "123456789012345678" },

  test_serial2_n: { type: "serial2", input: 1234 },
  test_serial2_b: { type: "serial2", input: 1234n, output: 1234 },
  test_serial2_s: { type: "serial2", input: "1234", output: 1234 },

  test_serial4_n: { type: "serial4", input: 12345 },
  test_serial4_b: { type: "serial4", input: 12345n, output: 12345 },
  test_serial4_s: { type: "serial4", input: "12345", output: 12345 },

  test_serial8_n: { type: "serial8", input: 1234, output: "1234" },
  test_serial8_b: { type: "serial8", input: 123456789012345678n, output: "123456789012345678" },
  test_serial8_s: { type: "serial8", input: "123456789012345678", output: "123456789012345678" },

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
    input: Buffer.from([0xde, 0xad, 0xbe, 0xef]),
  },

  // Date/Time types
  test_timestamp: {
    type: "timestamp",
    input: new Date("2024-06-15T00:00:00Z"), // UTC Value!
    output: new Date("2024-06-15T00:00:00"), // Local time (no Z)
  },
  test_timestamp_str: {
    type: "timestamp",
    input: "2024-06-15T00:00:00",
    output: new Date("2024-06-14T18:00:00.000Z"),
  },
  test_timestamptz: {
    type: "timestamptz",
    input: new Date("2024-06-15T12:34:56Z"),
  },
  test_timestamptz_str: {
    type: "timestamptz",
    input: "2024-06-15T12:34:56Z",
    output: new Date("2024-06-15T12:34:56Z"), // UTC value preserved correctly
  },
  test_timestamp_iso_no_tz: {
    type: "timestamp",
    input: "2024-06-15 12:34:56",
    output: new Date("2024-06-15T06:34:56.000Z"), // What the?
  },
  test_timestamptz_iso_no_tz: {
    type: "timestamptz",
    input: "2024-06-15 12:34:56",
    output: new Date("2024-06-15T09:34:56.000Z"), // What the?
  },
  test_date: { type: "date", input: new Date("2024-06-15T00:00:00Z") },
  test_date_str: {
    type: "date",
    input: "2024-06-15", // YYYY-MM-DD string format
    output: new Date("2024-06-15T00:00:00Z"),
  },
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
  // Porsager/postgres has bug https://github.com/porsager/postgres/issues/471
  //   test_bool_arr: { type: "boolean[]", input: [true, false, true] },
  test_decimal_arr: { type: "decimal(10,2)[]", input: ["10.50", "20.75"] },
  test_point_arr: { type: "point[]", input: ["(1,2)", "(3,4)"] },
  test_circle_arr: { type: "circle[]", input: ["<(1,2),3>", "<(4,5),6>"] },
} satisfies TestTable;

describe("porsager/postgres default type mapping", () => {
  it("porsager/postgres has bug https://github.com/porsager/postgres/issues/471", async () => {
    // If it ever gets fixed, update the TABLE above
    await sql
      .unsafe(`CREATE TEMP TABLE test_bool_arr (values boolean[]);`)
      .execute();

    // PostgresError: column "values" is of type boolean[] but expression is of type boolean
    try {
      await sql`INSERT INTO test_bool_arr (values) VALUES (${[true, false, true]})`.execute();
      expect.fail("Expected error was not thrown");
    } catch (er) {
      if (er instanceof Error) {
        expect(er.message).contains(
          'column "values" is of type boolean[] but expression is of type boolean',
        );
      } else {
        throw er;
      }
    }
  });

  it("insert and select all types round-trip correctly", async () => {
    await runMappingTest({
      table: TABLE,
      mapping: POSTGRES_TYPE_MAPPING,
      exec: async (statement) => {
        await sql.unsafe(statement).execute();
      },
      query: async (statement, params) => {
        const result = await sql.unsafe(statement, params || []).execute();
        return { rows: [...result] };
      },
    });
  });
});
