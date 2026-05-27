import type * as c from "./columns.ts";
import type { MapColumnsTo } from "../columnhelpers.ts";
import type { Params } from "../columns.ts";
import type { Opts } from "../sql.ts";
import type { DuckdbType } from "./types.ts";

// Map column types to a new value via a function
export type MapDuckdbColumnsTo<T> = {
  [K in keyof typeof c as ReturnType<(typeof c)[K]> extends {
    type: infer U extends string;
  }
    ? string extends U
      ? never
      : U
    : never]: (
    ...params: Parameters<(typeof c)[K]> extends [infer P] ? [P] : [c.Params]
  ) => T;
};

export const DUCKDBCOLUMN_TO_SQLTYPE = {
  // Numeric types
  int1: () => "int1",
  int2: () => "int2",
  int4: () => "int4",
  int8: () => "int8",
  hugeint: () => "hugeint",
  bignum: () => "bignum",
  utinyint: () => "utinyint",
  usmallint: () => "usmallint",
  uinteger: () => "uinteger",
  ubigint: () => "ubigint",
  uhugeint: () => "uhugeint",
  float4: () => "float4",
  float8: () => "float8",
  decimal: ({ precision, scale }) =>
    precision !== undefined
      ? scale !== undefined
        ? `decimal(${precision},${scale})`
        : `decimal(${precision})`
      : "decimal",

  // Character types
  text: () => "text",
  varchar: ({ maxLength }) => `varchar(${maxLength})`,
  char: ({ length }) => `char(${length})`,

  // Binary types
  blob: () => "blob",

  // Date/Time types
  timestamp: () => "timestamp",
  timestamptz: () => "timestamptz",
  date: () => "date",
  time: () => "time",
  interval: () => "interval",

  // Boolean type
  boolean: () => "boolean",

  // UUID type
  uuid: () => "uuid",

  // JSON type
  json: () => "json",

  // Bit string type
  bit: ({ length }) => `bit(${length})`,
} as const satisfies MapDuckdbColumnsTo<DuckdbType>;

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
