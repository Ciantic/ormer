import {
  describe,
  it,
  beforeAll,
  afterAll,
  afterEach,
  beforeEach,
} from "vitest";
import { PGlite } from "@electric-sql/pglite";
import { type PostgresType } from "../types.ts";
import { runMappingTest } from "./test-helper.ts";
import { PGUNIFIED_TYPE_MAPPING } from "./unified.ts";
import { startContainer } from "./test-container.ts";
import pg from "pg";
import postgres from "postgres";

beforeAll(async () => {
  process.env.TZ = "Europe/Helsinki";
  await startContainer();
});

// prettier-ignore
const TABLE = {
  // Numeric types
  test_int2_n: { type: "int2", input: 100 },
  test_int2_b: { type: "int2", input: 100n, output: 100 },
  test_int2_s: { type: "int2", input: "100", output: 100 },
  
  test_int4_n: { type: "int4", input: 200000 },
  test_int4_b: { type: "int4", input: 200000n, output: 200000 },
  test_int4_s: { type: "int4", input: "200000", output: 200000 },
  
  // Note: Output is always bigint for unified mapping
  test_int8_b: { type: "int8", input: 123456789012345678n, output: 123456789012345678n },
  test_int8_n: { type: "int8", input: 1234, output: 1234n }, 
  test_int8_s: { type: "int8", input: "123456789012345678", output: 123456789012345678n },

  test_serial2_n: { type: "serial2", input: 1234 },
  test_serial2_b: { type: "serial2", input: 1234n, output: 1234 },
  test_serial2_s: { type: "serial2", input: "1234", output: 1234 },

  test_serial4_n: { type: "serial4", input: 12345 },
  test_serial4_b: { type: "serial4", input: 12345n, output: 12345 },
  test_serial4_s: { type: "serial4", input: "12345", output: 12345 },

  // Note: Output is always bigint for unified mapping
  test_serial8_n: { type: "serial8", input: 1234, output: 1234n }, 
  test_serial8_b: { type: "serial8", input: 123456789012345678n, output: 123456789012345678n },
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
  test_timestamp: { type: "timestamp", input: "2024-06-15 00:00:00" },
  test_timestamp_str: { type: "timestamp", input: "2024-06-15T00:00:00", output: "2024-06-15 00:00:00" },
  test_timestamptz: { type: "timestamptz", input: new Date("2024-06-15T12:34:56Z") },
  test_date: { type: "date", input: "2024-06-15" },
  test_date_str: { type: "date", input: "2024-06-15" },
  
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

describe("npm:@electric-sql/pglite unified type mapping", () => {
  it("npm:@electric-sql/pglite insert and select all types round-trip correctly", async () => {
    const pglite = new PGlite({
      parsers: {
        // int8/serial8: return bigint instead of string
        20: (val: string) => BigInt(val),
        // timestamp: return string instead of Date
        1114: (val: string) => val,
        // date: return string instead of Date
        1082: (val: string) => val,
      },
    });
    await runMappingTest({
      table: TABLE,
      mapping: PGUNIFIED_TYPE_MAPPING,
      exec: async (sql) => {
        await pglite.exec(sql);
      },
      query: async (sql, params) => {
        const res = await pglite.query(sql, params);
        return { rows: res.rows as Record<string, any>[] };
      },
    });
  });
});

describe("npm:pg unified type mapping", () => {
  let client: pg.Client;

  beforeEach(async () => {
    // Retry connection until PostgreSQL is truly ready
    for (let i = 0; i < 30; i++) {
      try {
        client = await new pg.Client({
          host: "localhost",
          port: 5432,
          user: "postgres",
          password: "test",
          database: "test",
          types: {
            getTypeParser: (oid: number, format) => {
              // int8/serial8: return bigint instead of number | bigint
              if (oid === 20) return (val: string) => BigInt(val);
              // point: return string instead of {x, y}
              if (oid === 600) return (val: string) => val;
              // circle: return string instead of {x, y, radius}
              if (oid === 718) return (val: string) => val;
              // date: return string instead of Date
              if (oid === 1082) return (val: string) => val;
              // timestamp: return string instead of Date
              if (oid === 1114) return (val: string) => val;
              // interval: return string instead of {years, months, days}
              if (oid === 1186) return (val: string) => val;
              // bytea: wrap default parser to return Uint8Array
              if (oid === 17) {
                const byteaParser = pg.types.getTypeParser(oid, format);
                return (val: string) => new Uint8Array(byteaParser(val));
              }
              // numeric/decimal: return string
              if (oid === 1700) return (val: string) => val;
              // numeric[]: parse as string array
              if (oid === 1231)
                return (val: string) =>
                  (pg.types.arrayParser as any).create(val).parse();
              // point[]: parse as string array
              if (oid === 1017)
                return (val: string) =>
                  (pg.types.arrayParser as any).create(val).parse();
              // circle[]: parse as string array
              if (oid === 719)
                return (val: string) =>
                  (pg.types.arrayParser as any).create(val).parse();

              // For other types, use default parsers
              return pg.types.getTypeParser(oid, format);
            },
          },
        }).connect();
        return;
      } catch (er) {
        await new Promise((r) => setTimeout(r, 1000));
      }
    }
    throw new Error("Failed to connect to PostgreSQL after multiple attempts");
  });

  afterEach(async () => {
    try {
      await client?.end();
    } catch {
      // ignore
    }
  }, 30000);

  it("npm:pg insert and select all types round-trip correctly", async () => {
    await runMappingTest({
      table: TABLE,
      mapping: PGUNIFIED_TYPE_MAPPING,
      exec: async (sql) => {
        await client.query(sql);
      },
      query: async (sql, params) => {
        const res = await client.query(sql, params);
        return { rows: res.rows };
      },
    });
  });
});

describe("npm:postgres unified type mapping", () => {
  let sql: ReturnType<typeof postgres>;

  /**
   * Sloppy monkey patch for this https://github.com/porsager/postgres/issues/471
   */
  const monkeyPatchArrayInference = (
    sql: ReturnType<typeof postgres>,
  ): ReturnType<typeof postgres> => {
    const inferPostgresParamType = (value: unknown): number => {
      if (value instanceof Date) return 1184;
      if (value instanceof Uint8Array) return 17;
      if (value === true || value === false) return 16;
      if (typeof value === "bigint") return 20;
      if (Array.isArray(value)) return inferPostgresParamType(value[0]);
      return 0;
    };

    const typeArrayMap = (sql.options as any).shared?.typeArrayMap as
      | Record<number, number>
      | undefined;
    const patchParam = (param: unknown) => {
      if (!Array.isArray(param)) return param;

      const inferredType = inferPostgresParamType(param);
      const arrayOid = typeArrayMap?.[inferredType];
      return arrayOid ? sql.typed(param, arrayOid) : param;
    };

    const wrappedSql = ((strings: unknown, ...args: unknown[]) => {
      if (Array.isArray((strings as any)?.raw)) {
        return (sql as any)(strings as any, ...args.map(patchParam));
      }
      return (sql as any)(strings as any, ...args);
    }) as ReturnType<typeof postgres>;

    Object.assign(wrappedSql, sql);

    const originalUnsafe = sql.unsafe.bind(sql);

    wrappedSql.unsafe = ((statement, paramsOrOptions, queryOptions) => {
      if (Array.isArray(paramsOrOptions)) {
        const patchedParams = paramsOrOptions.map(patchParam);
        return originalUnsafe(statement, patchedParams as any, queryOptions);
      }

      return originalUnsafe(statement, paramsOrOptions as any, queryOptions);
    }) as typeof wrappedSql.unsafe;

    return wrappedSql;
  };

  beforeEach(async () => {
    // Retry connection until PostgreSQL is truly ready
    for (let i = 0; i < 30; i++) {
      try {
        sql = postgres({
          host: "localhost",
          port: 5432,
          user: "postgres",
          password: "test",
          database: "test",

          types: {
            bigint: {
              to: 20,
              from: [20],
              serialize: (x: bigint) => x.toString(),
              parse: (x: string) => BigInt(x),
            },
            date: {
              to: 1184,
              from: [1114, 1082],
              serialize: (x: Date | string) =>
                x instanceof Date ? x.toISOString() : x,
              parse: (x: string) => x,
            },
            bytea: {
              to: 17,
              from: [17],
              serialize: (x: Uint8Array) =>
                "\\x" + Buffer.from(x).toString("hex"),
              parse: (x: string) =>
                new Uint8Array(Buffer.from(x.slice(2), "hex")),
            },
          },
        });

        sql = monkeyPatchArrayInference(sql);

        await sql`SELECT 1`;
        return;
      } catch (er) {
        await new Promise((r) => setTimeout(r, 1000));
      }
    }
    throw new Error("Failed to connect to PostgreSQL after multiple attempts");
  }, 120000);

  afterEach(async () => {
    await sql?.end();
  }, 30000);

  it("npm:pg insert and select all types round-trip correctly", async () => {
    await runMappingTest({
      table: TABLE,
      mapping: PGUNIFIED_TYPE_MAPPING,
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
