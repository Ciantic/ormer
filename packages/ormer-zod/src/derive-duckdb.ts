import { duckdb, table } from "ormer";
import type { ColumnType, ColumnTypeSingualr, Params, Table } from "ormer";
import { z, ZodOptional } from "zod";
import type {
  ZodDbTableName,
  ZodDbNavigate,
  ZodDbFk,
  ZodDbParams,
  ZodDbDuckDbColumnType,
  ZodBigIntFormatVal,
  ZodNumberFormatVal,
  NaiveDatetime,
  ZodMaxLengthVal,
} from "./zod-ext.ts";
import type {
  ZodType,
  UnwrapModifiers,
  IsNullable,
  HasDefaultValue,
  HasDbPk,
  OmitNever,
  RewrapToColumnType,
  RewrapDeriveTable,
  IsOptional,
  ArrayDimensions,
} from "./common.ts";

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
  : T extends ZodNumberFormatVal<"uint32"> ? ColumnTypeSingualr<"uinteger"> // DuckDB has unsigned ints
  : T extends ZodNumberFormatVal<"float32"> ? ColumnTypeSingualr<"float4">
  : T extends ZodNumberFormatVal<"float64"> ? ColumnTypeSingualr<"float8">

  // Bigints
  : T extends ZodBigIntFormatVal<"int64"> ? ColumnTypeSingualr<"int8">
  : T extends ZodBigIntFormatVal<"uint64"> ? ColumnTypeSingualr<"ubigint"> // DuckDB has unsigned bigints

  // JSON — DuckDB uses json, not jsonb
  : T extends z.ZodObject ? ColumnType<"json", { schema: T }>
  : T extends z.ZodJSONSchema ? ColumnType<"json", { schema: T }>
  
  : T extends z.ZodNumberFormat ? { type: "ERROR" } // This should not happen, above list exhaustive
  : T extends z.ZodBigIntFormat ? { type: "ERROR" } // This should not happen, above list exhaustive
  
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
      DeriveBaseDuckDbColumn<UnwrapModifiers<T>> &
        OmitNever<{
          primaryKey: HasDbPk<T> extends true ? true : never;
          nullable: IsNullable<T> extends true ? true 
                  : IsOptional<T> extends true ? true 
                  : never;
          default: HasDefaultValue<T> extends true ? z.infer<T> : never;
          autoIncrement: HasDbPk<T> extends true ? 
              UnwrapModifiers<T> extends ZodNumberFormatVal<"safeint"> ? true 
            : UnwrapModifiers<T> extends ZodNumberFormatVal<"int32"> ? true 
            : UnwrapModifiers<T> extends ZodNumberFormatVal<"uint32"> ? true 
            : UnwrapModifiers<T> extends ZodBigIntFormatVal<"int64"> ? true 
            : UnwrapModifiers<T> extends ZodBigIntFormatVal<"uint64"> ? true 
            : never
            : never;
          foreignKeyTable: T extends ZodDbFk<infer N extends string, infer _> ? N : never;
          foreignKeyColumn: T extends ZodDbFk<infer _, infer C extends string> ? C : never;
          array: ArrayDimensions<T>;
        }>
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

  let node = schema;
  let nullable: boolean | undefined = undefined;
  let optional: boolean | undefined = undefined;
  let defaultValue: unknown = undefined;
  let primaryKey = false;
  let foreignKeyTable: string | undefined = undefined;
  let foreignKeyColumn: string | undefined = undefined;
  let arrayDimensions = "";

  // Unwrap modifiers (.nullable, .optional, .default) to get to the base type
  //
  // For optionality, the first encountered is the right value
  while (true) {
    const ndb = node.def?.db;
    if (ndb?.primaryKey === true) primaryKey = true;
    if (ndb?.foreignKeyTable && ndb?.foreignKeyColumn) {
      foreignKeyTable = ndb.foreignKeyTable;
      foreignKeyColumn = ndb.foreignKeyColumn;
    }

    if (node instanceof z.ZodNullable) {
      nullable = true;
    } else if (node instanceof z.ZodOptional) {
      if (optional === undefined) optional = true;
    } else if (node instanceof z.ZodExactOptional) {
      if (optional === undefined) optional = true;
    } else if (node instanceof z.ZodDefault) {
      defaultValue = node.def.defaultValue;
    } else if (node instanceof z.ZodPrefault) {
      defaultValue = node.def.defaultValue;
    } else if (node instanceof z.ZodCatch) {
      defaultValue = node.def.catchValue;
    } else if (node instanceof z.ZodNonOptional) {
      if (optional === undefined) optional = false;
    } else if (node instanceof z.ZodReadonly) {
      // readonly is a pure wrapper — no modifier to set, just unwrap
    } else if (node instanceof z.ZodPipe) {
      // pipe chains transformations — unwrap to the input schema
      node = node.def.in as typeof node;
      continue;
    } else if (node instanceof z.ZodArray) {
      arrayDimensions += "[]";
      node = node.def.element as typeof node;
      continue;
    }
    if ("innerType" in node.def) {
      // z.ZodNullable, z.ZodOptional, z.ZodDefault, z.ZodPrefault, ZodExactOptional, ZodCatch, ZodNonOptional all have innerType
      node = node.def.innerType as typeof node;
    } else {
      break;
    }
  }

  // Create params for the duckdb.X(params) call
  let paramsBase: Partial<Params> = {};
  if (nullable) paramsBase.nullable = true;
  if (optional) paramsBase.nullable = true;
  if (typeof defaultValue !== "undefined") paramsBase.default = defaultValue;
  if (primaryKey) {
    paramsBase.primaryKey = true;
    if (node instanceof z.ZodNumberFormat || node instanceof z.ZodBigInt) {
      paramsBase.autoIncrement = true;
    }
  }
  if (foreignKeyTable && foreignKeyColumn) {
    paramsBase.foreignKeyTable = foreignKeyTable;
    paramsBase.foreignKeyColumn = foreignKeyColumn;
  }
  if (arrayDimensions) {
    paramsBase.array = arrayDimensions;
  }

  if (node instanceof z.ZodUUID) {
    return duckdb.uuid(paramsBase) as ColumnType<any, any>;
  }

  if (node instanceof z.ZodGUID) {
    return duckdb.uuid(paramsBase) as ColumnType<any, any>;
  }

  if (node instanceof z.ZodURL) {
    return duckdb.text(paramsBase) as ColumnType<any, any>;
  }

  if (node instanceof z.ZodEmoji) {
    return duckdb.text(paramsBase) as ColumnType<any, any>;
  }

  if (node instanceof z.ZodNanoID) {
    return duckdb.varchar({
      ...paramsBase,
      maxLength: 21,
    }) as ColumnType<any, any>;
  }

  if (node instanceof z.ZodCUID2) {
    return duckdb.text(paramsBase) as ColumnType<any, any>;
  }

  if (node instanceof z.ZodULID) {
    return duckdb.varchar({
      ...paramsBase,
      maxLength: 26,
    }) as ColumnType<any, any>;
  }

  if (node instanceof z.ZodXID) {
    return duckdb.varchar({
      ...paramsBase,
      maxLength: 20,
    }) as ColumnType<any, any>;
  }

  if (node instanceof z.ZodKSUID) {
    return duckdb.varchar({
      ...paramsBase,
      maxLength: 27,
    }) as ColumnType<any, any>;
  }

  if (node instanceof z.ZodBase64) {
    return duckdb.text(paramsBase) as ColumnType<any, any>;
  }

  if (node instanceof z.ZodBase64URL) {
    return duckdb.text(paramsBase) as ColumnType<any, any>;
  }

  if (node instanceof z.ZodE164) {
    return duckdb.text(paramsBase) as ColumnType<any, any>;
  }

  if (node instanceof z.ZodJWT) {
    return duckdb.text(paramsBase) as ColumnType<any, any>;
  }

  // DuckDB: no inet type → fall back to text
  if (node instanceof z.ZodIPv4) {
    return duckdb.text(paramsBase) as ColumnType<any, any>;
  }

  if (node instanceof z.ZodIPv6) {
    return duckdb.text(paramsBase) as ColumnType<any, any>;
  }

  // DuckDB: no macaddr type → fall back to text
  if (node instanceof z.ZodMAC) {
    return duckdb.text(paramsBase) as ColumnType<any, any>;
  }

  // DuckDB: no cidr type → fall back to text
  if (node instanceof z.ZodCIDRv4) {
    return duckdb.text(paramsBase) as ColumnType<any, any>;
  }

  if (node instanceof z.ZodCIDRv6) {
    return duckdb.text(paramsBase) as ColumnType<any, any>;
  }

  if (node instanceof z.ZodISOTime) {
    return duckdb.time(paramsBase) as ColumnType<any, any>;
  }

  if (node instanceof z.ZodISODate) {
    return duckdb.date(paramsBase) as ColumnType<any, any>;
  }

  if (node instanceof z.ZodISODateTime) {
    throw new Error(
      `ZodISODateTime is not supported by deriveDuckDbColumn. Use z.string().naiveDatetime() instead.`,
    );
  }

  if ("isNaiveDatetime" in node.def && node.def.isNaiveDatetime) {
    return duckdb.timestamp(paramsBase) as ColumnType<any, any>;
  }

  if (node instanceof z.ZodString) {
    if (node.maxLength != null) {
      return duckdb.varchar({
        ...paramsBase,
        maxLength: node.maxLength,
      }) as ColumnType<any, any>;
    } else {
      return duckdb.text(paramsBase) as ColumnType<any, any>;
    }
  }

  if (node instanceof z.ZodEmail) {
    return duckdb.text(paramsBase) as ColumnType<any, any>;
  }

  if (node instanceof z.ZodBigIntFormat) {
    // z.int64() / z.uint64()
    //
    // Distinguish by the format string on the definition.
    const format = node._zod.def.format;
    if (format === "int64") {
      return duckdb.int8(paramsBase) as ColumnType<any, any>;
    } else if (format === "uint64") {
      return duckdb.ubigint(paramsBase) as ColumnType<any, any>;
    }

    // List is exhaustive, so this should not happen:
    throw new Error(`Unsupported ZodBigIntFormat format: ${format}`);
  }

  if (node instanceof z.ZodBigInt) {
    return duckdb.int8() as ColumnType<any, any>;
  }

  if (node instanceof z.ZodNumberFormat) {
    // z.int() / z.float32() / z.float64() / z.int32() / z.uint32()
    //
    // Distinguish by the format string on the definition, only available at
    // runtime.
    //
    // This is not possible at the type-level: https://github.com/colinhacks/zod/issues/6045
    const format = node._zod.def.format;
    if (format === "float32") {
      return duckdb.float4(paramsBase) as ColumnType<any, any>;
    } else if (format === "float64") {
      return duckdb.float8(paramsBase) as ColumnType<any, any>;
    } else if (format === "safeint" || format === "int32") {
      return duckdb.int4(paramsBase) as ColumnType<any, any>;
    } else if (format === "uint32") {
      return duckdb.uinteger(paramsBase) as ColumnType<any, any>;
    }

    // List is exhaustive, so this should not happen:
    throw new Error(`Unsupported ZodNumberFormat format: ${format}`);
  }

  if (node instanceof z.ZodNumber) {
    return duckdb.float8(paramsBase) as ColumnType<any, any>;
  }

  if (node instanceof z.ZodBoolean) {
    return duckdb.boolean(paramsBase) as ColumnType<any, any>;
  }

  if (node instanceof z.ZodDate) {
    return duckdb.timestamptz(paramsBase) as ColumnType<any, any>;
  }

  // DuckDB: json, not jsonb
  if (node instanceof z.ZodObject) {
    return duckdb.json({
      ...paramsBase,
      schema: node,
    }) as ColumnType<any, any>;
  }

  // z.json(), TODO: this is a bit sketchy perhaps?
  if (node instanceof z.ZodLazy) {
    return duckdb.json({
      ...paramsBase,
      schema: node,
    }) as ColumnType<any, any>;
  }

  throw new Error(`Unsupported Zod type: ${node?.constructor?.name}`);
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
