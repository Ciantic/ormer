// Align all example values:
// gawk -i inplace '/effect: .*example:/ { line=$0; sub(/,[[:space:]]*example:[[:space:]]*/, ",\t", line); n=split(line, a, "\t"); if (n==2) { printf "%-84sexample: %s\n", a[1], a[2]; next } } { print }' packages/ormer-effect/tests/fields.ts

import { Schema, Effect } from "effect";
import { pg, duckdb, sqlite, type ColumnType } from "ormer";
import {
  Int8,
  Int16,
  Int32,
  Uint8,
  Uint16,
  Uint32,
  Float32,
  Float64,
  Int64,
  Uint64,
  Int128,
  Uint128,
  NaiveDatetime,
  IsoTime,
  IsoTimeSecond,
  IsoDate,
  IsoDateTime,
  UuidString,
  UrlString,
  EmailString,
  Ipv4String,
  Ipv6String,
  MacString,
  PrimaryKey,
  AutoIncrement,
  ForeignKey,
  VarChar,
  WithDefault,
} from "../src/effect-ext.ts";

// ---------------------------------------------------------------------------
// Table definition for foreign key reference
// ---------------------------------------------------------------------------

export const UserSchema = Schema.Struct({
  id: Int64,
});

const pkAutoInc = { primaryKey: true as true, autoIncrement: true as true };

// prettier-ignore
export const ALL_EFFECT_FIELDS = {
  // String values
  c_str:              { effect: Schema.String,                                      example: "hello world" },
  c_str_max255:       { effect: VarChar(255),                                       example: "hello again!" },

  // Number types
  c_num:              { effect: Schema.Number,                                      example: 3.14 },
  c_num_int:          { effect: Schema.Number.check(Schema.isInt()),                example: 42 },
  c_f32:              { effect: Float32,                                            example: 1.5 },
  c_f64:              { effect: Float64,                                            example: 2.718281828 },
  c_int:              { effect: Int32,                                              example: 100 },
  c_int_pk:           { effect: Int32.pipe(PrimaryKey(), AutoIncrement()),          example: 1 },
  c_int32:            { effect: Int32,                                              example: 200 },
  c_int8:             { effect: Int8,                                               example: 50 },
  c_uint8:            { effect: Uint8,                                              example: 200 },
  c_int16:            { effect: Int16,                                              example: 15000 },
  c_uint16:           { effect: Uint16,                                             example: 50000 },
  c_uint32:           { effect: Uint32,                                             example: 300 },

  // Bigint
  c_bigint:           { effect: Schema.BigInt,                                      example: 9007199254740991n },
  c_int64:            { effect: Int64,                                              example: 123456789n },
  c_int64_pk:         { effect: Int64.pipe(PrimaryKey(), AutoIncrement()),          example: 1n },
  c_uint64:           { effect: Uint64,                                             example: 18446744073709551615n },
  c_int128:           { effect: Int128,                                             example: 170141183460469231731687303715884105727n },
  c_uint128:          { effect: Uint128,                                            example: 340282366920938463463374607431768211455n },

  // Boolean
  c_bool:             { effect: Schema.Boolean,                                     example: true },

  // JSON
  c_json:             { effect: Schema.Struct({ v: Schema.String }),                example: { v: "value" } },

  // Date/time types
  c_date:             { effect: Schema.Date,                                        example: new Date("2024-01-15T10:30:00Z") },
  c_time:             { effect: IsoTime,                                            example: "14:30:00" },
  c_timeseconds:      { effect: IsoTimeSecond,                                      example: "14:30:00" },
  c_date_only:        { effect: IsoDate,                                            example: "2024-01-15" },
  c_datetime:         { effect: IsoDateTime,                                        example: "2024-01-15T10:00Z" },
  c_timestamp:        { effect: NaiveDatetime,                                      example: "2024-01-15 10:30:00" },

  // UUID
  c_uuid:             { effect: UuidString,                                         example: "550e8400-e29b-41d4-a716-446655440000" },

  // Various string formats
  c_url:              { effect: UrlString,                                          example: "https://example.com" },
  c_email:            { effect: EmailString,                                        example: "user@example.com" },
  c_emoji:            { effect: Schema.String,                                      example: "😊" },
  c_nanoid:           { effect: VarChar(21),                                        example: "V1StGXR8_Z5jdHi6B-myT" },
  c_cuid2:            { effect: Schema.String,                                      example: "tz4a98xxat96iws9zmbrgj3a" },
  c_ulid:             { effect: VarChar(26),                                        example: "01ARZ3NDEKTSV4RRFFQ69G5FAV" },
  c_base64:           { effect: Schema.String,                                      example: "SGVsbG8gV29ybGQ=" },
  c_isbn:             { effect: Schema.String,                                      example: "978-3-16-148410-0" },

  // Network types
  c_ipv4:             { effect: Ipv4String,                                         example: "192.168.1.1" },
  c_ipv6:             { effect: Ipv6String,                                         example: "::1" },
  c_mac:              { effect: MacString,                                          example: "00:1a:2b:3c:4d:5e" },

  // Array types
  c_int_arr:          { effect: Schema.Array(Int32),                                example: [1, 2, 3] },
  c_str_arr:          { effect: Schema.Array(Schema.String),                        example: ["a", "b", "c"] },
  c_int_arr2:         { effect: Schema.Array(Schema.Array(Int32)),                  example: [[1, 2], [3, 4]] },
  c_str_arr_nullable: { effect: Schema.NullOr(Schema.Array(Schema.String)),         example: ["a", "b"] },

  // Other
  c_str_trimmed:      { effect: Schema.String,                                      example: "hello" },
  c_str_trim_nullish: { effect: Schema.NullOr(Schema.String),                       example: "hello" },

  // Container types
  c_str_nullable:     { effect: Schema.NullOr(Schema.String),                       example: null },
  c_str_nullish:      { effect: Schema.NullOr(Schema.String),                       example: null },
  c_str_default:      { effect: Schema.String.pipe(WithDefault("hello")),           example: "hello" },
  c_str_prefault:     { effect: Schema.String.pipe(WithDefault("hello")),           example: "hello" },
  c_str_pk:           { effect: Schema.String.pipe(PrimaryKey()),                   example: "pk_abc123" },
  c_int64_fk:         { effect: Int64.pipe(ForeignKey({ table: "users", column: "id" })),  example: 1n },
  c_pipe_with_nullish:{ effect: Schema.NullOr(UrlString),                           example: null },
} as const;

export const ALL_PG_FIELDS = {
  // String values
  c_str: pg.text(),
  c_str_max255: pg.varchar({ maxLength: 255 }),

  // Number types
  c_num: pg.float8(),
  c_num_int: pg.int4(),
  c_f32: pg.float4(),
  c_f64: pg.float8(),
  c_int: pg.int4(),
  c_int_pk: pg.int4(pkAutoInc),
  c_int32: pg.int4(),
  c_int8: "ERROR" as const,
  c_uint8: "ERROR" as const,
  c_int16: pg.int2(),
  c_uint16: "ERROR" as const,
  c_uint32: "ERROR" as const,

  // Bigint
  c_bigint: pg.int8(),
  c_int64: pg.int8(),
  c_int64_pk: pg.int8(pkAutoInc),
  c_uint64: "ERROR" as const,
  c_int128: "ERROR" as const,
  c_uint128: "ERROR" as const,

  // Boolean
  c_bool: pg.boolean(),

  // JSON
  c_json: pg.jsonb({ schema: Schema.Struct({ v: Schema.String }) }),

  // Date/time types
  c_date: pg.timestamptz(),
  c_time: "ERROR" as const,
  c_timeseconds: pg.time(),
  c_date_only: pg.date(),
  c_datetime: "ERROR" as const,
  c_timestamp: pg.timestamp(),

  // UUID
  c_uuid: pg.uuid(),

  // Various string formats
  c_url: pg.text(),
  c_email: pg.varchar({ maxLength: 320 }),
  c_emoji: pg.text(),
  c_nanoid: pg.varchar({ maxLength: 21 }),
  c_cuid2: pg.text(),
  c_ulid: pg.varchar({ maxLength: 26 }),
  c_base64: pg.text(),
  c_isbn: pg.text(),

  // Network types
  c_ipv4: pg.inet(),
  c_ipv6: pg.inet(),
  c_mac: pg.macaddr(),

  // Array types
  c_int_arr: pg.int4({ array: "[]" }),
  c_str_arr: pg.text({ array: "[]" }),
  c_int_arr2: pg.int4({ array: "[][]" }),
  c_str_arr_nullable: pg.text({ array: "[]", nullable: true }),

  // Other
  c_str_trimmed: pg.text(),
  c_str_trim_nullish: pg.text({ nullable: true }),

  // Container types
  c_str_nullable: pg.text({ nullable: true }),
  c_str_nullish: pg.text({ nullable: true }),
  c_str_default: pg.text({ default: "hello" }),
  c_str_prefault: pg.text({ default: "hello" }),
  c_str_pk: pg.text({ primaryKey: true }),
  c_int64_fk: pg.int8({ foreignKeyTable: "users", foreignKeyColumn: "id" }),
  c_pipe_with_nullish: pg.text({ nullable: true }),
} as const satisfies {
  [K in keyof typeof ALL_EFFECT_FIELDS]: ColumnType<string, any> | "ERROR";
};

export const ALL_DUCKDB_FIELDS = {
  // String values
  c_str: duckdb.text(),
  c_str_max255: duckdb.varchar({ maxLength: 255 }),

  // Number types
  c_num: duckdb.float8(),
  c_num_int: duckdb.int4(),
  c_f32: duckdb.float4(),
  c_f64: duckdb.float8(),
  c_int: duckdb.int4(),
  c_int_pk: duckdb.int4(pkAutoInc),
  c_int32: duckdb.int4(),
  c_int8: duckdb.int1(),
  c_uint8: duckdb.utinyint(),
  c_int16: duckdb.int2(),
  c_uint16: duckdb.usmallint(),
  c_uint32: duckdb.uinteger(),

  // Bigint
  c_bigint: duckdb.int8(),
  c_int64: duckdb.int8(),
  c_int64_pk: duckdb.int8(pkAutoInc),
  c_uint64: duckdb.ubigint(),
  c_int128: duckdb.hugeint(),
  c_uint128: duckdb.uhugeint(),

  // Boolean
  c_bool: duckdb.boolean(),

  // JSON — DuckDB uses json, not jsonb
  c_json: duckdb.json({ schema: Schema.Struct({ v: Schema.String }) }),

  // Date/time types
  c_date: duckdb.timestamptz(),
  c_time: "ERROR" as const,
  c_timeseconds: duckdb.time(),
  c_date_only: duckdb.date(),
  c_datetime: "ERROR" as const,
  c_timestamp: duckdb.timestamp(),

  // UUID
  c_uuid: duckdb.uuid(),

  // Various string formats
  c_url: duckdb.text(),
  c_email: duckdb.varchar({ maxLength: 320 }),
  c_emoji: duckdb.text(),
  c_nanoid: duckdb.varchar({ maxLength: 21 }),
  c_cuid2: duckdb.text(),
  c_ulid: duckdb.varchar({ maxLength: 26 }),
  c_base64: duckdb.text(),
  c_isbn: duckdb.text(),

  // Network types — DuckDB has no inet/macaddr → fall back to text
  c_ipv4: duckdb.text(),
  c_ipv6: duckdb.text(),
  c_mac: duckdb.text(),

  // Array types
  c_int_arr: duckdb.int4({ array: "[]" }),
  c_str_arr: duckdb.text({ array: "[]" }),
  c_int_arr2: duckdb.int4({ array: "[][]" }),
  c_str_arr_nullable: duckdb.text({ array: "[]", nullable: true }),

  // Other
  c_str_trimmed: duckdb.text(),
  c_str_trim_nullish: duckdb.text({ nullable: true }),

  // Container types
  c_str_nullable: duckdb.text({ nullable: true }),
  c_str_nullish: duckdb.text({ nullable: true }),
  c_str_default: duckdb.text({ default: "hello" }),
  c_str_prefault: duckdb.text({ default: "hello" }),
  c_str_pk: duckdb.text({ primaryKey: true }),
  c_int64_fk: duckdb.int8({ foreignKeyTable: "users", foreignKeyColumn: "id" }),
  c_pipe_with_nullish: duckdb.text({ nullable: true }),
} as const satisfies {
  [K in keyof typeof ALL_EFFECT_FIELDS]: ColumnType<string, any> | "ERROR";
};

export const ALL_SQLITE_FIELDS = {
  // String values
  c_str: sqlite.text(),
  c_str_max255: sqlite.text({
    check: (c: string) => `length(${c}) <= 255`,
  }),

  // Number types
  c_num: sqlite.real(),
  c_num_int: sqlite.integer(),
  c_f32: sqlite.real(),
  c_f64: sqlite.real(),
  c_int: sqlite.integer(),
  c_int_pk: sqlite.integer(pkAutoInc),
  c_int32: sqlite.integer(),
  c_int8: sqlite.integer(),
  c_uint8: sqlite.integer(),
  c_int16: sqlite.integer(),
  c_uint16: sqlite.integer(),
  c_uint32: sqlite.integer(),

  // Bigint — SQLite INTEGER is always number, can't round-trip bigint
  c_bigint: "ERROR" as const,
  c_int64: "ERROR" as const,
  c_int64_pk: "ERROR" as const,
  c_uint64: "ERROR" as const,
  c_int128: "ERROR" as const,
  c_uint128: "ERROR" as const,

  // Boolean — SQLite has no boolean, stores 0/1 in INTEGER, can't round-trip
  c_bool: "ERROR" as const,

  // JSON — SQLite stores as text, can't round-trip
  c_json: "ERROR" as const,

  // Date/time types — string-based work as TEXT, only Date can't round-trip
  c_date: "ERROR" as const,
  c_time: sqlite.text(),
  c_timeseconds: sqlite.text(),
  c_date_only: sqlite.text(),
  c_datetime: sqlite.text(),
  c_timestamp: sqlite.text(),

  // UUID
  c_uuid: sqlite.text(),

  // Various string formats
  c_url: sqlite.text(),
  c_email: sqlite.text({ check: (c: string) => `length(${c}) <= 320` }),
  c_emoji: sqlite.text(),
  c_nanoid: sqlite.text({
    check: (c: string) => `length(${c}) <= 21`,
  }),
  c_cuid2: sqlite.text(),
  c_ulid: sqlite.text({
    check: (c: string) => `length(${c}) <= 26`,
  }),
  c_base64: sqlite.text(),
  c_isbn: sqlite.text(),

  // Network types — SQLite has no inet/macaddr → fall back to text
  c_ipv4: sqlite.text(),
  c_ipv6: sqlite.text(),
  c_mac: sqlite.text(),

  // Array types — SQLite has no arrays, can't round-trip
  c_int_arr: "ERROR" as const,
  c_str_arr: "ERROR" as const,
  c_int_arr2: "ERROR" as const,
  c_str_arr_nullable: "ERROR" as const,

  // Other
  c_str_trimmed: sqlite.text(),
  c_str_trim_nullish: sqlite.text({ nullable: true }),

  // Container types
  c_str_nullable: sqlite.text({ nullable: true }),
  c_str_nullish: sqlite.text({ nullable: true }),
  c_str_default: sqlite.text({ default: "hello" }),
  c_str_prefault: sqlite.text({ default: "hello" }),
  c_str_pk: sqlite.text({ primaryKey: true }),
  c_int64_fk: "ERROR" as const,
  c_pipe_with_nullish: sqlite.text({ nullable: true }),
} as const satisfies {
  [K in keyof typeof ALL_EFFECT_FIELDS]: ColumnType<string, any> | "ERROR";
};
