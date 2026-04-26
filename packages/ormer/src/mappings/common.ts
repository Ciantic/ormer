import * as s from "../simplevalidation.ts";
import type { StandardSchemaV1 } from "@standard-schema/spec";
import type { Params } from "../columns.ts";

export type SelectToSchema<
  T extends Params,
  S extends StandardSchemaV1<any, any>,
> =
  S extends StandardSchemaV1<infer I, infer O>
    ? T extends { nullable: true }
      ? T extends { default: {} }
        ? StandardSchemaV1<I | null | undefined, O | null | undefined>
        : StandardSchemaV1<I | null, O | null>
      : T extends { default: {} }
        ? StandardSchemaV1<I | undefined, O | undefined>
        : S
    : never;

export function selectTypeToSchema<
  T extends Params,
  S extends StandardSchemaV1<any, any>,
>(params: T, schema: S): SelectToSchema<T, S> {
  if (params.nullable) {
    if (params.default !== undefined) {
      return s.schemaOpt(s.schemaNullable(schema)) as SelectToSchema<T, S>;
    } else {
      return s.schemaNullable(schema) as SelectToSchema<T, S>;
    }
  } else {
    if (params.default !== undefined) {
      return s.schemaOpt(schema) as SelectToSchema<T, S>;
    } else {
      return schema as SelectToSchema<T, S>;
    }
  }
}

export function selectType<S extends StandardSchemaV1<any, any>>(
  schema: S,
): <T extends Params>(params: T) => SelectToSchema<T, S> {
  return (params) => selectTypeToSchema(params, schema);
}
