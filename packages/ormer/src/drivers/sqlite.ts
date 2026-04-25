import type { MapColumnsTo } from "../columnhelpers.ts";
import type { Opts } from "../sql.ts";

// SQLite UUID generation expression (no built-in uuid function)
const SQLITE_UUID_GEN = `lower(printf('%s-%s-4%s-%s%s-%s',hex(randomblob(4)),hex(randomblob(2)),substr(hex(randomblob(2)),2,3),substr('89ab',abs(random())%4+1,1),substr(hex(randomblob(2)),2,3),hex(randomblob(6))))`;

export const SQLITE_TYPES = {
  int32: (_) => "integer" as const,
  int64: (_) => "integer" as const,
  bigint: (_) => "text" as const,
  float32: (_) => "real" as const,
  float64: (_) => "real" as const,
  decimal: (_) => "text" as const,
  uuid: (_) => "text" as const,
  string: (_) => "text" as const,
  varchar: (_) => "text" as const,
  boolean: (_) => "integer" as const,
  datetime: (params) => params.sqlite?.type ?? ("text" as const),
  datepart: (_) => "text" as const,
  timepart: (_) => "text" as const,
  jsonb: (_) => "text" as const,
  json: (_) => "text" as const,
} satisfies MapColumnsTo<string>;

export const SQLITE_OPTS: Opts = {
  colNameFn: (colName) => `"${colName}"`,
  autoIncrementKeyword: "AUTOINCREMENT",
  defaultExprFn: (value) => {
    if (value === "now") return "CURRENT_TIMESTAMP";
    if (value === "generate") return SQLITE_UUID_GEN;
    if (typeof value === "number") return String(value);
    if (typeof value === "string") return `'${value}'`;
    return null;
  },
};
