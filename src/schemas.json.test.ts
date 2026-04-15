import * as v from "valibot";
import { describe, it, expect } from "vitest";
import { SCHEMAS } from "./schemas.ts";

describe("schemas.json", () => {
  it("int32", () => {
    const int32 = SCHEMAS.int32();
    expect(v.parse(int32.fromJson, 123)).toBe(123);
    expect(v.parse(int32.toJson, 123)).toBe(123);
  });

  it("int64", () => {
    const int64 = SCHEMAS.int64();

    expect(v.parse(int64.fromJson, 123)).toBe(123);
    expect(v.parse(int64.toJson, 123)).toBe(123);
  });

  it("bigint", () => {
    const bigint = SCHEMAS.bigint();
    expect(v.parse(bigint.fromJson, "12345")).toBe(12345n);
    expect(v.parse(bigint.fromJson, 12345)).toBe(12345n);
    expect(v.parse(bigint.toJson, 12345n)).toBe(12345);
    expect(v.parse(bigint.toJson, 999999999999999999999n)).toBe("999999999999999999999");
  });

  it("float32", () => {
    const float32 = SCHEMAS.float32();
    expect(v.parse(float32.fromJson, 123.5)).toBe(123.5);
    expect(v.parse(float32.toJson, 123.5)).toBe(123.5);
  });

  it("float64", () => {
    const float64 = SCHEMAS.float64();
    expect(v.parse(float64.fromJson, 123.5)).toBe(123.5);
  });

  it("decimal", () => {
    const decimal = SCHEMAS.decimal({
      precision: 5,
      scale: 3,
    });
    expect(v.parse(decimal.fromJson, "12345.123")).toBe("12345.123");
    expect(v.parse(decimal.fromJson, 12345.123)).toBe("12345.123");
    expect(v.parse(decimal.toJson, "12345.123")).toBe("12345.123");
  });

  it("uuid", () => {
    const uuid = SCHEMAS.uuid();
    expect(
      v.parse(uuid.fromJson, "2703b08e-d93c-4fd0-8aca-30a9f22d4d79")
    ).toBe("2703b08e-d93c-4fd0-8aca-30a9f22d4d79");
    expect(
      v.parse(uuid.toJson, "2703b08e-d93c-4fd0-8aca-30a9f22d4d79")
    ).toBe("2703b08e-d93c-4fd0-8aca-30a9f22d4d79");
  });

  it("string", () => {
    const string = SCHEMAS.string();
    expect(v.parse(string.fromJson, "hello")).toBe("hello");
    expect(v.parse(string.toJson, "hello")).toBe("hello");
  });

  it("varchar", () => {
    const varchar = SCHEMAS.varchar({
      maxLength: 5,
    });
    expect(v.parse(varchar.fromJson, "hello")).toBe("hello");
    expect(v.parse(varchar.toJson, "hello")).toBe("hello");
  });

  it("boolean", () => {
    const boolean = SCHEMAS.boolean();
    expect(v.parse(boolean.fromJson, true)).toBe(true);
    expect(v.parse(boolean.toJson, true)).toBe(true);
  });

  it("datetime", () => {
    const timestamp = SCHEMAS.datetime();

    expect(v.parse(timestamp.fromJson, "2025-02-28T12:00")).toEqual(new Date("2025-02-28T12:00:00Z"));
    expect(
      v.parse(timestamp.fromJson, "2025-02-28T12:00:00Z")
    ).toEqual(new Date("2025-02-28T12:00:00Z"));
    expect(
      v.parse(timestamp.fromJson, "2025-02-28T11:00:00.123-01:00")
    ).toEqual(new Date("2025-02-28T12:00:00.123Z"));

    expect(v.parse(timestamp.fromJson, 1740744000)).toEqual(new Date("2025-02-28T12:00:00Z"));
    expect(v.parse(timestamp.fromJson, 1740744000000)).toEqual(new Date("2025-02-28T12:00:00Z"));

    expect(
      v.parse(timestamp.toJson, new Date("2025-02-28T12:00:00Z"))
    ).toBe("2025-02-28T12:00:00.000Z");
  });

  it("datepart", () => {
    const timestamp = SCHEMAS.datepart();

    expect(v.parse(timestamp.fromJson, "2025-02-28")).toBe("2025-02-28");
    expect(v.parse(timestamp.toJson, "2025-02-28")).toBe("2025-02-28");
  });

  it("timepart", () => {
    const timestamp = SCHEMAS.timepart();

    expect(v.parse(timestamp.fromJson, "23:59")).toBe("23:59");
    expect(v.parse(timestamp.fromJson, "23:59:12")).toBe("23:59:12");
    expect(v.parse(timestamp.fromJson, "23:59:12.1234")).toBe("23:59:12.1234");
    expect(v.parse(timestamp.toJson, "12:00")).toBe("12:00");
    expect(v.parse(timestamp.toJson, "23:59:12.1234")).toBe("23:59:12.1234");
  });
});
