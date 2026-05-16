import { describe, it, expectTypeOf } from "vitest";
import * as v from "./validationbuilder.ts";

describe("validationbuilder", () => {
  it("string", () => {
    const result = v.string();
    expectTypeOf(result).toEqualTypeOf<v.ValidationBuilder<"string", {}>>();
    expectTypeOf(result.type).toEqualTypeOf<"string">();
  });

  it("number", () => {
    const result = v.number();
    expectTypeOf(result).toEqualTypeOf<v.ValidationBuilder<"number", {}>>();
    expectTypeOf(result.type).toEqualTypeOf<"number">();
  });

  it("bigint", () => {
    const result = v.bigint();
    expectTypeOf(result).toEqualTypeOf<v.ValidationBuilder<"bigint", {}>>();
    expectTypeOf(result.type).toEqualTypeOf<"bigint">();
  });

  it("boolean", () => {
    const result = v.boolean();
    expectTypeOf(result).toEqualTypeOf<v.ValidationBuilder<"boolean", {}>>();
    expectTypeOf(result.type).toEqualTypeOf<"boolean">();
  });

  it("dateObject", () => {
    const result = v.dateObject();
    expectTypeOf(result).toEqualTypeOf<v.ValidationBuilder<"dateObject", {}>>();
    expectTypeOf(result.type).toEqualTypeOf<"dateObject">();
  });

  it("object", () => {
    const result = v.object();
    expectTypeOf(result).toEqualTypeOf<v.ValidationBuilder<"object", {}>>();
    expectTypeOf(result.type).toEqualTypeOf<"object">();
  });

  it("stringOfMaxLength preserves length as const", () => {
    const result = v.stringOfMaxLength(255);
    expectTypeOf(result).toEqualTypeOf<
      v.ValidationBuilder<"string", { readonly maxLength: 255 }>
    >();
    expectTypeOf(result.maxLength).toEqualTypeOf<255>();
  });

  it("stringOfLength preserves length as const", () => {
    const result = v.stringOfLength(10);
    expectTypeOf(result).toEqualTypeOf<
      v.ValidationBuilder<"string", { readonly length: 10 }>
    >();
    expectTypeOf(result.length).toEqualTypeOf<10>();
  });

  it("array stores element type as const", () => {
    const result = v.array(v.string());
    expectTypeOf(result).toEqualTypeOf<
      v.ValidationBuilder<"array", { readonly of: "string" }>
    >();
    expectTypeOf(result.of).toEqualTypeOf<"string">();
  });

  it("array with number", () => {
    const result = v.array(v.number());
    expectTypeOf(result.of).toEqualTypeOf<"number">();
  });

  it("array with dateObject", () => {
    const result = v.array(v.dateObject());
    expectTypeOf(result.of).toEqualTypeOf<"dateObject">();
  });

  it("objectWithFields preserves field types as const", () => {
    const result = v.objectWithFields({
      name: v.string(),
      age: v.number(),
      active: v.boolean(),
    });
    expectTypeOf(result.type).toEqualTypeOf<"objectWithFields">();
    expectTypeOf(result.fields.name).toEqualTypeOf<"string">();
    expectTypeOf(result.fields.age).toEqualTypeOf<"number">();
    expectTypeOf(result.fields.active).toEqualTypeOf<"boolean">();
  });

  it("objectWithFields with nested array", () => {
    const result = v.objectWithFields({
      tags: v.array(v.string()),
      scores: v.array(v.number()),
    });
    expectTypeOf(result.fields.tags).toEqualTypeOf<"array">();
    expectTypeOf(result.fields.scores).toEqualTypeOf<"array">();
  });

  it("objectWithFields with single field", () => {
    const result = v.objectWithFields({ name: v.string() });
    expectTypeOf(result.fields.name).toEqualTypeOf<"string">();
  });

  it("union of two primitives", () => {
    const result = v.union(v.string(), v.number());
    expectTypeOf(result.type).toEqualTypeOf<"union">();
    expectTypeOf(result.of).toEqualTypeOf<"string" | "number">();
  });

  it("union of three primitives", () => {
    const result = v.union(v.string(), v.number(), v.boolean());
    expectTypeOf(result.of).toEqualTypeOf<"string" | "number" | "boolean">();
  });

  it("union with dateObject and string", () => {
    const result = v.union(v.dateObject(), v.string());
    expectTypeOf(result.of).toEqualTypeOf<"dateObject" | "string">();
  });

  it("union with single primitive", () => {
    const result = v.union(v.string());
    expectTypeOf(result.of).toEqualTypeOf<"string">();
  });
});
