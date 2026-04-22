import { describe, it, expect } from "vitest";
import { SCHEMAS } from "./schemas.ts";
import type { StandardSchemaV1 } from "@standard-schema/spec";

function parse<T extends StandardSchemaV1>(
  schema: T,
  value: StandardSchemaV1.InferInput<T>,
): StandardSchemaV1.InferOutput<T> {
  const res = schema["~standard"].validate(value);
  if (res instanceof Promise) {
    throw new Error("Async validation not supported");
  }
  if (res.issues) {
    throw new Error(res.issues[0]?.message, { cause: res.issues });
  }

  return res.value;
}

describe("schemas", () => {
  it("int32", () => {
    const { schema } = SCHEMAS.int32();
    expect(parse(schema, 123)).toBe(123);

    expect(() => parse(schema, 123.5)).toThrow("Invalid integer");
    expect(() => parse(schema, 2147483648)).toThrow("Invalid value");
    expect(() => parse(schema, -2147483649)).toThrow("Invalid value");
    expect(() => parse(schema, "12345" as any)).toThrow("Expected number");
  });

  it("int64", () => {
    const { schema } = SCHEMAS.int64();

    expect(parse(schema, 123)).toBe(123);

    expect(() => parse(schema, 123.5)).toThrow("Invalid integer");
    expect(() => parse(schema, Number.MAX_SAFE_INTEGER + 1)).toThrow(
      "Invalid value",
    );
    expect(() => parse(schema, Number.MIN_SAFE_INTEGER - 1)).toThrow(
      "Invalid value",
    );
    expect(() => parse(schema, "12345" as any)).toThrow("Expected number");
  });

  it("bigint", () => {
    const { schema } = SCHEMAS.bigint();

    expect(parse(schema, 12345n)).toBe(12345n);

    expect(() => parse(schema, 123.5 as any)).toThrow("Invalid type");
    expect(() => parse(schema, Infinity as any)).toThrow("Invalid type");
    expect(() => parse(schema, -Infinity as any)).toThrow("Invalid type");
    expect(() => parse(schema, "1.23" as any)).toThrow("Invalid type");
  });

  it("float32", () => {
    const { schema } = SCHEMAS.float32();
    expect(parse(schema, 123.5)).toBe(123.5);

    expect(() => parse(schema, Infinity)).toThrow("Invalid value");
    expect(() => parse(schema, -Infinity)).toThrow("Invalid value");
    expect(() => parse(schema, "1.23" as any)).toThrow("Expected number");
  });

  it("float64", () => {
    const { schema } = SCHEMAS.float64();
    expect(parse(schema, 123.5)).toBe(123.5);

    expect(() => parse(schema, Infinity)).toThrow("Invalid value");
    expect(() => parse(schema, -Infinity)).toThrow("Invalid value");
    expect(() => parse(schema, "1.23" as any)).toThrow("Expected number");
  });

  it("decimal", () => {
    const { schema } = SCHEMAS.decimal({
      precision: 5,
      scale: 3,
    });
    expect(parse(schema, "12345.123")).toBe("12345.123");

    expect(() => parse(schema, Infinity as any)).toThrow("Invalid type");
    expect(() => parse(schema, -Infinity as any)).toThrow("Invalid type");
    expect(() => parse(schema, "invalid")).toThrow("Invalid decimal");
    expect(() => parse(schema, "123456.123")).toThrow("Invalid length");
    expect(() => parse(schema, "12345.1234")).toThrow("Invalid length");
    expect(() => parse(schema, 1234.123 as any)).toThrow("Expected string");
  });

  it("uuid", () => {
    const { schema } = SCHEMAS.uuid();
    expect(parse(schema, "2703b08e-d93c-4fd0-8aca-30a9f22d4d79")).toBe(
      "2703b08e-d93c-4fd0-8aca-30a9f22d4d79",
    );

    expect(() => parse(schema, "not_a_uuid")).toThrow("Invalid UUID");
    expect(() => parse(schema, 123 as any)).toThrow("Expected string");
    expect(() => parse(schema, 123n as any)).toThrow("Expected string");
  });

  it("string", () => {
    const { schema } = SCHEMAS.string();
    expect(parse(schema, "hello")).toBe("hello");

    expect(() => parse(schema, 123 as any)).toThrow("Expected string");
  });

  it("varchar", () => {
    const { schema } = SCHEMAS.varchar({
      maxLength: 5,
    });
    expect(parse(schema, "hello")).toBe("hello");

    expect(() => parse(schema, "123456")).toThrow("Invalid length");
    expect(() => parse(schema, 123 as any)).toThrow("Expected string");
  });

  it("boolean", () => {
    const { schema } = SCHEMAS.boolean();
    expect(parse(schema, true)).toBe(true);

    expect(() => parse(schema, 123 as any)).toThrow("Expected boolean");
    expect(() => parse(schema, "true" as any)).toThrow("Expected boolean");
  });
});
