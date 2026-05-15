import type { MapColumnsTo } from "../columnhelpers.ts";
import type { Params } from "../columns.ts";
import type { Opts } from "../sql.ts";
import type { PostgresType } from "./postgres-types.ts";

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
) => `decimal(${P},${S})`;

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

export const COMMON_TO_POSTGRES = {
  int32: (({ autoIncrement }) =>
    autoIncrement ? "serial4" : "int4") as Int32Fn,
  int64: (({ autoIncrement }) =>
    autoIncrement ? "serial8" : "int8") as Int64Fn,
  bigint: () => "decimal",
  float32: () => "float4",
  float64: () => "float8",
  decimal: (({ precision, scale }) =>
    `decimal(${precision},${scale})`) satisfies DecimalFn,
  uuid: () => "uuid",
  string: () => "text",
  varchar: (({ maxLength }) => `varchar(${maxLength})`) satisfies VarcharFn,
  boolean: () => "boolean",
  datetime: (({ postgres }) => postgres?.type ?? "timestamptz") as DatetimeFn,
  datepart: () => "date",
  timepart: () => "time",
  jsonb: () => "jsonb",
  json: () => "json",
} as const satisfies MapColumnsTo<PostgresType>;

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
