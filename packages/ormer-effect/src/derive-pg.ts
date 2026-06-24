import { pg, table } from "ormer";
import type { ColumnType, ColumnTypeSingualr, Table } from "ormer";
import { Schema } from "effect";
import {
  deriveColumn,
  type EffectSchemas,
  type ParamsDerived,
} from "./derive.ts";
import type {
  DomainOfType,
  GetBaseTypeWithoutArrays,
  GetDbFormat,
  RewrapToColumnType,
  SafeParamDerivation,
  UnwrapUntilReturnTrue,
} from "./common.ts";

// prettier-ignore
export type DeriveBasePgColumn<T> =
  "string" extends DomainOfType<T> ? (
        "uuid"          extends GetDbFormat<T> ? { type: "uuid" }
      : "url"           extends GetDbFormat<T> ? { type: "text" }
      : "email"         extends GetDbFormat<T> ? { type: "varchar"; maxLength: 320 }
      : "isoTime"       extends GetDbFormat<T> ? { type: "ERROR" }
      : "isoDateTime"   extends GetDbFormat<T> ? { type: "ERROR" }
      : "isoTimeSecond" extends GetDbFormat<T> ? { type: "time" }
      : "isoDate"       extends GetDbFormat<T> ? { type: "date" }
      : "naiveDatetime" extends GetDbFormat<T> ? { type: "timestamp" }
      : "ipv4"          extends GetDbFormat<T> ? { type: "inet" }
      : "ipv6"          extends GetDbFormat<T> ? { type: "inet" }
      : "mac"           extends GetDbFormat<T> ? { type: "macaddr" }
      : UnwrapUntilReturnTrue<T, { readonly maxLength: unknown }> extends [true, infer M]
        ? M extends { readonly maxLength: infer N extends number } ? { type: "varchar"; maxLength: N } 
        : { type: "text" }
      : { type: "text" }
  )
  : "number" extends DomainOfType<T> ? (
      "int8"       extends GetDbFormat<T> ? { type: "ERROR" }
    : "int16"      extends GetDbFormat<T> ? { type: "int2" }
    : "int32"      extends GetDbFormat<T> ? { type: "int4" }
    : "uint8"      extends GetDbFormat<T> ? { type: "ERROR" }
    : "uint16"     extends GetDbFormat<T> ? { type: "ERROR" }
    : "uint32"     extends GetDbFormat<T> ? { type: "ERROR" }
    : "float32"    extends GetDbFormat<T> ? { type: "float4" }
    : "float64"    extends GetDbFormat<T> ? { type: "float8" }
    : { type: "float8" }
  )
  : "bigint" extends DomainOfType<T> ? (
      "int64"      extends GetDbFormat<T> ? { type: "int8" }
    : "uint64"     extends GetDbFormat<T> ? { type: "ERROR" }
    : "int128"     extends GetDbFormat<T> ? { type: "ERROR" }
    : "uint128"    extends GetDbFormat<T> ? { type: "ERROR" }
    : { type: "int8" }
  )
  : "boolean" extends DomainOfType<T> ? { type: "boolean" }
  : "Date" extends DomainOfType<T> ? { type: "timestamptz" }
  : "object" extends DomainOfType<T> ? { type: "jsonb"; schema: T }
  : { type: "ERROR" };

/** Derive a PostgreSQL ColumnType from an Effect schema. */
export type DerivePgColumn<T> = RewrapToColumnType<
  DeriveBasePgColumn<GetBaseTypeWithoutArrays<T>> & SafeParamDerivation<T>
>;

/**
 * Derive an ormer PgTable type from an Effect Struct schema annotated with
 * `Table("name", ...)` or `dbTable` annotation.
 */
export type DerivePgTable<T extends Schema.Struct<any>> =
  T extends Schema.Struct<any>
    ? T["ast"]["annotations"] extends { dbTable: infer Name extends string }
      ? Table<
          Name,
          {
            [K in keyof T["fields"]]: DerivePgColumn<T["fields"][K]>;
          }
        >
      : never
    : never;

/**
 * Map a generic Effect schema choice (returned by deriveColumn) to a
 * PostgreSQL ColumnType.
 */
export function derivePgColumn<T extends Schema.Top>(schema: {
  ast: T["ast"];
}): DerivePgColumn<T> {
  return chooser(deriveColumn(schema)) as any;
}

function chooser([tag, params]: EffectSchemas): ColumnType<string, any> {
  const p = params as ParamsDerived & Record<string, unknown>;

  switch (tag) {
    // -----------------------------------------------------------------------
    // String variants
    // -----------------------------------------------------------------------
    case "uuid":
      return pg.uuid(params);
    case "url":
      return pg.text(params);
    case "email":
      return pg.varchar(params);
    case "isoTime":
    case "isoDateTime":
      throw new Error(`PG has no symmetric mapping for: ${tag}`);
    case "isoTimeSecond":
      return pg.time(params);
    case "isoDate":
      return pg.date(params);
    case "naiveDatetime":
      return pg.timestamp(params as any);
    case "string":
      if ("maxLength" in p && typeof p.maxLength === "number") {
        return pg.varchar(params as any);
      }
      return pg.text(params);

    // -----------------------------------------------------------------------
    // Network types (treated as string by deriveColumn, dispatched here)
    // -----------------------------------------------------------------------
    case "ipv4":
    case "ipv6":
      return pg.inet(params);
    case "mac":
      return pg.macaddr(params);

    // -----------------------------------------------------------------------
    // Number variants
    // -----------------------------------------------------------------------
    case "int8":
    case "uint8":
    case "uint16":
    case "uint32":
      throw new Error(`PG has no symmetric mapping for number format: ${tag}`);
    case "int16":
      return pg.int2(params);
    case "int32":
      return pg.int4(params);
    case "float32":
      return pg.float4(params);
    case "float64":
      return pg.float8(params);
    case "number":
      return pg.float8(params);

    // -----------------------------------------------------------------------
    // BigInt variants
    // -----------------------------------------------------------------------
    case "bigint":
      return pg.int8(params);
    case "int64":
      return pg.int8(params);
    case "uint64":
    case "int128":
    case "uint128":
      throw new Error(`PG has no symmetric mapping for bigint format: ${tag}`);

    // -----------------------------------------------------------------------
    // Boolean
    // -----------------------------------------------------------------------
    case "boolean":
      return pg.boolean(params);

    // -----------------------------------------------------------------------
    // Date
    // -----------------------------------------------------------------------
    case "date":
      return pg.timestamptz(params as any);

    // -----------------------------------------------------------------------
    // Object / JSON
    // -----------------------------------------------------------------------
    case "object":
      return pg.jsonb(params as any);

    // -----------------------------------------------------------------------
    // Fallback
    // -----------------------------------------------------------------------
    default:
      throw new Error(
        `derivePgColumn: Unhandled tag "${tag}" with params ${JSON.stringify(params)}`,
      );
  }
}

/**
 * Derive an ormer PgTable from an Effect Struct schema annotated with
 * `Table("name", ...)` or `dbTable` annotation.
 */
export function derivePgTable<S extends Schema.Struct<any>>(
  schema: S,
): DerivePgTable<S> {
  const tableName = (schema.ast.annotations as any)?.dbTable as
    | string
    | undefined;
  if (typeof tableName !== "string") {
    throw new Error(
      "Effect Struct must be annotated with Table('name', schema) or dbTable annotation.",
    );
  }

  const properties =
    (schema.ast as any)?.propertySignatures ??
    (schema.ast as any)?.fields ??
    [];

  const columns: Record<string, ColumnType<string, any>> = {};
  for (const prop of properties) {
    const key = typeof prop === "string" ? prop : (prop.name ?? prop.key);
    const propSchema =
      typeof prop === "string"
        ? (schema.ast as any)?.propertySignatures?.[prop]
        : (prop.type ?? prop.value ?? prop.schema);
    if (key && propSchema) {
      columns[key] = derivePgColumn({ ast: propSchema });
    }
  }

  return table(tableName as never, columns) as any;
}
