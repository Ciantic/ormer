import { sqlite, table } from "ormer";
import type { ColumnType, ColumnTypeSingualr, Params, Table } from "ormer";
import type {
  ObjectSchema,
  StringSchema,
  NumberSchema,
  BigintSchema,
  BooleanSchema,
  DateSchema,
  ArraySchema,
  InferMetadata,
} from "valibot";
import { deriveColumn, extractDbMetadata } from "./derive.ts";
import type {
  ValibotSchema,
  UnwrapModifiers,
  HasPipeItem,
  RewrapToColumnType,
  RewrapDeriveTable,
  SafeParamDerivation,
  HasDbNavigation,
  DbTableName,
  HasDbTypeCheck,
  HasDbTypeRegex,
  HasBaseSchema,
} from "./common.ts";

// ---------------------------------------------------------------------------
// Type-level: DeriveBaseSqliteColumn
// ---------------------------------------------------------------------------

/**
 * Map a (possibly wrapped) valibot schema to a SQLite ColumnType.
 *
 * Pipe actions (brands, validation, etc.) are checked via PipeUnion which
 * walks through modifier wrappers. Schema-type checks use UnwrapModifiers
 * to reach the base schema after pipe branches don't match.
 *
 * SQLite only has 4 storage classes: INTEGER, REAL, TEXT, BLOB.
 * Many types that work in PG/DuckDB cannot round-trip in SQLite.
 */
// prettier-ignore
type DeriveBaseSqliteColumn<T extends ValibotSchema> =
  // Stringy formats
    HasPipeItem<T, "uuid"> extends true                    ? ColumnTypeSingualr<"text">
  : HasPipeItem<T, "email"> extends true                   ? ColumnType<"text", { check: (col: string) => string }>
  : HasPipeItem<T, "nanoid"> extends true                  ? ColumnType<"text", { check: (col: string) => string }>
  : HasPipeItem<T, "ulid"> extends true                    ? ColumnType<"text", { check: (col: string) => string }>

  // Network types
  : HasPipeItem<T, "ipv4"> extends true                    ? ColumnTypeSingualr<"text">
  : HasPipeItem<T, "ipv6"> extends true                    ? ColumnTypeSingualr<"text">
  : HasPipeItem<T, "mac"> extends true                     ? ColumnTypeSingualr<"text">

  // Datetime formats
  : HasDbTypeRegex<T, "naiveDatetime"> extends true              ? ColumnTypeSingualr<"text">
  : HasPipeItem<T, "iso_time"> extends true                ? ColumnTypeSingualr<"text">
  : HasPipeItem<T, "iso_time_second"> extends true         ? ColumnTypeSingualr<"text">
  : HasPipeItem<T, "iso_date"> extends true                ? ColumnTypeSingualr<"text">
  : HasPipeItem<T, "iso_date_time"> extends true           ? ColumnTypeSingualr<"text">
  : HasPipeItem<T, "iso_date_time_second"> extends true    ? ColumnTypeSingualr<"text">
  : HasBaseSchema<T, DateSchema<any>> extends true ? { type: "ERROR" }

  // String
  : HasBaseSchema<T, StringSchema<any>> extends true ? 
        HasPipeItem<T, "max_length"> extends true
      ? ColumnType<"text", { check: (col: string) => string }>
      : ColumnTypeSingualr<"text">

  // Number formats — SQLite INTEGER is always number, can't round-trip bigint
  : HasDbTypeCheck<T, "int8"> extends true                    ? ColumnTypeSingualr<"integer">
  : HasDbTypeCheck<T, "int16"> extends true                   ? ColumnTypeSingualr<"integer">
  : HasDbTypeCheck<T, "int32"> extends true                   ? ColumnTypeSingualr<"integer">
  : HasDbTypeCheck<T, "uint8"> extends true                   ? ColumnTypeSingualr<"integer">
  : HasDbTypeCheck<T, "uint16"> extends true                  ? ColumnTypeSingualr<"integer">
  : HasDbTypeCheck<T, "uint32"> extends true                  ? ColumnTypeSingualr<"integer">
  : HasDbTypeCheck<T, "float32"> extends true                 ? ColumnTypeSingualr<"real">
  : HasDbTypeCheck<T, "float64"> extends true                 ? ColumnTypeSingualr<"real">
  : HasDbTypeCheck<T, "int64"> extends true                   ? { type: "ERROR" }
  : HasDbTypeCheck<T, "uint64"> extends true                  ? { type: "ERROR" }
  : HasDbTypeCheck<T, "int128"> extends true                  ? { type: "ERROR" }
  : HasDbTypeCheck<T, "uint128"> extends true                 ? { type: "ERROR" }
  : HasPipeItem<T, "safe_integer"> extends true          ? ColumnTypeSingualr<"integer">
  : HasPipeItem<T, "integer"> extends true               ? ColumnTypeSingualr<"integer">
  : HasBaseSchema<T, NumberSchema<any>> extends true     ? ColumnTypeSingualr<"real">
  : HasBaseSchema<T, BigintSchema<any>> extends true     ? { type: "ERROR" }

  // Boolean — SQLite has no boolean type, stores 0/1, can't round-trip
  : HasBaseSchema<T, BooleanSchema<any>> extends true    ? { type: "ERROR" }

  // JSON — SQLite stores as text, can't round-trip
  : HasBaseSchema<T, ObjectSchema<any, any>> extends true ? { type: "ERROR" }

  // Array (this shouldn't be reached since SafeParamDerivation catches it first)
  : UnwrapModifiers<T> extends ArraySchema<infer Inner extends ValibotSchema, any> ? DeriveBaseSqliteColumn<Inner>

  // Unsupported
  : never;

// ---------------------------------------------------------------------------
// Type-level: DeriveSqliteColumn
// ---------------------------------------------------------------------------

/**
 * Derive a SQLite column type from a valibot schema.
 */
// prettier-ignore
export type DeriveSqliteColumn<T extends ValibotSchema> =
    // Explicit .dbSqliteColumnType() override — skip derivation entirely
    InferMetadata<T> extends { sqliteColumnType: infer C } ? C

  // SQLite has no array types — error out
  : SafeParamDerivation<T> extends { array: string }
    ? { type: "ERROR" }

  // Otherwise, derive from the base type + modifiers (only if not ERROR)
  : DeriveBaseSqliteColumn<T> extends { type: "ERROR" }
    ? { type: "ERROR" }
    : RewrapToColumnType<
        DeriveBaseSqliteColumn<T> & SafeParamDerivation<T>
      >;

// ---------------------------------------------------------------------------
// Type-level: DeriveSqliteTable
// ---------------------------------------------------------------------------

/**
 * Derive a SQLite table type from a valibot object schema with dbTable metadata.
 */
// prettier-ignore
export type DeriveSqliteTable<
  T extends ObjectSchema<any, any> & { pipe?: readonly any[] },
> = RewrapDeriveTable<
  Table<
    DbTableName<T & ValibotSchema>,
    {
      [K in keyof T["entries"] &
        string as T["entries"][K] extends infer Entry
        ? Entry extends ValibotSchema
          ? HasDbNavigation<Entry> extends true
            ? never
            : K
          : K
        : K
      ]: DeriveSqliteColumn<
        T["entries"][K] extends ValibotSchema ? T["entries"][K] : never
      >;
    }
  >
>;

// ---------------------------------------------------------------------------
// Runtime helpers
// ---------------------------------------------------------------------------

/**
 * Strips the `array` and `maxLength` properties from params before passing
 * to sqlite.*() calls.
 *
 * - `array`: SQLite has no native array type.
 * - `maxLength`: Replaced by a CHECK constraint generated at runtime.
 */
function stripDerived(
  params: Record<string, unknown>,
): Record<string, unknown> {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
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
 * Derive a SQLite column from a valibot schema.
 */
export function deriveSqliteColumn<T extends ValibotSchema>(
  schema: T,
): DeriveSqliteColumn<T> {
  // Check for explicit dbSqliteColumnType override in metadata
  const dbMeta = extractDbMetadata(schema);
  if (dbMeta?.sqliteColumnType) {
    return dbMeta.sqliteColumnType as ColumnType<any, any>;
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
        return sqlite.text(p as Params);
      case "email":
        return sqlite.text({
          ...p,
          check: (c: string) => maxLengthCheck(c, 320),
        } as Params);
      case "ipv4":
      case "ipv6":
      case "mac":
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
      case "string":
        if ("maxLength" in params && typeof params.maxLength === "number") {
          return sqlite.text({
            ...p,
            check: (c: string) => maxLengthCheck(c, params.maxLength),
          } as Params);
        }
        return sqlite.text(p as Params);
      case "isoTime":
      case "isoTimeSecond":
      case "isoDate":
      case "isoDatetime":
      case "naiveDatetime":
        return sqlite.text(p as Params);
      case "integer":
      case "int8":
      case "int16":
      case "int32":
      case "uint8":
      case "uint16":
      case "uint32":
        return sqlite.integer(p as Params);
      case "int64":
      case "uint64":
      case "int128":
      case "uint128":
      case "bigint":
        throw new Error(
          `BigInt / Int64 / UInt64 / Int128 / UInt128 is not supported by deriveSqliteColumn. SQLite INTEGER maps to number and cannot round-trip bigint values.`,
        );
      case "float32":
      case "float64":
      case "number":
        return sqlite.real(p as Params);
      case "boolean":
        throw new Error(
          `Boolean is not supported by deriveSqliteColumn. SQLite has no boolean type (stores 0/1 in INTEGER) and cannot round-trip. Use .dbSqlite() to make an explicit choice.`,
        );
      case "date":
        throw new Error(
          `Date is not supported by deriveSqliteColumn. SQLite has no native date type and cannot round-trip. Use .dbSqlite() to make an explicit choice.`,
        );
      case "json":
      case "object":
        throw new Error(
          `Object / JSON is not supported by deriveSqliteColumn. SQLite has no JSON type and cannot round-trip. Use .dbSqlite() to make an explicit choice.`,
        );
    }
  }) as any;
}

// ---------------------------------------------------------------------------
// deriveSqliteTable
// ---------------------------------------------------------------------------

/**
 * Derive an ormer SQLite table from a valibot object schema.
 */
export function deriveSqliteTable<
  T extends ObjectSchema<any, any> & { pipe?: readonly any[] },
>(schema: T): DeriveSqliteTable<T> {
  const dbMeta = extractDbMetadata(schema);
  if (!dbMeta || typeof dbMeta.tableName !== "string") {
    throw new Error(
      "Valibot object must have .dbTable() metadata. Call d.dbTable('table_name') in the pipe.",
    );
  }
  const tableName = dbMeta.tableName;

  const entries = schema.entries ?? {};
  const columns: Record<string, ColumnType<any, any>> = {};

  for (const key of Object.keys(entries)) {
    const entry = entries[key];
    if (!entry) continue;
    const entryMeta = extractDbMetadata(entry);
    if (entryMeta?.navigation) {
      // Skip navigations (dbRef) — handled as relationship metadata
      continue;
    }
    columns[key] = deriveSqliteColumn(entry);
  }

  return table(tableName as never, columns) as any;
}
