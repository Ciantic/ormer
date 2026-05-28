import { describe, it, expect, expectTypeOf } from "vitest";
import { z } from "zod";
import { derivePgColumn } from "./zod-derive.ts";
import type { ColumnType, ColumnTypeSingualr } from "ormer";

// ---------------------------------------------------------------------------
// Type-level tests
//
// For string/number the return type is a union at the type level (ZodString
// and ZodNumber don't encode modifiers like .uuid() / .int() in their TS type).
// Each test asserts against the full inferred type — if the implementation
// changes the union members, the test must be updated too.
// ---------------------------------------------------------------------------

describe("derivePgColumn types", () => {
  it("z.string() -> text | varchar", () => {
    const col = derivePgColumn(z.string());
    expectTypeOf<typeof col>().toEqualTypeOf<
      ColumnTypeSingualr<"text"> | ColumnType<"varchar", { maxLength: number }>
    >();
    expect(col.type).toBe("text");
  });

  it("z.string().max(255) -> text | varchar", () => {
    const col = derivePgColumn(z.string().max(255));
    expectTypeOf<typeof col>().toEqualTypeOf<
      ColumnTypeSingualr<"text"> | ColumnType<"varchar", { maxLength: number }>
    >();
    expect(col.type).toBe("varchar");
    if (!("maxLength" in col))
      throw new Error("Expected maxLength to be present");
    expect(col.maxLength).toBe(255);
  });

  it("z.uuid() -> uuid", () => {
    const col = derivePgColumn(z.uuid());
    expectTypeOf<typeof col>().toEqualTypeOf<ColumnTypeSingualr<"uuid">>();
    expect(col.type).toBe("uuid");
  });

  it("z.string().email() -> text | varchar", () => {
    const col = derivePgColumn(z.string().email());
    expectTypeOf<typeof col>().toEqualTypeOf<
      ColumnTypeSingualr<"text"> | ColumnType<"varchar", { maxLength: number }>
    >();
    expect(col.type).toBe("text");
  });

  it("z.number() -> float8 | int4", () => {
    const col = derivePgColumn(z.number());
    expectTypeOf<typeof col>().toEqualTypeOf<
      ColumnTypeSingualr<"float8"> | ColumnTypeSingualr<"int4">
    >();
    expect(col.type).toBe("float8");
  });

  it("z.int() -> int4", () => {
    const col = derivePgColumn(z.int());
    expectTypeOf<typeof col>().toEqualTypeOf<ColumnTypeSingualr<"int4">>();
    expect(col.type).toBe("int4");
  });

  it("z.bigint() -> int8", () => {
    const col = derivePgColumn(z.bigint());
    expectTypeOf<typeof col>().toEqualTypeOf<ColumnTypeSingualr<"int8">>();
    expect(col.type).toBe("int8");
  });

  it("z.number().int() -> float8 | int4", () => {
    const col = derivePgColumn(z.number().int());
    expectTypeOf<typeof col>().toEqualTypeOf<
      ColumnTypeSingualr<"float8"> | ColumnTypeSingualr<"int4">
    >();
    expect(col.type).toBe("int4");
  });

  it("z.boolean() -> { type: 'boolean' }", () => {
    const col = derivePgColumn(z.boolean());
    expectTypeOf<typeof col>().toEqualTypeOf<ColumnTypeSingualr<"boolean">>();
    expect(col.type).toBe("boolean");
  });

  it("z.date() -> { type: 'timestamptz' }", () => {
    const col = derivePgColumn(z.date());
    expectTypeOf<typeof col>().toEqualTypeOf<
      ColumnTypeSingualr<"timestamptz">
    >();
    expect(col.type).toBe("timestamptz");
  });
});

describe("derivePgColumn nullable types", () => {
  it("z.string().nullable() -> text|varchar + nullable", () => {
    const col = derivePgColumn(z.string().nullable());
    expectTypeOf<typeof col>().toEqualTypeOf<
      | ColumnType<"text", { nullable: true }>
      | ColumnType<"varchar", { maxLength: number } & { nullable: true }>
    >();
    expect(col.type).toBe("text");
    expect(col.nullable).toBe(true);
  });

  it("z.number().nullable() -> float8|int4 + nullable", () => {
    const col = derivePgColumn(z.number().nullable());
    expectTypeOf<typeof col>().toEqualTypeOf<
      | ColumnType<"float8", { nullable: true }>
      | ColumnType<"int4", { nullable: true }>
    >();
    expect(col.type).toBe("float8");
    expect(col.nullable).toBe(true);
  });

  it("z.boolean().nullable() -> { type: 'boolean', nullable: true }", () => {
    const col = derivePgColumn(z.boolean().nullable());
    expectTypeOf<typeof col>().toEqualTypeOf<
      ColumnType<"boolean", { nullable: true }>
    >();
    expect(col.type).toBe("boolean");
    expect(col.nullable).toBe(true);
  });

  it("z.date().nullable() -> { type: 'timestamptz', nullable: true }", () => {
    const col = derivePgColumn(z.date().nullable());
    expectTypeOf<typeof col>().toEqualTypeOf<
      ColumnType<"timestamptz", { nullable: true }>
    >();
    expect(col.type).toBe("timestamptz");
    expect(col.nullable).toBe(true);
  });

  it("z.uuid().nullable() -> { type: 'uuid', nullable: true }", () => {
    const col = derivePgColumn(z.uuid().nullable());
    expectTypeOf<typeof col>().toEqualTypeOf<
      ColumnType<"uuid", { nullable: true }>
    >();
    expect(col.type).toBe("uuid");
    expect(col.nullable).toBe(true);
  });

  it("z.int().nullable() -> { type: 'int4', nullable: true }", () => {
    const col = derivePgColumn(z.int().nullable());
    expectTypeOf<typeof col>().toEqualTypeOf<
      ColumnType<"int4", { nullable: true }>
    >();
    expect(col.type).toBe("int4");
    expect(col.nullable).toBe(true);
  });

  it("z.bigint().nullable() -> { type: 'int8', nullable: true }", () => {
    const col = derivePgColumn(z.bigint().nullable());
    expectTypeOf<typeof col>().toEqualTypeOf<
      ColumnType<"int8", { nullable: true }>
    >();
    expect(col.type).toBe("int8");
    expect(col.nullable).toBe(true);
  });
});

describe("unsupported type throws", () => {
  it("z.array(z.string()) throws", () => {
    expect(() => derivePgColumn(z.array(z.string()) as any)).toThrow(
      "ZodArray",
    );
  });
});
