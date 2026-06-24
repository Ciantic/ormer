import { duckdb } from "ormer";
import type { ColumnType, Table } from "ormer";
import { Schema } from "effect";
import {
  deriveColumn,
  deriveTable,
  type EffectSchemas,
  type ParamsDerived,
} from "./derive.ts";
import type {
  DomainOfType,
  GetBaseTypeWithoutArrays,
  GetDbFormat,
  GetMaxLength,
  RemoveReadOnly,
  RewrapToColumnType,
  SafeParamDerivation,
} from "./common.ts";

// prettier-ignore
export type DeriveBaseDuckDbColumn<T> =
  "string" extends DomainOfType<T> ? (
      "uuid"          extends GetDbFormat<T> ? { type: "uuid" }
    : "url"           extends GetDbFormat<T> ? { type: "text" }
    : "email"         extends GetDbFormat<T> ? { type: "varchar"; maxLength: 320 }
    : "isoTime"       extends GetDbFormat<T> ? { type: "ERROR" }
    : "isoDateTime"   extends GetDbFormat<T> ? { type: "ERROR" }
    : "isoTimeSecond" extends GetDbFormat<T> ? { type: "time" }
    : "isoDate"       extends GetDbFormat<T> ? { type: "date" }
    : "naiveDatetime" extends GetDbFormat<T> ? { type: "timestamp" }
    : "ipv4"          extends GetDbFormat<T> ? { type: "text" }
    : "ipv6"          extends GetDbFormat<T> ? { type: "text" }
    : "mac"           extends GetDbFormat<T> ? { type: "text" }
    : GetMaxLength<T> extends number         ? { type: "varchar"; maxLength: GetMaxLength<T> }
    : { type: "text" }
  )
  : "number" extends DomainOfType<T> ? (
      "int8"       extends GetDbFormat<T> ? { type: "int1" }
    : "int16"      extends GetDbFormat<T> ? { type: "int2" }
    : "int32"      extends GetDbFormat<T> ? { type: "int4" }
    : "uint8"      extends GetDbFormat<T> ? { type: "utinyint" }
    : "uint16"     extends GetDbFormat<T> ? { type: "usmallint" }
    : "uint32"     extends GetDbFormat<T> ? { type: "uinteger" }
    : "float32"    extends GetDbFormat<T> ? { type: "float4" }
    : "float64"    extends GetDbFormat<T> ? { type: "float8" }
    : { type: "float8" }
  )
  : "bigint" extends DomainOfType<T> ? (
      "int64"      extends GetDbFormat<T> ? { type: "int8" }
    : "uint64"     extends GetDbFormat<T> ? { type: "ubigint" }
    : "int128"     extends GetDbFormat<T> ? { type: "hugeint" }
    : "uint128"    extends GetDbFormat<T> ? { type: "uhugeint" }
    : { type: "int8" }
  )
  : "boolean" extends DomainOfType<T> ? { type: "boolean" }
  : "Date" extends DomainOfType<T> ? { type: "timestamptz" }
  : "object" extends DomainOfType<T> ? { type: "json"; schema: T }
  : { type: "ERROR" };

export type DeriveDuckDbColumn<T> = RewrapToColumnType<
  DeriveBaseDuckDbColumn<GetBaseTypeWithoutArrays<T>> & SafeParamDerivation<T>
>;

export type DeriveDuckDbTable<T> = T extends {
  readonly tableName: infer Name extends string;
  readonly shape: infer S;
}
  ? S extends Schema.Struct<any>
    ? Table<
        Name,
        RemoveReadOnly<{
          [K in keyof S["fields"]]: DeriveDuckDbColumn<S["fields"][K]>;
        }>
      >
    : never
  : never;

/**
 * Map a generic Effect schema choice (returned by deriveColumn) to a
 * DuckDB ColumnType.
 */
export function deriveDuckDbColumn<T extends Schema.Top>(
  schema: T,
): DeriveDuckDbColumn<T> {
  return chooser(deriveColumn(schema)) as any;
}

function chooser([tag, params]: EffectSchemas): ColumnType<string, any> {
  const p = params as ParamsDerived & Record<string, unknown>;

  switch (tag) {
    // String variants
    case "uuid":
      return duckdb.uuid(params);
    case "url":
      return duckdb.text(params);
    case "email":
      return duckdb.varchar(params);
    case "isoTime":
    case "isoDateTime":
      throw new Error(`DuckDB has no symmetric mapping for: ${tag}`);
    case "isoTimeSecond":
      return duckdb.time(params);
    case "isoDate":
      return duckdb.date(params);
    case "naiveDatetime":
      return duckdb.timestamp(params as any);
    case "string":
      if ("maxLength" in p && typeof p.maxLength === "number") {
        return duckdb.varchar(params as any);
      }
      return duckdb.text(params);

    // Network types — DuckDB has no inet/macaddr, fall back to text
    case "ipv4":
    case "ipv6":
      return duckdb.text(params);
    case "mac":
      return duckdb.text(params);

    // Number variants — DuckDB supports all small integer types
    case "int8":
      return duckdb.int1(params);
    case "int16":
      return duckdb.int2(params);
    case "int32":
      return duckdb.int4(params);
    case "uint8":
      return duckdb.utinyint(params);
    case "uint16":
      return duckdb.usmallint(params);
    case "uint32":
      return duckdb.uinteger(params);
    case "float32":
      return duckdb.float4(params);
    case "float64":
      return duckdb.float8(params);
    case "number":
      return duckdb.float8(params);

    // BigInt variants — DuckDB supports unsigned and 128-bit types
    case "bigint":
      return duckdb.int8(params);
    case "int64":
      return duckdb.int8(params);
    case "uint64":
      return duckdb.ubigint(params);
    case "int128":
      return duckdb.hugeint(params);
    case "uint128":
      return duckdb.uhugeint(params);

    // Boolean
    case "boolean":
      return duckdb.boolean(params);

    // Date
    case "date":
      return duckdb.timestamptz(params as any);

    // Object / JSON — DuckDB uses json, not jsonb
    case "object":
      return duckdb.json(params as any);

    // Fallback
    default:
      throw new Error(
        `deriveDuckDbColumn: Unhandled tag "${tag}" with params ${JSON.stringify(params)}`,
      );
  }
}

/**
 * Derive an ormer DuckDbTable from an Effect TableWrapper schema
 * created with `Table("name", ...)`.
 */
export function deriveDuckDbTable<
  T extends { readonly tableName: string; readonly shape: Schema.Struct<any> },
>(wrapper: T): DeriveDuckDbTable<T> {
  return deriveTable(wrapper, deriveDuckDbColumn) as any;
}
