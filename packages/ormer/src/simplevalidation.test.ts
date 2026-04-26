import type { StandardSchemaV1 } from "@standard-schema/spec";
import { describe, it, expect, assertType } from "vitest";
import {
  number,
  string,
  schemaMapOpt,
  schemaOpt,
  schemaCombine,
  schemaPipe,
  schemaToJsonString,
  jsonStringToSchema,
  typedValidate,
  typedValidateLoose,
} from "./simplevalidation.js";

type Expect<T extends true> = T;
type Equal<X, Y> =
  (<T>() => T extends X ? 1 : 2) extends <T>() => T extends Y ? 1 : 2
    ? true
    : false;

describe("schemaMapOpt", () => {
  it("type-level: maps each schema to optional variant", () => {
    const schemas = { testNumber: number, testString: string };
    const mapped = schemaMapOpt(schemas);

    type Test = Expect<
      Equal<
        typeof mapped,
        {
          testNumber: StandardSchemaV1<number | undefined, number | undefined>;
          testString: StandardSchemaV1<string | undefined, string | undefined>;
        }
      >
    >;
    true satisfies Test;

    expect(true).toBe(true);
  });

  it("passes undefined through", () => {
    const mapped = schemaMapOpt({ n: number, s: string });

    expect(mapped.n["~standard"].validate(undefined)).toEqual({
      value: undefined,
    });
    expect(mapped.s["~standard"].validate(undefined)).toEqual({
      value: undefined,
    });
  });

  it("validates defined values with the original schema", () => {
    const mapped = schemaMapOpt({ n: number, s: string });

    expect(mapped.n["~standard"].validate(42)).toEqual({ value: 42 });
    expect(mapped.s["~standard"].validate("hello")).toEqual({
      value: "hello",
    });
  });

  it("rejects invalid values", () => {
    const mapped = schemaMapOpt({ n: number, s: string });

    const numResult = mapped.n["~standard"].validate(
      "not a number",
    ) as StandardSchemaV1.FailureResult;
    expect(numResult.issues).toBeDefined();
    expect(numResult.issues[0]?.message).toBe("Expected number");

    const strResult = mapped.s["~standard"].validate(
      123,
    ) as StandardSchemaV1.FailureResult;
    expect(strResult.issues).toBeDefined();
    expect(strResult.issues[0]?.message).toBe("Expected string");
  });
});

describe("schemaOpt", () => {
  it("type-level: wraps schema with undefined", () => {
    const opt = schemaOpt(number);

    type Test = Expect<
      Equal<
        typeof opt,
        StandardSchemaV1<number | undefined, number | undefined>
      >
    >;
    true satisfies Test;

    expect(true).toBe(true);
  });

  it("passes undefined through", () => {
    const opt = schemaOpt(number);
    expect(opt["~standard"].validate(undefined)).toEqual({
      value: undefined,
    });
  });

  it("validates defined values with the original schema", () => {
    const opt = schemaOpt(number);
    expect(opt["~standard"].validate(42)).toEqual({ value: 42 });
  });

  it("rejects invalid values", () => {
    const opt = schemaOpt(string);
    const result = opt["~standard"].validate(
      123,
    ) as StandardSchemaV1.FailureResult;
    expect(result.issues).toBeDefined();
    expect(result.issues[0]?.message).toBe("Expected string");
  });
});

describe("schemaCombine", () => {
  it("type-level: infers combined input/output types", () => {
    const combined = schemaCombine({ n: number, s: string });

    type Test = Expect<
      Equal<
        typeof combined,
        StandardSchemaV1<{ n: number; s: string }, { n: number; s: string }>
      >
    >;
    true satisfies Test;

    expect(true).toBe(true);
  });

  it("validates a valid object", () => {
    const combined = schemaCombine({ n: number, s: string });
    expect(combined["~standard"].validate({ n: 42, s: "hello" })).toEqual({
      value: { n: 42, s: "hello" },
    });
  });

  it("rejects non-object input", () => {
    const combined = schemaCombine({ n: number, s: string });
    const result = combined["~standard"].validate(
      null,
    ) as StandardSchemaV1.FailureResult;
    expect(result.issues[0]?.message).toBe("Expected object");
  });

  it("rejects invalid field value with key in message", () => {
    const combined = schemaCombine({ n: number, s: string });
    const result = combined["~standard"].validate({
      n: "bad",
      s: "hello",
    }) as StandardSchemaV1.FailureResult;
    expect(result.issues[0]?.message).toBe('Error in key "n": Expected number');
  });
});

const numToStr: StandardSchemaV1<number, string> = {
  "~standard": {
    version: 1,
    vendor: "ormer",
    validate: (v) => ({ value: String(v) }),
  },
};

describe("schemaPipe", () => {
  it("type-level: infers piped input/output types", () => {
    const piped = schemaPipe(number, numToStr);

    type Test = Expect<Equal<typeof piped, StandardSchemaV1<number, string>>>;
    true satisfies Test;

    expect(true).toBe(true);
  });

  it("pipes output of first schema into second", () => {
    const piped = schemaPipe(number, numToStr);
    expect(piped["~standard"].validate(42)).toEqual({ value: "42" });
  });

  it("returns issues from first schema", () => {
    const piped = schemaPipe(number, numToStr);
    const result = piped["~standard"].validate(
      "not a number",
    ) as StandardSchemaV1.FailureResult;
    expect(result.issues[0]?.message).toBe("Expected number");
  });
});

describe("schemaToJson", () => {
  it("type-level: infers input type from schema, output as string", () => {
    const s = schemaToJsonString(number);

    type Test = Expect<Equal<typeof s, StandardSchemaV1<number, string>>>;
    true satisfies Test;

    expect(true).toBe(true);
  });

  it("serializes valid value to JSON string", () => {
    const s = schemaToJsonString(schemaCombine({ n: number }));
    expect(s["~standard"].validate({ n: 1 })).toEqual({ value: '{"n":1}' });
  });

  it("returns issues for invalid input", () => {
    const s = schemaToJsonString(number);
    const result = s["~standard"].validate(
      "bad",
    ) as StandardSchemaV1.FailureResult;
    expect(result.issues[0]?.message).toBe("Expected number");
  });
});

describe("jsonToSchema", () => {
  it("type-level: input is string, output from schema", () => {
    const s = jsonStringToSchema(number);

    type Test = Expect<Equal<typeof s, StandardSchemaV1<string, number>>>;
    true satisfies Test;

    expect(true).toBe(true);
  });

  it("parses JSON string and validates", () => {
    const s = jsonStringToSchema(schemaCombine({ n: number }));
    expect(s["~standard"].validate('{"n":1}')).toEqual({ value: { n: 1 } });
  });

  it("returns issue for non-string input", () => {
    const s = jsonStringToSchema(number);
    const result = s["~standard"].validate(
      42 as any,
    ) as StandardSchemaV1.FailureResult;
    expect(result.issues[0]?.message).toBe("Expected string");
  });

  it("returns issue for invalid JSON", () => {
    const s = jsonStringToSchema(number);
    const result = s["~standard"].validate(
      "not json",
    ) as StandardSchemaV1.FailureResult;
    expect(result.issues[0]?.message).toBe("Invalid JSON string");
  });

  it("returns issues from inner schema for invalid parsed value", () => {
    const s = jsonStringToSchema(number);
    const result = s["~standard"].validate(
      '"not a number"',
    ) as StandardSchemaV1.FailureResult;
    expect(result.issues[0]?.message).toBe("Expected number");
  });
});

describe("typedValidate", () => {
  it("type-level: accepts valid input", () => {
    const testValidator = schemaCombine({
      something: number,
      name: string,
    });

    const validInput = {
      something: 42,
      name: "name",
    };

    const result = typedValidate(testValidator, validInput);
    assertType<StandardSchemaV1.Result<{ something: number; name: string }>>(
      result,
    );
  });

  it("type-level: rejects objects not fitting the schema", () => {
    const testValidator = schemaCombine({
      something: number,
      name: string,
    });

    const invalidInput = {
      something: "wrong type",
      name: "name",
    };

    // @ts-expect-error
    assertType(typedValidate(testValidator, invalidInput));
  });

  it("returns value for valid input", () => {
    const testValidator = schemaCombine({ n: number, s: string });
    const result = typedValidate(testValidator, { n: 42, s: "hello" });
    expect(result).toEqual({ value: { n: 42, s: "hello" } });
  });

  it("returns issues for invalid input", () => {
    const testValidator = schemaCombine({ n: number, s: string });
    const result = typedValidate(testValidator, {
      // @ts-expect-error
      n: "bad",
      s: "hello",
    }) as StandardSchemaV1.FailureResult;
    expect(result.issues).toBeDefined();
    expect(result.issues[0]?.message).toBe('Error in key "n": Expected number');
  });
});

describe("typedValidateLoose", () => {
  it("type-level: allows extraneous properties", () => {
    const testValidator = schemaCombine({
      something: number,
      name: string,
    });

    const inputWithExtras = {
      something: 42,
      name: "name",
      extraField: "this is fine",
    };

    typedValidateLoose(testValidator, inputWithExtras);

    expect(true).toBe(true);
  });

  it("type-level: rejects objects with wrong types for known fields", () => {
    const testValidator = schemaCombine({
      something: number,
      name: string,
    });

    const invalidInput = {
      something: "wrong type",
      name: "name",
      extraField: "this is fine",
    };

    // @ts-expect-error
    typedValidateLoose(testValidator, invalidInput);

    expect(true).toBe(true);
  });
});
