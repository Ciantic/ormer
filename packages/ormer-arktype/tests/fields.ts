// Align all example values:
// gawk -i inplace '/arktype: .*example:/ { line=$0; sub(/,[[:space:]]*example:[[:space:]]*/, ",\t", line); n=split(line, a, "\t"); if (n==2) { printf "%-64sexample: %s\n", a[1], a[2]; next } } { print }' packages/ormer-arktype/tests/fields.ts

import { type } from "arktype";
import { pg, duckdb, sqlite, type ColumnType } from "ormer";
import { db } from "../src/arktype-ext.ts";

export const UserSchema = db.table("users", {
  id: db.primaryKey("int64"),
});

// prettier-ignore
export const ALL_ARKTYPE_FIELDS = {
  // String values
  c_str:              { arktype: type("string"),                example: "hello world" },
  c_str_max255:       { arktype: type("string <= 255"),         example: "hello again!" },
  c_varchar255:       { arktype: db.varchar(255),               example: "hello varchar!" },

  // Number types
  c_num:              { arktype: type("number"),                example: 3.14 },
  c_num_int:          { arktype: type("number.integer"),        example: 42 },
  c_f32:              { arktype: db.type("float32"),            example: 1.5 },
  c_f64:              { arktype: db.type("float64"),            example: 2.718281828 },
  c_int8:             { arktype: db.type("int8"),               example: 1234567 },
  c_uint8:            { arktype: db.type("uint8"),              example: 255 },
  c_uint16:           { arktype: db.type("uint16"),             example: 65535 },
  c_int16:            { arktype: db.type("int16"),              example: 12345 },
  c_int32:            { arktype: db.type("int32"),              example: 100 },
  c_uint32:           { arktype: db.type("uint32"),             example: 300 },
  c_int_pk:           { arktype: db.primaryKey("int32"),        example: 1 },

  // Bigint
  c_bigint:           { arktype: type("bigint"),                example: 9007199254740991n },
  c_int64:            { arktype: db.type("int64"),              example: 123456789n },
  c_uint64:           { arktype: db.type("uint64"),             example: 18446744073709551615n },
  c_uint128:          { arktype: db.type("uint128"),            example: 340282366920938463463374607431768211455n },
  c_int64_pk:         { arktype: db.primaryKey("int64"),        example: 1n },

  // Boolean
  c_bool:             { arktype: type("boolean"),               example: true },

  // JSON
  c_json:             { arktype: type({ v: "string" }),         example: { v: "value" } },

  // Date/time types
  c_date:             { arktype: type("Date"),                  example: new Date("2024-01-15T10:30:00Z") },
  c_time:             { arktype: db.type("timepart"),           example: "14:30:00" },
  c_date_only:        { arktype: db.type("datepart"),           example: "2024-01-15" },
  c_datetime:         { arktype: type("string.date.iso"),       example: "2024-01-15T10:00Z" },
  c_timestamp:        { arktype: db.type("naivedatetime"),      example: "2024-01-15 10:30:00" },

  // GUID / UUID
  c_str_uuid:         { arktype: type("string.uuid"),           example: "550e8400-e29b-41d4-a716-446655440000" },
  c_db_uuid:          { arktype: db.type("uuid"),               example: "550e8400-e29b-41d4-a716-446655440000" },

  // Various string formats
  c_url:              { arktype: type("string.url"),            example: "https://example.com" },
  c_email:            { arktype: type("string.email"),          example: "user@example.com" },

  // Network types
  c_ipv4:             { arktype: type("string.ip.v4"),          example: "192.168.1.1" },
  c_ipv6:             { arktype: type("string.ip.v6"),          example: "::1" },

  // Array types
  c_int_arr:          { arktype: db.type("int32[]"),            example: [1, 2, 3] },
  c_bigint_arr:       { arktype: db.type("int64[][]"),          example: [[1n, 2n], [3n, 4n]] },
  c_str_arr:          { arktype: type("string[]"),              example: ["a", "b", "c"] },
  c_str_arr_nullable: { arktype: type("string[] | null"),       example: ["a", "b"] },

  // Container types
  c_str_nullable:     { arktype: type("string | null"),         example: null },
  c_str_nullish:      {
    arktype: type("string | null | undefined"),
    example: null,
  },
  c_str_default:      { arktype: type("string").default(""),    example: "hello" },
  c_int64_default:    { arktype: db.type("int64").default(0n),  example: 123456789n },
  c_str_pk:           { arktype: db.primaryKey("string"),       example: "pk_abc123" },
  c_int64_fk:         {
    arktype: db.foreignKeyRef(UserSchema, "id"),
    example: 1n,
  },
  c_int64_fk_plain:   {
    arktype: db.foreignKey("int64", "users", "id"),
    example: 1n,
  },
} as const;

const pkAutoInc = { primaryKey: true as true, autoIncrement: true as true };

export const ALL_PG_FIELDS = {
  // String values
  c_str: pg.text(),
  c_str_max255: pg.text(),
  c_varchar255: pg.varchar({ maxLength: 255 }),

  // Number types
  c_num: pg.float8(),
  c_num_int: pg.float8(),
  c_f32: pg.float4(),
  c_f64: pg.float8(),
  c_int8: "ERROR" as const,
  c_uint8: "ERROR" as const,
  c_uint16: "ERROR" as const,
  c_int16: pg.int2(),
  c_int32: pg.int4(),
  c_uint32: "ERROR" as const,
  c_int_pk: pg.int4(pkAutoInc),

  // Bigint
  c_bigint: pg.int8(),
  c_int64: pg.int8(),
  c_uint64: "ERROR" as const,
  c_uint128: "ERROR" as const,
  c_int64_pk: pg.int8(pkAutoInc),

  // Boolean
  c_bool: pg.boolean(),

  // JSON
  c_json: pg.jsonb({ schema: type({ v: "string" }) }),

  // Date/time types
  c_date: pg.timestamptz(),
  c_time: pg.time(),
  c_date_only: pg.date(),
  c_datetime: pg.text(),
  c_timestamp: pg.timestamp(),

  // GUID / UUID
  c_str_uuid: pg.text(),
  c_db_uuid: pg.uuid(),

  // Various string formats
  c_url: pg.text(),
  c_email: pg.text(),

  // Network types
  c_ipv4: pg.text(),
  c_ipv6: pg.text(),

  // Array types
  c_int_arr: pg.int4({ array: "[]" }),
  c_bigint_arr: pg.int8({ array: "[][]" }),
  c_str_arr: pg.text({ array: "[]" }),
  c_str_arr_nullable: pg.text({ array: "[]", nullable: true }),

  // Container types
  c_str_nullable: pg.text({ nullable: true }),
  c_str_nullish: pg.text({ nullable: true }),
  c_str_default: pg.text({ default: "" }),
  c_int64_default: pg.int8({ default: 0n }),
  c_str_pk: pg.text({ primaryKey: true }),
  c_int64_fk: pg.int8({ foreignKeyTable: "users", foreignKeyColumn: "id" }),
  c_int64_fk_plain: pg.int8({
    foreignKeyTable: "users",
    foreignKeyColumn: "id",
  }),
} as const satisfies {
  [K in keyof typeof ALL_ARKTYPE_FIELDS]: ColumnType<string, any> | "ERROR";
};

export const ALL_DUCKDB_FIELDS = {
  // String values
  c_str: duckdb.text(),
  c_str_max255: duckdb.text(),
  c_varchar255: duckdb.varchar({ maxLength: 255 }),

  // Number types
  c_num: duckdb.float8(),
  c_num_int: duckdb.float8(),
  c_f32: duckdb.float4(),
  c_f64: duckdb.float8(),
  c_int8: duckdb.int1(),
  c_uint8: duckdb.utinyint(),
  c_uint16: duckdb.usmallint(),
  c_int16: duckdb.int2(),
  c_int32: duckdb.int4(),
  c_uint32: duckdb.uinteger(),
  c_int_pk: duckdb.int4(pkAutoInc),

  // Bigint
  c_bigint: duckdb.int8(),
  c_int64: duckdb.int8(),
  c_uint64: duckdb.ubigint(),
  c_uint128: duckdb.uhugeint(),
  c_int64_pk: duckdb.int8(pkAutoInc),

  // Boolean
  c_bool: duckdb.boolean(),

  // JSON — DuckDB uses json, not jsonb
  c_json: duckdb.json({ schema: type({ v: "string" }) }),

  // Date/time types
  c_date: duckdb.timestamptz(),
  c_time: duckdb.time(),
  c_date_only: duckdb.date(),
  c_datetime: duckdb.text(),
  c_timestamp: duckdb.timestamp(),

  // GUID / UUID
  c_str_uuid: duckdb.text(),
  c_db_uuid: duckdb.uuid(),

  // Various string formats
  c_url: duckdb.text(),
  c_email: duckdb.text(),

  // Network types
  c_ipv4: duckdb.text(),
  c_ipv6: duckdb.text(),

  // Array types
  c_int_arr: duckdb.int4({ array: "[]" }),
  c_bigint_arr: duckdb.int8({ array: "[][]" }),
  c_str_arr: duckdb.text({ array: "[]" }),
  c_str_arr_nullable: duckdb.text({ array: "[]", nullable: true }),

  // Container types
  c_str_nullable: duckdb.text({ nullable: true }),
  c_str_nullish: duckdb.text({ nullable: true }),
  c_str_default: duckdb.text({ default: "" }),
  c_int64_default: duckdb.int8({ default: 0n }),
  c_str_pk: duckdb.text({ primaryKey: true }),
  c_int64_fk: duckdb.int8({ foreignKeyTable: "users", foreignKeyColumn: "id" }),
  c_int64_fk_plain: duckdb.int8({
    foreignKeyTable: "users",
    foreignKeyColumn: "id",
  }),
} as const satisfies {
  [K in keyof typeof ALL_ARKTYPE_FIELDS]: ColumnType<string, any> | "ERROR";
};
