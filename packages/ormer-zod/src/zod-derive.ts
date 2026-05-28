import { pg } from "ormer";
import type { ColumnType, ColumnTypeSingualr } from "ormer";
import type { z } from "zod";

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

/** The fully derived pg column type from a Zod schema */
export type DerivePgColumn<T extends ZodType> =
  IsNullable<T> extends true
    ? WithParams<DeriveBaseColumn<T>, { nullable: true }>
    : DeriveBaseColumn<T>;

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
  if (inner.dbPk) paramsBase.primaryKey = true;

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
      return (hasParams ? pg.int8(paramsBase) : pg.int8()) as any;

    case "ZodNumberFormat":
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

export function derivePgTable() {
  // TODO: Implement, this should take in a ZodObjects and derive a PgTable from
  // it, using the dbTable, dbPk, dbFk, and dbNavigate metadata. It should be
  // typesafe, meaning that pgtable retains the column names etc what can be
  // retained in the type level.
}
