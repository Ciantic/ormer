import { describe, it, expect } from "vitest";
import { SCHEMAS } from "./schemas.ts";
import type { StandardSchemaV1 } from "@standard-schema/spec";

function parse<T extends StandardSchemaV1>(schema: T, value: StandardSchemaV1.InferInput<T>): StandardSchemaV1.InferOutput<T> {
    const res = schema["~standard"].validate(value);
    if (res instanceof Promise) {
        throw new Error("Async validation not supported");
    }
    if (res.issues) {
        throw new Error("Validation failed", { cause: res.issues });
    }

    return res.value;
}

describe("schemas.json", () => {
  it("int32", () => {
    const int32 = SCHEMAS.int32();
    expect(parse(int32.fromJson, 123)).toBe(123);
    expect(parse(int32.toJson, 123)).toBe(123);
  });

  it("int64", () => {
    const int64 = SCHEMAS.int64();

    expect(parse(int64.fromJson, 123)).toBe(123);
    expect(parse(int64.toJson, 123)).toBe(123);
  });

  it("bigint", () => {
    const bigint = SCHEMAS.bigint();
    expect(parse(bigint.fromJson, "12345")).toBe(12345n);
    expect(parse(bigint.fromJson, 12345)).toBe(12345n);
    expect(parse(bigint.toJson, 12345n)).toBe(12345);
    expect(parse(bigint.toJson, 999999999999999999999n)).toBe("999999999999999999999");
  });

  it("float32", () => {
    const float32 = SCHEMAS.float32();
    expect(parse(float32.fromJson, 123.5)).toBe(123.5);
    expect(parse(float32.toJson, 123.5)).toBe(123.5);
  });

  it("float64", () => {
    const float64 = SCHEMAS.float64();
    expect(parse(float64.fromJson, 123.5)).toBe(123.5);
  });

  it("decimal", () => {
    const decimal = SCHEMAS.decimal({
      precision: 5,
      scale: 3,
    });
    expect(parse(decimal.fromJson, "12345.123")).toBe("12345.123");
    expect(parse(decimal.fromJson, 12345.123)).toBe("12345.123");
    expect(parse(decimal.toJson, "12345.123")).toBe("12345.123");
  });

  it("uuid", () => {
    const uuid = SCHEMAS.uuid();
    expect(
      parse(uuid.fromJson, "2703b08e-d93c-4fd0-8aca-30a9f22d4d79")
    ).toBe("2703b08e-d93c-4fd0-8aca-30a9f22d4d79");
    expect(
      parse(uuid.toJson, "2703b08e-d93c-4fd0-8aca-30a9f22d4d79")
    ).toBe("2703b08e-d93c-4fd0-8aca-30a9f22d4d79");
  });

  it("string", () => {
    const string = SCHEMAS.string();
    expect(parse(string.fromJson, "hello")).toBe("hello");
    expect(parse(string.toJson, "hello")).toBe("hello");
  });

  it("varchar", () => {
    const varchar = SCHEMAS.varchar({
      maxLength: 5,
    });
    expect(parse(varchar.fromJson, "hello")).toBe("hello");
    expect(parse(varchar.toJson, "hello")).toBe("hello");
  });

  it("boolean", () => {
    const boolean = SCHEMAS.boolean();
    expect(parse(boolean.fromJson, true)).toBe(true);
    expect(parse(boolean.toJson, true)).toBe(true);
  });

  it("datetime", () => {
    const timestamp = SCHEMAS.datetime();

    expect(parse(timestamp.fromJson, "2025-02-28T12:00")).toEqual(new Date("2025-02-28T12:00:00Z"));
    expect(
      parse(timestamp.fromJson, "2025-02-28T12:00:00Z")
    ).toEqual(new Date("2025-02-28T12:00:00Z"));
    expect(
      parse(timestamp.fromJson, "2025-02-28T11:00:00.123-01:00")
    ).toEqual(new Date("2025-02-28T12:00:00.123Z"));

    expect(parse(timestamp.fromJson, 1740744000)).toEqual(new Date("2025-02-28T12:00:00Z"));
    expect(parse(timestamp.fromJson, 1740744000000)).toEqual(new Date("2025-02-28T12:00:00Z"));

    expect(
      parse(timestamp.toJson, new Date("2025-02-28T12:00:00Z"))
    ).toBe("2025-02-28T12:00:00.000Z");
  });

  it("datepart", () => {
    const timestamp = SCHEMAS.datepart();

    expect(parse(timestamp.fromJson, "2025-02-28")).toBe("2025-02-28");
    expect(parse(timestamp.toJson, "2025-02-28")).toBe("2025-02-28");
  });

  it("timepart", () => {
    const timestamp = SCHEMAS.timepart();

    expect(parse(timestamp.fromJson, "23:59")).toBe("23:59");
    expect(parse(timestamp.fromJson, "23:59:12")).toBe("23:59:12");
    expect(parse(timestamp.fromJson, "23:59:12.1234")).toBe("23:59:12.1234");
    expect(parse(timestamp.toJson, "12:00")).toBe("12:00");
    expect(parse(timestamp.toJson, "23:59:12.1234")).toBe("23:59:12.1234");
  });
});
