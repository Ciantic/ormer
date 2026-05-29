import { pg, table } from "ormer";
import type { ColumnType, ColumnTypeSingualr, Table } from "ormer";
import type { z } from "zod";

type FinalType<T> = T extends infer U ? { [K in keyof U]: U[K] } : never;

type ZodType = z.ZodType;

// ---------------------------------------------------------------------------
// Type-level derivation
// ---------------------------------------------------------------------------

/** Extract the inner Zod type, unwrapping ZodNullable */
type UnwrapNullable<T extends ZodType> =
  T extends z.ZodNullable<infer Inner> ? Inner : T;

/** Whether the Zod type is nullable */
type IsNullable<T extends ZodType> =
  T extends z.ZodNullable<any> ? true : false;

/** Map a non-nullable Zod type to a union of possible pg column types */
type DeriveBaseColumn<T extends ZodType> =
  UnwrapNullable<T> extends z.ZodUUID
    ? ColumnTypeSingualr<"uuid">
    : UnwrapNullable<T> extends z.ZodBigInt
      ? ColumnTypeSingualr<"int8">
      : UnwrapNullable<T> extends z.ZodString
        ?
            | ColumnTypeSingualr<"text">
            | ColumnType<"varchar", { maxLength: number }>
        : UnwrapNullable<T> extends z.ZodNumberFormat
          ? ColumnTypeSingualr<"int4">
          : UnwrapNullable<T> extends z.ZodNumber
            ? ColumnTypeSingualr<"float8"> | ColumnTypeSingualr<"int4">
            : UnwrapNullable<T> extends z.ZodBoolean
              ? ColumnTypeSingualr<"boolean">
              : UnwrapNullable<T> extends z.ZodDate
                ? ColumnTypeSingualr<"timestamptz">
                : never;

/** Add extra params to a pg column type */
type WithParams<C, P> =
  C extends ColumnType<infer Type, infer Existing>
    ? ColumnType<Type, Existing & P>
    : C extends ColumnTypeSingualr<infer Type>
      ? ColumnType<Type, P>
      : never;

/** DeriveBaseColumn with primaryKey and serial type adjustment for dbPk */
type DerivePgColumnInner<T extends ZodType> =
  UnwrapNullable<T> extends { idDbPk: true }
    ? UnwrapNullable<T> extends z.ZodBigInt
      ? ColumnType<"serial8", { primaryKey: true }>
      : UnwrapNullable<T> extends z.ZodNumberFormat
        ? ColumnType<"serial4", { primaryKey: true }>
        : WithParams<DeriveBaseColumn<T>, { primaryKey: true }>
    : DeriveBaseColumn<T>;

/** The fully derived pg column type from a Zod schema */
export type DerivePgColumn<T extends ZodType> =
  IsNullable<T> extends true
    ? WithParams<DerivePgColumnInner<T>, { nullable: true }>
    : DerivePgColumnInner<T>;

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
 * - z.number()           → pg.float8()
 * - z.number().int()     → pg.int8()
 * - z.boolean()          → pg.boolean()
 * - z.date()             → pg.timestamptz()
 * - z.X().nullable()     → adds nullable: true to the result
 * - z.X().dbPk()         → adds primaryKey: true to the result
 */
export function derivePgColumn<T extends ZodType>(
  schema: T,
): DerivePgColumn<T> {
  const nullable = schema.def.type === "nullable";
  // deno-lint-ignore no-explicit-any
  const inner: any = nullable ? (schema as any).def.innerType : schema;

  // deno-lint-ignore no-explicit-any
  const paramsBase: any = {};
  if (nullable) paramsBase.nullable = true;
  if (inner.idDbPk === true) paramsBase.primaryKey = true;

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

    case "ZodBigInt":
      if (inner.idDbPk === true) return pg.serial8(paramsBase) as any;
      return (hasParams ? pg.int8(paramsBase) : pg.int8()) as any;

    case "ZodNumberFormat":
      if (inner.idDbPk === true) return pg.serial4(paramsBase) as any;
      return (hasParams ? pg.int4(paramsBase) : pg.int4()) as any;

    case "ZodNumber": {
      if (inner.isInt)
        return (hasParams ? pg.int4(paramsBase) : pg.int4()) as any;
      return (hasParams ? pg.float8(paramsBase) : pg.float8()) as any;
    }

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
        Params & {
          foreignKeyTable: FKRel["schema"]["dbTableName"];
          foreignKeyColumn: FKRel["key"];
        }
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
  FinalType<
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
              DerivePgColumn<T["shape"][K]>,
              T["shape"][K]["dbFkRel"]
            >
          : DerivePgColumn<T["shape"][K]>;
      }
    >
  >;

// ---------------------------------------------------------------------------
// DerivePgTable — Runtime
// ---------------------------------------------------------------------------

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
): DerivePgTable<T> {
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
