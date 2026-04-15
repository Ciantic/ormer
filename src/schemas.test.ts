import * as v from "valibot";
import { describe, it, expect } from "vitest";
import { SCHEMAS } from "./schemas.ts";

describe("schemas", () => {
  it("int32", () => {
    const { schema } = SCHEMAS.int32();
    expect(v.parse(schema, 123)).toBe(123);

    expect(() => v.parse(schema, 123.5)).toThrow("Invalid integer");
    expect(() => v.parse(schema, 2147483648)).toThrow("Invalid value");
    expect(() => v.parse(schema, -2147483649)).toThrow("Invalid value");
    expect(() => v.parse(schema, "12345")).toThrow("Expected number");
  });

  it("int64", () => {
    const { schema } = SCHEMAS.int64();

    expect(v.parse(schema, 123)).toBe(123);

    expect(() => v.parse(schema, 123.5)).toThrow("Invalid integer");
    expect(() => v.parse(schema, Number.MAX_SAFE_INTEGER + 1)).toThrow("Invalid value");
    expect(() => v.parse(schema, Number.MIN_SAFE_INTEGER - 1)).toThrow("Invalid value");
    expect(() => v.parse(schema, "12345")).toThrow("Expected number");
  });

  it("bigint", () => {
    const { schema } = SCHEMAS.bigint();

    expect(v.parse(schema, 12345n)).toBe(12345n);

    expect(() => v.parse(schema, 123.5)).toThrow("Invalid type");
    expect(() => v.parse(schema, Infinity)).toThrow("Invalid type");
    expect(() => v.parse(schema, -Infinity)).toThrow("Invalid type");
    expect(() => v.parse(schema, "1.23")).toThrow("Invalid type");
  });

  it("float32", () => {
    const { schema } = SCHEMAS.float32();
    expect(v.parse(schema, 123.5)).toBe(123.5);

    expect(() => v.parse(schema, Infinity)).toThrow("Invalid value");
    expect(() => v.parse(schema, -Infinity)).toThrow("Invalid value");
    expect(() => v.parse(schema, "1.23")).toThrow("Expected number");
  });

  it("float64", () => {
    const { schema } = SCHEMAS.float64();
    expect(v.parse(schema, 123.5)).toBe(123.5);

    expect(() => v.parse(schema, Infinity)).toThrow("Invalid value");
    expect(() => v.parse(schema, -Infinity)).toThrow("Invalid value");
    expect(() => v.parse(schema, "1.23")).toThrow("Expected number");
  });

  it("decimal", () => {
    const { schema } = SCHEMAS.decimal({
      precision: 5,
      scale: 3,
    });
    expect(v.parse(schema, "12345.123")).toBe("12345.123");

    expect(() => v.parse(schema, Infinity)).toThrow("Invalid type");
    expect(() => v.parse(schema, -Infinity)).toThrow("Invalid type");
    expect(() => v.parse(schema, "invalid")).toThrow("Invalid decimal");
    expect(() => v.parse(schema, "123456.123")).toThrow("Invalid length");
    expect(() => v.parse(schema, "12345.1234")).toThrow("Invalid length");
    expect(() => v.parse(schema, 1234.123)).toThrow("Expected string");
  });

  it("uuid", () => {
    const { schema } = SCHEMAS.uuid();
    expect(
      v.parse(schema, "2703b08e-d93c-4fd0-8aca-30a9f22d4d79")
    ).toBe("2703b08e-d93c-4fd0-8aca-30a9f22d4d79");

    expect(() => v.parse(schema, "not_a_uuid")).toThrow("Invalid UUID");
    expect(() => v.parse(schema, 123)).toThrow("Expected string");
    expect(() => v.parse(schema, 123n)).toThrow("Expected string");
  });

  it("string", () => {
    const { schema } = SCHEMAS.string();
    expect(v.parse(schema, "hello")).toBe("hello");

    expect(() => v.parse(schema, 123)).toThrow("Expected string");
  });

  it("varchar", () => {
    const { schema } = SCHEMAS.varchar({
      maxLength: 5,
    });
    expect(v.parse(schema, "hello")).toBe("hello");

    expect(() => v.parse(schema, "123456")).toThrow("Invalid length");
    expect(() => v.parse(schema, 123)).toThrow("Expected string");
  });

  it("boolean", () => {
    const { schema } = SCHEMAS.boolean();
    expect(v.parse(schema, true)).toBe(true);

    expect(() => v.parse(schema, 123)).toThrow("Expected boolean");
    expect(() => v.parse(schema, "true")).toThrow("Expected boolean");
  });
});
