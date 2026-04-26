import type { StandardSchemaV1 } from "@standard-schema/spec";
import { describe, it, expect } from "vitest";
import { number, string, schemaCombine } from "../simplevalidation.js";
import {
  selectTypeToSchema,
  selectType,
  schemaMapper,
  schemaToStringMapper,
  stringToSchemaMapper,
} from "./common.js";

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

// ─── schemaMapper ─────────────────────────────────────────────────────────────

describe("schemaMapper", () => {
  it("uses the schema from params", () => {
    const inner = schemaCombine({ n: number });
    const schema = schemaMapper({ schema: inner });
    expect(validate(schema, { n: 1 })).toEqual({ value: { n: 1 } });
  });

  it("nullable + default wraps schema from params", () => {
    const inner = schemaCombine({ n: number });
    const schema = schemaMapper({ schema: inner, nullable: true, default: {} });
    expect(validate(schema, null)).toEqual({ value: null });
    expect(validate(schema, undefined)).toEqual({ value: undefined });
  });
});

// ─── schemaToStringMapper ─────────────────────────────────────────────────────

describe("schemaToStringMapper", () => {
  it("type-level: output is string", () => {
    const inner = schemaCombine({ n: number });
    const schema = schemaToStringMapper({ schema: inner });
    type Test = Expect<
      Equal<typeof schema, StandardSchemaV1<{ n: number }, string>>
    >;
    true satisfies Test;
    expect(true).toBe(true);
  });

  it("serializes valid value to JSON string", () => {
    const schema = schemaToStringMapper({
      schema: schemaCombine({ n: number }),
    });
    expect(validate(schema, { n: 42 })).toEqual({ value: '{"n":42}' });
  });

  it("rejects invalid inner value", () => {
    const schema = schemaToStringMapper({ schema: number });
    const result = validate(schema, "bad") as StandardSchemaV1.FailureResult;
    expect(result.issues[0]?.message).toBe("Expected number");
  });

  it("nullable: passes null through and serializes value", () => {
    const schema = schemaToStringMapper({ schema: number, nullable: true });
    expect(validate(schema, null)).toEqual({ value: null });
    expect(validate(schema, 1)).toEqual({ value: "1" });
  });
});

// ─── stringToSchemaMapper ────────────────────────────────────────────────────

describe("stringToSchemaMapper", () => {
  it("type-level: input is string, output from schema", () => {
    const inner = schemaCombine({ n: number });
    const schema = stringToSchemaMapper({ schema: inner });
    type Test = Expect<
      Equal<typeof schema, StandardSchemaV1<string, { n: number }>>
    >;
    true satisfies Test;
    expect(true).toBe(true);
  });

  it("parses JSON string and validates", () => {
    const schema = stringToSchemaMapper({
      schema: schemaCombine({ n: number }),
    });
    expect(validate(schema, '{"n":42}')).toEqual({ value: { n: 42 } });
  });

  it("returns issue for non-string input", () => {
    const schema = stringToSchemaMapper({ schema: number });
    const result = validate(schema, 42) as StandardSchemaV1.FailureResult;
    expect(result.issues[0]?.message).toBe("Expected string");
  });

  it("returns issue for invalid JSON", () => {
    const schema = stringToSchemaMapper({ schema: number });
    const result = validate(
      schema,
      "not json",
    ) as StandardSchemaV1.FailureResult;
    expect(result.issues[0]?.message).toBe("Invalid JSON string");
  });

  it("returns issue when parsed value fails inner schema", () => {
    const schema = stringToSchemaMapper({ schema: number });
    const result = validate(
      schema,
      '"hello"',
    ) as StandardSchemaV1.FailureResult;
    expect(result.issues[0]?.message).toBe("Expected number");
  });

  it("nullable: passes null through and parses value", () => {
    const schema = stringToSchemaMapper({ schema: number, nullable: true });
    expect(validate(schema, null)).toEqual({ value: null });
    expect(validate(schema, "7")).toEqual({ value: 7 });
  });
});
