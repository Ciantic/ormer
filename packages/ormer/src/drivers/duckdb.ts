import type { MapColumnsTo } from "../columnhelpers.ts";
import type { Opts } from "../sql.ts";

export const DUCKDB_TYPES = {
  int32: (_) => "int4" as const,
  int64: (_) => "int8" as const,
  bigint: (_) => "hugeint" as const,
  float32: (_) => "real" as const,
  float64: (_) => "float8" as const,
  decimal: (({ precision, scale }) =>
    `decimal(${precision}, ${scale})`) as (params: {
    precision: number;
    scale: number;
  }) => string,
  uuid: (_) => "uuid" as const,
  string: (_) => "text" as const,
  varchar: (({ maxLength }) => `varchar(${maxLength})`) as (params: {
    maxLength: number;
  }) => string,
  boolean: (_) => "boolean" as const,
  datetime: (_) => "timestamptz" as const,
  datepart: (_) => "date" as const,
  timepart: (_) => "time" as const,
  jsonb: (_) => "json" as const,
  json: (_) => "json" as const,
} satisfies MapColumnsTo<string>;

export const DUCKDB_OPTS: Opts = {
  colNameFn: (colName) => `"${colName}"`,
  autoIncrementSequenceFn: (tableName, colName) => {
    const seqName = `${tableName}_${colName}_seq`;
    return {
      prependSql: `CREATE SEQUENCE "${seqName}"`,
      defaultExpr: `nextval('${seqName}')`,
    };
  },
  defaultExprFn: (value) => {
    if (value === "now") return "current_timestamp";
    if (value === "generate") return "gen_random_uuid()";
    if (typeof value === "number") return String(value);
    if (typeof value === "string") return `'${value}'`;
    return null;
  },
};
