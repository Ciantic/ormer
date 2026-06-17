import { sqlite, table } from "ormer";
import type { ColumnType, ColumnTypeSingualr, Table } from "ormer";
import type { Type } from "arktype";
import { deriveColumn } from "./derive.ts";
import type { TableName } from "./arktype-ext.ts";
import type {
  DomainOfType,
  DbFormatOfType,
  IsVarchar,
  SafeParamDerivation,
  RewrapToColumnType,
  GetBaseTypeWithoutArrays,
} from "./common.ts";

// prettier-ignore
type DeriveBaseSqliteColumn<T extends Type<any, any>> =
  "string" extends DomainOfType<T> ? (
        "uuid" extends DbFormatOfType<T> ? ColumnTypeSingualr<"text">
      : "timepart" extends DbFormatOfType<T> ? ColumnTypeSingualr<"text">
      : "datepart" extends DbFormatOfType<T> ? ColumnTypeSingualr<"text">
      : "naivedatetime" extends DbFormatOfType<T> ? ColumnTypeSingualr<"text">
      : IsVarchar<T> extends true ? ColumnTypeSingualr<"text">
      : ColumnTypeSingualr<"text">
    )
  : "number" extends DomainOfType<T> ? (
        "float32" extends DbFormatOfType<T> ? ColumnTypeSingualr<"real">
      : "float64" extends DbFormatOfType<T> ? ColumnTypeSingualr<"real">
      : "int32" extends DbFormatOfType<T> ? ColumnTypeSingualr<"integer">
      : "int16" extends DbFormatOfType<T> ? ColumnTypeSingualr<"integer">
      : "int8" extends DbFormatOfType<T> ? ColumnTypeSingualr<"integer">
      : "uint8" extends DbFormatOfType<T> ? ColumnTypeSingualr<"integer">
      : "uint16" extends DbFormatOfType<T> ? ColumnTypeSingualr<"integer">
      : "uint32" extends DbFormatOfType<T> ? ColumnTypeSingualr<"integer">
      : ColumnTypeSingualr<"real">
    )
  : "bigint" extends DomainOfType<T> ? { type: "ERROR" }
  : "boolean" extends DomainOfType<T> ? { type: "ERROR" }
  : "Date" extends DomainOfType<T> ? { type: "ERROR" }
  : "object" extends DomainOfType<T> ? { type: "ERROR" }
  : { type: "ERROR" };

export type DeriveSqliteColumn<
  T extends Type<any, any> | [Type<any, any>, ...any[]],
> =
  SafeParamDerivation<T> extends { array: string }
    ? { type: "ERROR" }
    : RewrapToColumnType<
        DeriveBaseSqliteColumn<GetBaseTypeWithoutArrays<T>> &
          SafeParamDerivation<T>
      >;

/**
 * Derive a SqliteTable type from an arktype object with dbTable metadata.
 */
export type DeriveSqliteTable<
  T extends Type<Record<string, any>, any> & TableName<string>,
> =
  T extends Type<infer Shape, infer $>
    ? T extends TableName<infer Name>
      ? Table<
          Name,
          {
            [K in keyof Shape]: DeriveSqliteColumn<Type<Shape[K], $>>;
          }
        >
      : never
    : never;

/**
 * Map a generic arktype choice to a SQLite ColumnType.
 *
 * SQLite only has 4 storage classes: INTEGER, REAL, TEXT, BLOB.
 * Many types that work in PG/DuckDB cannot round-trip in SQLite.
 */
export function deriveSqliteColumn<
  T extends Type<any, any> | [Type<any, any>, ...any[]],
>(schema: T): DeriveSqliteColumn<T> {
  return deriveColumn(schema, ([domain, dbformat, params]) => {
    if ("array" in params && typeof params.array === "string") {
      throw new Error(
        "SQLite has no array type. Use sqlite.text() with explicit mapping.",
      );
    }
    if (domain === "string") {
      return sqlite.text(params);
    }
    if (domain === "number") {
      if (
        dbformat === "int8" ||
        dbformat === "int16" ||
        dbformat === "int32" ||
        dbformat === "uint8" ||
        dbformat === "uint16" ||
        dbformat === "uint32"
      ) {
        return sqlite.integer(params);
      }
      return sqlite.real(params);
    }
    if (domain === "bigint") {
      throw new Error(
        `SQLite has no symmetric mapping for bigint format: ${dbformat}`,
      );
    }
    if (domain === "boolean") {
      throw new Error(
        "SQLite has no boolean type. Use sqlite.integer() with explicit mapping.",
      );
    }
    if (domain === "Date") {
      throw new Error(
        "SQLite has no date type. Use sqlite.text() with explicit mapping.",
      );
    }
    if (domain === "object") {
      throw new Error(
        "SQLite has no json type. Use sqlite.text() with explicit mapping.",
      );
    }
    throw new Error(
      `Unsupported arktype choice: ${domain} with dbformat ${dbformat}`,
    );
  });
}

/**
 * Derive an ormer SqliteTable from an arktype table type created with `db.table()`.
 */
export function deriveSqliteTable<
  T extends Type<Record<string, any>, any> & TableName<string>,
>(schema: T): DeriveSqliteTable<T> {
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
    columns[key] = deriveSqliteColumn(colType);
  }

  return table(tableName as never, columns) as any;
}
