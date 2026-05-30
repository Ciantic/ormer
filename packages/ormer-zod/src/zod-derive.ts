import { pg, table } from "ormer";
import type { ColumnType, ColumnTypeSingualr, Table } from "ormer";
import type { z } from "zod";

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

type HasDbPk<T extends ZodType> = T extends { isDbPk: true } ? true : false;

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
  schema: T,
): DerivePgColumnImproved<T> {
  // deno-lint-ignore no-explicit-any
  let node: any = schema;
  let nullable = false;
  let defaultValue: unknown = undefined;

  // deno-lint-ignore no-explicit-any
  const paramsBase: any = {};

  // Unwrap ZodNullable and ZodDefault wrappers to get the inner type.
  // retain nullable/default metadata from wrappers along the way.
  // eslint-disable-next-line no-constant-condition
  while (true) {
    if (node.isDbPk === true) paramsBase.primaryKey = true;
    if (node.def.type === "nullable") {
      nullable = true;
      node = node.def.innerType;
    } else if (node.def.type === "optional") {
      nullable = true;
      node = node.def.innerType;
    } else if (node.def.type === "default") {
      defaultValue = node.def.defaultValue;
      node = node.def.innerType;
    } else {
      break;
    }
  }
  const inner: any = node;

  if (nullable) paramsBase.nullable = true;
  if (inner.isDbPk === true) paramsBase.primaryKey = true;
  if (defaultValue !== undefined) paramsBase.default = defaultValue;

  const hasParams = Object.keys(paramsBase).length > 0;

  switch (inner.constructor.name) {
    case "ZodUUID":
      return (hasParams ? pg.uuid(paramsBase) : pg.uuid()) as any;

    case "ZodString": {
      const maxLength: number | null = inner.maxLength;

      if (maxLength != null)
        return pg.varchar({ maxLength, ...paramsBase }) as any;
      return (hasParams ? pg.text(paramsBase) : pg.text()) as any;
    }

    case "ZodEmail":
      return (hasParams ? pg.text(paramsBase) : pg.text()) as any;

    case "ZodBigInt":
      if (paramsBase.primaryKey === true)
        return pg.int8({ ...paramsBase, autoIncrement: true }) as any;
      return (hasParams ? pg.int8(paramsBase) : pg.int8()) as any;

    case "ZodNumberFormat":
      if (paramsBase.primaryKey === true)
        return pg.int4({ ...paramsBase, autoIncrement: true }) as any;
      return (hasParams ? pg.int4(paramsBase) : pg.int4()) as any;

    case "ZodNumber":
      return (hasParams ? pg.float8(paramsBase) : pg.float8()) as any;

    case "ZodBoolean":
      return (hasParams ? pg.boolean(paramsBase) : pg.boolean()) as any;

    case "ZodDate":
      return (hasParams ? pg.timestamptz(paramsBase) : pg.timestamptz()) as any;

    default:
      throw new Error(`Unsupported Zod type: ${inner.constructor.name}`);
  }
}

// ---------------------------------------------------------------------------
// DerivePgTable — Type level
// ---------------------------------------------------------------------------

/** Add foreignKeyTable/foreignKeyColumn params from dbFk metadata */
type WithFkParams<
  C,
  FKRel extends { schema: { dbTableName: string }; key: string },
> =
  C extends ColumnType<infer Type, infer Params>
    ? ColumnType<
        Type,
        FinalType<
          Omit<Params, "type"> & {
            foreignKeyTable: FKRel["schema"]["dbTableName"];
            foreignKeyColumn: FKRel["key"];
          }
        >
      >
    : C extends ColumnTypeSingualr<infer Type>
      ? ColumnType<
          Type,
          {
            foreignKeyTable: FKRel["schema"]["dbTableName"];
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
 * - The table name is read from `dbTableName` metadata on the ZodObject.
 *
 * Only ZodObjects that have had `.dbTable(tableName)` called will match;
 * plain ZodObjects (without the metadata) resolve to `never`.
 */
export type DerivePgTable<T extends z.ZodObject & { dbTableName: string }> =
  Table<
    T["dbTableName"],
    {
      [K in keyof T["shape"] as T["shape"][K] extends {
        dbNavRel: { schema: z.ZodObject; key: string };
      }
        ? never
        : K]: T["shape"][K] extends {
        dbFkRel: { schema: z.ZodObject; key: string };
      }
        ? WithFkParams<
            DerivePgColumnImproved<T["shape"][K]>,
            T["shape"][K]["dbFkRel"]
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
export function derivePgTable<T extends z.ZodObject & { dbTableName: string }>(
  schema: T,
): UnwrapDeriveTable<DerivePgTable<T>> {
  const tableName = (schema as any).dbTableName;
  if (typeof tableName !== "string") {
    throw new Error(
      "ZodObject must have .dbTable() metadata. Call schema.dbTable('table_name')",
    );
  }

  const shape = (schema as any).shape;
  const columns: Record<string, any> = {};

  for (const key of Object.keys(shape)) {
    const fieldSchema = shape[key];

    // Skip navigations (dbRef) — handled as relationship metadata.
    // Must check hasOwnProperty because dbRef is a prototype method on all ZodTypes.
    if (Object.hasOwn(fieldSchema, "dbNavRel")) continue;

    // Foreign key — must check hasOwnProperty because dbFk is a prototype
    // method on all ZodTypes.
    if (Object.hasOwn(fieldSchema, "dbFkRel")) {
      const refSchema = fieldSchema.dbFkRel.schema;
      const refKey = fieldSchema.dbFkRel.key;
      const col = derivePgColumn(fieldSchema);
      columns[key] = {
        ...col,
        foreignKeyTable: refSchema.dbTableName,
        foreignKeyColumn: refKey,
      };
      continue;
    }

    // Regular column
    columns[key] = derivePgColumn(fieldSchema);
  }

  return table(tableName as never, columns) as any;
}
