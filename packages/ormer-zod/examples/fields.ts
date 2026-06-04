import { z } from "zod";
import { pg } from "ormer";
import "../src/zod-ext.ts";

export const UserSchema = z.object({ id: z.int64().dbPk() }).dbTable("users");
const pkAutoInc = { primaryKey: true as true, autoIncrement: true as true };

// prettier-ignore
export const ALL_ZOD_FIELDS = {
  // String values
  c_str:              { zod: z.string(),           pg: pg.text(),                      example: "hello world" },
  c_str_max255:       { zod: z.string().max(255),  pg: pg.varchar({ maxLength: 255 }), example: "hello again!" },

  // Number types
  c_num:              { zod: z.number(),           pg: pg.float8(),              example: 3.14 },
  c_num_int:          { zod: z.number().int(),     pg: pg.float8(),              example: 42 },
  c_f32:              { zod: z.float32(),          pg: pg.float4(),              example: 1.5 },
  c_f64:              { zod: z.float64(),          pg: pg.float8(),              example: 2.718281828 },
  c_int:              { zod: z.int(),              pg: pg.int4(),                example: 100 },
  c_int_pk:           { zod: z.int().dbPk(),       pg: pg.int4(pkAutoInc),       example: 1 },
  c_int32:            { zod: z.int32(),            pg: pg.int4(),                example: 200 },
  c_uint32_error:     { zod: z.uint32(),           pg: "ERROR",                  example: 300 },

  // Bigint 
  c_bigint:           { zod: z.bigint(),           pg: pg.int8(),                example: 9007199254740991n },
  c_int64:            { zod: z.int64(),            pg: pg.int8(),                example: 123456789n },
  c_int64_pk:         { zod: z.int64().dbPk(),     pg: pg.int8(pkAutoInc),       example: 1n },
  c_uint64_error:     { zod: z.uint64(),           pg: "ERROR",                  example: 18446744073709551615n },

  // Boolean
  c_bool:             { zod: z.boolean(),          pg: pg.boolean(),             example: true },

  // Date/time types
  c_date:             { zod: z.date(),             pg: pg.timestamptz(),         example: new Date("2024-01-15T10:30:00Z") },
  c_time:             { zod: z.iso.time(),         pg: pg.time(),                example: "14:30:00" },
  c_date_only:        { zod: z.iso.date(),         pg: pg.date(),                example: "2024-01-15" },
  c_timestamp:        { zod: z.string().naiveDatetime(),      pg: pg.timestamp(),           example: "2024-01-15 10:30:00" },

  // GUID / UUID
  c_uuid:             { zod: z.uuid(),             pg: pg.uuid(),                example: "550e8400-e29b-41d4-a716-446655440000" },
  c_guid:             { zod: z.guid(),             pg: pg.uuid(),                example: "550e8400-e29b-41d4-a716-446655440001" },

  // Various string formats
  c_url:              { zod: z.url(),              pg: pg.text(),                example: "https://example.com" },
  c_email:            { zod: z.email(),            pg: pg.text(),                example: "user@example.com" },
  c_emoji:            { zod: z.emoji(),            pg: pg.text(),                example: "😊" },
  c_nanoid:           { zod: z.nanoid(),           pg: pg.varchar({ maxLength: 21 }), example: "V1StGXR8_Z5jdHi6B-myT" },
  c_cuid2:            { zod: z.cuid2(),            pg: pg.text(),                     example: "tz4a98xxat96iws9zmbrgj3a" },
  c_ulid:             { zod: z.ulid(),             pg: pg.varchar({ maxLength: 26 }), example: "01ARZ3NDEKTSV4RRFFQ69G5FAV" },
  c_xid:              { zod: z.xid(),              pg: pg.varchar({ maxLength: 20 }), example: "9m4e2mr0ui3e8a215n4g" },
  c_ksuid:            { zod: z.ksuid(),            pg: pg.varchar({ maxLength: 27 }), example: "0ujsswThIGTUYm2K8FjOOfXtY1K" },
  c_base64:           { zod: z.base64(),           pg: pg.text(),                     example: "SGVsbG8gV29ybGQ=" },
  c_base64url:        { zod: z.base64url(),        pg: pg.text(),                     example: "SGVsbG8gV29ybGQ" },
  c_e164:             { zod: z.e164(),             pg: pg.text(),                     example: "+14155552671" },
  c_jwt:              { zod: z.jwt(),              pg: pg.text(),                     example: "eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiIxMjM0NTY3ODkwIn0.dozjgNryP4J3jVmNHl0w5N_XgL0n3I9PlFUP0THsR8U" },

  // Network types
  c_ipv4:             { zod: z.ipv4(),             pg: pg.inet(),                  example: "192.168.1.1" },
  c_ipv6:             { zod: z.ipv6(),             pg: pg.inet(),                  example: "::1" },
  c_mac:              { zod: z.mac(),              pg: pg.macaddr(),               example: "00:1a:2b:3c:4d:5e" },
  c_cidrv4:           { zod: z.cidrv4(),           pg: pg.cidr(),                  example: "192.168.1.0/24" },
  c_cidrv6:           { zod: z.cidrv6(),           pg: pg.cidr(),                  example: "2001:db8::/32" },

  // Array types
  c_int_arr:          { zod: z.int().array(),                pg: pg.int4({ array: "[]" }),                 example: [1, 2, 3] },
  c_str_arr:          { zod: z.string().array(),             pg: pg.text({ array: "[]" }),                 example: ["a", "b", "c"] },
  c_int_arr2:         { zod: z.int().array().array(),        pg: pg.int4({ array: "[][]" }),               example: [[1, 2], [3, 4]] },
  c_str_arr_nullable: { zod: z.string().array().nullable(),  pg: pg.text({ array: "[]", nullable: true }), example: ["a", "b"] },

  // Container types
  c_str_nullable:     { zod: z.string().nullable(),          pg: pg.text({ nullable: true }),             example: null },
  c_str_nullish:      { zod: z.string().nullish(),           pg: pg.text({ nullable: true }),             example: null },
  c_str_default:      { zod: z.string().default("hello"),    pg: pg.text({ default: "hello" }),           example: "hello" },
  c_str_prefault:     { zod: z.string().prefault("hello"),   pg: pg.text({ default: "hello" }),           example: "hello" },
  c_str_pk:           { zod: z.string().dbPk(),              pg: pg.text({ primaryKey: true }),           example: "pk_abc123" },
  c_int64_fk:         { 
    zod: z.int64().dbFk(UserSchema, "id"),                          
    pg: pg.int8({ foreignKeyTable: "users", foreignKeyColumn: "id" }),
    example: 1n,
  },
} as const

/*
Other types for future consideration:

- z.enum([...])                          → pg.text()   (or check constraint)
- z.nativeEnum({...})                    → pg.text()
- z.symbol()                             → pg.text()   (stored as string)
- z.nan()                                → pg.float4()
- z.object() / z.record() / z.array()    → pg.jsonb()
- z.undefined / z.null / z.void          → → (unlikely column types)
 */
