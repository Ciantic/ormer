import { z } from "zod";
import { pg, type ColumnType } from "ormer";
import "../src/zod-ext.ts";

export const UserSchema = z.object({ id: z.int64().dbPk() }).dbTable("users");
const pkAutoInc = { primaryKey: true as true, autoIncrement: true as true };

// prettier-ignore
export const ALL_ZOD_FIELDS = {
  // String values
  c_str:              { zod: z.string(),           example: "hello world" },
  c_str_max255:       { zod: z.string().max(255),  example: "hello again!" },

  // Number types
  c_num:              { zod: z.number(),           example: 3.14 },
  c_num_int:          { zod: z.number().int(),     example: 42 },
  c_f32:              { zod: z.float32(),          example: 1.5 },
  c_f64:              { zod: z.float64(),          example: 2.718281828 },
  c_int:              { zod: z.int(),              example: 100 },
  c_int_pk:           { zod: z.int().dbPk(),       example: 1 },
  c_int32:            { zod: z.int32(),            example: 200 },
  c_uint32:           { zod: z.uint32(),           example: 300 },

  // Bigint 
  c_bigint:           { zod: z.bigint(),           example: 9007199254740991n },
  c_int64:            { zod: z.int64(),            example: 123456789n },
  c_int64_pk:         { zod: z.int64().dbPk(),     example: 1n },
  c_uint64:           { zod: z.uint64(),           example: 18446744073709551615n },

  // Boolean
  c_bool:             { zod: z.boolean(),          example: true },

  // JSON
  c_json:            { zod: z.object({ v: z.string() }),  example: { v: "value" } },
  c_json2:           { zod: z.json(),                     example: [1, 2, 3] },

  // Date/time types
  c_date:             { zod: z.date(),             example: new Date("2024-01-15T10:30:00Z") },
  c_time:             { zod: z.iso.time(),         example: "14:30:00" },
  c_date_only:        { zod: z.iso.date(),         example: "2024-01-15" },
  c_datetime:         { zod: z.iso.datetime(),     example: "2024-01-15T10:00Z" },
  c_timestamp:        { zod: z.string().naiveDatetime(),      example: "2024-01-15 10:30:00" },

  // GUID / UUID
  c_uuid:             { zod: z.uuid(),             example: "550e8400-e29b-41d4-a716-446655440000" },
  c_guid:             { zod: z.guid(),             example: "550e8400-e29b-41d4-a716-446655440001" },

  // Various string formats
  c_url:              { zod: z.url(),              example: "https://example.com" },
  c_email:            { zod: z.email(),            example: "user@example.com" },
  c_emoji:            { zod: z.emoji(),            example: "😊" },
  c_nanoid:           { zod: z.nanoid(),           example: "V1StGXR8_Z5jdHi6B-myT" },
  c_cuid2:            { zod: z.cuid2(),            example: "tz4a98xxat96iws9zmbrgj3a" },
  c_ulid:             { zod: z.ulid(),             example: "01ARZ3NDEKTSV4RRFFQ69G5FAV" },
  c_xid:              { zod: z.xid(),              example: "9m4e2mr0ui3e8a215n4g" },
  c_ksuid:            { zod: z.ksuid(),            example: "0ujsswThIGTUYm2K8FjOOfXtY1K" },
  c_base64:           { zod: z.base64(),           example: "SGVsbG8gV29ybGQ=" },
  c_base64url:        { zod: z.base64url(),        example: "SGVsbG8gV29ybGQ" },
  c_e164:             { zod: z.e164(),             example: "+14155552671" },
  c_jwt:              { 
    zod: z.jwt(),              
    example: "eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiIxMjM0NTY3ODkwIn0.dozjgNryP4J3jVmNHl0w5N_XgL0n3I9PlFUP0THsR8U" 
  },

  // Network types
  c_ipv4:             { zod: z.ipv4(),             example: "192.168.1.1" },
  c_ipv6:             { zod: z.ipv6(),             example: "::1" },
  c_mac:              { zod: z.mac(),              example: "00:1a:2b:3c:4d:5e" },
  c_cidrv4:           { zod: z.cidrv4(),           example: "192.168.1.0/24" },
  c_cidrv6:           { zod: z.cidrv6(),           example: "2001:db8::/32" },

  // Array types
  c_int_arr:          { zod: z.int().array(),                example: [1, 2, 3] },
  c_str_arr:          { zod: z.string().array(),             example: ["a", "b", "c"] },
  c_int_arr2:         { zod: z.int().array().array(),        example: [[1, 2], [3, 4]] },
  c_str_arr_nullable: { zod: z.string().array().nullable(),  example: ["a", "b"] },

  // Container types
  c_str_nullable:     { zod: z.string().nullable(),          example: null },
  c_str_nullish:      { zod: z.string().nullish(),           example: null },
  c_str_default:      { zod: z.string().default("hello"),    example: "hello" },
  c_str_prefault:     { zod: z.string().prefault("hello"),   example: "hello" },
  c_str_pk:           { zod: z.string().dbPk(),              example: "pk_abc123" },
  c_int64_fk:         { 
    zod: z.int64().dbFk(UserSchema, "id"),                          
    example: 1n,
  },
} as const

export const ALL_PG_FIELDS = {
  // String values
  c_str: pg.text(),
  c_str_max255: pg.varchar({ maxLength: 255 }),

  // Number types
  c_num: pg.float8(),
  c_num_int: pg.float8(),
  c_f32: pg.float4(),
  c_f64: pg.float8(),
  c_int: pg.int4(),
  c_int_pk: pg.int4(pkAutoInc),
  c_int32: pg.int4(),
  c_uint32: "ERROR" as const,

  // Bigint
  c_bigint: pg.int8(),
  c_int64: pg.int8(),
  c_int64_pk: pg.int8(pkAutoInc),
  c_uint64: "ERROR" as const,

  // Boolean
  c_bool: pg.boolean(),

  // JSON
  c_json: pg.jsonb({ schema: z.object({ v: z.string() }) }),
  c_json2: pg.jsonb({ schema: z.json() }),

  // Date/time types
  c_date: pg.timestamptz(),
  c_time: pg.time(),
  c_date_only: pg.date(),
  c_datetime: "ERROR" as const,
  c_timestamp: pg.timestamp(),

  // GUID / UUID
  c_uuid: pg.uuid(),
  c_guid: pg.uuid(),

  // Various string formats
  c_url: pg.text(),
  c_email: pg.text(),
  c_emoji: pg.text(),
  c_nanoid: pg.varchar({ maxLength: 21 }),
  c_cuid2: pg.text(),
  c_ulid: pg.varchar({ maxLength: 26 }),
  c_xid: pg.varchar({ maxLength: 20 }),
  c_ksuid: pg.varchar({ maxLength: 27 }),
  c_base64: pg.text(),
  c_base64url: pg.text(),
  c_e164: pg.text(),
  c_jwt: pg.text(),

  // Network types
  c_ipv4: pg.inet(),
  c_ipv6: pg.inet(),
  c_mac: pg.macaddr(),
  c_cidrv4: pg.cidr(),
  c_cidrv6: pg.cidr(),

  // Array types
  c_int_arr: pg.int4({ array: "[]" }),
  c_str_arr: pg.text({ array: "[]" }),
  c_int_arr2: pg.int4({ array: "[][]" }),
  c_str_arr_nullable: pg.text({ array: "[]", nullable: true }),

  // Container types
  c_str_nullable: pg.text({ nullable: true }),
  c_str_nullish: pg.text({ nullable: true }),
  c_str_default: pg.text({ default: "hello" }),
  c_str_prefault: pg.text({ default: "hello" }),
  c_str_pk: pg.text({ primaryKey: true }),
  c_int64_fk: pg.int8({ foreignKeyTable: "users", foreignKeyColumn: "id" }),
} as const satisfies {
  [K in keyof typeof ALL_ZOD_FIELDS]: ColumnType<string, any> | "ERROR";
};

/*
Other types for future consideration:

- z.enum([...])                          → pg.text()   (or check constraint)
- z.nativeEnum({...})                    → pg.text()
- z.symbol()                             → pg.text()   (stored as string)
- z.nan()                                → pg.float4()
- z.object() / z.record() / z.array()    → pg.jsonb()
- z.undefined / z.null / z.void          → → (unlikely column types)
 */
