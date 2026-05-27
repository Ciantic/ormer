import type * as c from "./columns.ts";
import type { MapColumnsTo } from "../columnhelpers.ts";
import type { Params } from "../columns.ts";
import type { Opts } from "../sql.ts";
import type { PostgresType } from "./types.ts";

// Map column types to a new value via a function
export type MapPgColumnsTo<T> = {
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

export const PGCOLUMN_TO_SQLTYPE = {
  // Numeric types
  int2: () => "int2",
  int4: () => "int4",
  int8: () => "int8",
  serial2: () => "serial2",
  serial4: () => "serial4",
  serial8: () => "serial8",
  float4: () => "float4",
  float8: () => "float8",
  money: () => "money",
  decimal: ({ precision, scale }) => `decimal(${precision},${scale})`,

  // Character types
  text: () => "text",
  varchar: ({ maxLength }) => `varchar(${maxLength})`,
  char: ({ length }) => `char(${length})`,

  // Binary types
  bytea: () => "bytea",

  // Date/Time types
  timestamp: ({ precision }) =>
    precision !== undefined ? `timestamp(${precision})` : "timestamp",
  timestamptz: ({ precision }) =>
    precision !== undefined ? `timestamptz(${precision})` : "timestamptz",
  date: () => "date",
  time: ({ precision }) =>
    precision !== undefined ? `time(${precision})` : "time",
  timetz: ({ precision }) =>
    precision !== undefined ? `timetz(${precision})` : "timetz",
  interval: ({ precision }) =>
    precision !== undefined ? `interval(${precision})` : "interval",

  // Boolean type
  boolean: () => "boolean",

  // UUID type
  uuid: () => "uuid",

  // JSON types
  jsonb: () => "jsonb",
  json: () => "json",

  // Network address types
  inet: () => "inet",
  cidr: () => "cidr",
  macaddr: () => "macaddr",
  macaddr8: () => "macaddr8",

  // Bit string types
  bit: ({ length }) => `bit(${length})`,
  varbit: ({ maxLength }) => `varbit(${maxLength})`,

  // Text search types
  tsvector: () => "tsvector",
  tsquery: () => "tsquery",

  // XML type
  xml: () => "xml",

  // Geometric types
  point: () => "point",
  line: () => "line",
  lseg: () => "lseg",
  box: () => "box",
  path: () => "path",
  polygon: () => "polygon",
  circle: () => "circle",

  // System / object identifier types
  xmin: () => "xmin",
  pg_lsn: () => "pg_lsn",
  pg_snapshot: () => "pg_snapshot",
} as const satisfies MapPgColumnsTo<PostgresType>;

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
