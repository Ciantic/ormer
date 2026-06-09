import { pg, table } from "ormer";
import type { ColumnType, ColumnTypeSingualr, Params, Table } from "ormer";
import type {
  BaseIssue,
  BaseSchema,
  SchemaWithPipe,
  ObjectSchema,
  StringSchema,
  NumberSchema,
  BigintSchema,
  BooleanSchema,
  DateSchema,
  ArraySchema,
  MaxLengthAction,
  BrandAction,
  InferOutput,
  Brand,
} from "valibot";
import {
  deriveColumn,
  extractDbMetadata,
  type AnyValibotSchema,
} from "./derive.ts";
import type {
  InferrableValibotSchema,
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
} from "./common.ts";

// ---------------------------------------------------------------------------
// Type-level: DeriveBasePgColumn
// ---------------------------------------------------------------------------

// prettier-ignore
type DeriveBrandPgColumn<T extends InferrableValibotSchema> =
  InferOutput<T> extends Brand<infer B>
    ? B extends "naiveDatetime" ? ColumnTypeSingualr<"timestamp">
    : B extends "int32"         ? ColumnTypeSingualr<"int4">
    : B extends "uint32"        ? { type: "ERROR" }
    : B extends "float32"       ? ColumnTypeSingualr<"float4">
    : B extends "float64"       ? ColumnTypeSingualr<"float8">
    : B extends "int64"         ? ColumnTypeSingualr<"int8">
    : B extends "uint64"        ? { type: "ERROR" }
    : never
    : never;

// prettier-ignore
type DeriveNonBrandPgColumn<T extends ValibotSchema> =
  // ---- String (with optional maxLength) ----
    UnwrapModifiers<T> extends StringSchema<any>
      ? HasPipeItem<T, "max_length"> extends true
        ? ColumnType<"varchar", { maxLength: GetPipeItemProp<T, "max_length", "requirement"> }>
        : ColumnTypeSingualr<"text">

  // ---- Number ----
  : UnwrapModifiers<T> extends NumberSchema<any> ? HasPipeItem<T, "safe_integer"> extends true ? ColumnTypeSingualr<"int4"> : ColumnTypeSingualr<"float8">

  // ---- Bigint ----
  : UnwrapModifiers<T> extends BigintSchema<any> ? ColumnTypeSingualr<"int8">

  // ---- Boolean ----
  : UnwrapModifiers<T> extends BooleanSchema<any> ? ColumnTypeSingualr<"boolean">

  // ---- Date (JS Date objects → timestamptz) ----
  : UnwrapModifiers<T> extends DateSchema<any> ? ColumnTypeSingualr<"timestamptz">

  // ---- Object / JSON ----
  : UnwrapModifiers<T> extends ObjectSchema<any, any> ? ColumnType<"jsonb", { schema: UnwrapModifiers<T> }>

  // ---- Array (recurse into element type; SafeParamDerivation provides array: "[]") ----
  : UnwrapModifiers<T> extends ArraySchema<infer Inner extends ValibotSchema, any> ? DeriveBasePgColumn<Inner>

  // ---- Fallback ----
  : never;

/**
 * Map a (possibly wrapped) valibot schema to a PostgreSQL ColumnType.
 *
 * Pipe actions (brands, validation, etc.) are checked via PipeUnion which
 * walks through modifier wrappers. Schema-type checks use UnwrapModifiers
 * to reach the base schema after pipe branches don't match.
 */
// prettier-ignore
type DeriveBasePgColumn<T extends ValibotSchema> =
  // ---- Pipe-action based detection (string formats) ----
    HasPipeItem<T, "uuid"> extends true                    ? ColumnTypeSingualr<"uuid">
  : HasPipeItem<T, "url"> extends true                     ? ColumnTypeSingualr<"text">
  : HasPipeItem<T, "email"> extends true                   ? ColumnTypeSingualr<"text">
  : HasPipeItem<T, "emoji"> extends true                   ? ColumnTypeSingualr<"text">
  : HasPipeItem<T, "nanoid"> extends true                  ? ColumnType<"varchar", { maxLength: 21 }>
  : HasPipeItem<T, "cuid2"> extends true                   ? ColumnTypeSingualr<"text">
  : HasPipeItem<T, "ulid"> extends true                    ? ColumnType<"varchar", { maxLength: 26 }>
  : HasPipeItem<T, "base64"> extends true                  ? ColumnTypeSingualr<"text">
  : HasPipeItem<T, "ipv4"> extends true                    ? ColumnTypeSingualr<"inet">
  : HasPipeItem<T, "ipv6"> extends true                    ? ColumnTypeSingualr<"inet">
  : HasPipeItem<T, "mac"> extends true                     ? ColumnTypeSingualr<"macaddr">

  // ---- ISO date/time detection ----
  : HasPipeItem<T, "iso_time"> extends true                ? { type: "ERROR" }
  : HasPipeItem<T, "iso_time_second"> extends true         ? ColumnTypeSingualr<"time">
  : HasPipeItem<T, "iso_date"> extends true                ? ColumnTypeSingualr<"date">
  : HasPipeItem<T, "iso_date_time"> extends true           ? { type: "ERROR" }
  : HasPipeItem<T, "iso_date_time_second"> extends true    ? { type: "ERROR" }

  // ---- Brand-based types (delegated to helper) ---
  : [DeriveBrandPgColumn<T>] extends [never]
    ? DeriveNonBrandPgColumn<T>
    : DeriveBrandPgColumn<T>;

// ---------------------------------------------------------------------------
// Type-level: DerivePgColumn
// ---------------------------------------------------------------------------

/**
 * Derive a PgColumn type from a valibot schema.
 *
 * 1. Check for explicit .dbPgColumnType() override in pipe metadata.
 * 2. Otherwise, derive from the base type + modifier params.
 */
// prettier-ignore
export type DerivePgColumn<T extends ValibotSchema> =
    // Explicit .dbPgColumnType() override — skip derivation entirely
    DbMetadataOf<T> extends { pgColumnType: infer C } ? C
  : RewrapToColumnType<
    DeriveBasePgColumn<T> & SafeParamDerivation<T>
  >;

// ---------------------------------------------------------------------------
// Type-level: DerivePgTable
// ---------------------------------------------------------------------------

/**
 * Derive a PgTable type from a valibot object schema with dbTable metadata.
 */
// prettier-ignore
export type DerivePgTable<
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
      ]: DerivePgColumn<
        T["entries"][K] extends ValibotSchema ? T["entries"][K] : never
      >;
    }
  >
>;

// ---------------------------------------------------------------------------
// Runtime implementation
// ---------------------------------------------------------------------------

/**
 * Derive a PgColumn from a valibot schema.
 */
export function derivePgColumn(
  schema: AnyValibotSchema,
): ColumnType<string, any> {
  // Check for explicit dbPgColumnType override in metadata
  const dbMeta = extractDbMetadata(schema);
  if (dbMeta?.pgColumnType) {
    return dbMeta.pgColumnType as ColumnType<any, any>;
  }

  return deriveColumn(schema, ([t, params]) => {
    switch (t) {
      case "uuid":
        return pg.uuid(params);
      case "url":
      case "emoji":
      case "cuid2":
      case "base64":
      case "email":
        return pg.text(params);
      case "nanoid":
      case "ulid":
      case "string":
        return "maxLength" in params ? pg.varchar(params) : pg.text(params);
      case "ipv4":
      case "ipv6":
        return pg.inet(params);
      case "mac":
        return pg.macaddr(params);
      case "isoTime":
        throw new Error(
          `v.isoTime() is not supported by derivePgColumn. Use v.isoTimeSecond() instead.`,
        );
      case "isoTimeSecond":
        return pg.time(params);
      case "isoDate":
        return pg.date(params);
      case "isoDatetime":
        throw new Error(
          `v.isoDateTime() is not supported by derivePgColumn. Use d.naiveDatetime() instead.`,
        );
      case "naiveDatetime":
        return pg.timestamp(params as Params);
      case "int64":
      case "bigint":
        return pg.int8(params);
      case "uint64":
        throw new Error(`PG has no mapping for uint64`);
      case "int32":
        return pg.int4(params);
      case "uint32":
        throw new Error(`PG has no mapping for uint32`);
      case "float32":
        return pg.float4(params);
      case "float64":
      case "number":
        return pg.float8(params);
      case "boolean":
        return pg.boolean(params);
      case "date":
        return pg.timestamptz(params as Params);
      case "json":
      case "object": {
        if (!("schema" in params)) {
          throw new Error(
            `Object types must have a "schema" property for deriveColumn.`,
          );
        }
        return pg.jsonb(params as any);
      }
    }
  }) as any;
}

// ---------------------------------------------------------------------------
// derivePgTable
// ---------------------------------------------------------------------------

/**
 * Derive an ormer PgTable from a valibot object schema.
 */
export function derivePgTable(
  schema: AnyValibotSchema,
): Table<string, Record<string, ColumnType<any, any>>> {
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
    columns[key] = derivePgColumn(entry);
  }

  return table(tableName as never, columns) as any;
}
