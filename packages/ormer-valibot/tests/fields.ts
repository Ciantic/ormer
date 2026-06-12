import * as v from "valibot";
import * as d from "../src/valibot-ext.ts";
import { pg, type ColumnType } from "ormer";

export const UserSchema = v.pipe(
  v.object({ id: v.pipe(v.bigint(), d.int64(), d.dbPrimaryKey()) }),
  d.dbTable("users"),
);
const pkAutoInc = { primaryKey: true as true, autoIncrement: true as true };

// prettier-ignore
export const ALL_VALIBOT_FIELDS = {
  // String values
  c_str:              { valibot: v.string(),                            example: "hello world" },
  c_str_max255:       { valibot: v.pipe(v.string(), v.maxLength(255)),  example: "hello again!" },

  // Number types
  c_num:              { valibot: v.number(),                                        example: 3.14 },
  c_num_int:          { valibot: v.pipe(v.number(), v.integer()),                   example: 42 },
  c_f32:              { valibot: v.pipe(v.number(), d.float32()),                   example: 1.5 },
  c_f64:              { valibot: v.pipe(v.number(), d.float64()),                   example: 2.718281828 },
  c_int:              { valibot: v.pipe(v.number(), d.int32()),                     example: 100 },
  c_int_pk:           { valibot: v.pipe(v.number(), d.int32(), d.dbPrimaryKey()),   example: 1 },
  c_int32:            { valibot: v.pipe(v.number(), d.int32()),                     example: 200 },
  c_uint32:           { valibot: v.pipe(v.number(), d.uint32()),                    example: 300 },

  // Bigint
  c_bigint:           { valibot: v.bigint(),                                        example: 9007199254740991n },
  c_int64:            { valibot: v.pipe(v.bigint(), d.int64()),                     example: 123456789n },
  c_int64_pk:         { valibot: v.pipe(v.bigint(), d.int64(), d.dbPrimaryKey()),   example: 1n },
  c_uint64:           { valibot: v.pipe(v.bigint(), d.uint64()),                    example: 18446744073709551615n },

  // Boolean
  c_bool:             { valibot: v.boolean(),                             example: true },

  // JSON
  c_json:            { valibot: v.object({ v: v.string() }),              example: { v: "value" } },

  // Date/time types
  c_date:             { valibot: v.date(),                                example: new Date("2024-01-15T10:30:00Z") },
  c_time:             { valibot: v.pipe(v.string(), v.isoTime()),         example: "14:30" },
  c_timeseconds:      { valibot: v.pipe(v.string(), v.isoTimeSecond()),   example: "14:30:00" },
  c_date_only:        { valibot: v.pipe(v.string(), v.isoDate()),         example: "2024-01-15" },
  c_datetime:         { valibot: v.pipe(v.string(), v.isoDateTime()),     example: "2024-01-15 10:00" }, 
  c_timestamp:        { valibot: v.pipe(v.string(), d.naiveDatetime()),   example: "2024-01-15 10:30:00" },

  // UUID
  c_uuid:             { valibot: v.pipe(v.string(), v.uuid()),            example: "550e8400-e29b-41d4-a716-446655440000" },

  // Various string formats
  c_url:              { valibot: v.pipe(v.string(), v.url()),             example: "https://example.com" },
  c_email:            { valibot: v.pipe(v.string(), v.email()),           example: "user@example.com" },
  c_emoji:            { valibot: v.pipe(v.string(), v.emoji()),           example: "😊" },
  c_nanoid:           { valibot: v.pipe(v.string(), v.nanoid()),          example: "V1StGXR8_Z5jdHi6B-myT" },
  c_cuid2:            { valibot: v.pipe(v.string(), v.cuid2()),           example: "tz4a98xxat96iws9zmbrgj3a" },
  c_ulid:             { valibot: v.pipe(v.string(), v.ulid()),            example: "01ARZ3NDEKTSV4RRFFQ69G5FAV" },
  c_base64:           { valibot: v.pipe(v.string(), v.base64()),          example: "SGVsbG8gV29ybGQ=" },
  c_isbn:             { valibot: v.pipe(v.string(), v.isbn()),            example: "978-3-16-148410-0" },

  // Network types
  c_ipv4:             { valibot: v.pipe(v.string(), v.ipv4()),            example: "192.168.1.1" },
  c_ipv6:             { valibot: v.pipe(v.string(), v.ipv6()),            example: "::1" },
  c_mac:              { valibot: v.pipe(v.string(), v.mac()),             example: "00:1a:2b:3c:4d:5e" },

  // Array types
  c_int_arr:          { valibot: v.array(v.pipe(v.number(), d.int32())),                 example: [1, 2, 3] },
  c_str_arr:          { valibot: v.array(v.string()),                                    example: ["a", "b", "c"] },
  c_int_arr2:         { valibot: v.array(v.array(v.pipe(v.number(), d.int32()))),        example: [[1, 2], [3, 4]] },
  c_str_arr_nullable: { valibot: v.nullable(v.array(v.string())),                        example: ["a", "b"] },

  // Other
  c_str_trimmed:       { valibot: v.pipe(v.string(), v.trim()),               example: "hello" },
  c_str_trim_nullish:  { valibot: v.nullish(v.pipe(v.string(), v.trim())),    example: "hello" },

  // Container types
  c_str_nullable:     { valibot: v.nullable(v.string()),                      example: null },
  c_str_nullish:      { valibot: v.nullish(v.string()),                       example: null },
  c_str_default:      { valibot: v.optional(v.string(), "hello"),             example: "hello" },
  c_str_prefault:     { valibot: v.fallback(v.string(), "hello"),             example: "hello" },
  c_str_pk:           { valibot: v.pipe(v.string(), d.dbPrimaryKey()),        example: "pk_abc123" },
  c_int64_fk:         { 
    valibot: v.pipe(v.bigint(), d.int64(), d.dbForeignKey("users", "id")),
    example: 1n,
  },
  c_pipe_with_nullish: { valibot: v.nullish(v.pipe(v.string(), v.url())),     example: null },
} as const;

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
  c_json: pg.jsonb({ schema: v.object({ v: v.string() }) }),

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
  [K in keyof typeof ALL_VALIBOT_FIELDS]: ColumnType<string, any> | "ERROR";
};
