import { sqlite } from "ormer";
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
export type DeriveBaseSqliteColumn<T> =
  "string" extends DomainOfType<T> ? (
      "uuid"          extends GetDbFormat<T> ? { type: "text" }
    : "url"           extends GetDbFormat<T> ? { type: "text" }
    : "email"         extends GetDbFormat<T> ? { type: "text" }
    : "isoTime"       extends GetDbFormat<T> ? { type: "text" }
    : "isoDateTime"   extends GetDbFormat<T> ? { type: "text" }
    : "isoTimeSecond" extends GetDbFormat<T> ? { type: "text" }
    : "isoDate"       extends GetDbFormat<T> ? { type: "text" }
    : "naiveDatetime" extends GetDbFormat<T> ? { type: "text" }
    : "ipv4"          extends GetDbFormat<T> ? { type: "text" }
    : "ipv6"          extends GetDbFormat<T> ? { type: "text" }
    : "mac"           extends GetDbFormat<T> ? { type: "text" }
    : GetMaxLength<T> extends number         ? { type: "text" }
    : { type: "text" }
  )
  : "number" extends DomainOfType<T> ? (
      "int8"       extends GetDbFormat<T> ? { type: "integer" }
    : "int16"      extends GetDbFormat<T> ? { type: "integer" }
    : "int32"      extends GetDbFormat<T> ? { type: "integer" }
    : "uint8"      extends GetDbFormat<T> ? { type: "integer" }
    : "uint16"     extends GetDbFormat<T> ? { type: "integer" }
    : "uint32"     extends GetDbFormat<T> ? { type: "integer" }
    : "float32"    extends GetDbFormat<T> ? { type: "real" }
    : "float64"    extends GetDbFormat<T> ? { type: "real" }
    : { type: "real" }
  )
  : "bigint" extends DomainOfType<T> ? { type: "ERROR" }
  : "boolean" extends DomainOfType<T> ? { type: "ERROR" }
  : "Date" extends DomainOfType<T> ? { type: "ERROR" }
  : "object" extends DomainOfType<T> ? { type: "ERROR" }
  : { type: "ERROR" };

export type DeriveSqliteColumn<T> =
  SafeParamDerivation<T> extends { array: string }
    ? { type: "ERROR" }
    : RewrapToColumnType<
        DeriveBaseSqliteColumn<GetBaseTypeWithoutArrays<T>> &
          SafeParamDerivation<T>
      >;

export type DeriveSqliteTable<T> = T extends {
  readonly tableName: infer Name extends string;
  readonly shape: infer S;
}
  ? S extends Schema.Struct<any>
    ? Table<
        Name,
        RemoveReadOnly<{
          [K in keyof S["fields"]]: DeriveSqliteColumn<S["fields"][K]>;
        }>
      >
    : never
  : never;

/**
 * Map a generic Effect schema choice (returned by deriveColumn) to a
 * SQLite ColumnType.
 *
 * SQLite only has 4 storage classes: INTEGER, REAL, TEXT, BLOB.
 * Many types that work in PG/DuckDB cannot round-trip in SQLite.
 */
export function deriveSqliteColumn<T extends Schema.Top>(
  schema: T,
): DeriveSqliteColumn<T> {
  return chooser(deriveColumn(schema)) as any;
}

function chooser([tag, params]: EffectSchemas): ColumnType<string, any> {
  const p = params as ParamsDerived;

  if ("array" in p && typeof p.array === "string") {
    throw new Error(
      "SQLite has no array type. Use sqlite.text() with explicit mapping.",
    );
  }

  switch (tag) {
    // String variants — all map to TEXT
    // SQLite text() doesn't use maxLength, so strip it from params
    case "uuid":
    case "url":
    case "email":
    case "isoTime":
    case "isoDateTime":
    case "isoTimeSecond":
    case "isoDate":
    case "naiveDatetime":
    case "string": {
      if ("maxLength" in p && typeof p.maxLength === "number") {
        const { maxLength: _, ...rest } = p;
        return sqlite.text(rest);
      }
      return sqlite.text(params);
    }

    // Network types — fall back to TEXT
    case "ipv4":
    case "ipv6":
    case "mac": {
      if ("maxLength" in p && typeof p.maxLength === "number") {
        const { maxLength: _, ...rest } = p;
        return sqlite.text(rest);
      }
      return sqlite.text(params);
    }

    // Number variants — integer formats map to INTEGER, float formats to REAL
    case "int8":
    case "int16":
    case "int32":
    case "uint8":
    case "uint16":
    case "uint32":
      return sqlite.integer(params);
    case "float32":
    case "float64":
    case "number":
      return sqlite.real(params);

    // BigInt — SQLite INTEGER is 64-bit signed, can't round-trip bigint
    case "bigint":
    case "int64":
    case "uint64":
    case "int128":
    case "uint128":
      throw new Error(
        `SQLite has no symmetric mapping for bigint format: ${tag}`,
      );

    // Boolean — SQLite has no boolean type
    case "boolean":
      throw new Error(
        "SQLite has no boolean type. Use sqlite.integer() with explicit mapping.",
      );

    // Date — SQLite has no date type
    case "date":
      throw new Error(
        "SQLite has no date type. Use sqlite.text() with explicit mapping.",
      );

    // Object / JSON — SQLite has no json type
    case "object":
      throw new Error(
        "SQLite has no json type. Use sqlite.text() with explicit mapping.",
      );

    // Fallback
    default:
      throw new Error(
        `deriveSqliteColumn: Unhandled tag "${tag}" with params ${JSON.stringify(params)}`,
      );
  }
}

/**
 * Derive an ormer SqliteTable from an Effect TableWrapper schema
 * created with `Table("name", ...)`.
 */
export function deriveSqliteTable<
  T extends { readonly tableName: string; readonly shape: Schema.Struct<any> },
>(wrapper: T): DeriveSqliteTable<T> {
  return deriveTable(wrapper, deriveSqliteColumn) as any;
}
