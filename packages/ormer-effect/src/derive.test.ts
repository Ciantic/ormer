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
  UuidString,
  UrlString,
  EmailString,
  PrimaryKey,
  AutoIncrement,
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
  it("extracts the constructor default value", () => {
    const schema = Schema.String.pipe(
      Schema.withConstructorDefault(Effect.succeed("hello")),
    );
    expect(deriveColumn(schema)).toEqual(["string", { default: "hello" }]);
  });

  it("extracts a numeric constructor default value", () => {
    const schema = Schema.Number.pipe(
      Schema.withConstructorDefault(Effect.succeed(42)),
    );
    expect(deriveColumn(schema)).toEqual(["number", { default: 42 }]);
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
});

// ---------------------------------------------------------------------------
// isMaxLength check
// ---------------------------------------------------------------------------

describe("deriveColumn — isMaxLength", () => {
  it("derives maxLength from isMaxLength check", () => {
    const schema = Schema.String.pipe(Schema.check(Schema.isMaxLength(255)));
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

  it("derives custom refine on string as plain string", () => {
    const schema = Schema.String.pipe(
      Schema.refine((s): s is string => s.length > 0, { message: "non-empty" }),
    );
    expect(deriveColumn(schema)).toEqual(["string", {}]);
  });

  it("derives custom refine on number as plain number", () => {
    const schema = Schema.Number.pipe(
      Schema.refine((n): n is number => n > 0, { message: "positive" }),
    );
    expect(deriveColumn(schema)).toEqual(["number", {}]);
  });

  it("derives nullable NonEmptyString as nullable string", () => {
    expect(deriveColumn(Schema.NullOr(Schema.NonEmptyString))).toEqual([
      "string",
      { nullable: true },
    ]);
  });

  it("derives refined + branded as the brand type", () => {
    const schema = Int32.pipe(
      Schema.refine((n): n is number => n > 0, {
        message: "positive",
      }),
    );
    expect(deriveColumn(schema)).toEqual(["int32", {}]);
  });

  it("derives refined boolean as plain boolean", () => {
    const schema = Schema.Boolean.pipe(
      Schema.refine((b): b is boolean => b === true, {
        message: "must be true",
      }),
    );
    expect(deriveColumn(schema)).toEqual(["boolean", {}]);
  });
});

// ---------------------------------------------------------------------------
// Annotations: primaryKey, autoIncrement, foreignKey
// ---------------------------------------------------------------------------

describe("deriveColumn — annotations", () => {
  it("derives primaryKey", () => {
    const schema = Int64.pipe(Schema.annotate({ primaryKey: true }));
    expect(deriveColumn(schema)).toEqual(["int64", { primaryKey: true }]);
  });

  it("derives primaryKey via PrimaryKey helper", () => {
    const schema = Int64.pipe(PrimaryKey());
    expect(deriveColumn(schema)).toEqual(["int64", { primaryKey: true }]);
  });

  it("derives autoIncrement via AutoIncrement helper", () => {
    const schema = Int32.pipe(AutoIncrement());
    expect(deriveColumn(schema)).toEqual(["int32", { autoIncrement: true }]);
  });

  it("derives primaryKey + autoIncrement", () => {
    const schema = Int32.pipe(
      Schema.annotate({ primaryKey: true, autoIncrement: true }),
    );
    expect(deriveColumn(schema)).toEqual([
      "int32",
      { primaryKey: true, autoIncrement: true },
    ]);
  });

  it("derives foreignKey", () => {
    const schema = Int64.pipe(
      Schema.annotate({
        foreignKeyTable: "users",
        foreignKeyColumn: "id",
      }),
    );
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
        throw new Error(
          `pgChooser: Unhandled tag ${tag} with params ${JSON.stringify(params)}`,
        );
    }
  };

  it("derives pg column for string", () => {
    const col = pgChooser(deriveColumn(Schema.String));
    expect(col.type).toBe("text");
  });

  it("derives pg column for int32", () => {
    const col = pgChooser(deriveColumn(Int32));
    expect(col.type).toBe("int4");
  });

  it("derives pg column for int64", () => {
    const col = pgChooser(deriveColumn(Int64));
    expect(col.type).toBe("int8");
  });

  it("derives pg column for nullable string", () => {
    const col = pgChooser(deriveColumn(Schema.NullOr(Schema.String)));
    expect(col.type).toBe("text");
    expect((col as any).nullable).toBe(true);
  });

  it("derives pg column for uuid", () => {
    const col = pgChooser(deriveColumn(UuidString));
    expect(col.type).toBe("uuid");
  });

  it("derives pg column for struct as jsonb", () => {
    const col = pgChooser(deriveColumn(Schema.Struct({ v: Schema.String })));
    expect(col.type).toBe("jsonb");
  });

  it("derives pg column with maxLength from check", () => {
    const schema = Schema.String.pipe(Schema.check(Schema.isMaxLength(255)));
    const col = pgChooser(deriveColumn(schema));
    expect(col.type).toBe("varchar");
    expect((col as any).maxLength).toBe(255);
  });

  it("derives pg column with primaryKey", () => {
    const schema = Int32.pipe(
      Schema.annotate({ primaryKey: true, autoIncrement: true }),
    );
    const col = pgChooser(deriveColumn(schema));
    expect(col.type).toBe("int4");
    expect((col as any).primaryKey).toBe(true);
    expect((col as any).autoIncrement).toBe(true);
  });

  it("derives pg column for Date as timestamptz", () => {
    const col = pgChooser(deriveColumn(Schema.Date));
    expect(col.type).toBe("timestamptz");
  });

  it("derives pg column for boolean", () => {
    const col = pgChooser(deriveColumn(Schema.Boolean));
    expect(col.type).toBe("boolean");
  });
});
