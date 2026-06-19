import { duckdb, table } from "ormer";
import type { ColumnType, ColumnTypeSingualr, Params, Table } from "ormer";
import type {
  ObjectSchema,
  StringSchema,
  NumberSchema,
  BigintSchema,
  BooleanSchema,
  DateSchema,
  ArraySchema,
} from "valibot";
import { deriveColumn, extractDbMetadata } from "./derive.ts";
import type {
  ValibotSchema,
  UnwrapModifiers,
  HasPipeItem,
  GetPipeItemProp,
  RewrapToColumnType,
  RewrapDeriveTable,
  SafeParamDerivation,
  HasDbNavigation,
  DbTableName,
  DbMetadataOf,
  HasDbTypeCheck,
  HasDbTypeRegex,
  HasBaseSchema,
} from "./common.ts";

// ---------------------------------------------------------------------------
// Type-level: DeriveDuckDbColumn
// ---------------------------------------------------------------------------

/**
 * Map a (possibly wrapped) valibot schema to a DuckDB ColumnType.
 *
 * Pipe actions (brands, validation, etc.) are checked via PipeUnion which
 * walks through modifier wrappers. Schema-type checks use UnwrapModifiers
 * to reach the base schema after pipe branches don't match.
 */
// prettier-ignore
type DeriveBaseDuckDbColumn<T extends ValibotSchema> =
  // Stringy formats
    HasPipeItem<T, "uuid"> extends true                    ? ColumnTypeSingualr<"uuid">
  : HasPipeItem<T, "email"> extends true                   ? ColumnType<"varchar", { maxLength: 320 }>
  : HasPipeItem<T, "nanoid"> extends true                  ? ColumnType<"varchar", { maxLength: 21 }>
  : HasPipeItem<T, "ulid"> extends true                    ? ColumnType<"varchar", { maxLength: 26 }>

  // DuckDB has no inet/macaddr → fall back to text
  : HasPipeItem<T, "ipv4"> extends true                    ? ColumnTypeSingualr<"text">
  : HasPipeItem<T, "ipv6"> extends true                    ? ColumnTypeSingualr<"text">
  : HasPipeItem<T, "mac"> extends true                     ? ColumnTypeSingualr<"text">

  // Datetime formats
  : HasDbTypeRegex<T, "naiveDatetime"> extends true              ? ColumnTypeSingualr<"timestamp">
  : HasPipeItem<T, "iso_time"> extends true                ? { type: "ERROR" }
  : HasPipeItem<T, "iso_time_second"> extends true         ? ColumnTypeSingualr<"time">
  : HasPipeItem<T, "iso_date"> extends true                ? ColumnTypeSingualr<"date">
  : HasPipeItem<T, "iso_date_time"> extends true           ? { type: "ERROR" }
  : HasPipeItem<T, "iso_date_time_second"> extends true    ? { type: "ERROR" }
  : HasBaseSchema<T, DateSchema<any>> extends true ? ColumnTypeSingualr<"timestamptz">

  // String
  : HasBaseSchema<T, StringSchema<any>> extends true ? 
        HasPipeItem<T, "max_length"> extends true
      ? ColumnType<"varchar", { maxLength: GetPipeItemProp<T, "max_length", "requirement"> }>
      : ColumnTypeSingualr<"text">

  // Number formats
  : HasDbTypeCheck<T, "int8"> extends true                    ? ColumnTypeSingualr<"int1">
  : HasDbTypeCheck<T, "int16"> extends true                   ? ColumnTypeSingualr<"int2">
  : HasDbTypeCheck<T, "int32"> extends true                   ? ColumnTypeSingualr<"int4">
  : HasDbTypeCheck<T, "uint8"> extends true                   ? ColumnTypeSingualr<"utinyint">
  : HasDbTypeCheck<T, "uint16"> extends true                  ? ColumnTypeSingualr<"usmallint">
  : HasDbTypeCheck<T, "uint32"> extends true                  ? ColumnTypeSingualr<"uinteger">
  : HasDbTypeCheck<T, "int64"> extends true                   ? ColumnTypeSingualr<"int8">
  : HasDbTypeCheck<T, "uint64"> extends true                  ? ColumnTypeSingualr<"ubigint">
  : HasDbTypeCheck<T, "int128"> extends true                  ? ColumnTypeSingualr<"hugeint">
  : HasDbTypeCheck<T, "uint128"> extends true                 ? ColumnTypeSingualr<"uhugeint">
  : HasDbTypeCheck<T, "float32"> extends true                 ? ColumnTypeSingualr<"float4">
  : HasDbTypeCheck<T, "float64"> extends true                 ? ColumnTypeSingualr<"float8">
  : HasPipeItem<T, "safe_integer"> extends true          ? ColumnTypeSingualr<"int4">
  : HasPipeItem<T, "integer"> extends true               ? ColumnTypeSingualr<"int4">
  : HasBaseSchema<T, NumberSchema<any>> extends true     ? ColumnTypeSingualr<"float8">
  : HasBaseSchema<T, BigintSchema<any>> extends true     ? ColumnTypeSingualr<"int8">

  // Boolean 
  : HasBaseSchema<T, BooleanSchema<any>> extends true    ? ColumnTypeSingualr<"boolean">
  
  // JSON — DuckDB uses json, not jsonb
  : HasBaseSchema<T, ObjectSchema<any, any>> extends true ? ColumnType<"json", { schema: T }>

  // Array
  : UnwrapModifiers<T> extends ArraySchema<infer Inner extends ValibotSchema, any> ? DeriveBaseDuckDbColumn<Inner>

  // Unsupported
  : never;

/**
 * Derive a DuckDB column type from a valibot schema.
 *
 * 1. Check for explicit .dbDuckDbColumnType() override in pipe metadata.
 * 2. Otherwise, derive from the base type + modifier params.
 */
// prettier-ignore
export type DeriveDuckDbColumn<T extends ValibotSchema> =
    // Explicit .dbDuckDbColumnType() override — skip derivation entirely
    DbMetadataOf<T> extends { duckDbColumnType: infer C } ? C
  : DeriveBaseDuckDbColumn<T> extends { type: "ERROR" }
    ? { type: "ERROR" }
    : RewrapToColumnType<
    DeriveBaseDuckDbColumn<T> & SafeParamDerivation<T>
  >;

// ---------------------------------------------------------------------------
// Type-level: DeriveDuckDbTable
// ---------------------------------------------------------------------------

/**
 * Derive a DuckDB table type from a valibot object schema with dbTable metadata.
 */
// prettier-ignore
export type DeriveDuckDbTable<
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
      ]: DeriveDuckDbColumn<
        T["entries"][K] extends ValibotSchema ? T["entries"][K] : never
      >;
    }
  >
>;

// ---------------------------------------------------------------------------
// Runtime implementation
// ---------------------------------------------------------------------------

/**
 * Derive a DuckDB column from a valibot schema.
 */
export function deriveDuckDbColumn<T extends ValibotSchema>(
  schema: T,
): DeriveDuckDbColumn<T> {
  // Check for explicit dbDuckDbColumnType override in metadata
  const dbMeta = extractDbMetadata(schema);
  if (dbMeta?.duckDbColumnType) {
    return dbMeta.duckDbColumnType as ColumnType<any, any>;
  }

  return deriveColumn(schema, ([t, params]) => {
    switch (t) {
      case "uuid":
        return duckdb.uuid(params);
      case "email":
        return duckdb.varchar(params);
      case "nanoid":
        return duckdb.varchar(params);
      case "ulid":
        return duckdb.varchar(params);
      case "string":
        return "maxLength" in params
          ? duckdb.varchar(params)
          : duckdb.text(params);
      case "ipv4":
      case "ipv6":
      case "mac":
        return duckdb.text(params);
      case "isoTime":
        throw new Error(
          `v.isoTime() is not supported by deriveDuckDbColumn. Use v.isoTimeSecond() instead.`,
        );
      case "isoTimeSecond":
        return duckdb.time(params);
      case "isoDate":
        return duckdb.date(params);
      case "isoDatetime":
        throw new Error(
          `v.isoDateTime() is not supported by deriveDuckDbColumn. Use d.naiveDatetime() instead.`,
        );
      case "naiveDatetime":
        return duckdb.timestamp(params as Params);
      case "integer":
        return duckdb.int4(params);
      case "int8":
        return duckdb.int1(params);
      case "int16":
        return duckdb.int2(params);
      case "int64":
      case "bigint":
        return duckdb.int8(params);
      case "uint8":
        return duckdb.utinyint(params);
      case "uint16":
        return duckdb.usmallint(params);
      case "uint64":
        return duckdb.ubigint(params);
      case "int32":
        return duckdb.int4(params);
      case "uint32":
        return duckdb.uinteger(params);
      case "int128":
        return duckdb.hugeint(params);
      case "uint128":
        return duckdb.uhugeint(params);
      case "float32":
        return duckdb.float4(params);
      case "float64":
      case "number":
        return duckdb.float8(params);
      case "boolean":
        return duckdb.boolean(params);
      case "date":
        return duckdb.timestamptz(params as Params);
      case "json":
      case "object": {
        if (!("schema" in params)) {
          throw new Error(
            `Object types must have a "schema" property for deriveColumn.`,
          );
        }
        return duckdb.json(params as any);
      }
    }
  }) as any;
}

// ---------------------------------------------------------------------------
// deriveDuckDbTable
// ---------------------------------------------------------------------------

/**
 * Derive an ormer DuckDB table from a valibot object schema.
 */
export function deriveDuckDbTable<
  T extends ObjectSchema<any, any> & { pipe?: readonly any[] },
>(schema: T): DeriveDuckDbTable<T> {
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
    columns[key] = deriveDuckDbColumn(entry);
  }

  return table(tableName as never, columns) as any;
}
