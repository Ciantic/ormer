import { pg, table } from "ormer";
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

/**
 * Map a (possibly wrapped) valibot schema to a PostgreSQL ColumnType.
 *
 * Pipe actions (brands, validation, etc.) are checked via PipeUnion which
 * walks through modifier wrappers. Schema-type checks use UnwrapModifiers
 * to reach the base schema after pipe branches don't match.
 */
// prettier-ignore
type DeriveBasePgColumn<T extends ValibotSchema> =
  // Stringy formats
    HasPipeItem<T, "uuid"> extends true                    ? ColumnTypeSingualr<"uuid">
  : HasPipeItem<T, "email"> extends true                   ? ColumnType<"varchar", { maxLength: 320 }>
  : HasPipeItem<T, "nanoid"> extends true                  ? ColumnType<"varchar", { maxLength: 21 }>
  : HasPipeItem<T, "ulid"> extends true                    ? ColumnType<"varchar", { maxLength: 26 }>
  : HasPipeItem<T, "ipv4"> extends true                    ? ColumnTypeSingualr<"inet">
  : HasPipeItem<T, "ipv6"> extends true                    ? ColumnTypeSingualr<"inet">
  : HasPipeItem<T, "mac"> extends true                     ? ColumnTypeSingualr<"macaddr">

  // Datetime formats
  : HasDbTypeRegex<T, "naiveDatetime"> extends true              ? ColumnTypeSingualr<"timestamp">
  : HasPipeItem<T, "iso_time"> extends true                ? { type: "ERROR" }
  : HasPipeItem<T, "iso_time_second"> extends true         ? ColumnTypeSingualr<"time">
  : HasPipeItem<T, "iso_date"> extends true                ? ColumnTypeSingualr<"date">
  : HasPipeItem<T, "iso_date_time"> extends true           ? { type: "ERROR" }
  : HasPipeItem<T, "iso_date_time_second"> extends true    ? { type: "ERROR" }
  : HasBaseSchema<T, DateSchema<any>> extends true         ? ColumnTypeSingualr<"timestamptz">

  // String
  : HasBaseSchema<T, StringSchema<any>> extends true ? 
        HasPipeItem<T, "max_length"> extends true
      ? ColumnType<"varchar", { maxLength: GetPipeItemProp<T, "max_length", "requirement"> }>
      : ColumnTypeSingualr<"text">

  // Number formats
  : HasDbTypeCheck<T, "int8"> extends true                    ? { type: "ERROR" }
  : HasDbTypeCheck<T, "int16"> extends true                   ? ColumnTypeSingualr<"int2">
  : HasDbTypeCheck<T, "int32"> extends true                   ? ColumnTypeSingualr<"int4">
  : HasDbTypeCheck<T, "uint8"> extends true                   ? { type: "ERROR" }
  : HasDbTypeCheck<T, "uint16"> extends true                  ? { type: "ERROR" }
  : HasDbTypeCheck<T, "uint32"> extends true                  ? { type: "ERROR" }
  : HasDbTypeCheck<T, "float32"> extends true                 ? ColumnTypeSingualr<"float4">
  : HasDbTypeCheck<T, "float64"> extends true                 ? ColumnTypeSingualr<"float8">
  : HasDbTypeCheck<T, "int64"> extends true                   ? ColumnTypeSingualr<"int8">
  : HasDbTypeCheck<T, "uint64"> extends true                  ? { type: "ERROR" }
  : HasDbTypeCheck<T, "int128"> extends true                  ? { type: "ERROR" }
  : HasDbTypeCheck<T, "uint128"> extends true                 ? { type: "ERROR" }
  : HasPipeItem<T, "safe_integer"> extends true          ? ColumnTypeSingualr<"int4">
  : HasPipeItem<T, "integer"> extends true               ? ColumnTypeSingualr<"int4">
  : HasBaseSchema<T, NumberSchema<any>> extends true     ? ColumnTypeSingualr<"float8">
  : HasBaseSchema<T, BigintSchema<any>> extends true     ? ColumnTypeSingualr<"int8">

  // Boolean 
  : HasBaseSchema<T, BooleanSchema<any>> extends true     ? ColumnTypeSingualr<"boolean">
  
  // JSON
  : HasBaseSchema<T, ObjectSchema<any, any>> extends true ? ColumnType<"jsonb", { schema: T }>

  // Array
  : UnwrapModifiers<T> extends ArraySchema<infer Inner extends ValibotSchema, any> ? DeriveBasePgColumn<Inner>

  // Unsupported
  : never;

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
  : DeriveBasePgColumn<T> extends { type: "ERROR" }
    ? { type: "ERROR" }
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
export function derivePgColumn<T extends ValibotSchema>(
  schema: T,
): DerivePgColumn<T> {
  // Check for explicit dbPgColumnType override in metadata
  const dbMeta = extractDbMetadata(schema);
  if (dbMeta?.pgColumnType) {
    return dbMeta.pgColumnType as ColumnType<any, any>;
  }

  return deriveColumn(schema, ([t, params]) => {
    switch (t) {
      case "uuid":
        return pg.uuid(params);
      case "email":
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
      case "integer":
        return pg.int4(params);
      case "int8":
        throw new Error(`PG has no mapping for int8 (tinyint)`);
      case "int16":
        return pg.int2(params);
      case "int64":
      case "bigint":
        return pg.int8(params);
      case "uint8":
        throw new Error(`PG has no mapping for uint8`);
      case "uint16":
        throw new Error(`PG has no mapping for uint16`);
      case "uint64":
        throw new Error(`PG has no mapping for uint64`);
      case "int32":
        return pg.int4(params);
      case "uint32":
        throw new Error(`PG has no mapping for uint32`);
      case "int128":
        throw new Error(`PG has no mapping for int128 (hugeint)`);
      case "uint128":
        throw new Error(`PG has no mapping for uint128 (uhugeint)`);
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
export function derivePgTable<
  T extends ObjectSchema<any, any> & { pipe?: readonly any[] },
>(schema: T): DerivePgTable<T> {
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
