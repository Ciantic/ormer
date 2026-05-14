import * as s from "../simplevalidation.ts";
import type { PostgresTypeBuilder } from "./postgres-types.ts";
import type { StandardSchemaV1 } from "@standard-schema/spec";

export const PG_TYPE_MAPPING = {
  // Numeric types
  int2: () => s.number,
  int4: () => s.number,
  int8: () => s.string,
  serial2: () => s.number,
  serial4: () => s.number,
  serial8: () => s.string,
  float4: () => s.number,
  float8: () => s.number,
  money: () => s.string,
  decimal: (_?) => s.union(s.string, s.number),

  // Character types
  text: () => s.string,
  varchar: s.stringMaxLength,
  char: s.stringLength,

  // Binary types
  bytea: () => s.buffer,

  // Date/Time types
  timestamp: (_?) => s.dateObject,
  timestamptz: (_?) => s.dateObject,
  date: () => s.dateObject,
  time: (_?) => s.string,
  timetz: (_?) => s.string,
  interval: (_?) => s.object,

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
  bit: s.stringLength,
  varbit: s.stringMaxLength,

  // Text search types
  tsvector: () => s.string,
  tsquery: () => s.string,

  // XML type
  xml: () => s.string,

  // Geometric types
  point: () => s.union(s.string, s.object),
  line: () => s.string,
  lseg: () => s.string,
  box: () => s.string,
  path: () => s.string,
  polygon: () => s.string,
  circle: () => s.object,

  // Object identifier / system types
  xmin: () => s.number,
  pg_lsn: () => s.string,
  pg_snapshot: () => s.string,
} satisfies PostgresTypeBuilder<StandardSchemaV1>;
