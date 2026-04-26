import type { StandardSchemaV1 } from "@standard-schema/spec";
import { describe, it, expect } from "vitest";
import { number, schemaCombine } from "../simplevalidation.js";
import { selectTypeToSchema, selectType } from "./common.js";

type Expect<T extends true> = T;
type Equal<X, Y> =
  (<T>() => T extends X ? 1 : 2) extends <T>() => T extends Y ? 1 : 2
    ? true
    : false;

const validate = (schema: StandardSchemaV1<any, any>, value: unknown) =>
  schema["~standard"].validate(value);

// ─── paramsToSchema ──────────────────────────────────────────────────────────

describe("paramsToSchema", () => {
  describe("plain (no nullable, no default)", () => {
    it("type-level: returns the original schema type", () => {
      const result = selectTypeToSchema({}, number);
      type Test = Expect<Equal<typeof result, typeof number>>;
      true satisfies Test;
      expect(true).toBe(true);
    });

    it("validates valid value", () => {
      const schema = selectTypeToSchema({}, number);
      expect(validate(schema, 42)).toEqual({ value: 42 });
    });

    it("rejects invalid value", () => {
      const schema = selectTypeToSchema({}, number);
      const result = validate(schema, "bad") as StandardSchemaV1.FailureResult;
      expect(result.issues[0]?.message).toBe("Expected number");
    });
  });

  describe("nullable only", () => {
    it("type-level: adds null to input/output", () => {
      const result = selectTypeToSchema({ nullable: true }, number);
      type Test = Expect<
        Equal<typeof result, StandardSchemaV1<number | null, number | null>>
      >;
      true satisfies Test;
      expect(true).toBe(true);
    });

    it("passes null through", () => {
      const schema = selectTypeToSchema({ nullable: true }, number);
      expect(validate(schema, null)).toEqual({ value: null });
    });

    it("validates non-null value", () => {
      const schema = selectTypeToSchema({ nullable: true }, number);
      expect(validate(schema, 7)).toEqual({ value: 7 });
    });

    it("rejects undefined", () => {
      const schema = selectTypeToSchema({ nullable: true }, number);
      const result = validate(
        schema,
        undefined,
      ) as StandardSchemaV1.FailureResult;
      expect(result.issues).toBeDefined();
    });
  });

  describe("default only", () => {
    it("type-level: adds undefined to input/output", () => {
      const result = selectTypeToSchema({ default: 0 }, number);
      type Test = Expect<
        Equal<
          typeof result,
          StandardSchemaV1<number | undefined, number | undefined>
        >
      >;
      true satisfies Test;
      expect(true).toBe(true);
    });

    it("passes undefined through", () => {
      const schema = selectTypeToSchema({ default: 0 }, number);
      expect(validate(schema, undefined)).toEqual({ value: undefined });
    });

    it("validates defined value", () => {
      const schema = selectTypeToSchema({ default: 0 }, number);
      expect(validate(schema, 5)).toEqual({ value: 5 });
    });

    it("rejects null", () => {
      const schema = selectTypeToSchema({ default: 0 }, number);
      const result = validate(schema, null) as StandardSchemaV1.FailureResult;
      expect(result.issues).toBeDefined();
    });
  });

  describe("nullable + default", () => {
    it("type-level: adds null and undefined to input/output", () => {
      const result = selectTypeToSchema({ nullable: true, default: 0 }, number);
      type Test = Expect<
        Equal<
          typeof result,
          StandardSchemaV1<number | null | undefined, number | null | undefined>
        >
      >;
      true satisfies Test;
      expect(true).toBe(true);
    });

    it("passes null through", () => {
      const schema = selectTypeToSchema({ nullable: true, default: 0 }, number);
      expect(validate(schema, null)).toEqual({ value: null });
    });

    it("passes undefined through", () => {
      const schema = selectTypeToSchema({ nullable: true, default: 0 }, number);
      expect(validate(schema, undefined)).toEqual({ value: undefined });
    });

    it("validates defined non-null value", () => {
      const schema = selectTypeToSchema({ nullable: true, default: 0 }, number);
      expect(validate(schema, 3)).toEqual({ value: 3 });
    });
  });
});

// ─── colMapper ───────────────────────────────────────────────────────────────

describe("colMapper", () => {
  it("returns a generic function that applies paramsToSchema", () => {
    const mapper = selectType(number);
    const schema = mapper({ nullable: true, default: 0 });
    type Test = Expect<
      Equal<
        typeof schema,
        StandardSchemaV1<number | null | undefined, number | null | undefined>
      >
    >;
    true satisfies Test;
    expect(validate(schema, null)).toEqual({ value: null });
    expect(validate(schema, undefined)).toEqual({ value: undefined });
    expect(validate(schema, 1)).toEqual({ value: 1 });
  });

  it("plain params returns the base schema", () => {
    const mapper = selectType(number);
    const schema = mapper({});
    type Test = Expect<Equal<typeof schema, typeof number>>;
    true satisfies Test;
    expect(validate(schema, 42)).toEqual({ value: 42 });
  });
});
