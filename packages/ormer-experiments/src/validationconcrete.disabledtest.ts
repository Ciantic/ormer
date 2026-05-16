import { describe, it, expect, expectTypeOf } from "vitest";
import * as v from "./validationbuilder.ts";
import { concrete, type ConcreteSchema } from "./validationconcrete.ts";
import { typedValidate } from "./simplevalidation.ts";

describe("validationconcrete", () => {
  it("concrete string -> validates strings", () => {
    const schema = concrete(v.string());
    expectTypeOf(schema).toEqualTypeOf<
      ConcreteSchema<ReturnType<typeof v.string>>
    >();

    expect(typedValidate(schema, "hello")).toEqual({ value: "hello" });
    // @ts-expect-error - intentional wrong type
    expect(typedValidate(schema, 123).issues?.[0]?.message).toBe(
      "Expected string",
    );
  });

  it("concrete number -> validates numbers", () => {
    const schema = concrete(v.number());
    expect(typedValidate(schema, 42)).toEqual({ value: 42 });
    // @ts-expect-error - intentional wrong type
    expect(typedValidate(schema, "foo").issues?.[0]?.message).toBe(
      "Expected number",
    );
  });

  it("concrete bigint -> validates bigints", () => {
    const schema = concrete(v.bigint());
    expect(typedValidate(schema, BigInt(1))).toEqual({ value: BigInt(1) });
    // @ts-expect-error - intentional wrong type
    expect(typedValidate(schema, 1).issues?.[0]?.message).toBe("Invalid type");
  });

  it("concrete boolean -> validates booleans", () => {
    const schema = concrete(v.boolean());
    expect(typedValidate(schema, true)).toEqual({ value: true });
    // @ts-expect-error - intentional wrong type
    expect(typedValidate(schema, 0).issues?.[0]?.message).toBe(
      "Expected boolean",
    );
  });

  it("concrete dateObject -> validates Dates", () => {
    const schema = concrete(v.dateObject());
    const d = new Date();
    expect(typedValidate(schema, d)).toEqual({ value: d });
    // @ts-expect-error - intentional wrong type
    expect(typedValidate(schema, "2024").issues?.[0]?.message).toBe(
      "Expected Date",
    );
  });

  it("concrete object -> validates objects", () => {
    const schema = concrete(v.object());
    expect(typedValidate(schema, {})).toEqual({ value: {} });
    expect(typedValidate(schema, null).issues?.[0]?.message).toBe(
      "Expected object",
    );
  });

  it("concrete array(string) -> validates string arrays", () => {
    const schema = concrete(v.array(v.string()));
    expect(typedValidate(schema, ["a", "b"])).toEqual({ value: ["a", "b"] });
    // @ts-expect-error - intentional wrong type
    expect(typedValidate(schema, [1]).issues).toBeDefined();
  });

  it("concrete union -> validates union", () => {
    const schema = concrete(v.union(v.string(), v.number()));
    // @ts-expect-error - type inference of union is narrow
    expect(typedValidate(schema, "hello")).toEqual({ value: "hello" });
    // @ts-expect-error - type inference of union is narrow
    expect(typedValidate(schema, 42)).toEqual({ value: 42 });
    // @ts-expect-error - intentional wrong type
    expect(typedValidate(schema, true).issues).toBeDefined();
  });

  it("concrete objectWithFields -> validates shaped objects", () => {
    const schema = concrete(
      v.objectWithFields({
        name: v.string(),
        age: v.number(),
      }),
    );
    expect(typedValidate(schema, { name: "Alice", age: 30 })).toEqual({
      value: { name: "Alice", age: 30 },
    });
    expect(
      // @ts-expect-error - intentional wrong type
      typedValidate(schema, { name: "Alice", age: "old" }).issues,
    ).toBeDefined();
  });

  it("concrete stringOfMaxLength -> validates max length", () => {
    const schema = concrete(v.stringOfMaxLength(5));
    expect(typedValidate(schema, "hello")).toEqual({ value: "hello" });
    expect(typedValidate(schema, "hello!").issues).toBeDefined();
  });

  it("concrete stringOfLength -> validates exact length", () => {
    const schema = concrete(v.stringOfLength(3));
    expect(typedValidate(schema, "abc")).toEqual({ value: "abc" });
    expect(typedValidate(schema, "ab").issues).toBeDefined();
  });
});
