import { describe, it, expect } from "vitest";
import { type } from "arktype";
import { deriveColumn } from "./derive.ts";
import { db } from "./arktype-ext.ts";

const chooser = (triple: any) => ({
  domain: triple[0],
  ...(triple[1] ? { dbformat: triple[1] } : {}),
  ...triple[2],
});

describe("deriveColumn", () => {
  // -- Basic domain types --
  it("derives simple string", () => {
    expect(deriveColumn(type("string"), chooser)).toEqual({ domain: "string" });
  });

  it("derives simple number", () => {
    expect(deriveColumn(type("number"), chooser)).toEqual({ domain: "number" });
  });

  it("derives bigint", () => {
    expect(deriveColumn(type("bigint"), chooser)).toEqual({ domain: "bigint" });
  });

  it("derives boolean", () => {
    expect(deriveColumn(type("boolean"), chooser)).toEqual({
      domain: "boolean",
    });
  });

  it("derives Date", () => {
    expect(deriveColumn(type("Date"), chooser)).toEqual({ domain: "Date" });
  });

  it("derives number.integer", () => {
    expect(deriveColumn(type("number.integer"), chooser)).toEqual({
      domain: "number",
    });
  });

  // -- DB format types --
  it("derives int64 (domain bigint)", () => {
    expect(deriveColumn(db.type("int64"), chooser)).toEqual({
      domain: "bigint",
      dbformat: "int64",
    });
  });

  it("derives float32 (domain number)", () => {
    expect(deriveColumn(db.type("float32"), chooser)).toEqual({
      domain: "number",
      dbformat: "float32",
    });
  });

  it("derives float64 (domain number)", () => {
    expect(deriveColumn(db.type("float64"), chooser)).toEqual({
      domain: "number",
      dbformat: "float64",
    });
  });

  it("derives int32 (domain number)", () => {
    expect(deriveColumn(db.type("int32"), chooser)).toEqual({
      domain: "number",
      dbformat: "int32",
    });
  });

  it("derives uint64 (domain bigint)", () => {
    expect(deriveColumn(db.type("uint64"), chooser)).toEqual({
      domain: "bigint",
      dbformat: "uint64",
    });
  });

  it("derives uuid (domain string)", () => {
    expect(deriveColumn(db.type("uuid"), chooser)).toEqual({
      domain: "string",
      dbformat: "uuid",
    });
  });

  // -- Nullable / optional unions --
  it("derives string | null as nullable", () => {
    expect(deriveColumn(type("string | null"), chooser)).toEqual({
      domain: "string",
      nullable: true,
    });
  });

  it("derives string | null | undefined as nullable", () => {
    expect(deriveColumn(type("string | null | undefined"), chooser)).toEqual({
      domain: "string",
      nullable: true,
    });
  });

  it("derives int64 | null | undefined as nullable", () => {
    expect(deriveColumn(db.type("int64 | null | undefined"), chooser)).toEqual({
      domain: "bigint",
      nullable: true,
      dbformat: "int64",
    });
  });

  it("derives int32 | null | undefined as nullable", () => {
    expect(deriveColumn(db.type("int32 | null | undefined"), chooser)).toEqual({
      domain: "number",
      nullable: true,
      dbformat: "int32",
    });
  });

  it("derives boolean | null | undefined as nullable", () => {
    expect(deriveColumn(type("boolean | null | undefined"), chooser)).toEqual({
      domain: "boolean",
      nullable: true,
    });
  });

  // -- Arrays --
  it("derives 1D string array", () => {
    expect(deriveColumn(type("string[]"), chooser)).toEqual({
      domain: "string",
      array: "[]",
    });
  });

  it("derives 1D int64 array", () => {
    expect(deriveColumn(db.type("int64[]"), chooser)).toEqual({
      domain: "bigint",
      array: "[]",
      dbformat: "int64",
    });
  });

  it("derives 2D int64 array", () => {
    expect(deriveColumn(db.type("int64[][]"), chooser)).toEqual({
      domain: "bigint",
      array: "[][]",
      dbformat: "int64",
    });
  });

  it("derives 1D int32 array", () => {
    expect(deriveColumn(db.type("int32[]"), chooser)).toEqual({
      domain: "number",
      array: "[]",
      dbformat: "int32",
    });
  });

  it("derives string[] | null as nullable array", () => {
    expect(deriveColumn(type("string[] | null"), chooser)).toEqual({
      domain: "string",
      nullable: true,
      array: "[]",
    });
  });

  it("derives int64[] | null as nullable array", () => {
    expect(deriveColumn(db.type("int64[] | null"), chooser)).toEqual({
      domain: "bigint",
      nullable: true,
      array: "[]",
      dbformat: "int64",
    });
  });

  // -- maxLength --
  it("derives plain string from string <= 255 (not distinguishable at type-level)", () => {
    expect(deriveColumn(type("string <= 255"), chooser)).toEqual({
      domain: "string",
    });
  });

  it("derives maxLength from varchar(255)", () => {
    expect(deriveColumn(db.varchar(255), chooser)).toEqual({
      domain: "string",
      maxLength: 255,
    });
  });

  // -- Primary key --
  it("derives primaryKey on int64", () => {
    expect(deriveColumn(db.primaryKey("int64"), chooser)).toEqual({
      domain: "bigint",
      primaryKey: true,
      autoIncrement: true,
      dbformat: "int64",
    });
  });

  // -- Foreign key --
  it("derives foreignKey constraint", () => {
    expect(
      deriveColumn(db.foreignKey("int64", "users", "id"), chooser),
    ).toEqual({
      domain: "bigint",
      foreignKeyTable: "users",
      foreignKeyColumn: "id",
      dbformat: "int64",
    });
  });

  // -- String formats --
  it("derives string.email", () => {
    expect(deriveColumn(type("string.email"), chooser)).toEqual({
      domain: "string",
    });
  });

  it("derives string.url", () => {
    expect(deriveColumn(type("string.url"), chooser)).toEqual({
      domain: "string",
    });
  });

  it("derives default value string", () => {
    expect(deriveColumn(type("string").default("hello"), chooser)).toEqual({
      domain: "string",
      default: "hello",
    });
  });

  it("derives default value number", () => {
    expect(deriveColumn(type("number").default(42), chooser)).toEqual({
      domain: "number",
      default: 42,
    });
  });

  it("derives default value bigint", () => {
    expect(
      deriveColumn(type("bigint").default(9007199254740991n), chooser),
    ).toEqual({
      domain: "bigint",
      default: 9007199254740991n,
    });
  });
});
