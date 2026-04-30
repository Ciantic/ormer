import type { MapColumnsTo } from "../columnhelpers.ts";
import type { Params } from "../columns.ts";
import type { Opts } from "../sql.ts";

export type PostgresType =
  | "serial"
  | "integer"
  | "bigserial"
  | "bigint"
  | "numeric"
  | "real"
  | "double precision"
  | "uuid"
  | "text"
  | `decimal(${number}, ${number})`
  | `varchar(${number})`
  | "boolean"
  | "timestamp"
  | "timestamptz"
  | "date"
  | "xmin"
  | "time"
  | "jsonb"
  | "json";

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
  bigint: () => "numeric" as const,
  float32: () => "real" as const,
  float64: () => "double precision" as const,
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
