import * as z from "zod";
import * as s from "../simplevalidation.ts";
import type { StandardSchemaV1 } from "@standard-schema/spec";
import { selectType, selectTypeToSchema } from "./common.ts";
import type { Params } from "../columns.ts";
import type { MapColumnsTo, MapColumnsToValue } from "../columnhelpers.ts";
import type { BasePostgresType, PostgresType } from "../drivers/postgres.ts";

export const PGLITE_TYPE_MAPPING = {
  // Numeric types
  int2: s.number,
  int4: s.number,
  int8: s.bigint,
  serial2: s.number,
  serial4: s.number,
  serial8: s.number,
  float4: s.number,
  float8: s.number,
  money: s.string,

  // Character types
  text: s.string,

  // Binary types
  bytea: s.uint8Array,

  // Date/Time types
  timestamp: s.datetime,
  timestamptz: s.datetime,
  date: s.datetime,
  time: s.string,
  timetz: s.string,
  interval: s.string,

  // Boolean type
  boolean: s.boolean,

  // UUID type
  uuid: s.string,

  // JSON types
  jsonb: s.object,
  json: s.object,

  // Network address types
  inet: s.string,
  cidr: s.string,
  macaddr: s.string,
  macaddr8: s.string,

  // Bit string types
  bit: ({ length }: { length: number }) => s.string,
  varbit: ({ maxLength }: { maxLength: number }) => s.string,

  // Text search types
  tsvector: s.string,
  tsquery: s.string,

  // XML type
  xml: s.string,

  // Geometric types
  point: s.string,
  line: s.string,
  lseg: s.string,
  box: s.string,
  path: s.string,
  polygon: s.string,
  circle: s.string,

  // Object identifier / system types
  xmin: s.number,
  pg_lsn: s.string,
  pg_snapshot: s.string,

  // Parametric types (factory functions)
  decimal: (params?: { precision: number; scale: number }) => s.decimal(params),
  varchar: ({ maxLength }: { maxLength: number }) => s.varchar({ maxLength }),
  char: ({ maxLength }: { maxLength: number }) => s.varchar({ maxLength }),
} satisfies Record<
  BasePostgresType | "bit" | "varbit" | "decimal" | "varchar" | "char",
  any
>;
