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

type UnwrapUntilReturnTrue<T, Check> = T extends Check
  ? true
  : T extends z.ZodNullable<infer Inner extends ZodType>
    ? UnwrapUntilReturnTrue<Inner, Check>
    : T extends z.ZodOptional<infer Inner extends ZodType>
      ? UnwrapUntilReturnTrue<Inner, Check>
      : T extends z.ZodDefault<infer Inner extends ZodType>
        ? UnwrapUntilReturnTrue<Inner, Check>
        : false;

type UnwrapModifiers<T extends ZodType> =
  T extends z.ZodNullable<infer Inner extends ZodType>
    ? UnwrapModifiers<Inner>
    : T extends z.ZodOptional<infer Inner extends ZodType>
      ? UnwrapModifiers<Inner>
      : T extends z.ZodDefault<infer Inner extends ZodType>
        ? UnwrapModifiers<Inner>
        : T;

type IsNullable<T extends ZodType> =
  UnwrapUntilReturnTrue<T, z.ZodNullable<any> | z.ZodOptional<any>> extends true
    ? true
    : false;

type HasDefaultValue<T extends ZodType> =
  UnwrapUntilReturnTrue<T, z.ZodDefault<any>> extends true ? true : false;

type HasDbPk<T extends ZodType> = T extends ZodDbPrimaryKey ? true : false;

/** Map a non-nullable Zod type to a union of possible pg column types */
type DeriveBaseColumn<T extends ZodType> = T extends z.ZodUUID
  ? ColumnTypeSingualr<"uuid">
  : T extends z.ZodInt
    ? ColumnTypeSingualr<"int4">
    : T extends z.ZodType<bigint, bigint>
      ? ColumnTypeSingualr<"int8">
      : T extends z.ZodType<string, string>
        ?
            | ColumnTypeSingualr<"text">
            | ColumnType<"varchar", { maxLength: number }>
        : T extends z.ZodType<number, number>
          ? ColumnTypeSingualr<"float8">
          : T extends z.ZodType<boolean, boolean>
            ? ColumnTypeSingualr<"boolean">
            : T extends z.ZodType<Date, Date>
              ? ColumnTypeSingualr<"timestamptz">
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
 * Mapping:
 * - z.string()           → pg.text()
 * - z.string().max(255)  → pg.varchar(255)
 * - z.string().uuid()    → pg.uuid()
 * - z.string().email()   → pg.text()
 * - z.uuid()             → pg.uuid()
 * - z.number()           → pg.float8()
 * - z.number().int()     → pg.float8()
 * - z.int()              → pg.int4()
 * - z.int().dbPk()       → pg.int4({ primaryKey: true, autoIncrement: true })
 * - z.bigint()           → pg.int8()
 * - z.bigint().dbPk()    → pg.int8({ primaryKey: true, autoIncrement: true })
 * - z.boolean()          → pg.boolean()
 * - z.date()             → pg.timestamptz()
 * - z.X().nullable()     → adds nullable: true to the result
 * - z.X().optional()     → also adds nullable: true to the result
 * - z.X().default(val)   → adds default: val to the result
 * - z.X().dbPk()         → adds primaryKey: true to the result
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
  const pgParamsBase: Partial<Params> = {
    ...(nullable ? { nullable: true } : {}),
    ...(typeof defaultValue !== "undefined"
      ? { default: defaultValue as unknown }
      : {}),
    ...(primaryKey ? { primaryKey: true } : {}),
    ...(node instanceof z.ZodNumberFormat || node instanceof z.ZodBigInt
      ? { autoIncrement: true }
      : {}),
  };

  if (node instanceof z.ZodUUID) {
    return pg.uuid(pgParamsBase) as ColumnType<any, any>;
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
    return pg.int4(pgParamsBase) as ColumnType<any, any>;
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
