import { sqlite, table } from "ormer";
import type { ColumnType, ColumnTypeSingualr, Params, Table } from "ormer";
import { z } from "zod";
import type {
  ZodDbTableName,
  ZodDbNavigate,
  ZodDbParams,
  ZodDbSqliteColumnType,
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
  ParamsDerived,
} from "./common.ts";
import { deriveColumn } from "./derive.ts";

// prettier-ignore
type DeriveBaseSqliteColumn<T extends ZodType> = 
  // Constructor-types
    T extends z.ZodUUID ? ColumnTypeSingualr<"text">
  : T extends z.ZodGUID ? ColumnTypeSingualr<"text">
  : T extends z.ZodURL ? ColumnTypeSingualr<"text">
  : T extends z.ZodEmail ? ColumnTypeSingualr<"text">
  : T extends z.ZodEmoji ? ColumnTypeSingualr<"text">
  : T extends z.ZodNanoID ? ColumnType<"text", { check: (col: string) => string }>
  : T extends z.ZodCUID2 ? ColumnTypeSingualr<"text">
  : T extends z.ZodULID ? ColumnType<"text", { check: (col: string) => string }>
  : T extends z.ZodXID ? ColumnType<"text", { check: (col: string) => string }>
  : T extends z.ZodKSUID ? ColumnType<"text", { check: (col: string) => string }>
  : T extends z.ZodBase64 ? ColumnTypeSingualr<"text">
  : T extends z.ZodBase64URL ? ColumnTypeSingualr<"text">
  : T extends z.ZodE164 ? ColumnTypeSingualr<"text">
  : T extends z.ZodJWT ? ColumnTypeSingualr<"text">
  // SQLite has no inet/macaddr/cidr → fall back to text
  : T extends z.ZodIPv4 ? ColumnTypeSingualr<"text">
  : T extends z.ZodIPv6 ? ColumnTypeSingualr<"text">
  : T extends z.ZodMAC ? ColumnTypeSingualr<"text">
  : T extends z.ZodCIDRv4 ? ColumnTypeSingualr<"text">
  : T extends z.ZodCIDRv6 ? ColumnTypeSingualr<"text">
  // Date/time — string-based ZodISO types work as TEXT, only ZodDate can't round-trip
  : T extends z.ZodISOTime ? ColumnTypeSingualr<"text">
  : T extends z.ZodISODate ? ColumnTypeSingualr<"text">
  : T extends NaiveDatetime ? ColumnTypeSingualr<"text">
  : T extends z.ZodISODateTime ? ColumnTypeSingualr<"text">

  // Custom workarounds because of this: https://github.com/colinhacks/zod/issues/6045
  // Number formats
  : T extends ZodNumberFormatVal<"safeint"> ? ColumnTypeSingualr<"integer"> 
  : T extends ZodNumberFormatVal<"int32"> ? ColumnTypeSingualr<"integer">
  : T extends ZodNumberFormatVal<"uint32"> ? ColumnTypeSingualr<"integer">
  : T extends ZodNumberFormatVal<"int8"> ? ColumnTypeSingualr<"integer">
  : T extends ZodNumberFormatVal<"uint8"> ? ColumnTypeSingualr<"integer">
  : T extends ZodNumberFormatVal<"int16"> ? ColumnTypeSingualr<"integer">
  : T extends ZodNumberFormatVal<"uint16"> ? ColumnTypeSingualr<"integer">
  : T extends ZodNumberFormatVal<"float32"> ? ColumnTypeSingualr<"real">
  : T extends ZodNumberFormatVal<"float64"> ? ColumnTypeSingualr<"real">

  // Bigints — SQLite INTEGER is always number, can't round-trip bigint
  : T extends ZodBigIntFormatVal<"int64"> ? { type: "ERROR" }
  : T extends ZodBigIntFormatVal<"uint64"> ? { type: "ERROR" }
  : T extends ZodBigIntFormatVal<"uint128"> ? { type: "ERROR" }
  : T extends ZodBigIntFormatVal<"int128"> ? { type: "ERROR" }

  // JSON — SQLite stores as text, can't round-trip
  : T extends z.ZodObject ? { type: "ERROR" }
  : T extends z.ZodJSONSchema ? { type: "ERROR" }
  
  : T extends z.ZodNumberFormat ? { type: "ERROR" } // This should not happen, above list exhaustive
  : T extends z.ZodBigIntFormat ? { type: "ERROR" } // This should not happen, above list exhaustive
  
  : T extends z.ZodNumber & ZodSafeInt ? ColumnTypeSingualr<"integer">
  : T extends z.ZodNumber ? ColumnTypeSingualr<"real">
  : T extends z.ZodBigInt ? { type: "ERROR" }
  : T extends z.ZodString & ZodMaxLengthVal<infer _Max> ? ColumnType<"text", { check: (col: string) => string }>
  : T extends z.ZodString ? ColumnTypeSingualr<"text">
  // Bool — SQLite has no boolean type, stores 0/1, can't round-trip
  : T extends z.ZodBoolean ? { type: "ERROR" }
  // Date — SQLite has no native date type, stores as text, can't round-trip
  : T extends z.ZodDate ? { type: "ERROR" }
  : never;

// prettier-ignore
export type DeriveSqliteColumn<T extends ZodType> =
  // Explicit .dbSqlite() override — skip derivation entirely
  T extends ZodDbSqliteColumnType<any> ? T["def"]["db"]["sqliteColumnType"]

  // SQLite has no array types — error out
  : SafeParamDerivation<T> extends { array: string }
    ? { type: "ERROR" }

  // Otherwise, derive from the base type + modifiers (only if not ERROR)
  : DeriveBaseSqliteColumn<UnwrapModifiers<T>> extends { type: "ERROR" }
    ? { type: "ERROR" }
    : RewrapToColumnType<
        DeriveBaseSqliteColumn<UnwrapModifiers<T>> & SafeParamDerivation<T>
      >;

// ---------------------------------------------------------------------------
// Runtime helpers
// ---------------------------------------------------------------------------

/**
 * Strips the `array` and `maxLength` properties from params before passing
 * to sqlite.*() calls.
 *
 * - `array`: SQLite has no native array type — arrays are stored as JSON text.
 * - `maxLength`: Replaced by a CHECK constraint generated at runtime.
 */
function stripDerived(params: ParamsDerived): Record<string, unknown> {
  // strip array (SQLite has no native array) and maxLength (replaced by CHECK)
  const { array: _, maxLength: __, ...rest } = params as any;
  return rest;
}

/**
 * Builds a CHECK constraint for maxLength on a text column.
 */
function maxLengthCheck(colName: string, maxLength: number): string {
  return `length(${colName}) <= ${maxLength}`;
}

// ---------------------------------------------------------------------------
// Runtime implementation
// ---------------------------------------------------------------------------

/**
 * Derive a SQLite column from a ZodType schema.
 */
export function deriveSqliteColumn<
  T extends ZodType & { def?: { db?: Partial<ZodDbParams> } },
>(schema: T): DeriveSqliteColumn<T> {
  // Explicit .dbSqlite() override — skip derivation entirely
  const dbMeta = schema.def?.db;
  if (dbMeta?.sqliteColumnType) {
    return dbMeta?.sqliteColumnType as ColumnType<any, any>;
  }

  return deriveColumn(schema, ([t, params]) => {
    // SQLite has no native array type — strip array dimension and force to text
    // (arrays are stored as JSON text).
    const hasArray = "array" in params && typeof params.array === "string";
    const p = stripDerived(params);

    if (hasArray) {
      throw new Error(
        `Array types are not supported by deriveSqliteColumn. SQLite has no native array type. Use .dbSqlite() to make an explicit choice.`,
      );
    }

    switch (t) {
      case "uuid":
      case "guid":
        return sqlite.text(p as Params);
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
        return sqlite.text(p as Params);
      case "nanoid":
        return sqlite.text({
          ...p,
          check: (c: string) => maxLengthCheck(c, 21),
        } as Params);
      case "ulid":
        return sqlite.text({
          ...p,
          check: (c: string) => maxLengthCheck(c, 26),
        } as Params);
      case "xid":
        return sqlite.text({
          ...p,
          check: (c: string) => maxLengthCheck(c, 20),
        } as Params);
      case "ksuid":
        return sqlite.text({
          ...p,
          check: (c: string) => maxLengthCheck(c, 27),
        } as Params);
      case "string":
        if ("maxLength" in params && typeof params.maxLength === "number") {
          return sqlite.text({
            ...p,
            check: (c: string) => maxLengthCheck(c, params.maxLength),
          } as Params);
        }
        return sqlite.text(p as Params);
      case "isoTime":
      case "isoDate":
      case "naiveDatetime":
      case "isoDatetime":
        return sqlite.text(p as Params);
      case "int64":
      case "uint64":
      case "uint128":
      case "int128":
      case "bigint":
        throw new Error(
          `ZodBigInt / ZodInt64 / ZodUInt64 is not supported by deriveSqliteColumn. SQLite INTEGER maps to number and cannot round-trip bigint values.`,
        );
      case "int32":
      case "int8":
      case "int16":
      case "uint32":
      case "uint8":
      case "uint16":
        return sqlite.integer(p as Params);
      case "float32":
      case "float64":
        return sqlite.real(p as Params);
      case "boolean":
        throw new Error(
          `ZodBoolean is not supported by deriveSqliteColumn. SQLite has no boolean type (stores 0/1 in INTEGER) and cannot round-trip. Use .dbSqlite() to make an explicit choice.`,
        );
      case "date":
        throw new Error(
          `ZodDate is not supported by deriveSqliteColumn. SQLite has no native date type and cannot round-trip. Use .dbSqlite() to make an explicit choice.`,
        );
      case "json":
      case "object":
        throw new Error(
          `ZodObject / ZodJSONSchema is not supported by deriveSqliteColumn. SQLite has no JSON type and cannot round-trip. Use .dbSqlite() to make an explicit choice.`,
        );
    }
  }) as DeriveSqliteColumn<T>;
}

// ---------------------------------------------------------------------------
// DeriveSqliteTable
// ---------------------------------------------------------------------------

/**
 * Derive a SQLite table type from a ZodObject with dbTable metadata.
 */
export type DeriveSqliteTable<
  T extends { shape: Record<string, any> } & ZodDbTableName<string>,
> =
  // prettier-ignore
  Table<T["def"]["db"]["tableName"], {
    [ K in keyof T["shape"] as T["shape"][K] extends ZodDbNavigate<any, any> ? never : K ]: DeriveSqliteColumn<T["shape"][K]>
  }>;

/**
 * Derive an ormer SQLite table from a ZodObject schema.
 */
export function deriveSqliteTable<
  T extends z.ZodObject & ZodDbTableName<string>,
>(schema: T): RewrapDeriveTable<DeriveSqliteTable<T>> {
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

    columns[key] = deriveSqliteColumn(shape[key]);
  }

  return table(tableName as never, columns) as any;
}
