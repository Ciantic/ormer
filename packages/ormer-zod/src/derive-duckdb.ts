import { duckdb, table } from "ormer";
import type { ColumnType, ColumnTypeSingualr, Params, Table } from "ormer";
import { z } from "zod";
import type {
  ZodDbTableName,
  ZodDbNavigate,
  ZodDbParams,
  ZodDbDuckDbColumnType,
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
type DeriveBaseDuckDbColumn<T extends ZodType> = 
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
  // DuckDB has no inet/macaddr/cidr → fall back to text
  : T extends z.ZodIPv4 ? ColumnTypeSingualr<"text">
  : T extends z.ZodIPv6 ? ColumnTypeSingualr<"text">
  : T extends z.ZodMAC ? ColumnTypeSingualr<"text">
  : T extends z.ZodCIDRv4 ? ColumnTypeSingualr<"text">
  : T extends z.ZodCIDRv6 ? ColumnTypeSingualr<"text">
  : T extends z.ZodISOTime ? ColumnTypeSingualr<"time">
  : T extends z.ZodISODate ? ColumnTypeSingualr<"date">
  : T extends NaiveDatetime ? ColumnTypeSingualr<"timestamp">
  : T extends z.ZodISODateTime ? { type: "ERROR" } // Not supported, see test cases

  // Custom workarounds because of this: https://github.com/colinhacks/zod/issues/6045
  // Number formats
  : T extends ZodNumberFormatVal<"safeint"> ? ColumnTypeSingualr<"int4"> 
  : T extends ZodNumberFormatVal<"int32"> ? ColumnTypeSingualr<"int4">
  : T extends ZodNumberFormatVal<"int8"> ? ColumnTypeSingualr<"int1">
  : T extends ZodNumberFormatVal<"uint8"> ? ColumnTypeSingualr<"utinyint">
  : T extends ZodNumberFormatVal<"int16"> ? ColumnTypeSingualr<"int2">
  : T extends ZodNumberFormatVal<"uint16"> ? ColumnTypeSingualr<"usmallint">
  : T extends ZodNumberFormatVal<"uint32"> ? ColumnTypeSingualr<"uinteger"> // DuckDB has unsigned ints
  : T extends ZodNumberFormatVal<"float32"> ? ColumnTypeSingualr<"float4">
  : T extends ZodNumberFormatVal<"float64"> ? ColumnTypeSingualr<"float8">

  // Bigints
  : T extends ZodBigIntFormatVal<"int64"> ? ColumnTypeSingualr<"int8">
  : T extends ZodBigIntFormatVal<"uint64"> ? ColumnTypeSingualr<"ubigint"> // DuckDB has unsigned bigints
  : T extends ZodBigIntFormatVal<"uint128"> ? ColumnTypeSingualr<"uhugeint"> // DuckDB has unsigned hugeints
  : T extends ZodBigIntFormatVal<"int128"> ? ColumnTypeSingualr<"hugeint">

  // JSON — DuckDB uses json, not jsonb
  : T extends z.ZodObject ? ColumnType<"json", { schema: T }>
  : T extends z.ZodJSONSchema ? ColumnType<"json", { schema: T }>
  
  : T extends z.ZodNumberFormat ? { type: "ERROR" } // This should not happen, above list exhaustive
  : T extends z.ZodBigIntFormat ? { type: "ERROR" } // This should not happen, above list exhaustive
  
  : T extends z.ZodNumber & ZodSafeInt ? ColumnTypeSingualr<"int4">
  : T extends z.ZodNumber ? ColumnTypeSingualr<"float8">
  : T extends z.ZodBigInt ? ColumnTypeSingualr<"int8">
  : T extends z.ZodString & ZodMaxLengthVal<infer Max> ? ColumnType<"varchar", { maxLength: Max }>
  : T extends z.ZodString ? ColumnTypeSingualr<"text">
  : T extends z.ZodBoolean ? ColumnTypeSingualr<"boolean">
  : T extends z.ZodDate ? ColumnTypeSingualr<"timestamptz">
  : never;

// prettier-ignore
export type DeriveDuckDbColumn<T extends ZodType> =
  // Explicit .dbDuck() override — skip derivation entirely
  T extends ZodDbDuckDbColumnType<any> ? T["def"]["db"]["duckDbColumnType"]

  // Otherwise, derive from the base type + modifiers
  : RewrapToColumnType<
      DeriveBaseDuckDbColumn<UnwrapModifiers<T>> & SafeParamDerivation<T>
        
    >;

// ---------------------------------------------------------------------------
// Runtime implementation
// ---------------------------------------------------------------------------

/**
 * Derive a DuckDB column from a ZodType schema.
 */
export function deriveDuckDbColumn<
  T extends ZodType & { def?: { db?: Partial<ZodDbParams> } },
>(schema: T): DeriveDuckDbColumn<T> {
  // Explicit .dbDuck() override — skip derivation entirely
  const dbMeta = schema.def?.db;
  if (dbMeta?.duckDbColumnType) {
    return dbMeta?.duckDbColumnType as ColumnType<any, any>;
  }
  return deriveColumn(schema, ([t, params]) => {
    switch (t) {
      case "uuid":
      case "guid":
        return duckdb.uuid(params);
      case "url":
      case "emoji":
      case "cuid2":
      case "base64":
      case "base64url":
      case "e164":
      case "jwt":
      case "email":
      case "ipv4":
      case "ipv6":
      case "mac":
      case "cidrv4":
      case "cidrv6":
        return duckdb.text(params);
      case "nanoid":
      case "ulid":
      case "xid":
      case "ksuid":
      case "string":
        return "maxLength" in params
          ? duckdb.varchar(params)
          : duckdb.text(params);
      case "isoTime":
        return duckdb.time(params);
      case "isoDate":
        return duckdb.date(params);
      case "isoDatetime":
        throw new Error(
          `ZodISODateTime is not supported by deriveDuckDbColumn. Use z.string().naiveDatetime() instead.`,
        );
      case "naiveDatetime":
        return duckdb.timestamp(params as Params);
      case "int64":
      case "bigint":
        return duckdb.int8(params);
      case "uint64":
        return duckdb.ubigint(params);
      case "uint128":
        return duckdb.uhugeint(params);
      case "int128":
        return duckdb.hugeint(params);
      case "int32":
        return duckdb.int4(params);
      case "int16":
        return duckdb.int2(params);
      case "uint32":
        return duckdb.uinteger(params);
      case "uint16":
        return duckdb.usmallint(params);
      case "int8":
        return duckdb.int1(params);
      case "uint8":
        return duckdb.utinyint(params);
      case "float32":
        return duckdb.float4(params);
      case "float64":
        return duckdb.float8(params);
      case "boolean":
        return duckdb.boolean(params);
      case "date":
        return duckdb.timestamptz(params as Params);
      case "json":
      case "object":
        if (!("schema" in params)) {
          throw new Error(
            `ZodObject and ZodJSONSchema types must have a "schema" property in their db params for deriveColumn to work.`,
          );
        }
        return duckdb.json(params);
    }
  }) as DeriveDuckDbColumn<T>;
}

// ---------------------------------------------------------------------------
// DeriveDuckDbTable
// ---------------------------------------------------------------------------

/**
 * Derive a DuckDB table type from a ZodObject with dbTable metadata.
 */
export type DeriveDuckDbTable<
  T extends { shape: Record<string, any> } & ZodDbTableName<string>,
> =
  // prettier-ignore
  Table<T["def"]["db"]["tableName"], {
    [ K in keyof T["shape"] as T["shape"][K] extends ZodDbNavigate<any, any> ? never : K ]: DeriveDuckDbColumn<T["shape"][K]>
  }>;

/**
 * Derive an ormer DuckDB table from a ZodObject schema.
 */
export function deriveDuckDbTable<
  T extends z.ZodObject & ZodDbTableName<string>,
>(schema: T): RewrapDeriveTable<DeriveDuckDbTable<T>> {
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
      continue;
    }

    columns[key] = deriveDuckDbColumn(shape[key]);
  }

  return table(tableName as never, columns) as any;
}
