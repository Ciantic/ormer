import { pg, table } from "ormer";
import type { ColumnType, ColumnTypeSingualr, Table } from "ormer";
import type { Type } from "arktype";
import { deriveColumn } from "./derive.ts";
import type { DbFormat, TableName } from "./arktype-ext.ts";
import type {
  DomainOfType,
  DbFormatOfType,
  GetMaxLength,
  IsVarchar,
  SafeParamDerivation,
  RewrapToColumnType,
  GetBaseTypeWithoutArrays,
} from "./common.ts";

type FinalType<T> = T extends infer U ? { [K in keyof U]: U[K] } : never;

// prettier-ignore
type DeriveBasePgColumn<T extends Type<any, any>> =
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
      : "int8" extends DbFormatOfType<T> ? { type: "ERROR" }
      : "uint8" extends DbFormatOfType<T> ? { type: "ERROR" }
      : "uint16" extends DbFormatOfType<T> ? { type: "ERROR" }
      : "uint32" extends DbFormatOfType<T> ? { type: "ERROR" } 
      : ColumnTypeSingualr<"float8">
    )
  : "bigint" extends DomainOfType<T> ? (
        "int64" extends DbFormatOfType<T> ? ColumnTypeSingualr<"int8">
      : "uint64" extends DbFormatOfType<T> ? { type: "ERROR" } 
      : "uint128" extends DbFormatOfType<T> ? { type: "ERROR" }
      : ColumnTypeSingualr<"int8">
    )
  : "boolean" extends DomainOfType<T> ? ColumnTypeSingualr<"boolean">
  : "Date" extends DomainOfType<T> ? ColumnTypeSingualr<"timestamptz">
  : "object" extends DomainOfType<T> ? ColumnType<"jsonb", { schema: T }>
  : { type: "ERROR" };

export type DerivePgColumn<
  T extends Type<any, any> | [Type<any, any>, ...any[]],
> = RewrapToColumnType<
  DeriveBasePgColumn<GetBaseTypeWithoutArrays<T>> & SafeParamDerivation<T>
>;

/**
 * Derive a PgTable type from a ZodObject with dbTable metadata.
 */
export type DerivePgTable<
  T extends Type<Record<string, any>, any> & TableName<string>,
> =
  T extends Type<infer Shape, infer $>
    ? T extends TableName<infer Name>
      ? Table<
          Name,
          {
            [K in keyof Shape]: DerivePgColumn<Type<Shape[K], $>>;
          }
        >
      : never
    : never;

/**
 * Map a generic arktype choice to a PostgreSQL ColumnType.
 *
 * For "string" and "number" we also inspect `params.dbformat` (set from
 * `.configure({ dbformat: ... })` or `db.varchar()` / `db.type("...")`) to
 * pick the correct PG type.
 */
export function derivePgColumn<
  T extends Type<any, any> | [Type<any, any>, ...any[]],
>(schema: T): DerivePgColumn<T> {
  return deriveColumn(schema, ([domain, dbformat, params]) => {
    if (domain === "string") {
      if (dbformat === "uuid") return pg.uuid(params);
      if (dbformat === "timepart") return pg.time(params);
      if (dbformat === "datepart") return pg.date(params);
      if (dbformat === "naivedatetime") return pg.timestamp(params);
      if ("maxLength" in params && typeof params.maxLength === "number") {
        return pg.varchar(params);
      }
      return pg.text(params);
    }
    if (domain === "number") {
      if (dbformat === "float32") return pg.float4(params);
      if (dbformat === "float64") return pg.float8(params);
      if (dbformat === "int32") return pg.int4(params);
      if (dbformat === "int16") return pg.int2(params);
      if (
        dbformat === "int8" ||
        dbformat === "uint8" ||
        dbformat === "uint16" ||
        dbformat === "uint32"
      ) {
        throw new Error(
          `PG has no symmetric mapping for number format: ${dbformat}`,
        );
      }
      return pg.float8(params);
    }
    if (domain === "bigint") {
      if (dbformat === "int64" || dbformat === "") return pg.int8(params);
      if (dbformat === "uint64" || dbformat === "uint128") {
        throw new Error(
          `PG has no symmetric mapping for bigint format: ${dbformat}`,
        );
      }
      return pg.int8(params);
    }
    if (domain === "boolean") {
      return pg.boolean(params);
    }
    if (domain === "Date") {
      return pg.timestamptz(params);
    }
    if (domain === "object") {
      return pg.jsonb({ ...params, schema });
    }
    throw new Error(
      `Unsupported arktype choice: ${domain} with dbformat ${dbformat}`,
    );
  });
}

/**
 * Derive an ormer PgTable from an arktype table type created with `db.table()`.
 */
export function derivePgTable<
  T extends Type<Record<string, any>, any> & TableName<string>,
>(schema: T): DerivePgTable<T> {
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
    columns[key] = derivePgColumn(colType);
  }

  return table(tableName as never, columns) as any;
}
