import * as z from "zod";
import * as s from "../simplevalidation.ts";
import type { StandardSchemaV1 } from "@standard-schema/spec";
import { selectType, selectTypeToSchema } from "./common.ts";
import type { Params } from "../columns.ts";
import type { MapColumnsTo, MapColumnsToValue } from "../columnhelpers.ts";

export const PGLITE_SELECT_SCHEMAS = {
  int32: s.number,
  int64: s.bigint,
  bigint: s.string,
  float32: s.number,
  float64: s.number,
  decimal: s.string,
  uuid: s.string,
  string: s.string,
  varchar: s.string,
  boolean: s.boolean,
  datetime: s.datetime,
  datepart: s.datetime,
  timepart: s.string,
  jsonb: s.object,
  json: s.object,
} satisfies MapColumnsToValue<StandardSchemaV1<any, any>>;

export const PGLITE_INSERT_SCHEMAS = {
  int32: s.number,
  int64: s.bigint,
  bigint: s.string,
  float32: s.number,
  float64: s.number,
  decimal: s.string,
  uuid: s.string,
  string: s.string,
  varchar: s.string,
  boolean: s.boolean,
  datetime: s.datetime,
  datepart: s.datepartCoerced,
  timepart: s.string,
  jsonb: s.object,
  json: s.object,
} satisfies MapColumnsToValue<StandardSchemaV1<any, any>>;

export const PGLITE_UPDATE_SCHEMAS = PGLITE_INSERT_SCHEMAS;

export type PgliteSelectTypes = {
  [K in keyof typeof PGLITE_SELECT_SCHEMAS]: StandardSchemaV1.InferInput<
    (typeof PGLITE_SELECT_SCHEMAS)[K]
  >;
};

export type PgliteInsertTypes = {
  [K in keyof typeof PGLITE_INSERT_SCHEMAS]: StandardSchemaV1.InferInput<
    (typeof PGLITE_INSERT_SCHEMAS)[K]
  >;
};

export type PgliteUpdateTypes = {
  [K in keyof typeof PGLITE_UPDATE_SCHEMAS]: StandardSchemaV1.InferInput<
    (typeof PGLITE_UPDATE_SCHEMAS)[K]
  >;
};

export const PGLITE_SELECT_SCHEMAS_OLD = {
  int32: selectType(s.number),
  int64: selectType(s.bigint),
  bigint: selectType(s.string),
  float32: selectType(s.number),
  float64: selectType(s.number),
  decimal: selectType(s.string),
  uuid: selectType(s.string),
  string: selectType(s.string),
  varchar: selectType(s.string),
  boolean: selectType(s.boolean),
  datetime: selectType(s.datetime),
  datepart: selectType(s.datetime),
  timepart: selectType(s.string),
  jsonb: <
    S extends StandardSchemaV1<any, any>,
    P extends Params<{ schema: S }>,
  >(
    p: P & { schema: S },
  ) => selectTypeToSchema(p, p.schema),
  json: <S extends StandardSchemaV1<any, any>, P extends Params<{ schema: S }>>(
    p: P & { schema: S },
  ) => selectTypeToSchema(p, p.schema),
} satisfies MapColumnsTo<StandardSchemaV1<any, any>>;
