import * as z from "zod";
import * as s from "../simplevalidation.ts";
import type { StandardSchemaV1 } from "@standard-schema/spec";
import { selectType, selectTypeToSchema } from "./common.ts";
import type { Params } from "../columns.ts";

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
};

export type PgliteSelectTypes = {
  [K in keyof typeof PGLITE_SELECT_SCHEMAS]: StandardSchemaV1.InferInput<
    ReturnType<(typeof PGLITE_SELECT_SCHEMAS)[K]>
  >;
};

const foo = PGLITE_SELECT_SCHEMAS.int32({ nullable: true, default: 0 });
const zoo = PGLITE_SELECT_SCHEMAS.jsonb({
  nullable: true,
  default: { test: 123 },
  schema: z.object({ test: z.number() }),
});
const zoo2 = PGLITE_SELECT_SCHEMAS.json({
  nullable: true,
  default: { test: 123 },
  schema: z.object({ test: z.number() }),
});

// // Compile-time check: PgliteSelectTypes must cover every column type defined in
// // columns.ts, with no extraneous keys
// type _PgliteSelectTypesExhaustive = [AllColumnTypes] extends [
//   keyof PgliteSelectTypes,
// ]
//   ? [keyof PgliteSelectTypes] extends [AllColumnTypes]
//     ? true
//     : never
//   : never;
// const _assertPgliteSelectTypesExhaustive: _PgliteSelectTypesExhaustive = true;
