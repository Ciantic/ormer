import { describe, it, expect } from "vitest";
import { Schema, Effect, type Brand } from "effect";
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
  DbUuid,
  UrlString,
  EmailString,
} from "./effect-ext.ts";
import { pg } from "ormer";

// ---------------------------------------------------------------------------
// Minimal chooser that captures [tag, params] for assertion
// ---------------------------------------------------------------------------

type Tagged = { type: string; tag: string; params: Record<string, unknown> };

const capture = (t: readonly [string, ParamsDerived]): Tagged => {
  const [tag, params] = t;
  const copy: Record<string, unknown> = {
    ...(params as Record<string, unknown>),
  };
  // schema is an object and messy to compare — just note its presence
  if ("schema" in copy) copy.schema = "(schema)";
  return { type: tag, tag, params: copy };
};

// ---------------------------------------------------------------------------
// Basic types
// ---------------------------------------------------------------------------

describe("deriveColumn — basic types", () => {
  it("derives string", () => {
    expect(deriveColumn(Schema.String, capture)).toEqual({
      type: "string",
      tag: "string",
      params: {},
    });
  });

  it("derives number", () => {
    expect(deriveColumn(Schema.Number, capture)).toEqual({
      type: "number",
      tag: "number",
      params: {},
    });
  });

  it("derives bigint", () => {
    expect(deriveColumn(Schema.BigInt, capture)).toEqual({
      type: "bigint",
      tag: "bigint",
      params: {},
    });
  });

  it("derives boolean", () => {
    expect(deriveColumn(Schema.Boolean, capture)).toEqual({
      type: "boolean",
      tag: "boolean",
      params: {},
    });
  });

  it("derives Date", () => {
    expect(deriveColumn(Schema.Date, capture)).toEqual({
      type: "date",
      tag: "date",
      params: {},
    });
  });

  it("derives object (Struct)", () => {
    expect(deriveColumn(Schema.Struct({ a: Schema.String }), capture)).toEqual({
      type: "object",
      tag: "object",
      params: { schema: "(schema)" },
    });
  });
});

// ---------------------------------------------------------------------------
// Number brands
// ---------------------------------------------------------------------------

describe("deriveColumn — number brands", () => {
  it("derives int8", () => {
    expect(deriveColumn(Int8, capture)).toEqual({
      type: "int8",
      tag: "int8",
      params: {},
    });
  });

  it("derives int16", () => {
    expect(deriveColumn(Int16, capture)).toEqual({
      type: "int16",
      tag: "int16",
      params: {},
    });
  });

  it("derives int32", () => {
    expect(deriveColumn(Int32, capture)).toEqual({
      type: "int32",
      tag: "int32",
      params: {},
    });
  });

  it("derives uint8", () => {
    expect(deriveColumn(Uint8, capture)).toEqual({
      type: "uint8",
      tag: "uint8",
      params: {},
    });
  });

  it("derives uint16", () => {
    expect(deriveColumn(Uint16, capture)).toEqual({
      type: "uint16",
      tag: "uint16",
      params: {},
    });
  });

  it("derives uint32", () => {
    expect(deriveColumn(Uint32, capture)).toEqual({
      type: "uint32",
      tag: "uint32",
      params: {},
    });
  });

  it("derives float32", () => {
    expect(deriveColumn(Float32, capture)).toEqual({
      type: "float32",
      tag: "float32",
      params: {},
    });
  });

  it("derives float64", () => {
    expect(deriveColumn(Float64, capture)).toEqual({
      type: "float64",
      tag: "float64",
      params: {},
    });
  });
});

// ---------------------------------------------------------------------------
// BigInt brands
// ---------------------------------------------------------------------------

describe("deriveColumn — bigint brands", () => {
  it("derives int64", () => {
    expect(deriveColumn(Int64, capture)).toEqual({
      type: "int64",
      tag: "int64",
      params: {},
    });
  });

  it("derives uint64", () => {
    expect(deriveColumn(Uint64, capture)).toEqual({
      type: "uint64",
      tag: "uint64",
      params: {},
    });
  });

  it("derives int128", () => {
    expect(deriveColumn(Int128, capture)).toEqual({
      type: "int128",
      tag: "int128",
      params: {},
    });
  });

  it("derives uint128", () => {
    expect(deriveColumn(Uint128, capture)).toEqual({
      type: "uint128",
      tag: "uint128",
      params: {},
    });
  });
});

// ---------------------------------------------------------------------------
// String brands
// ---------------------------------------------------------------------------

describe("deriveColumn — string brands", () => {
  it("derives uuid", () => {
    expect(deriveColumn(DbUuid, capture)).toEqual({
      type: "uuid",
      tag: "uuid",
      params: {},
    });
  });

  it("derives url", () => {
    expect(deriveColumn(UrlString, capture)).toEqual({
      type: "url",
      tag: "url",
      params: {},
    });
  });

  it("derives email", () => {
    expect(deriveColumn(EmailString, capture)).toEqual({
      type: "email",
      tag: "email",
      params: { maxLength: 320 },
    });
  });

  it("derives naiveDatetime", () => {
    expect(deriveColumn(NaiveDatetime, capture)).toEqual({
      type: "naiveDatetime",
      tag: "naiveDatetime",
      params: {},
    });
  });

  it("derives isoTime", () => {
    expect(deriveColumn(IsoTime, capture)).toEqual({
      type: "isoTime",
      tag: "isoTime",
      params: {},
    });
  });

  it("derives isoTimeSecond", () => {
    expect(deriveColumn(IsoTimeSecond, capture)).toEqual({
      type: "isoTimeSecond",
      tag: "isoTimeSecond",
      params: {},
    });
  });

  it("derives isoDate", () => {
    expect(deriveColumn(IsoDate, capture)).toEqual({
      type: "isoDate",
      tag: "isoDate",
      params: {},
    });
  });

  it("derives isoDateTime", () => {
    expect(deriveColumn(IsoDateTime, capture)).toEqual({
      type: "isoDateTime",
      tag: "isoDateTime",
      params: {},
    });
  });
});

// ---------------------------------------------------------------------------
// Wrappers: nullable
// ---------------------------------------------------------------------------

describe("deriveColumn — NullOr wrapper", () => {
  it("marks string | null as nullable", () => {
    expect(deriveColumn(Schema.NullOr(Schema.String), capture)).toEqual({
      type: "string",
      tag: "string",
      params: { nullable: true },
    });
  });

  it("marks number | null as nullable", () => {
    expect(deriveColumn(Schema.NullOr(Schema.Number), capture)).toEqual({
      type: "number",
      tag: "number",
      params: { nullable: true },
    });
  });

  it("marks branded number | null as nullable", () => {
    expect(deriveColumn(Schema.NullOr(Int32), capture)).toEqual({
      type: "int32",
      tag: "int32",
      params: { nullable: true },
    });
  });

  it("marks branded string | null as nullable", () => {
    expect(deriveColumn(Schema.NullOr(DbUuid), capture)).toEqual({
      type: "uuid",
      tag: "uuid",
      params: { nullable: true },
    });
  });
});

// ---------------------------------------------------------------------------
// Wrappers: optional (UndefinedOr / Schema.optional)
// ---------------------------------------------------------------------------

describe("deriveColumn — optional wrapper", () => {
  it("marks optional string as nullable (no default)", () => {
    expect(deriveColumn(Schema.optional(Schema.String), capture)).toEqual({
      type: "string",
      tag: "string",
      params: { nullable: true },
    });
  });

  it("marks optional number as nullable (no default)", () => {
    expect(deriveColumn(Schema.optional(Schema.Number), capture)).toEqual({
      type: "number",
      tag: "number",
      params: { nullable: true },
    });
  });

  it("marks optional branded number as nullable", () => {
    expect(deriveColumn(Schema.optional(Int32), capture)).toEqual({
      type: "int32",
      tag: "int32",
      params: { nullable: true },
    });
  });
});

// ---------------------------------------------------------------------------
// Wrappers: nullish (NullOr + undefined)
// ---------------------------------------------------------------------------

describe("deriveColumn — NullishOr wrapper", () => {
  it("marks nullish string as nullable", () => {
    expect(deriveColumn(Schema.NullishOr(Schema.String), capture)).toEqual({
      type: "string",
      tag: "string",
      params: { nullable: true },
    });
  });

  it("marks nullish branded number as nullable", () => {
    expect(deriveColumn(Schema.NullishOr(Int32), capture)).toEqual({
      type: "int32",
      tag: "int32",
      params: { nullable: true },
    });
  });
});

// ---------------------------------------------------------------------------
// Wrappers: default value
// ---------------------------------------------------------------------------

describe("deriveColumn — optional with default", () => {
  it("extracts the constructor default value", () => {
    const schema = Schema.String.pipe(
      Schema.withConstructorDefault(Effect.succeed("hello")),
    );
    expect(deriveColumn(schema, capture)).toEqual({
      type: "string",
      tag: "string",
      params: { default: "hello" },
    });
  });

  it("extracts a numeric constructor default value", () => {
    const schema = Schema.Number.pipe(
      Schema.withConstructorDefault(Effect.succeed(42)),
    );
    expect(deriveColumn(schema, capture)).toEqual({
      type: "number",
      tag: "number",
      params: { default: 42 },
    });
  });
});

// ---------------------------------------------------------------------------
// Array
// ---------------------------------------------------------------------------

describe("deriveColumn — array", () => {
  it("derives string array", () => {
    expect(deriveColumn(Schema.Array(Schema.String), capture)).toEqual({
      type: "string",
      tag: "string",
      params: { array: "[]" },
    });
  });

  it("derives number array", () => {
    expect(deriveColumn(Schema.Array(Schema.Number), capture)).toEqual({
      type: "number",
      tag: "number",
      params: { array: "[]" },
    });
  });

  it("derives branded array", () => {
    expect(deriveColumn(Schema.Array(Int32), capture)).toEqual({
      type: "int32",
      tag: "int32",
      params: { array: "[]" },
    });
  });

  it("derives nullable array", () => {
    expect(
      deriveColumn(Schema.NullOr(Schema.Array(Schema.String)), capture),
    ).toEqual({
      type: "string",
      tag: "string",
      params: { nullable: true, array: "[]" },
    });
  });
});

// ---------------------------------------------------------------------------
// isMaxLength check
// ---------------------------------------------------------------------------

describe("deriveColumn — isMaxLength", () => {
  it("derives maxLength from isMaxLength check", () => {
    const schema = Schema.String.pipe(Schema.check(Schema.isMaxLength(255)));
    expect(deriveColumn(schema, capture)).toEqual({
      type: "string",
      tag: "string",
      params: { maxLength: 255 },
    });
  });
});

// ---------------------------------------------------------------------------
// Refines and built-in constrained schemas
// ---------------------------------------------------------------------------

describe("deriveColumn — refines and constrained schemas", () => {
  it("derives NonEmptyString as plain string", () => {
    expect(deriveColumn(Schema.NonEmptyString, capture)).toEqual({
      type: "string",
      tag: "string",
      params: {},
    });
  });

  it("derives custom refine on string as plain string", () => {
    const schema = Schema.String.pipe(
      Schema.refine((s): s is string => s.length > 0, { message: "non-empty" }),
    );
    expect(deriveColumn(schema, capture)).toEqual({
      type: "string",
      tag: "string",
      params: {},
    });
  });

  it("derives custom refine on number as plain number", () => {
    const schema = Schema.Number.pipe(
      Schema.refine((n): n is number => n > 0, { message: "positive" }),
    );
    expect(deriveColumn(schema, capture)).toEqual({
      type: "number",
      tag: "number",
      params: {},
    });
  });

  it("derives nullable NonEmptyString as nullable string", () => {
    expect(deriveColumn(Schema.NullOr(Schema.NonEmptyString), capture)).toEqual(
      {
        type: "string",
        tag: "string",
        params: { nullable: true },
      },
    );
  });

  it("derives refined + branded as the brand type", () => {
    const schema = Int32.pipe(
      Schema.refine((n): n is number & Brand.Brand<"int32"> => n > 0, {
        message: "positive",
      }),
    );
    expect(deriveColumn(schema, capture)).toEqual({
      type: "int32",
      tag: "int32",
      params: {},
    });
  });

  it("derives refined boolean as plain boolean", () => {
    const schema = Schema.Boolean.pipe(
      Schema.refine((b): b is boolean => b === true, {
        message: "must be true",
      }),
    );
    expect(deriveColumn(schema, capture)).toEqual({
      type: "boolean",
      tag: "boolean",
      params: {},
    });
  });
});

// ---------------------------------------------------------------------------
// Annotations: primaryKey, autoIncrement, foreignKey
// ---------------------------------------------------------------------------

describe("deriveColumn — annotations", () => {
  it("derives primaryKey", () => {
    const schema = Int64.pipe(Schema.annotate({ primaryKey: true }));
    expect(deriveColumn(schema, capture)).toEqual({
      type: "int64",
      tag: "int64",
      params: { primaryKey: true },
    });
  });

  it("derives primaryKey + autoIncrement", () => {
    const schema = Int32.pipe(
      Schema.annotate({ primaryKey: true, autoIncrement: true }),
    );
    expect(deriveColumn(schema, capture)).toEqual({
      type: "int32",
      tag: "int32",
      params: { primaryKey: true, autoIncrement: true },
    });
  });

  it("derives foreignKey", () => {
    const schema = Int64.pipe(
      Schema.annotate({
        foreignKeyTable: "users",
        foreignKeyColumn: "id",
      }),
    );
    expect(deriveColumn(schema, capture)).toEqual({
      type: "int64",
      tag: "int64",
      params: {
        foreignKeyTable: "users",
        foreignKeyColumn: "id",
      },
    });
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
    expect(deriveColumn(schema, capture)).toEqual({
      type: "int64",
      tag: "int64",
      params: {
        nullable: true,
        foreignKeyTable: "users",
        foreignKeyColumn: "id",
      },
    });
  });
});

// ---------------------------------------------------------------------------
// Integration: deriveColumn used with a real chooser (pg)
// ---------------------------------------------------------------------------

describe("deriveColumn — integration with pg chooser", () => {
  const pgChooser = (t: readonly [string, ParamsDerived]): any => {
    const [tag, params] = t;
    const baseParams = params as Record<string, unknown>;
    switch (tag) {
      case "string":
        if (
          "maxLength" in baseParams &&
          typeof baseParams.maxLength === "number"
        ) {
          return pg.varchar(baseParams as any);
        }
        return pg.text(baseParams as any);
      case "number":
        return pg.float8(baseParams as any);
      case "int8":
      case "int16":
        return { type: "ERROR" }; // PG doesn't have int1/int2
      case "int32":
        return pg.int4(baseParams as any);
      case "uint8":
      case "uint16":
      case "uint32":
        return { type: "ERROR" }; // PG doesn't have unsigned
      case "int64":
        return pg.int8(baseParams as any);
      case "uint64":
      case "int128":
      case "uint128":
        return { type: "ERROR" }; // PG doesn't have uint64/int128
      case "float32":
        return pg.float4(baseParams as any);
      case "float64":
        return pg.float8(baseParams as any);
      case "bigint":
        return pg.int8(baseParams as any);
      case "boolean":
        return pg.boolean(baseParams as any);
      case "date":
        return pg.timestamptz(baseParams as any);
      case "uuid":
        return pg.uuid(baseParams as any);
      case "isoTime":
      case "isoDateTime":
        return { type: "ERROR" }; // PG has no iso_time direct mapping
      case "isoTimeSecond":
        return pg.time(baseParams as any);
      case "isoDate":
        return pg.date(baseParams as any);
      case "naiveDatetime":
        return pg.timestamp(baseParams as any);
      case "email":
        return pg.varchar({ maxLength: 320, ...baseParams } as any);
      case "url":
      case "ipv4":
      case "ipv6":
      case "mac":
        return pg.text(baseParams as any);
      case "object":
        return pg.jsonb(baseParams as any);
      default:
        return pg.text(baseParams as any);
    }
  };

  it("derives pg column for string", () => {
    const col = deriveColumn(Schema.String, pgChooser);
    expect(col.type).toBe("text");
  });

  it("derives pg column for int32", () => {
    const col = deriveColumn(Int32, pgChooser);
    expect(col.type).toBe("int4");
  });

  it("derives pg column for int64", () => {
    const col = deriveColumn(Int64, pgChooser);
    expect(col.type).toBe("int8");
  });

  it("derives pg column for nullable string", () => {
    const col = deriveColumn(Schema.NullOr(Schema.String), pgChooser);
    expect(col.type).toBe("text");
    expect((col as any).nullable).toBe(true);
  });

  it("derives pg column for uuid", () => {
    const col = deriveColumn(DbUuid, pgChooser);
    expect(col.type).toBe("uuid");
  });

  it("derives pg column for struct as jsonb", () => {
    const col = deriveColumn(Schema.Struct({ v: Schema.String }), pgChooser);
    expect(col.type).toBe("jsonb");
  });

  it("derives pg column with maxLength from check", () => {
    const schema = Schema.String.pipe(Schema.check(Schema.isMaxLength(255)));
    const col = deriveColumn(schema, pgChooser);
    expect(col.type).toBe("varchar");
    expect((col as any).maxLength).toBe(255);
  });

  it("derives pg column with primaryKey", () => {
    const schema = Int32.pipe(
      Schema.annotate({ primaryKey: true, autoIncrement: true }),
    );
    const col = deriveColumn(schema, pgChooser);
    expect(col.type).toBe("int4");
    expect((col as any).primaryKey).toBe(true);
    expect((col as any).autoIncrement).toBe(true);
  });

  it("derives pg column for Date as timestamptz", () => {
    const col = deriveColumn(Schema.Date, pgChooser);
    expect(col.type).toBe("timestamptz");
  });

  it("derives pg column for boolean", () => {
    const col = deriveColumn(Schema.Boolean, pgChooser);
    expect(col.type).toBe("boolean");
  });
});
