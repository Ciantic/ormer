import { z } from "zod";
import { pg } from "ormer";
import "../src/zod-ext.ts";

export const UserSchema = z.object({ id: z.int64().dbPk() }).dbTable("users");

// prettier-ignore
export const ALL_ZOD_FIELDS = {
  // String values
  c_str:              { zod: z.string(),           pg: pg.text() },
  c_str_max255:       { zod: z.string().max(255),  pg: pg.varchar({ maxLength: 255 }) },

  // Number types
  c_num:              { zod: z.number(),           pg: pg.float8() },
  c_num_int:          { zod: z.number().int(),     pg: pg.float8() },
  c_f32:              { zod: z.float32(),          pg: pg.float4() },
  c_f64:              { zod: z.float64(),          pg: pg.float8() },
  c_int:              { zod: z.int(),              pg: pg.int4() },
  c_int_pk:           { zod: z.int().dbPk(),       pg: pg.int4({ primaryKey: true, autoIncrement: true }) },
  c_int32:            { zod: z.int32(),            pg: pg.int4() },
  c_uint32_error:     { zod: z.uint32(),           pg: "ERROR" },

  // Bigint 
  c_bigint:           { zod: z.bigint(),           pg: pg.int8() },
  c_int64:            { zod: z.int64(),            pg: pg.int8() },
  c_int64_pk:         { zod: z.int64().dbPk(),     pg: pg.int8({ primaryKey: true, autoIncrement: true }) },
  c_uint64_error:     { zod: z.uint64(),           pg: "ERROR" },

  // Boolean
  c_bool:             { zod: z.boolean(),          pg: pg.boolean() },

  // Date/time types
  c_date:             { zod: z.date(),             pg: pg.timestamptz() },
  c_time:             { zod: z.iso.time(),         pg: pg.time() },
  c_timestamp:        { zod: z.iso.datetime(),     pg: pg.timestamp() },
  c_date_only:        { zod: z.iso.date(),         pg: pg.date() },

  // GUID / UUID
  c_uuid:             { zod: z.uuid(),             pg: pg.uuid() },
  c_guid:             { zod: z.guid(),             pg: pg.uuid() },

  // Various string formats
  c_url:              { zod: z.url(),              pg: pg.text() },
  c_email:            { zod: z.email(),            pg: pg.text() },
  c_emoji:            { zod: z.emoji(),            pg: pg.text() },
  c_nanoid:           { zod: z.nanoid(),           pg: pg.varchar({ maxLength: 21 }) },
  c_cuid2:            { zod: z.cuid2(),            pg: pg.text() },
  c_ulid:             { zod: z.ulid(),             pg: pg.varchar({ maxLength: 26 }) },
  c_xid:              { zod: z.xid(),              pg: pg.varchar({ maxLength: 20 }) },
  c_ksuid:            { zod: z.ksuid(),            pg: pg.varchar({ maxLength: 27 }) },
  c_base64:           { zod: z.base64(),           pg: pg.text() },
  c_base64url:        { zod: z.base64url(),        pg: pg.text() },
  c_e164:             { zod: z.e164(),             pg: pg.text() },
  c_jwt:              { zod: z.jwt(),              pg: pg.text() },

  // Network types
  c_ipv4:             { zod: z.ipv4(),             pg: pg.inet() },
  c_ipv6:             { zod: z.ipv6(),             pg: pg.inet() },
  c_mac:              { zod: z.mac(),              pg: pg.macaddr() },
  c_cidrv4:           { zod: z.cidrv4(),           pg: pg.cidr() },
  c_cidrv6:           { zod: z.cidrv6(),           pg: pg.cidr() },

  // Array types
  c_int_arr:          { zod: z.int().array(),                pg: pg.int4({ array: "[]" }) },
  c_str_arr:          { zod: z.string().array(),             pg: pg.text({ array: "[]" }) },
  c_int_arr2:         { zod: z.int().array().array(),        pg: pg.int4({ array: "[][]" }) },
  c_str_arr_nullable: { zod: z.string().array().nullable(),  pg: pg.text({ array: "[]", nullable: true }) },

  // Container types
  c_str_nullable:     { zod: z.string().nullable(),          pg: pg.text({ nullable: true }) },
  c_str_nullish:      { zod: z.string().nullish(),           pg: pg.text({ nullable: true }) },
  c_str_default:      { zod: z.string().default("hello"),    pg: pg.text({ default: "hello" }) },
  c_str_prefault:     { zod: z.string().prefault("hello"),   pg: pg.text({ default: "hello" }) },
  c_str_pk:           { zod: z.string().dbPk(),              pg: pg.text({ primaryKey: true }) },
  c_int64_fk:         { 
    zod: z.int64().dbFk(UserSchema, "id"),                          
    pg: pg.int8({ foreignKeyTable: "users", foreignKeyColumn: "id" }) 
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
