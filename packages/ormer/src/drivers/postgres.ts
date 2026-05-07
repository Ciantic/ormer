import type { MapColumnsTo } from "../columnhelpers.ts";
import type { Params } from "../columns.ts";
import type { Opts } from "../sql.ts";

export type BasePostgresType =
  // Numeric types
  | "int2" // smallint
  | "int4" // integer
  | "int8" // bigint
  | "serial2"
  | "serial4" // serial
  | "serial8" // bigserial
  | "float4" // real
  | "float8" // double precision
  | "money"
  | `decimal` // numeric
  // Character types
  | "text"
  // Binary types
  | "bytea"
  // Date/Time types
  | "timestamp"
  | "timestamptz"
  | "date"
  | "time"
  | "timetz"
  | "interval"
  // Boolean type
  | "boolean"
  // UUID type
  | "uuid"
  // JSON types
  | "jsonb"
  | "json"
  // Network address types
  | "inet"
  | "cidr"
  | "macaddr"
  | "macaddr8"
  // Text search types
  | "tsvector"
  | "tsquery"
  // XML type
  | "xml"
  // Geometric types
  | "point"
  | "line"
  | "lseg"
  | "box"
  | "path"
  | "polygon"
  | "circle"
  // Object identifier / system types
  | "xmin"
  | "pg_lsn"
  | "pg_snapshot";

export type BasePostgresVariadicTypes =
  | `decimal(${number}, ${number})` // numeric(precision, scale)
  // Character types
  | `varchar(${number})`
  | `char(${number})`
  // Bit string types
  | `bit(${number})`
  | `varbit(${number})`;

export type BasePostgresVariadicTypeNames =
  BasePostgresVariadicTypes extends `${infer Name}(${string}` ? Name : never;

export type PostgresType =
  | BasePostgresType
  | BasePostgresVariadicTypes
  | `${BasePostgresType}[]`
  | `${BasePostgresVariadicTypes}[]`;

export type PostgresTypeBuilder<T, V = T> = Omit<
  {
    [k in BasePostgresType]: T;
  },
  BasePostgresVariadicTypeNames
> & {
  [k in BasePostgresVariadicTypeNames]: V;
};

type Int32Fn = <A extends boolean>(
  params: Params<{
    autoIncrement?: A;
  }>,
) => A extends true ? "serial4" : "int4";

type Int64Fn = <A extends boolean>(
  params: Params<{
    autoIncrement?: A;
  }>,
) => A extends true ? "serial8" : "int8";

type DecimalFn = <P extends number, S extends number>(
  params: Params<{
    precision: P;
    scale: S;
  }>,
) => `decimal(${P}, ${S})`;

type VarcharFn = <N extends number>(
  params: Params<{
    maxLength: N;
  }>,
) => `varchar(${N})`;

type DatetimeFn = <T extends "timestamp" | "timestamptz" = "timestamptz">(
  params: Params<{
    postgres?: { type?: T };
  }>,
) => T;

export const POSTGRES_TYPES = {
  int32: (({ autoIncrement }) =>
    autoIncrement ? "serial4" : "int4") as Int32Fn,
  int64: (({ autoIncrement }) =>
    autoIncrement ? "serial8" : "int8") as Int64Fn,
  bigint: () => "decimal" as const,
  float32: () => "float4" as const,
  float64: () => "float8" as const,
  decimal: (({ precision, scale }) =>
    `decimal(${precision}, ${scale})`) satisfies DecimalFn,
  uuid: () => "uuid" as const,
  string: () => "text" as const,
  varchar: (({ maxLength }) => `varchar(${maxLength})`) satisfies VarcharFn,
  boolean: () => "boolean" as const,
  datetime: (({ postgres }) => postgres?.type ?? "timestamptz") as DatetimeFn,
  datepart: () => "date" as const,
  timepart: () => "time" as const,
  jsonb: () => "jsonb" as const,
  json: () => "json" as const,
} satisfies MapColumnsTo<PostgresType>;

export const POSTGRES_OPTS: Opts = {
  colNameFn: (colName) => `"${colName}"`,
  defaultExprFn: (value) => {
    if (value === "now") return "CURRENT_TIMESTAMP";
    if (value === "generate") return "gen_random_uuid()";
    if (typeof value === "number") return String(value);
    if (typeof value === "string") return `'${value}'`;
    return null;
  },
};
