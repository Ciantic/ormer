import { pg, table } from "ormer";
import type { ColumnType, ColumnTypeSingualr, Params, Table } from "ormer";
import { z } from "zod";
import type {
  ZodDbTableName,
  ZodDbPrimaryKey,
  ZodDbNavigate,
  ZodDbFk,
  ZodDbParams,
} from "./zod-ext.ts";

type FinalType<T> = T extends infer U ? { [K in keyof U]: U[K] } : never;

type ZodType = z.ZodType;

// ---------------------------------------------------------------------------
// Type-level derivation
// ---------------------------------------------------------------------------

// prettier-ignore
type UnwrapUntilReturnTrue<T, Check> = T extends Check
  ? true
  : T extends z.ZodNullable<infer Inner extends ZodType> ? UnwrapUntilReturnTrue<Inner, Check>
  : T extends z.ZodOptional<infer Inner extends ZodType> ? UnwrapUntilReturnTrue<Inner, Check>
  : T extends z.ZodDefault<infer Inner extends ZodType>  ? UnwrapUntilReturnTrue<Inner, Check>
  : false;

// prettier-ignore
type UnwrapModifiers<T extends ZodType> =
    T extends z.ZodNullable<infer Inner extends ZodType> ? UnwrapModifiers<Inner>
  : T extends z.ZodOptional<infer Inner extends ZodType> ? UnwrapModifiers<Inner>
  : T extends z.ZodDefault<infer Inner extends ZodType>  ? UnwrapModifiers<Inner>
  : T;

type IsNullable<T extends ZodType> =
  UnwrapUntilReturnTrue<T, z.ZodNullable<any> | z.ZodOptional<any>> extends true
    ? true
    : false;

type HasDefaultValue<T extends ZodType> =
  UnwrapUntilReturnTrue<T, z.ZodDefault<any>> extends true ? true : false;

type HasDbPk<T extends ZodType> = T extends ZodDbPrimaryKey ? true : false;

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
  : T extends z.ZodNumberFormat ? ColumnTypeSingualr<"int4" | "int8" | "float4" | "float8">
  : T extends z.ZodNumber ? ColumnTypeSingualr<"float8">
  : T extends z.ZodBigInt ? ColumnTypeSingualr<"int8">
  : T extends z.ZodString ? ColumnTypeSingualr<"text"> | ColumnType<"varchar", { maxLength: number }>
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

type OmitNever<T> = Omit<
  T,
  { [K in keyof T]: T[K] extends never ? K : never }[keyof T]
>;

type NonEmptyObject<T> = keyof T extends never ? never : T;

type RewrapToColumnType<T> = T extends {
  type: infer Type extends string;
} & infer Params
  ? Omit<Params, "type"> extends NonEmptyObject<Omit<Params, "type">>
    ? ColumnType<Type, FinalType<Omit<Params, "type">>>
    : ColumnTypeSingualr<Type>
  : T extends ColumnTypeSingualr<infer Type>
    ? ColumnTypeSingualr<Type>
    : never;

export type DerivePgColumnImproved<T extends ZodType> = RewrapToColumnType<
  DeriveBaseColumn<UnwrapModifiers<T>> &
    OmitNever<{
      primaryKey: HasDbPk<T> extends true ? true : never;
      nullable: IsNullable<T> extends true ? true : never;
      default: HasDefaultValue<T> extends true ? z.infer<T> : never;
      autoIncrement: HasDbPk<T> extends true
        ? UnwrapModifiers<T> extends z.ZodBigInt
          ? true
          : UnwrapModifiers<T> extends z.ZodNumberFormat
            ? true
            : never
        : never;
    }>
>;

// ---------------------------------------------------------------------------
// Runtime implementation
// ---------------------------------------------------------------------------

/**
 * Derive a PgColumn from a ZodType schema.
 *
 * Currently implemented mappings:
 * - z.string()              → pg.text()
 * - z.string().max(255)     → pg.varchar({ maxLength: 255 })
 * - z.uuid()                → pg.uuid()
 * - z.number()              → pg.float8()
 * - z.number().int()        → pg.float8()
 * - z.int()                 → pg.int4()
 * - z.int().dbPk()          → pg.int4({ primaryKey: true, autoIncrement: true
 *   })
 * - z.bigint()              → pg.int8()
 * - z.bigint().dbPk()       → pg.int8({ primaryKey: true, autoIncrement: true
 *   })
 * - z.boolean()             → pg.boolean()
 * - z.date()                → pg.timestamptz()
 * - z.url()                 → pg.text()
 * - z.emoji()               → pg.text()
 * - z.nanoid()              → pg.varchar({ maxLength: 21 })
 * - z.cuid2()               → pg.text()
 * - z.ulid()                → pg.varchar({ maxLength: 26 })
 * - z.xid()                 → pg.varchar({ maxLength: 20 })
 * - z.ksuid()               → pg.varchar({ maxLength: 27 })
 * - z.base64()              → pg.text()
 * - z.base64url()           → pg.text()
 * - z.e164()                → pg.text() (phone numbers)
 * - z.jwt()                 → pg.text()
 * - z.guid()                → pg.uuid()
 * - z.ipv4()                → pg.inet()
 * - z.ipv6()                → pg.inet()
 * - z.mac()                 → pg.macaddr()
 * - z.cidrv4()              → pg.cidr()
 * - z.cidrv6()              → pg.cidr()
 * - z.float32()             → pg.float4()
 * - z.float64()             → pg.float8()
 * - z.int32()               → pg.int4()
 * - z.uint32()              → pg.int8()
 * - z.X().nullable()        → adds nullable: true to the result
 * - z.X().optional()        → also adds nullable: true to the result
 * - z.X().default(val)      → adds default: val to the result
 * - z.X().dbPk()            → adds primaryKey: true to the result
 *
 * Note: z.int(), z.int32(), z.uint32(), z.float32(), z.float64() at type-level
 * are indistinguishable (all are ZodNumberFormat).
 *
 * Candidates for future implementation:
 *
 * BigInt subtypes
 * - z.int64()                              → pg.int8()
 * - z.uint64()                             → pg.numeric(20,0)
 *
 * Other types
 * - z.enum([...])                          → pg.text()       (or check
 *   constraint)
 * - z.nativeEnum({...})                    → pg.text()
 * - z.symbol()                             → pg.text()       (stored as string)
 * - z.nan()                                → pg.float4()
 * - z.object() / z.record() / z.array()    → pg.jsonb()
 * - z.undefined / z.null / z.void          → → (unlikely column types)
 */
export function derivePgColumn<T extends ZodType>(
  schema: T & { db?: Partial<ZodDbParams> },
): DerivePgColumnImproved<T> {
  let node = schema;
  let nullable = false;
  let defaultValue: unknown = undefined;
  let primaryKey = false;

  // Unwrap modifiers (.nullable, .optional, .default) to get to the base type
  while (true) {
    if (node.db?.primaryKey === true) primaryKey = true;
    if (node instanceof z.ZodNullable) {
      nullable = true;
      node = node.def.innerType as typeof node;
    } else if (node instanceof z.ZodOptional) {
      nullable = true;
      node = node.def.innerType as typeof node;
    } else if (node instanceof z.ZodDefault) {
      defaultValue = node.def.defaultValue;
      node = node.def.innerType as typeof node;
    } else {
      break;
    }
  }

  // Create params for the pg.X(params) call
  let pgParamsBase: Partial<Params> = {};
  if (nullable) pgParamsBase.nullable = true;
  if (typeof defaultValue !== "undefined") pgParamsBase.default = defaultValue;
  if (primaryKey) {
    pgParamsBase.primaryKey = true;
    if (node instanceof z.ZodNumberFormat || node instanceof z.ZodBigInt) {
      pgParamsBase.autoIncrement = true;
    }
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

  if (node instanceof z.ZodBigInt) {
    return pg.int8(pgParamsBase) as ColumnType<any, any>;
  }

  if (node instanceof z.ZodNumberFormat) {
    // z.int() / z.float32() / z.float64() / z.int32() / z.uint32()
    //
    // Distinguish by the format string on the definition, only available at
    // runtime.
    const format = (node._zod.def as any).format;
    if (format === "float32") {
      return pg.float4(pgParamsBase) as ColumnType<any, any>;
    } else if (format === "float64") {
      return pg.float8(pgParamsBase) as ColumnType<any, any>;
    } else if (format === "safeint" || format === "int32") {
      return pg.int4(pgParamsBase) as ColumnType<any, any>;
    } else if (format === "uint32") {
      return pg.int8(pgParamsBase) as ColumnType<any, any>;
    }
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
// DerivePgTable — Type level
// ---------------------------------------------------------------------------

/** Add foreignKeyTable/foreignKeyColumn params from dbFk metadata */
type WithFkParams<
  C,
  FKRel extends { schema: { db: { tableName: string } }; key: string },
> =
  C extends ColumnType<infer Type, infer Params>
    ? ColumnType<
        Type,
        FinalType<
          Omit<Params, "type"> & {
            foreignKeyTable: FKRel["schema"]["db"]["tableName"];
            foreignKeyColumn: FKRel["key"];
          }
        >
      >
    : C extends ColumnTypeSingualr<infer Type>
      ? ColumnType<
          Type,
          {
            foreignKeyTable: FKRel["schema"]["db"]["tableName"];
            foreignKeyColumn: FKRel["key"];
          }
        >
      : never;

/**
 * Derive a PgTable type from a ZodObject with dbTable metadata.
 *
 * - Columns are derived from each shape key using {@link DerivePgColumn}.
 * - Fields with `.dbRef` (navigations) are excluded from the columns map.
 * - Fields with `.dbFk` get additional `foreignKeyTable` / `foreignKeyColumn`
 *   parameters.
 * - The table name is read from `db.tableName` metadata on the ZodObject.
 *
 * Only ZodObjects that have had `.dbTable(tableName)` called will match;
 * plain ZodObjects (without the metadata) resolve to `never`.
 */
export type DerivePgTable<T extends z.ZodObject & ZodDbTableName<string>> =
  Table<
    T["db"]["tableName"],
    {
      [K in keyof T["shape"] as T["shape"][K] extends ZodDbNavigate<
        z.ZodObject,
        string
      >
        ? never
        : K]: T["shape"][K] extends ZodDbFk<z.ZodObject, string>
        ? WithFkParams<
            DerivePgColumnImproved<T["shape"][K]>,
            T["shape"][K]["db"]["fkRel"]
          >
        : DerivePgColumnImproved<T["shape"][K]>;
    }
  >;

// ---------------------------------------------------------------------------
// DerivePgTable — Runtime
// ---------------------------------------------------------------------------

type UnwrapDeriveTable<T> =
  T extends Table<infer Name, infer Columns> ? Table<Name, Columns> : never;

/**
 * Derive an ormer PgTable from a ZodObject schema.
 *
 * The ZodObject must have `.dbTable(tableName)` metadata. Each field in the
 * shape is processed through {@link derivePgColumn}. Foreign key fields
 * (`.dbFk(...)`) additionally receive `foreignKeyTable` / `foreignKeyColumn`
 * parameters. Navigation fields (`.dbRef`) are skipped.
 *
 * @example
 * ```ts
 * const InvoiceTable = derivePgTable(InvoiceSchema);
 * // InvoiceTable.table === "invoice"
 * // InvoiceTable.columns.id.type === "int4" (with primaryKey)
 * // InvoiceTable.columns.title.type === "text"
 * ```
 */
export function derivePgTable<T extends z.ZodObject & ZodDbTableName<string>>(
  schema: T,
): UnwrapDeriveTable<DerivePgTable<T>> {
  const dbMeta = (schema as any).db;
  if (!dbMeta || typeof dbMeta.tableName !== "string") {
    throw new Error(
      "ZodObject must have .dbTable() metadata. Call schema.dbTable('table_name')",
    );
  }
  const tableName = dbMeta.tableName;

  const shape = (schema as any).shape;
  const columns: Record<string, any> = {};

  for (const key of Object.keys(shape)) {
    const fieldSchema = shape[key];

    // Skip navigations (dbRef) — handled as relationship metadata.
    if (fieldSchema.db && Object.hasOwn(fieldSchema.db, "navRel")) continue;

    // Foreign key
    if (fieldSchema.db && Object.hasOwn(fieldSchema.db, "fkRel")) {
      const refSchema = fieldSchema.db.fkRel.schema;
      const refKey = fieldSchema.db.fkRel.key;
      const col = derivePgColumn(fieldSchema);
      columns[key] = {
        ...col,
        foreignKeyTable: refSchema.db.tableName,
        foreignKeyColumn: refKey,
      };
      continue;
    }

    // Regular column
    columns[key] = derivePgColumn(fieldSchema);
  }

  return table(tableName as never, columns) as any;
}
