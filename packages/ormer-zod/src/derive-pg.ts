import { pg, table } from "ormer";
import type { ColumnType, ColumnTypeSingualr, Params, Table } from "ormer";
import { z } from "zod";
import type {
  ZodDbTableName,
  ZodDbNavigate,
  ZodDbParams,
  ZodDbPgColumnType,
  ZodBigIntFormatVal,
  ZodNumberFormatVal,
  NaiveDatetime,
  ZodSafeInt,
  ZodMaxLengthVal,
} from "./zod-ext.ts";
import type {
  ZodType,
  UnwrapModifiers,
  RewrapToColumnType,
  RewrapDeriveTable,
  SafeParamDerivation,
} from "./common.ts";
import { deriveColumn } from "./derive.ts";

// prettier-ignore
type DeriveBaseColumn<T extends ZodType> = 
  // Constructor-types
    T extends z.ZodUUID ? ColumnTypeSingualr<"uuid">
  : T extends z.ZodGUID ? ColumnTypeSingualr<"uuid">
  : T extends z.ZodURL ? ColumnTypeSingualr<"text">
  : T extends z.ZodEmail ? ColumnTypeSingualr<"text">
  : T extends z.ZodEmoji ? ColumnTypeSingualr<"text">
  : T extends z.ZodNanoID ? ColumnType<"varchar", { maxLength: 21 }>
  : T extends z.ZodCUID2 ? ColumnTypeSingualr<"text">
  : T extends z.ZodULID ? ColumnType<"varchar", { maxLength: 26 }>
  : T extends z.ZodXID ? ColumnType<"varchar", { maxLength: 20 }>
  : T extends z.ZodKSUID ? ColumnType<"varchar", { maxLength: 27 }>
  : T extends z.ZodBase64 ? ColumnTypeSingualr<"text">
  : T extends z.ZodBase64URL ? ColumnTypeSingualr<"text">
  : T extends z.ZodE164 ? ColumnTypeSingualr<"text">
  : T extends z.ZodJWT ? ColumnTypeSingualr<"text">
  : T extends z.ZodIPv4 ? ColumnTypeSingualr<"inet">
  : T extends z.ZodIPv6 ? ColumnTypeSingualr<"inet">
  : T extends z.ZodMAC ? ColumnTypeSingualr<"macaddr">
  : T extends z.ZodCIDRv4 ? ColumnTypeSingualr<"cidr">
  : T extends z.ZodCIDRv6 ? ColumnTypeSingualr<"cidr">
  : T extends z.ZodISOTime ? ColumnTypeSingualr<"time">
  : T extends z.ZodISODate ? ColumnTypeSingualr<"date">
  : T extends NaiveDatetime ? ColumnTypeSingualr<"timestamp">
  : T extends z.ZodISODateTime ? { type: "ERROR" } // Not supported, see test cases

  // Custom workarounds because of this: https://github.com/colinhacks/zod/issues/6045
  // Number formats
  : T extends ZodNumberFormatVal<"safeint"> ? ColumnTypeSingualr<"int4"> 
  : T extends ZodNumberFormatVal<"int32"> ? ColumnTypeSingualr<"int4">
  : T extends ZodNumberFormatVal<"int8"> ? { type: "ERROR" } // No symmetric PG mapping
  : T extends ZodNumberFormatVal<"uint8"> ? { type: "ERROR" } // No symmetric PG mapping
  : T extends ZodNumberFormatVal<"int16"> ? ColumnTypeSingualr<"int2">
  : T extends ZodNumberFormatVal<"uint16"> ? { type: "ERROR" } // No symmetric PG mapping
  : T extends ZodNumberFormatVal<"uint32"> ? { type: "ERROR" } // No symmetric PG mapping
  : T extends ZodNumberFormatVal<"float32"> ? ColumnTypeSingualr<"float4">
  : T extends ZodNumberFormatVal<"float64"> ? ColumnTypeSingualr<"float8">

  // Bigints
  : T extends ZodBigIntFormatVal<"int64"> ? ColumnTypeSingualr<"int8">
  : T extends ZodBigIntFormatVal<"uint64"> ? { type: "ERROR" } // No symmetric PG mapping
  : T extends ZodBigIntFormatVal<"uint128"> ? { type: "ERROR" } // No symmetric PG mapping
  : T extends ZodBigIntFormatVal<"int128"> ? { type: "ERROR" } // No symmetric PG mapping

  // JSON
  : T extends z.ZodObject ? ColumnType<"jsonb", { schema: T }>
  : T extends z.ZodJSONSchema ? ColumnType<"jsonb", { schema: T }>
  
  : T extends z.ZodNumberFormat ? { type: "ERROR" } // This should not happen, above list exhaustive
  : T extends z.ZodBigIntFormat ? { type: "ERROR" } // This should not happen, above list exhaustive
  
  : T extends z.ZodNumber & ZodSafeInt ? ColumnTypeSingualr<"int4">
  : T extends z.ZodNumber ? ColumnTypeSingualr<"float8">
  : T extends z.ZodBigInt ? ColumnTypeSingualr<"int8">
  : T extends z.ZodString & ZodMaxLengthVal<infer Max> ? ColumnType<"varchar", { maxLength: Max }>
  : T extends z.ZodString ? ColumnTypeSingualr<"text">
  : T extends z.ZodBoolean ? ColumnTypeSingualr<"boolean">
  : T extends z.ZodDate ? ColumnTypeSingualr<"timestamptz">
  // Are these needed?
  //
  // : T extends z.ZodType<string, string> ? ColumnTypeSingualr<"text">
  // : T extends z.ZodType<number, number> ? ColumnTypeSingualr<"float8">
  // : T extends z.ZodType<boolean, boolean> ? ColumnTypeSingualr<"boolean">
  // : T extends z.ZodType<Date, Date> ? ColumnTypeSingualr<"timestamptz">
  // : T extends z.ZodType<bigint, bigint> ? ColumnTypeSingualr<"int8">
  : never;

// prettier-ignore
export type DerivePgColumn<T extends ZodType> =
  // Explicit .dbPg() override — skip derivation entirely
  T extends ZodDbPgColumnType<any> ? T["def"]["db"]["pgColumnType"]

  // Otherwise, derive from the base type + modifiers
  : RewrapToColumnType<
      DeriveBaseColumn<UnwrapModifiers<T>> & SafeParamDerivation<T>
    >;

// ---------------------------------------------------------------------------
// Runtime implementation
// ---------------------------------------------------------------------------

/**
 * Derive a PgColumn from a ZodType schema.
 */
export function derivePgColumn<
  T extends ZodType & { def?: { db?: Partial<ZodDbParams> } },
>(schema: T): DerivePgColumn<T> {
  // Explicit .dbPg() override — skip derivation entirely
  const dbMeta = schema.def?.db;
  if (dbMeta?.pgColumnType) {
    return dbMeta?.pgColumnType as ColumnType<any, any>;
  }

  return deriveColumn(schema, ([t, params]) => {
    switch (t) {
      case "uuid":
      case "guid":
        return pg.uuid(params);
      case "url":
      case "emoji":
      case "cuid2":
      case "base64":
      case "base64url":
      case "e164":
      case "jwt":
      case "email":
        return pg.text(params);
      case "nanoid":
      case "ulid":
      case "xid":
      case "ksuid":
      case "string":
        return "maxLength" in params ? pg.varchar(params) : pg.text(params);
      case "ipv4":
      case "ipv6":
        return pg.inet(params);
      case "mac":
        return pg.macaddr(params);
      case "cidrv4":
      case "cidrv6":
        return pg.cidr(params);
      case "isoTime":
        return pg.time(params);
      case "isoDate":
        return pg.date(params);
      case "isoDatetime":
        throw new Error(
          `ZodISODateTime is not supported by derivePgColumn. Use z.string().naiveDatetime() instead.`,
        );
      case "naiveDatetime":
        return pg.timestamp(params as Params);
      case "int64":
      case "bigint":
        return pg.int8(params);
      case "uint64":
      case "uint128":
      case "int128":
        throw new Error(`PG has no mapping for ZodBigIntFormat: ${t}`);
      case "int32":
        return pg.int4(params);
      case "int16":
        return pg.int2(params);
      case "uint32":
      case "int8":
      case "uint8":
      case "uint16":
        throw new Error(`PG has no mapping for ZodNumberFormat: ${t}`);
      case "float32":
        return pg.float4(params);
      case "float64":
        return pg.float8(params);
      case "boolean":
        return pg.boolean(params);
      case "date":
        return pg.timestamptz(params as Params);
      case "json":
      case "object":
        if (!("schema" in params)) {
          throw new Error(
            `ZodObject and ZodJSONSchema types must have a "schema" property in their db params for deriveColumn to work.`,
          );
        }
        return pg.jsonb(params);
    }
  }) as DerivePgColumn<T>;
}

// ---------------------------------------------------------------------------
// DerivePgTable
// ---------------------------------------------------------------------------

/**
 * Derive a PgTable type from a ZodObject with dbTable metadata.
 */
export type DerivePgTable<
  T extends { shape: Record<string, any> } & ZodDbTableName<string>,
> =
  // prettier-ignore
  Table<T["def"]["db"]["tableName"], {
    [ K in keyof T["shape"] as T["shape"][K] extends ZodDbNavigate<any, any> ? never : K ]: DerivePgColumn<T["shape"][K]>
  }>;

/**
 * Derive an ormer PgTable from a ZodObject schema.
 */
export function derivePgTable<T extends z.ZodObject & ZodDbTableName<string>>(
  schema: T,
): RewrapDeriveTable<DerivePgTable<T>> {
  const dbMeta = schema?.def?.db as Partial<ZodDbParams> | undefined;
  if (!dbMeta || typeof dbMeta.tableName !== "string") {
    throw new Error(
      "ZodObject must have .dbTable() metadata. Call schema.dbTable('table_name')",
    );
  }
  const tableName = dbMeta.tableName;

  const shape = schema.shape;
  const columns: Record<string, ColumnType<any, any>> = {};

  for (const key of Object.keys(shape)) {
    if (shape[key].def?.db?.navigation) {
      // Skip navigations (dbRef) — handled as relationship metadata.
      // TODO: navigation is supported by table, implement that
      continue;
    }

    columns[key] = derivePgColumn(shape[key]);
  }

  return table(tableName as never, columns) as any;
}
