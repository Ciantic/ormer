import * as s from "../simplevalidation.ts";
import type { PostgresTypeBuilder } from "./postgres-types.ts";
import type { StandardSchemaV1 } from "@standard-schema/spec";

export const PGLITE_TYPE_MAPPING = {
  // Numeric types
  int2: () => s.number,
  int4: () => s.number,
  int8: () => s.bigint,
  serial2: () => s.number,
  serial4: () => s.number,
  serial8: () => s.number,
  float4: () => s.number,
  float8: () => s.number,
  money: () => s.string,
  decimal: s.decimal,

  // Character types
  text: () => s.string,
  varchar: s.varchar,
  char: s.char,

  // Binary types
  bytea: () => s.uint8Array,

  // Date/Time types
  timestamp: (_?) => s.datetime,
  timestamptz: (_?) => s.datetime,
  date: () => s.datetime, // pglite has odd default: YYYY-MM-DD entries returned as Date objects
  time: (_?) => s.string,
  timetz: (_?) => s.string,
  interval: (_?) => s.string,

  // Boolean type
  boolean: () => s.boolean,

  // UUID type
  uuid: () => s.string,

  // JSON types
  jsonb: () => s.object,
  json: () => s.object,

  // Network address types
  inet: () => s.string,
  cidr: () => s.string,
  macaddr: () => s.string,
  macaddr8: () => s.string,

  // Bit string types
  bit: (_: { length: number }) => s.string,
  varbit: (_: { maxLength: number }) => s.string,

  // Text search types
  tsvector: () => s.string,
  tsquery: () => s.string,

  // XML type
  xml: () => s.string,

  // Geometric types
  point: () => s.string,
  line: () => s.string,
  lseg: () => s.string,
  box: () => s.string,
  path: () => s.string,
  polygon: () => s.string,
  circle: () => s.string,

  // Object identifier / system types
  xmin: () => s.number,
  pg_lsn: () => s.string,
  pg_snapshot: () => s.string,
} satisfies PostgresTypeBuilder<StandardSchemaV1>;
