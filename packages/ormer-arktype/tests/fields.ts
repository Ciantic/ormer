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
  c_int8:             { arktype: db.type("int8"),               example: 1234567890123456789n },
  c_int16:            { arktype: db.type("int16"),              example: 12345 },
  c_int32:            { arktype: db.type("int32"),              example: 100 },
  c_uint32:           { arktype: db.type("uint32"),             example: 300 },
  c_int_pk:           { arktype: db.primaryKey("int32"),        example: 1 },

  // Bigint
  c_bigint:           { arktype: type("bigint"),                example: 9007199254740991n },
  c_int64:            { arktype: db.type("int64"),              example: 123456789n },
  c_uint64:           { arktype: db.type("uint64"),             example: 18446744073709551615n },
  c_int64_pk:         { arktype: db.primaryKey("int64"),        example: 1n },

  // Boolean
  c_bool:             { arktype: type("boolean"),               example: true },

  // JSON
  c_json:             { arktype: type({ v: "string" }),         example: { v: "value" } },
  c_json2:            { arktype: type("unknown"),               example: [1, 2, 3] },

  // Date/time types
  c_date:             { arktype: type("Date"),                  example: new Date("2024-01-15T10:30:00Z") },
  c_time:             { arktype: type("string"),                example: "14:30:00" },
  c_date_only:        { arktype: type("string.date"),           example: "2024-01-15" },
  c_datetime:         { arktype: type("string.date.iso"),       example: "2024-01-15T10:00Z" },
  c_timestamp:        { arktype: type("string"),                example: "2024-01-15 10:30:00" },

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
} as const;

const pkAutoInc = { primaryKey: true as true, autoIncrement: true as true };
