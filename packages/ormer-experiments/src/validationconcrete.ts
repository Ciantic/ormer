import type { StandardSchemaV1 } from "@standard-schema/spec";
import type { ValidationBuilder } from "./validationbuilder.ts";
import * as s from "./simplevalidation.ts";

// ── Type-level mapping from builder to StandardSchemaV1 ──

export type ConcreteSchema<T extends ValidationBuilder<string, {}>> =
  T extends { type: "string" }
    ? StandardSchemaV1<string, string>
    : T extends { type: "number" }
      ? StandardSchemaV1<number, number>
      : T extends { type: "bigint" }
        ? StandardSchemaV1<bigint, bigint>
        : T extends { type: "boolean" }
          ? StandardSchemaV1<boolean, boolean>
          : T extends { type: "dateObject" }
            ? StandardSchemaV1<Date, Date>
            : T extends { type: "object" }
              ? StandardSchemaV1<object, object>
              : T extends { type: "array"; of: infer Elem }
                ? Elem extends string
                  ? StandardSchemaV1<
                      PrimitiveToTS<Elem>[],
                      PrimitiveToTS<Elem>[]
                    >
                  : never
                : T extends { type: "union"; of: infer U }
                  ? U extends string
                    ? StandardSchemaV1<PrimitiveToTS<U>, PrimitiveToTS<U>>
                    : never
                  : T extends { type: "objectWithFields"; fields: infer F }
                    ? F extends Record<string, string>
                      ? StandardSchemaV1<
                          { [K in keyof F]: PrimitiveToTS<F[K]> },
                          { [K in keyof F]: PrimitiveToTS<F[K]> }
                        >
                      : never
                    : never;

type PrimitiveToTS<T extends string> = T extends "string"
  ? string
  : T extends "number"
    ? number
    : T extends "bigint"
      ? bigint
      : T extends "boolean"
        ? boolean
        : T extends "dateObject"
          ? Date
          : T extends "object"
            ? object
            : unknown;

// ── Runtime implementation ──

const primitiveSchemas: Record<string, StandardSchemaV1> = {
  string: s.string,
  number: s.number,
  bigint: s.bigint,
  boolean: s.boolean,
  dateObject: s.dateObject,
  object: s.object,
};

export function concrete<T extends ValidationBuilder<string, {}>>(
  builder: T,
): ConcreteSchema<T> {
  if (builder.type === "string") {
    if ("maxLength" in builder) {
      return s.stringMaxLength({
        maxLength: (builder as any).maxLength,
      }) as any;
    }
    if ("length" in builder) {
      return s.stringLength({ length: (builder as any).length }) as any;
    }
    return primitiveSchemas.string as any;
  }
  if (builder.type === "number") {
    return primitiveSchemas.number as any;
  }
  if (builder.type === "bigint") {
    return primitiveSchemas.bigint as any;
  }
  if (builder.type === "boolean") {
    return primitiveSchemas.boolean as any;
  }
  if (builder.type === "dateObject") {
    return primitiveSchemas.dateObject as any;
  }
  if (builder.type === "object") {
    return primitiveSchemas.object as any;
  }
  if (builder.type === "array") {
    const elemSchema = concrete({ type: (builder as any).of } as any);
    return s.array(elemSchema as StandardSchemaV1<unknown, unknown>) as any;
  }
  if (builder.type === "union") {
    const ofArr: string[] = (builder as any).of;
    const schemas = ofArr.map((t: string) => concrete({ type: t } as any));
    return (s.union as any)(...schemas);
  }
  if (builder.type === "objectWithFields") {
    const fields: Record<string, string> = (builder as any).fields;
    const schemas: Record<string, StandardSchemaV1> = {};
    for (const key of Object.keys(fields)) {
      schemas[key] = concrete({ type: fields[key] } as any);
    }
    return s.schemaCombine(schemas) as any;
  }
  throw new Error("Unknown builder type: " + (builder as any).type);
}
