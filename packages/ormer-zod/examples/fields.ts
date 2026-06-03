import { z } from "zod";
import { pg } from "ormer";
import type { DerivePgColumn } from "../src/zod-derive.ts";

// prettier-ignore
export const ALL_ZOD_FIELDS = [
  () => [z.string(), pg.text()] as const,
  () => [z.string().max(255), pg.varchar({ maxLength: 255 })] as const,
  () => [z.uuid(), pg.uuid()] as const,
  () => [z.number(), pg.float8()] as const,
  () => [z.number().int(), pg.float8()] as const,
  () => [z.float32(), pg.float4()] as const,
  () => [z.float64(), pg.float8()] as const,
  () => [z.int(), pg.int4()] as const,
  () => [z.int().dbPk(), pg.int4({ primaryKey: true, autoIncrement: true })] as const,
  () => [z.bigint(), pg.decimal()] as const,
  () => [z.int32(), pg.int4()] as const,
  () => [z.uint32(), { type: "ERROR" } as { type: "ERROR" }] as const,
  () => [z.int64(), pg.int8()] as const,
  () => [z.int64().dbPk(), pg.int8({ primaryKey: true, autoIncrement: true })] as const,
  () => [z.uint64(), pg.decimal({ precision: 20, scale: 0 })] as const,
  () => [z.boolean(), pg.boolean()] as const,
  () => [z.date(), pg.timestamptz()] as const,
  () => [z.url(), pg.text()] as const,
  () => [z.email(), pg.text()] as const,
  () => [z.emoji(), pg.text()] as const,
  () => [z.nanoid(), pg.varchar({ maxLength: 21 })] as const,
  () => [z.cuid2(), pg.text()] as const,
  () => [z.ulid(), pg.varchar({ maxLength: 26 })] as const,
  () => [z.xid(), pg.varchar({ maxLength: 20 })] as const,
  () => [z.ksuid(), pg.varchar({ maxLength: 27 })] as const,
  () => [z.base64(), pg.text()] as const,
  () => [z.base64url(), pg.text()] as const,
  () => [z.e164(), pg.text()] as const,
  () => [z.jwt(), pg.text()] as const,
  () => [z.guid(), pg.uuid()] as const,
  () => [z.ipv4(), pg.inet()] as const,
  () => [z.ipv6(), pg.inet()] as const,
  () => [z.mac(), pg.macaddr()] as const,
  () => [z.cidrv4(), pg.cidr()] as const,
  () => [z.cidrv6(), pg.cidr()] as const,

  () => [z.string().nullable(), pg.text({ nullable: true })] as const,
  () => [z.string().optional(), pg.text({ nullable: true })] as const,
  () => [z.string().default("hello"), pg.text({ default: "hello" })] as const,
  () => [z.string().prefault("hello"), pg.text({ default: "hello" })] as const,
  () => [z.string().dbPk(), pg.text({ primaryKey: true })] as const,
  () => [
    z.int64().dbFk(z.object({ id: z.int64().dbPk() }).dbTable("users"), "id"),
    pg.int8({ foreignKeyTable: "users", foreignKeyColumn: "id" }),
  ] as const,

  // Array types
  () => [z.int().array(), pg.int4({ array: "[]" })] as const,
  () => [z.string().array(), pg.text({ array: "[]" })] as const,
  () => [z.int().array().array(), pg.int4({ array: "[][]" })] as const,
  () => [z.string().array().nullable(), pg.text({ array: "[]", nullable: true })] as const,
] as const

/*
Other types for future consideration:

- z.enum([...])                          → pg.text()   (or check constraint)
- z.nativeEnum({...})                    → pg.text()
- z.symbol()                             → pg.text()   (stored as string)
- z.nan()                                → pg.float4()
- z.object() / z.record() / z.array()    → pg.jsonb()
- z.undefined / z.null / z.void          → → (unlikely column types)
 */
