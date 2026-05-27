import type * as c from "./columns.ts";
import type { Opts } from "../sql.ts";
import type { SqliteType } from "./types.ts";

// Map column types to a new value via a function
export type MapSqliteColumnsTo<T> = {
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

// SQLite UUID generation expression (no built-in uuid function)
const SQLITE_UUID_GEN = `lower(printf('%s-%s-4%s-%s%s-%s',hex(randomblob(4)),hex(randomblob(2)),substr(hex(randomblob(2)),2,3),substr('89ab',abs(random())%4+1,1),substr(hex(randomblob(2)),2,3),hex(randomblob(6))))`;

export const SQLITECOLUMN_TO_SQLTYPE = {
  int: () => "int",
  integer: () => "integer",
  real: () => "real",
  text: () => "text",
  blob: () => "blob",
  any: () => "any",
} as const satisfies MapSqliteColumnsTo<SqliteType>;

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
