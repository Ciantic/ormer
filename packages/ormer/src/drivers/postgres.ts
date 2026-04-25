import type { MapColumnsTo } from "../columnhelpers.ts";
import type { Params } from "../columns.ts";
import type { Opts } from "../sql.ts";

type Int32Fn = <A extends boolean>(
  params: Params<{
    autoIncrement?: A;
  }>,
) => A extends true ? "serial" : "integer";

type Int64Fn = <A extends boolean>(
  params: Params<{
    autoIncrement?: A;
  }>,
) => A extends true ? "bigserial" : "bigint";

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
    autoIncrement ? "serial" : "integer") as Int32Fn,
  int64: (({ autoIncrement }) =>
    autoIncrement ? "bigserial" : "bigint") as Int64Fn,
  bigint: (_) => "numeric" as const,
  float32: (_) => "real" as const,
  float64: (_) => "double precision" as const,
  decimal: (({ precision, scale }) =>
    `decimal(${precision}, ${scale})`) satisfies DecimalFn,
  uuid: (_) => "uuid" as const,
  string: (_) => "text" as const,
  varchar: (({ maxLength }) => `varchar(${maxLength})`) satisfies VarcharFn,
  boolean: (_) => "boolean" as const,
  datetime: (({ postgres }) => postgres?.type ?? "timestamptz") as DatetimeFn,
  datepart: (_) => "date" as const,
  timepart: (_) => "time" as const,
  jsonb: (_) => "jsonb" as const,
  json: (_) => "json" as const,
} satisfies MapColumnsTo<string>;

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
