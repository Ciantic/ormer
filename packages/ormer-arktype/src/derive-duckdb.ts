import { duckdb, table } from "ormer";
import type { ColumnType, ColumnTypeSingualr, Table } from "ormer";
import type { Type } from "arktype";
import { deriveColumn } from "./derive.ts";
import type { TableName } from "./arktype-ext.ts";
import type {
  DomainOfType,
  DbFormatOfType,
  GetMaxLength,
  IsVarchar,
  SafeParamDerivation,
  RewrapToColumnType,
  GetBaseTypeWithoutArrays,
} from "./common.ts";

// prettier-ignore
type DeriveBaseDuckDbColumn<T extends Type<any, any>> =
  "string" extends DomainOfType<T> ? (
        "uuid" extends DbFormatOfType<T> ? ColumnTypeSingualr<"uuid">
      : "timepart" extends DbFormatOfType<T> ? ColumnTypeSingualr<"time">
      : "datepart" extends DbFormatOfType<T> ? ColumnTypeSingualr<"date">
      : "naivedatetime" extends DbFormatOfType<T> ? ColumnTypeSingualr<"timestamp">
      : IsVarchar<T> extends true ? ColumnType<"varchar", { maxLength: GetMaxLength<T> }>
      : ColumnTypeSingualr<"text">
    )
  : "number" extends DomainOfType<T> ? (
        "float32" extends DbFormatOfType<T> ? ColumnTypeSingualr<"float4">
      : "float64" extends DbFormatOfType<T> ? ColumnTypeSingualr<"float8">
      : "int32" extends DbFormatOfType<T> ? ColumnTypeSingualr<"int4">
      : "int16" extends DbFormatOfType<T> ? ColumnTypeSingualr<"int2">
      : "int8" extends DbFormatOfType<T> ? ColumnTypeSingualr<"int1">
      : "uint8" extends DbFormatOfType<T> ? ColumnTypeSingualr<"utinyint">
      : "uint16" extends DbFormatOfType<T> ? ColumnTypeSingualr<"usmallint">
      : "uint32" extends DbFormatOfType<T> ? ColumnTypeSingualr<"uinteger">
      : ColumnTypeSingualr<"float8">
    )
  : "bigint" extends DomainOfType<T> ? (
        "int64" extends DbFormatOfType<T> ? ColumnTypeSingualr<"int8">
      : "uint64" extends DbFormatOfType<T> ? ColumnTypeSingualr<"ubigint">
      : "uint128" extends DbFormatOfType<T> ? ColumnTypeSingualr<"uhugeint">
      : ColumnTypeSingualr<"int8">
    )
  : "boolean" extends DomainOfType<T> ? ColumnTypeSingualr<"boolean">
  : "Date" extends DomainOfType<T> ? ColumnTypeSingualr<"timestamptz">
  : "object" extends DomainOfType<T> ? ColumnType<"json", { schema: T }>
  : { type: "ERROR" };

export type DeriveDuckDbColumn<
  T extends Type<any, any> | [Type<any, any>, ...any[]],
> = RewrapToColumnType<
  DeriveBaseDuckDbColumn<GetBaseTypeWithoutArrays<T>> & SafeParamDerivation<T>
>;

/**
 * Derive a DuckDbTable type from an arktype object with dbTable metadata.
 */
export type DeriveDuckDbTable<
  T extends Type<Record<string, any>, any> & TableName<string>,
> =
  T extends Type<infer Shape, infer $>
    ? T extends TableName<infer Name>
      ? Table<
          Name,
          {
            [K in keyof Shape]: DeriveDuckDbColumn<Type<Shape[K], $>>;
          }
        >
      : never
    : never;

/**
 * Map a generic arktype choice to a DuckDB ColumnType.
 *
 * For "string" and "number" we also inspect `params.dbformat` (set from
 * `.configure({ dbformat: ... })` or `db.varchar()` / `db.type("...")`) to
 * pick the correct DuckDB type.
 */
export function deriveDuckDbColumn<
  T extends Type<any, any> | [Type<any, any>, ...any[]],
>(schema: T): DeriveDuckDbColumn<T> {
  return deriveColumn(schema, ([domain, dbformat, params]) => {
    if (domain === "string") {
      if (dbformat === "uuid") return duckdb.uuid(params);
      if (dbformat === "timepart") return duckdb.time(params);
      if (dbformat === "datepart") return duckdb.date(params);
      if (dbformat === "naivedatetime") return duckdb.timestamp(params);
      if ("maxLength" in params && typeof params.maxLength === "number") {
        return duckdb.varchar(params);
      }
      return duckdb.text(params);
    }
    if (domain === "number") {
      if (dbformat === "float32") return duckdb.float4(params);
      if (dbformat === "float64") return duckdb.float8(params);
      if (dbformat === "int32") return duckdb.int4(params);
      if (dbformat === "int16") return duckdb.int2(params);
      if (dbformat === "int8") return duckdb.int1(params);
      if (dbformat === "uint8") return duckdb.utinyint(params);
      if (dbformat === "uint16") return duckdb.usmallint(params);
      if (dbformat === "uint32") return duckdb.uinteger(params);
      return duckdb.float8(params);
    }
    if (domain === "bigint") {
      if (dbformat === "int64" || dbformat === "") return duckdb.int8(params);
      if (dbformat === "uint64") return duckdb.ubigint(params);
      if (dbformat === "uint128") return duckdb.uhugeint(params);
      return duckdb.int8(params);
    }
    if (domain === "boolean") {
      return duckdb.boolean(params);
    }
    if (domain === "Date") {
      return duckdb.timestamptz(params);
    }
    if (domain === "object") {
      return duckdb.json({ ...params, schema });
    }
    throw new Error(
      `Unsupported arktype choice: ${domain} with dbformat ${dbformat}`,
    );
  });
}

/**
 * Derive an ormer DuckDbTable from an arktype table type created with `db.table()`.
 */
export function deriveDuckDbTable<
  T extends Type<Record<string, any>, any> & TableName<string>,
>(schema: T): DeriveDuckDbTable<T> {
  const tableName = (schema as any).meta?.tableName;
  if (typeof tableName !== "string") {
    throw new Error(
      "Arktype object must be created with db.table('name', ...).",
    );
  }

  const structure = (schema as any).structure;
  const fields = [
    ...(structure?.required ?? []),
    ...(structure?.optional ?? []),
  ];
  const columns: Record<string, ColumnType<string, any>> = {};

  for (const field of fields) {
    const key = field.key;
    const colType = field.value;
    columns[key] = deriveDuckDbColumn(colType);
  }

  return table(tableName as never, columns) as any;
}
