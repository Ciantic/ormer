import { pg, table } from "ormer";
import type { ColumnType, ColumnTypeSingualr, Params, Table } from "ormer";
import { z, ZodOptional } from "zod";
import type {
  ZodDbTableName,
  ZodDbNavigate,
  ZodDbFk,
  ZodDbParams,
  ZodDbPgColumnType,
  ZodBigIntFormatVal,
  ZodNumberFormatVal,
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
  UnwrapUntilReturnTrue,
} from "./common.ts";

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

  // Custom workarounds because of this: https://github.com/colinhacks/zod/issues/6045
  // Number formats
  : T extends ZodNumberFormatVal<"safeint"> ? ColumnTypeSingualr<"int4"> 
  : T extends ZodNumberFormatVal<"int32"> ? ColumnTypeSingualr<"int4">
  : T extends ZodNumberFormatVal<"uint32"> ? { type: "ERROR" } // No symmetric PG mapping
  : T extends ZodNumberFormatVal<"float32"> ? ColumnTypeSingualr<"float4">
  : T extends ZodNumberFormatVal<"float64"> ? ColumnTypeSingualr<"float8">

  // Bigints
  : T extends ZodBigIntFormatVal<"int64"> ? ColumnTypeSingualr<"int8">
  : T extends ZodBigIntFormatVal<"uint64"> ? { type: "ERROR" } // No symmetric PG mapping
  
  : T extends z.ZodNumberFormat ? { type: "ERROR" } // This should not happen, above list exhaustive
  : T extends z.ZodBigIntFormat ? { type: "ERROR" } // This should not happen, above list exhaustive
  
  : T extends z.ZodNumber ? ColumnTypeSingualr<"float8">
  : T extends z.ZodBigInt ? ColumnTypeSingualr<"int8">
  : T extends z.ZodString & { maxLength: infer Max extends number } ? ColumnType<"varchar", { maxLength: Max }>
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
      DeriveBaseColumn<UnwrapModifiers<T>> &
        // DeriveOrExplicit<T> &
        OmitNever<{
          primaryKey: HasDbPk<T> extends true ? true : never;
          nullable: IsNullable<T> extends true ? true 
                  : IsOptional<T> extends true ? true 
                  : never;
          default: HasDefaultValue<T> extends true ? z.infer<T> : never;
          autoIncrement: HasDbPk<T> extends true ? 
              UnwrapModifiers<T> extends ZodNumberFormatVal<"safeint"> ? true 
            : UnwrapModifiers<T> extends ZodNumberFormatVal<"int32"> ? true 
            : UnwrapModifiers<T> extends ZodBigIntFormatVal<"uint64"> ? true 
            : UnwrapModifiers<T> extends ZodBigIntFormatVal<"int64"> ? true 
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

  // Create params for the pg.X(params) call
  let pgParamsBase: Partial<Params> = {};
  if (nullable) pgParamsBase.nullable = true;
  if (optional) pgParamsBase.nullable = true;
  if (typeof defaultValue !== "undefined") pgParamsBase.default = defaultValue;
  if (primaryKey) {
    pgParamsBase.primaryKey = true;
    if (node instanceof z.ZodNumberFormat || node instanceof z.ZodBigInt) {
      pgParamsBase.autoIncrement = true;
    }
  }
  if (foreignKeyTable && foreignKeyColumn) {
    pgParamsBase.foreignKeyTable = foreignKeyTable;
    pgParamsBase.foreignKeyColumn = foreignKeyColumn;
  }
  if (arrayDimensions) {
    pgParamsBase.array = arrayDimensions;
  }

  if (node instanceof z.ZodUUID) {
    return pg.uuid(pgParamsBase) as ColumnType<any, any>;
  }

  if (node instanceof z.ZodGUID) {
    return pg.uuid(pgParamsBase) as ColumnType<any, any>;
  }

  if (node instanceof z.ZodURL) {
    return pg.text(pgParamsBase) as ColumnType<any, any>;
  }

  if (node instanceof z.ZodEmoji) {
    return pg.text(pgParamsBase) as ColumnType<any, any>;
  }

  if (node instanceof z.ZodNanoID) {
    return pg.varchar({
      ...pgParamsBase,
      maxLength: 21,
    }) as ColumnType<any, any>;
  }

  if (node instanceof z.ZodCUID2) {
    return pg.text(pgParamsBase) as ColumnType<any, any>;
  }

  if (node instanceof z.ZodULID) {
    return pg.varchar({
      ...pgParamsBase,
      maxLength: 26,
    }) as ColumnType<any, any>;
  }

  if (node instanceof z.ZodXID) {
    return pg.varchar({
      ...pgParamsBase,
      maxLength: 20,
    }) as ColumnType<any, any>;
  }

  if (node instanceof z.ZodKSUID) {
    return pg.varchar({
      ...pgParamsBase,
      maxLength: 27,
    }) as ColumnType<any, any>;
  }

  if (node instanceof z.ZodBase64) {
    return pg.text(pgParamsBase) as ColumnType<any, any>;
  }

  if (node instanceof z.ZodBase64URL) {
    return pg.text(pgParamsBase) as ColumnType<any, any>;
  }

  if (node instanceof z.ZodE164) {
    return pg.text(pgParamsBase) as ColumnType<any, any>;
  }

  if (node instanceof z.ZodJWT) {
    return pg.text(pgParamsBase) as ColumnType<any, any>;
  }

  if (node instanceof z.ZodIPv4) {
    return pg.inet(pgParamsBase) as ColumnType<any, any>;
  }

  if (node instanceof z.ZodIPv6) {
    return pg.inet(pgParamsBase) as ColumnType<any, any>;
  }

  if (node instanceof z.ZodMAC) {
    return pg.macaddr(pgParamsBase) as ColumnType<any, any>;
  }

  if (node instanceof z.ZodCIDRv4) {
    return pg.cidr(pgParamsBase) as ColumnType<any, any>;
  }

  if (node instanceof z.ZodCIDRv6) {
    return pg.cidr(pgParamsBase) as ColumnType<any, any>;
  }

  if (node instanceof z.ZodString) {
    if (node.maxLength != null) {
      return pg.varchar({
        ...pgParamsBase,
        maxLength: node.maxLength,
      }) as ColumnType<any, any>;
    } else {
      return pg.text(pgParamsBase) as ColumnType<any, any>;
    }
  }

  if (node instanceof z.ZodEmail) {
    return pg.text(pgParamsBase) as ColumnType<any, any>;
  }

  if (node instanceof z.ZodBigIntFormat) {
    // z.int64() / z.uint64()
    //
    // Distinguish by the format string on the definition.
    const format = node._zod.def.format;
    if (format === "int64") {
      return pg.int8(pgParamsBase) as ColumnType<any, any>;
    } else if (format === "uint64") {
      throw new Error(`PG has no mapping for ZodBigIntFormat: ${format}`);
    }

    // List is exhaustive, so this should not happen:
    throw new Error(`Unsupported ZodBigIntFormat format: ${format}`);
  }

  if (node instanceof z.ZodBigInt) {
    return pg.int8() as ColumnType<any, any>;
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
      return pg.float4(pgParamsBase) as ColumnType<any, any>;
    } else if (format === "float64") {
      return pg.float8(pgParamsBase) as ColumnType<any, any>;
    } else if (format === "safeint" || format === "int32") {
      return pg.int4(pgParamsBase) as ColumnType<any, any>;
    } else if (format === "uint32") {
      throw new Error(`PG has no mapping for ZodNumberFormat: ${format}`);
    }

    // List is exhaustive, so this should not happen:
    throw new Error(`Unsupported ZodNumberFormat format: ${format}`);
  }

  if (node instanceof z.ZodNumber) {
    return pg.float8(pgParamsBase) as ColumnType<any, any>;
  }

  if (node instanceof z.ZodBoolean) {
    return pg.boolean(pgParamsBase) as ColumnType<any, any>;
  }

  if (node instanceof z.ZodDate) {
    return pg.timestamptz(pgParamsBase) as ColumnType<any, any>;
  }

  // Are these needed?
  //
  // if (node.def.type === "string") {
  //   return pg.text(pgParamsBase) as ColumnType<any, any>;
  // } else if (node.def.type === "number") {
  //   return pg.float8(pgParamsBase) as ColumnType<any, any>;
  // } else if (node.def.type === "boolean") {
  //   return pg.boolean(pgParamsBase) as ColumnType<any, any>;
  // } else if (node.def.type === "date") {
  //   return pg.timestamptz(pgParamsBase) as ColumnType<any, any>;
  // } else if (node.def.type === "bigint") {
  //   return pg.int8(pgParamsBase) as ColumnType<any, any>;
  // }

  throw new Error(`Unsupported Zod type: ${node?.constructor?.name}`);
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
