import * as s from "../../simplevalidation.ts";
import { io } from "../../simplevalidation.ts";
import type { PostgresTypeBuilder } from "../types.ts";
import type { StandardSchemaV1 } from "@standard-schema/spec";

// Common numeric type accepts string, number or bigint
const numeric = s.union(s.string, s.number, s.bigint);

// Quirks of pglite:
//
// - For serial8 and int8 output value type differs based on size of the number:
//   Big numbers are returned as bigint, smaller numbers as number.
// - timestamp (no timezone): Input UTC Date → output converted to local time
//   (Date without Z). String input interpreted as local time → UTC-adjusted
//   output. Prefer timestamptz whenever possible.
// - timestamptz: UTC Date/string in → UTC Date out, preserved correctly.
// - date: Date object or string input → Date output preserved as-is.
// - date string input ("YYYY-MM-DD") → Date at UTC midnight.
//
export const PGLITE_TYPE_MAPPING = {
  // Numeric types
  int2: () => io(numeric, s.number),
  int4: () => io(numeric, s.number),
  int8: () => io(numeric, s.union(s.number, s.bigint)),
  serial2: () => io(numeric, s.number),
  serial4: () => io(numeric, s.number),
  serial8: () => io(numeric, s.union(s.number, s.bigint)),
  float4: () => io(numeric, s.number),
  float8: () => io(numeric, s.number),
  decimal: (_?) => io(numeric, s.string),
  money: () => io(s.string),

  // Character types
  text: () => io(s.string),
  varchar: (p) => io(s.stringMaxLength(p)),
  char: (p) => io(s.stringLength(p)),

  // Binary types
  bytea: () => io(s.uint8Array),

  // Date/Time types
  timestamp: (_?) => io(s.union(s.dateObject, s.string), s.dateObject),
  timestamptz: (_?) => io(s.union(s.dateObject, s.string), s.dateObject),
  date: () => io(s.union(s.dateObject, s.string), s.dateObject),
  time: (_?) => io(s.string),
  timetz: (_?) => io(s.string),
  interval: (_?) => io(s.string),

  // Boolean type
  boolean: () => io(s.boolean),

  // UUID type
  uuid: () => io(s.string),

  // JSON types
  jsonb: () => io(s.object),
  json: () => io(s.object),

  // Network address types
  inet: () => io(s.string),
  cidr: () => io(s.string),
  macaddr: () => io(s.string),
  macaddr8: () => io(s.string),

  // Bit string types
  bit: (p) => io(s.stringLength(p)),
  varbit: (p) => io(s.stringMaxLength(p)),

  // Text search types
  tsvector: () => io(s.string),
  tsquery: () => io(s.string),

  // XML type
  xml: () => io(s.string),

  // Geometric types
  point: () => io(s.string),
  line: () => io(s.string),
  lseg: () => io(s.string),
  box: () => io(s.string),
  path: () => io(s.string),
  polygon: () => io(s.string),
  circle: () => io(s.string),

  // Object identifier / system types
  xmin: () => io(s.number),
  pg_lsn: () => io(s.string),
  pg_snapshot: () => io(s.string),
} satisfies PostgresTypeBuilder<{
  input: StandardSchemaV1;
  output: StandardSchemaV1;
}>;
