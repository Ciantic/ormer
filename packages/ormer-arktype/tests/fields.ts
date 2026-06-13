import { type } from "arktype";
import { db } from "../src/arktype-ext.ts";

export const UserSchema = db.table("users", {
  id: db.primaryKey("int64"),
});

// prettier-ignore
export const ALL_ARKTYPE_FIELDS = {
  // String values
  c_str:              { arktype: type("string"),              example: "hello world" },
  c_str_max255:       { arktype: type("string <= 255"),       example: "hello again!" },

  // Number types
  c_num:              { arktype: type("number"),              example: 3.14 },
  c_num_int:          { arktype: type("number.integer"),      example: 42 },
  c_f32:              { arktype: db.type("float32"),                     example: 1.5 },
  c_f64:              { arktype: db.type("float64"),                     example: 2.718281828 },
  c_int:              { arktype: db.type("int32"),                       example: 100 },
  c_int_pk:           { arktype: db.primaryKey("int32"),         example: 1 },
  c_int32:            { arktype: db.type("int32"),                       example: 200 },
  c_uint32:           { arktype: db.type("uint32"),                      example: 300 },

  // Bigint
  c_bigint:           { arktype: type("bigint"),              example: 9007199254740991n },
  c_int64:            { arktype: db.type("int64"),                       example: 123456789n },
  c_int64_pk:         { arktype: db.primaryKey("int64"),         example: 1n },
  c_uint64:           { arktype: db.type("uint64"),                      example: 18446744073709551615n },

  // Boolean
  c_bool:             { arktype: type("boolean"),             example: true },

  // JSON
  c_json:            { arktype: type({ v: "string" }),       example: { v: "value" } },
  c_json2:           { arktype: type("unknown"),             example: [1, 2, 3] },

  // Date/time types
  c_date:             { arktype: type("Date"),                example: new Date("2024-01-15T10:30:00Z") },
  c_time:             { arktype: type("string"),                     example: "14:30:00" },
  c_date_only:        { arktype: type("string.date"),         example: "2024-01-15" },
  c_datetime:         { arktype: type("string.date.iso"),     example: "2024-01-15T10:00Z" },
  c_timestamp:        { arktype: type("string"),               example: "2024-01-15 10:30:00" },

  // GUID / UUID
  c_uuid:             { arktype: type("string.uuid"),         example: "550e8400-e29b-41d4-a716-446655440000" },
  c_guid:             { arktype: type("string.uuid"),         example: "550e8400-e29b-41d4-a716-446655440001" },

  // Various string formats
  c_url:              { arktype: type("string.url"),          example: "https://example.com" },
  c_email:            { arktype: type("string.email"),        example: "user@example.com" },
  c_emoji:            { arktype: type("string"),              example: "😊" },
  c_nanoid:           { arktype: type("string"),              example: "V1StGXR8_Z5jdHi6B-myT" },
  c_cuid2:            { arktype: type("string"),              example: "tz4a98xxat96iws9zmbrgj3a" },
  c_ulid:             { arktype: type("string"),              example: "01ARZ3NDEKTSV4RRFFQ69G5FAV" },
  c_xid:              { arktype: type("string"),              example: "9m4e2mr0ui3e8a215n4g" },
  c_ksuid:            { arktype: type("string"),              example: "0ujsswThIGTUYm2K8FjOOfXtY1K" },
  c_base64:           { arktype: type("string.base64"),       example: "SGVsbG8gV29ybGQ=" },
  c_base64url:        { arktype: type("string.base64.url"),   example: "SGVsbG8gV29ybGQ" },
  c_e164:             { arktype: type("string"),              example: "+14155552671" },
  c_jwt:              {
    arktype: type("string"),
    example: "eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiIxMjM0NTY3ODkwIn0.dozjgNryP4J3jVmNHl0w5N_XgL0n3I9PlFUP0THsR8U",
  },

  // Network types
  c_ipv4:             { arktype: type("string.ip.v4"),        example: "192.168.1.1" },
  c_ipv6:             { arktype: type("string.ip.v6"),        example: "::1" },
  c_mac:              { arktype: type("string"),              example: "00:1a:2b:3c:4d:5e" },
  c_cidrv4:           { arktype: type("string"),              example: "192.168.1.0/24" },
  c_cidrv6:           { arktype: type("string"),              example: "2001:db8::/32" },

  // Array types
  c_int_arr:          { arktype: type("number.integer[]"),    example: [1, 2, 3] },
  c_str_arr:          { arktype: type("string[]"),            example: ["a", "b", "c"] },
  c_int_arr2:         { arktype: type("number.integer[][]"),  example: [[1, 2], [3, 4]] },
  c_str_arr_nullable: { arktype: type("string[] | null"),     example: ["a", "b"] },

  // Container types
  c_str_nullable:     { arktype: type("string | null"),       example: null },
  c_str_nullish:      { arktype: type("string | null | undefined"), example: null },
  c_str_default:      { arktype: type("string"),              example: "hello" },
  c_str_prefault:     { arktype: type("string"),              example: "hello" },
  c_str_pk:           { arktype: db.primaryKey("string"), example: "pk_abc123" },
  c_int64_fk:         {
    arktype: db.foreignKeyRef(UserSchema, "id"),
    example: 1n,
  },
} as const;
