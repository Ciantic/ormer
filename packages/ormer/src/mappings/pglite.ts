import * as z from "zod";
import * as s from "../simplevalidation.ts";
import type { StandardSchemaV1 } from "@standard-schema/spec";
import { selectType, selectTypeToSchema } from "./common.ts";
import type { Params } from "../columns.ts";
import type { MapColumnsTo } from "../columnhelpers.ts";

export const PGLITE_SELECT_SCHEMAS = {
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
