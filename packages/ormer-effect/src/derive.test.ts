import { describe, it, expect } from "vitest";
import { Schema, Effect, Brand } from "effect";
import { deriveColumn, type ParamsDerived } from "./derive.ts";
import {
  Int8,
  Int16,
  Int32,
  Uint8,
  Uint16,
  Uint32,
  Float32,
  Float64,
  Int64,
  Uint64,
  Int128,
  Uint128,
  NaiveDatetime,
  IsoTime,
  IsoTimeSecond,
  IsoDate,
  IsoDateTime,
  UuidString,
  UrlString,
  EmailString,
  PrimaryKey,
  AutoIncrement,
  ForeignKey,
  WithDefault,
  VarChar,
} from "./effect-ext.ts";
import { pg } from "ormer";

// ---------------------------------------------------------------------------
// Basic types
// ---------------------------------------------------------------------------

describe("deriveColumn — basic types", () => {
  it("derives string", () => {
    expect(deriveColumn(Schema.String)).toEqual(["string", {}]);
  });

  it("derives number", () => {
    expect(deriveColumn(Schema.Number)).toEqual(["number", {}]);
  });

  it("derives bigint", () => {
    expect(deriveColumn(Schema.BigInt)).toEqual(["bigint", {}]);
  });

  it("derives boolean", () => {
    expect(deriveColumn(Schema.Boolean)).toEqual(["boolean", {}]);
  });

  it("derives Date", () => {
    expect(deriveColumn(Schema.Date)).toEqual(["date", {}]);
  });

  it("derives object (Struct)", () => {
    expect(deriveColumn(Schema.Struct({ a: Schema.String }))).toEqual([
      "object",
      { schema: expect.objectContaining({ ast: expect.anything() }) },
    ]);
  });
});

// ---------------------------------------------------------------------------
// Number brands
// ---------------------------------------------------------------------------

describe("deriveColumn — number brands", () => {
  it("derives int8", () => {
    expect(deriveColumn(Int8)).toEqual(["int8", {}]);
  });

  it("derives int16", () => {
    expect(deriveColumn(Int16)).toEqual(["int16", {}]);
  });

  it("derives int32", () => {
    expect(deriveColumn(Int32)).toEqual(["int32", {}]);
  });

  it("derives uint8", () => {
    expect(deriveColumn(Uint8)).toEqual(["uint8", {}]);
  });

  it("derives uint16", () => {
    expect(deriveColumn(Uint16)).toEqual(["uint16", {}]);
  });

  it("derives uint32", () => {
    expect(deriveColumn(Uint32)).toEqual(["uint32", {}]);
  });

  it("derives float32", () => {
    expect(deriveColumn(Float32)).toEqual(["float32", {}]);
  });

  it("derives float64", () => {
    expect(deriveColumn(Float64)).toEqual(["float64", {}]);
  });
});

// ---------------------------------------------------------------------------
// BigInt brands
// ---------------------------------------------------------------------------

describe("deriveColumn — bigint brands", () => {
  it("derives int64", () => {
    expect(deriveColumn(Int64)).toEqual(["int64", {}]);
  });

  it("derives uint64", () => {
    expect(deriveColumn(Uint64)).toEqual(["uint64", {}]);
  });

  it("derives int128", () => {
    expect(deriveColumn(Int128)).toEqual(["int128", {}]);
  });

  it("derives uint128", () => {
    expect(deriveColumn(Uint128)).toEqual(["uint128", {}]);
  });
});

// ---------------------------------------------------------------------------
// String brands
// ---------------------------------------------------------------------------

describe("deriveColumn — string brands", () => {
  it("derives uuid", () => {
    expect(deriveColumn(UuidString)).toEqual(["uuid", {}]);
  });

  it("derives url", () => {
    expect(deriveColumn(UrlString)).toEqual(["url", {}]);
  });

  it("derives email", () => {
    expect(deriveColumn(EmailString)).toEqual(["email", { maxLength: 320 }]);
  });

  it("derives naiveDatetime", () => {
    expect(deriveColumn(NaiveDatetime)).toEqual(["naiveDatetime", {}]);
  });

  it("derives isoTime", () => {
    expect(deriveColumn(IsoTime)).toEqual(["isoTime", {}]);
  });

  it("derives isoTimeSecond", () => {
    expect(deriveColumn(IsoTimeSecond)).toEqual(["isoTimeSecond", {}]);
  });

  it("derives isoDate", () => {
    expect(deriveColumn(IsoDate)).toEqual(["isoDate", {}]);
  });

  it("derives isoDateTime", () => {
    expect(deriveColumn(IsoDateTime)).toEqual(["isoDateTime", {}]);
  });
});

// ---------------------------------------------------------------------------
// Wrappers: nullable
// ---------------------------------------------------------------------------

describe("deriveColumn — NullOr wrapper", () => {
  it("marks string | null as nullable", () => {
    expect(deriveColumn(Schema.NullOr(Schema.String))).toEqual([
      "string",
      { nullable: true },
    ]);
  });

  it("marks number | null as nullable", () => {
    expect(deriveColumn(Schema.NullOr(Schema.Number))).toEqual([
      "number",
      { nullable: true },
    ]);
  });

  it("marks branded number | null as nullable", () => {
    expect(deriveColumn(Schema.NullOr(Int32))).toEqual([
      "int32",
      { nullable: true },
    ]);
  });

  it("marks branded string | null as nullable", () => {
    expect(deriveColumn(Schema.NullOr(UuidString))).toEqual([
      "uuid",
      { nullable: true },
    ]);
  });

  it("marks refined string | null as nullable", () => {
    expect(
      deriveColumn(
        Schema.NullOr(
          UuidString.pipe(
            Schema.refine((s): s is string => s.length === 36, {
              message: "UUID must be 36 characters long",
            }),
          ),
        ).check(Schema.makeFilter((c) => true, { message: "dummy" })),
      ),
    ).toEqual(["uuid", { nullable: true }]);
  });
});

// ---------------------------------------------------------------------------
// Wrappers: optional (UndefinedOr / Schema.optional)
// ---------------------------------------------------------------------------

describe("deriveColumn — optional wrapper", () => {
  it("marks optional string as nullable (no default)", () => {
    expect(deriveColumn(Schema.optional(Schema.String))).toEqual([
      "string",
      { nullable: true },
    ]);
  });

  it("marks optional number as nullable (no default)", () => {
    expect(deriveColumn(Schema.optional(Schema.Number))).toEqual([
      "number",
      { nullable: true },
    ]);
  });

  it("marks optional branded number as nullable", () => {
    expect(deriveColumn(Schema.optional(Int32))).toEqual([
      "int32",
      { nullable: true },
    ]);
  });
});

// ---------------------------------------------------------------------------
// Wrappers: nullish (NullOr + undefined)
// ---------------------------------------------------------------------------

describe("deriveColumn — NullishOr wrapper", () => {
  it("marks nullish string as nullable", () => {
    expect(deriveColumn(Schema.NullishOr(Schema.String))).toEqual([
      "string",
      { nullable: true },
    ]);
  });

  it("marks nullish branded number as nullable", () => {
    expect(deriveColumn(Schema.NullishOr(Int32))).toEqual([
      "int32",
      { nullable: true },
    ]);
  });
});

// ---------------------------------------------------------------------------
// Wrappers: default value
// ---------------------------------------------------------------------------

describe("deriveColumn — optional with default", () => {
  it("extracts the decoding default value", () => {
    const schema = Schema.String.pipe(WithDefault("hello"));

    // Verify the full decode still works
    expect(Schema.decodeSync(schema)(undefined)).toBe("hello");

    // Verify deriveColumn includes the default in params
    expect(deriveColumn(schema)).toEqual(["string", { default: "hello" }]);
  });
});

// ---------------------------------------------------------------------------
// Array
// ---------------------------------------------------------------------------

describe("deriveColumn — array", () => {
  it("derives string array", () => {
    expect(deriveColumn(Schema.Array(Schema.String))).toEqual([
      "string",
      { array: "[]" },
    ]);
  });

  it("derives number array", () => {
    expect(deriveColumn(Schema.Array(Schema.Number))).toEqual([
      "number",
      { array: "[]" },
    ]);
  });

  it("derives branded array", () => {
    expect(deriveColumn(Schema.Array(Int32))).toEqual([
      "int32",
      { array: "[]" },
    ]);
  });

  it("derives nullable array", () => {
    expect(deriveColumn(Schema.NullOr(Schema.Array(Schema.String)))).toEqual([
      "string",
      { nullable: true, array: "[]" },
    ]);
  });

  it("derives refined array", () => {
    const schema = Schema.Array(
      Int32.pipe(
        Schema.refine((n): n is number => n > 0, {
          message: "positive",
        }),
      ),
    );
    expect(deriveColumn(schema)).toEqual([
      "int32",
      {
        array: "[]",
      },
    ]);
  });
});

// ---------------------------------------------------------------------------
// VarChar
// ---------------------------------------------------------------------------

describe("deriveColumn — isMaxLength", () => {
  it("can't derive maxLength from isMaxLength check alone", () => {
    const schema = Schema.String.pipe(Schema.check(Schema.isMaxLength(255)));
    expect(deriveColumn(schema)).toEqual(["string", {}]);
  });

  it("can derive maxLength from varchar", () => {
    const schema = VarChar(255);
    expect(deriveColumn(schema)).toEqual(["string", { maxLength: 255 }]);
  });
});

// ---------------------------------------------------------------------------
// Refines and built-in constrained schemas
// ---------------------------------------------------------------------------

describe("deriveColumn — refines and constrained schemas", () => {
  it("derives NonEmptyString as plain string", () => {
    expect(deriveColumn(Schema.NonEmptyString)).toEqual(["string", {}]);
  });

  it("checked schema retains the dbformat", () => {
    const schema = UuidString.check(Schema.isNonEmpty());

    expect(deriveColumn(schema)).toEqual(["uuid", {}]);
  });

  it("refined schema retains the dbformat", () => {
    const schema = UuidString.pipe(
      Schema.refine((n): n is string => n.length === 36, {
        message: "UUID must be 36 characters long",
      }),
    );

    expect(deriveColumn(schema)).toEqual(["uuid", {}]);
  });

  it("derives custom refine on number as plain number", () => {
    const schema = Schema.Number.pipe(
      Schema.refine((n): n is number => n > 0, { message: "must be positive" }),
    );
    expect(deriveColumn(schema)).toEqual(["number", {}]);
  });
});

// ---------------------------------------------------------------------------
// Annotations: primaryKey, autoIncrement, foreignKey
// ---------------------------------------------------------------------------

describe("deriveColumn — annotations", () => {
  it("derives primaryKey via PrimaryKey helper", () => {
    const schema = Int64.pipe(PrimaryKey());
    expect(deriveColumn(schema)).toEqual(["int64", { primaryKey: true }]);
  });

  it("derives autoIncrement via AutoIncrement helper", () => {
    const schema = Int32.pipe(AutoIncrement());
    expect(deriveColumn(schema)).toEqual(["int32", { autoIncrement: true }]);
  });

  it("derives primaryKey + autoIncrement", () => {
    const schema = Int32.pipe(PrimaryKey(), AutoIncrement());
    expect(deriveColumn(schema)).toEqual([
      "int32",
      { primaryKey: true, autoIncrement: true },
    ]);
  });

  it("derives foreignKey", () => {
    const schema = Int64.pipe(ForeignKey({ table: "users", column: "id" }));
    expect(deriveColumn(schema)).toEqual([
      "int64",
      {
        foreignKeyTable: "users",
        foreignKeyColumn: "id",
      },
    ]);
  });

  it("derives nullable + annotations", () => {
    const schema = Schema.NullOr(
      Int64.pipe(
        Schema.annotate({
          foreignKeyTable: "users",
          foreignKeyColumn: "id",
        }),
      ),
    );
    expect(deriveColumn(schema)).toEqual([
      "int64",
      {
        nullable: true,
        foreignKeyTable: "users",
        foreignKeyColumn: "id",
      },
    ]);
  });
});
