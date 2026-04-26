import * as s from "../simplevalidation.ts";
import type { StandardSchemaV1 } from "@standard-schema/spec";
import type { Params } from "../columns.ts";

export type SelectToSchema<
  T extends Params,
  S extends StandardSchemaV1<any, any>,
> =
  S extends StandardSchemaV1<infer I, infer O>
    ? T extends { nullable: true }
      ? T extends { default: any }
        ? StandardSchemaV1<I | null | undefined, O | null | undefined>
        : StandardSchemaV1<I | null, O | null>
      : T extends { default: any }
        ? StandardSchemaV1<I | undefined, O | undefined>
        : StandardSchemaV1<
            StandardSchemaV1.InferInput<S>,
            StandardSchemaV1.InferOutput<S>
          >
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
      return schema as any as SelectToSchema<T, S>;
    }
  }
}

// Like selectTypeToSchema but returns a branded StandardSchemaV1 wrapper
// so TypeScript preserves the computed type instead of inferring the raw schema.
export function selectTypeToSchemaTyped<
  T extends Params,
  S extends StandardSchemaV1<any, any>,
>(params: T, schema: S): SelectToSchema<T, S> {
  return selectTypeToSchema(params, schema) as any;
}

export function selectType<S extends StandardSchemaV1<any, any>>(
  schema: S,
): <T extends Params>(params: T) => SelectToSchema<T, S> {
  return (params) => selectTypeToSchema(params, schema);
}

export function selectTypeWithSchema<S extends StandardSchemaV1<any, any>>(
  schema: S,
): <T extends Omit<Params, "schema">>(
  params: T & { schema: S },
) => SelectToSchema<T & { schema: S }, S> {
  return (params) => selectTypeToSchema(params, params.schema);
}
