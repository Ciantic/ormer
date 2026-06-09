import * as v from "valibot";
import { describe, it, expectTypeOf } from "vitest";
import type {
  IsNullable,
  IsOptional,
  HasDefaultValue,
  HasPipeItem,
  GetPipeItemProp,
  HasDbPk,
  DbFkTable,
  DbFkColumn,
  DbTableName,
  HasDbNavigation,
  ArrayDimensions,
  UnwrapModifiers,
  PipeUnion,
  SafeParamDerivation,
  GetAutoIncrement,
} from "./common.ts";
import * as d from "./valibot-ext.ts";

// ---------------------------------------------------------------------------
// IsNullable
// ---------------------------------------------------------------------------

describe("IsNullable", () => {
  it("returns true for v.nullable()", () => {
    const s = v.nullable(v.string());
    expectTypeOf<IsNullable<typeof s>>().toEqualTypeOf<true>();
  });

  it("returns false for plain v.string()", () => {
    const s = v.string();
    expectTypeOf<IsNullable<typeof s>>().toEqualTypeOf<false>();
  });

  it("returns false for v.optional()", () => {
    const s = v.optional(v.string());
    expectTypeOf<IsNullable<typeof s>>().toEqualTypeOf<false>();
  });

  it("returns false for v.nonNullable(v.nullable(...))", () => {
    // nonNullable removes null, so the resulting type is not nullable.
    const s = v.nonNullable(v.nullable(v.string()));
    expectTypeOf<IsNullable<typeof s>>().toEqualTypeOf<false>();
  });

  it("returns true for v.nullish() — nullish includes null", () => {
    const s = v.nullish(v.string());
    expectTypeOf<IsNullable<typeof s>>().toEqualTypeOf<true>();
  });

  it("returns false for v.array(v.nullable(v.string())) — top-level is array", () => {
    // BUG: implementation walks into ArraySchema and flags the inner nullable.
    const s = v.array(v.nullable(v.string()));
    expectTypeOf<IsNullable<typeof s>>().toEqualTypeOf<false>();
  });

  it("returns true for v.nullable(v.array(v.string())) — top-level is nullable", () => {
    const s = v.nullable(v.array(v.string()));
    expectTypeOf<IsNullable<typeof s>>().toEqualTypeOf<true>();
  });
});

// ---------------------------------------------------------------------------
// IsOptional
// ---------------------------------------------------------------------------

describe("IsOptional", () => {
  it("returns true for v.optional()", () => {
    const s = v.optional(v.string());
    expectTypeOf<IsOptional<typeof s>>().toEqualTypeOf<true>();
  });

  it("returns true for v.nullish() — nullish includes undefined", () => {
    const s = v.nullish(v.string());
    expectTypeOf<IsOptional<typeof s>>().toEqualTypeOf<true>();
  });

  it("returns true for v.exactOptional()", () => {
    const s = v.exactOptional(v.string());
    expectTypeOf<IsOptional<typeof s>>().toEqualTypeOf<true>();
  });

  it("returns false for v.nullable()", () => {
    const s = v.nullable(v.string());
    expectTypeOf<IsOptional<typeof s>>().toEqualTypeOf<false>();
  });

  it("returns false for v.nonOptional(v.optional(...))", () => {
    const s = v.nonOptional(v.optional(v.string()));
    expectTypeOf<IsOptional<typeof s>>().toEqualTypeOf<false>();
  });

  it("returns false for plain v.string()", () => {
    const s = v.string();
    expectTypeOf<IsOptional<typeof s>>().toEqualTypeOf<false>();
  });
});

// ---------------------------------------------------------------------------
// HasDefaultValue
// ---------------------------------------------------------------------------

describe("HasDefaultValue", () => {
  it("returns true for v.optional(v.string(), 'hello')", () => {
    const s = v.optional(v.string(), "hello");
    expectTypeOf<HasDefaultValue<typeof s>>().toEqualTypeOf<true>();
  });

  it("returns true for v.fallback(v.string(), 'hello')", () => {
    const s = v.fallback(v.string(), "hello");
    expectTypeOf<HasDefaultValue<typeof s>>().toEqualTypeOf<true>();
  });

  it("returns false for v.optional(v.string(), undefined)", () => {
    const s = v.optional(v.string(), undefined);
    expectTypeOf<HasDefaultValue<typeof s>>().toEqualTypeOf<false>();
  });

  it("returns false for plain v.string()", () => {
    const s = v.string();
    expectTypeOf<HasDefaultValue<typeof s>>().toEqualTypeOf<false>();
  });

  it("returns false for v.nullable(v.string())", () => {
    const s = v.nullable(v.string());
    expectTypeOf<HasDefaultValue<typeof s>>().toEqualTypeOf<false>();
  });

  it("returns false for v.nullish(v.string())", () => {
    const s = v.nullish(v.string());
    expectTypeOf<HasDefaultValue<typeof s>>().toEqualTypeOf<false>();
  });

  it("detects default through v.nonNullable wrapper", () => {
    const s = v.nonNullable(v.optional(v.string(), "default"));
    expectTypeOf<HasDefaultValue<typeof s>>().toEqualTypeOf<true>();
  });

  it("detects default through v.nonNullish wrapper", () => {
    const s = v.nonNullish(v.nullish(v.string(), "default"));
    expectTypeOf<HasDefaultValue<typeof s>>().toEqualTypeOf<true>();
  });
});

// ---------------------------------------------------------------------------
// HasPipeItem
// ---------------------------------------------------------------------------

describe("HasPipeItem", () => {
  it("returns true for schema with a brand pipe item", () => {
    const s = v.pipe(v.number(), v.integer(), v.brand("int32"));
    expectTypeOf<HasPipeItem<typeof s, "brand">>().toEqualTypeOf<true>();
  });

  it("returns true for schema with a metadata pipe item", () => {
    const s = v.pipe(v.string(), d.dbPrimaryKey());
    expectTypeOf<HasPipeItem<typeof s, "metadata">>().toEqualTypeOf<true>();
  });

  it("returns false for schema without the given pipe item type", () => {
    const s = v.string();
    expectTypeOf<HasPipeItem<typeof s, "brand">>().toEqualTypeOf<false>();
  });

  it("returns false for schema without metadata", () => {
    const s = v.string();
    expectTypeOf<HasPipeItem<typeof s, "metadata">>().toEqualTypeOf<false>();
  });

  it("detects brand through modifier chain (nullable wrapping pipe)", () => {
    const s = v.nullable(v.pipe(v.number(), d.int32()));
    expectTypeOf<HasPipeItem<typeof s, "brand">>().toEqualTypeOf<true>();
  });
});

// ---------------------------------------------------------------------------
// GetPipeItemProp
// ---------------------------------------------------------------------------

describe("GetPipeItemProp", () => {
  it("extracts brand name from int32", () => {
    const s = v.pipe(v.number(), v.integer(), v.brand("int32"));
    expectTypeOf<
      GetPipeItemProp<typeof s, "brand", "name">
    >().toEqualTypeOf<"int32">();
  });

  it("returns never when pipe item type not found", () => {
    const s = v.string();
    expectTypeOf<
      GetPipeItemProp<typeof s, "brand", "name">
    >().toEqualTypeOf<never>();
  });

  it("extracts metadata from primary key schema", () => {
    const s = v.pipe(v.string(), d.dbPrimaryKey());
    type M = GetPipeItemProp<typeof s, "metadata", "metadata">;
    expectTypeOf<M>().toMatchTypeOf<{ db: { primaryKey: true } }>();
  });
});

// ---------------------------------------------------------------------------
// HasDbPk
// ---------------------------------------------------------------------------

describe("HasDbPk", () => {
  it("returns true for string primary key schema", () => {
    const s = v.pipe(v.string(), d.dbPrimaryKey());
    expectTypeOf<HasDbPk<typeof s>>().toEqualTypeOf<true>();
  });

  it("returns true for int32 primary key schema", () => {
    const s = v.pipe(v.number(), d.int32(), d.dbPrimaryKey());
    expectTypeOf<HasDbPk<typeof s>>().toEqualTypeOf<true>();
  });

  it("returns false for plain v.string()", () => {
    const s = v.string();
    expectTypeOf<HasDbPk<typeof s>>().toEqualTypeOf<false>();
  });

  it("returns false for int32 without primary key metadata", () => {
    const s = v.pipe(v.number(), v.integer(), v.brand("int32"));
    expectTypeOf<HasDbPk<typeof s>>().toEqualTypeOf<false>();
  });
});

// ---------------------------------------------------------------------------
// DbFkTable / DbFkColumn
// ---------------------------------------------------------------------------

describe("DbFkTable", () => {
  it("extracts foreign key table name", () => {
    const s = v.pipe(v.bigint(), d.int64(), d.dbForeignKey("users", "id"));
    expectTypeOf<DbFkTable<typeof s>>().toEqualTypeOf<"users">();
  });

  it("returns never for non-FK schema", () => {
    const s = v.string();
    expectTypeOf<DbFkTable<typeof s>>().toEqualTypeOf<never>();
  });
});

describe("DbFkColumn", () => {
  it("extracts foreign key column name", () => {
    const s = v.pipe(v.bigint(), d.int64(), d.dbForeignKey("users", "id"));
    expectTypeOf<DbFkColumn<typeof s>>().toEqualTypeOf<"id">();
  });

  it("returns never for non-FK schema", () => {
    const s = v.string();
    expectTypeOf<DbFkColumn<typeof s>>().toEqualTypeOf<never>();
  });
});

// ---------------------------------------------------------------------------
// DbTableName
// ---------------------------------------------------------------------------

describe("DbTableName", () => {
  it("extracts table name from metadata", () => {
    const s = v.pipe(v.object({ id: v.string() }), d.dbTable("my_table"));
    expectTypeOf<DbTableName<typeof s>>().toEqualTypeOf<"my_table">();
  });

  it("returns never for schema without table name metadata", () => {
    const s = v.string();
    expectTypeOf<DbTableName<typeof s>>().toEqualTypeOf<never>();
  });
});

// ---------------------------------------------------------------------------
// HasDbNavigation
// ---------------------------------------------------------------------------

describe("HasDbNavigation", () => {
  it("returns true for schema with navigation metadata", () => {
    const s = v.pipe(
      v.object({ id: v.string() }),
      d.dbNavigate({} as any, "related"),
    );
    expectTypeOf<HasDbNavigation<typeof s>>().toEqualTypeOf<true>();
  });

  it("returns false for schema without navigation metadata", () => {
    const s = v.string();
    expectTypeOf<HasDbNavigation<typeof s>>().toEqualTypeOf<false>();
  });
});

// ---------------------------------------------------------------------------
// ArrayDimensions
// ---------------------------------------------------------------------------

describe("ArrayDimensions", () => {
  it("returns '[]' for a 1D array", () => {
    const s = v.array(v.string());
    expectTypeOf<ArrayDimensions<typeof s>>().toEqualTypeOf<"[]">();
  });

  it("returns '[][]' for a 2D array", () => {
    const s = v.array(v.array(v.string()));
    expectTypeOf<ArrayDimensions<typeof s>>().toEqualTypeOf<"[][]">();
  });

  it("returns never for a non-array schema", () => {
    const s = v.string();
    expectTypeOf<ArrayDimensions<typeof s>>().toEqualTypeOf<never>();
  });

  it("returns '[]' for nullable array (detects through nullable wrapper)", () => {
    const s = v.nullable(v.array(v.string()));
    expectTypeOf<ArrayDimensions<typeof s>>().toEqualTypeOf<"[]">();
  });
});

// ---------------------------------------------------------------------------
// UnwrapModifiers
// ---------------------------------------------------------------------------

describe("UnwrapModifiers", () => {
  it("unwraps nullable to base schema", () => {
    const s = v.nullable(v.string());
    type Base = UnwrapModifiers<typeof s>;
    expectTypeOf<v.InferOutput<Base>>().toEqualTypeOf<string>();
  });

  it("unwraps optional to base schema", () => {
    const s = v.optional(v.string());
    type Base = UnwrapModifiers<typeof s>;
    expectTypeOf<v.InferOutput<Base>>().toEqualTypeOf<string>();
  });

  it("unwraps nullish to base schema", () => {
    const s = v.nullish(v.string());
    type Base = UnwrapModifiers<typeof s>;
    expectTypeOf<v.InferOutput<Base>>().toEqualTypeOf<string>();
  });

  it("unwraps nonNullable to base schema", () => {
    const s = v.nonNullable(v.nullable(v.string()));
    type Base = UnwrapModifiers<typeof s>;
    expectTypeOf<v.InferOutput<Base>>().toEqualTypeOf<string>();
  });

  it("unwraps nonNullish to base schema", () => {
    const s = v.nonNullish(v.nullish(v.string()));
    type Base = UnwrapModifiers<typeof s>;
    expectTypeOf<v.InferOutput<Base>>().toEqualTypeOf<string>();
  });

  it("unwraps nonOptional to base schema", () => {
    const s = v.nonOptional(v.optional(v.string()));
    type Base = UnwrapModifiers<typeof s>;
    expectTypeOf<v.InferOutput<Base>>().toEqualTypeOf<string>();
  });

  it("unwraps exactOptional to base schema", () => {
    const s = v.exactOptional(v.string());
    type Base = UnwrapModifiers<typeof s>;
    expectTypeOf<v.InferOutput<Base>>().toEqualTypeOf<string>();
  });

  it("unwraps through pipe to the base schema", () => {
    const s = v.pipe(v.string(), v.minLength(1));
    type Base = UnwrapModifiers<typeof s>;
    expectTypeOf<v.InferOutput<Base>>().toEqualTypeOf<string>();
  });

  //   it("unwraps array to item schema", () => {
  //     const s = v.array(v.string());
  //     type Base = UnwrapModifiers<typeof s>;
  //     expectTypeOf<v.InferOutput<Base>>().toEqualTypeOf<string>();
  //   });

  it("returns same for non-wrapped schema", () => {
    const s = v.string();
    type Base = UnwrapModifiers<typeof s>;
    expectTypeOf<v.InferOutput<Base>>().toEqualTypeOf<string>();
  });
});

// ---------------------------------------------------------------------------
// PipeUnion
// ---------------------------------------------------------------------------

describe("PipeUnion", () => {
  it("extracts pipe items as a union (includes brand from int32)", () => {
    const s = v.pipe(v.number(), v.integer(), v.brand("int32"));
    type U = PipeUnion<typeof s>;
    type HasBrand = Extract<U, { type: "brand" }> extends never ? false : true;
    expectTypeOf<HasBrand>().toEqualTypeOf<true>();
  });

  it("returns never for non-piped schema", () => {
    const s = v.string();
    expectTypeOf<PipeUnion<typeof s>>().toEqualTypeOf<never>();
  });

  it("walks through nullable wrapper to extract pipe items", () => {
    const s = v.nullable(v.pipe(v.number(), d.int32()));
    type U = PipeUnion<typeof s>;
    type HasBrand = Extract<U, { type: "brand" }> extends never ? false : true;
    expectTypeOf<HasBrand>().toEqualTypeOf<true>();
  });
});

// ---------------------------------------------------------------------------
// GetAutoIncrement
// ---------------------------------------------------------------------------

describe("GetAutoIncrement", () => {
  it("returns true for int32 with primary key", () => {
    const s = v.pipe(v.number(), d.int32(), d.dbPrimaryKey());
    expectTypeOf<GetAutoIncrement<typeof s>>().toEqualTypeOf<true>();
  });

  it("returns true for int64 with primary key", () => {
    const s = v.pipe(v.bigint(), d.int64(), d.dbPrimaryKey());
    expectTypeOf<GetAutoIncrement<typeof s>>().toEqualTypeOf<true>();
  });

  it("returns true for uint64 with primary key", () => {
    const s = v.pipe(v.bigint(), d.uint64(), d.dbPrimaryKey());
    expectTypeOf<GetAutoIncrement<typeof s>>().toEqualTypeOf<true>();
  });

  it("returns never for int32 without primary key", () => {
    const s = v.pipe(v.number(), v.integer(), v.brand("int32"));
    expectTypeOf<GetAutoIncrement<typeof s>>().toEqualTypeOf<never>();
  });

  it("returns never for string primary key (non-numeric brand)", () => {
    const s = v.pipe(v.string(), d.dbPrimaryKey());
    expectTypeOf<GetAutoIncrement<typeof s>>().toEqualTypeOf<never>();
  });
});

// ---------------------------------------------------------------------------
// SafeParamDerivation
// ---------------------------------------------------------------------------

describe("SafeParamDerivation", () => {
  it("derives nullable:true for nullable schema", () => {
    const s = v.nullable(v.string());
    type P = SafeParamDerivation<typeof s>;
    expectTypeOf<P["nullable"]>().toEqualTypeOf<true>();
  });

  it("derives primaryKey:true for PK schema", () => {
    const s = v.pipe(v.number(), d.int32(), d.dbPrimaryKey());
    type P = SafeParamDerivation<typeof s>;
    expectTypeOf<P["primaryKey"]>().toEqualTypeOf<true>();
  });

  it("derives autoIncrement:true for int32 PK", () => {
    const s = v.pipe(v.number(), d.int32(), d.dbPrimaryKey());
    type P = SafeParamDerivation<typeof s>;
    expectTypeOf<P["autoIncrement"]>().toEqualTypeOf<true>();
  });

  it("derives default:unknown for schema with default", () => {
    const s = v.optional(v.string(), "hello");
    type P = SafeParamDerivation<typeof s>;
    expectTypeOf<P["default"]>().toEqualTypeOf<unknown>();
  });

  it("derives foreignKeyTable and foreignKeyColumn for FK schema", () => {
    const s = v.pipe(v.bigint(), d.int64(), d.dbForeignKey("users", "id"));
    type P = SafeParamDerivation<typeof s>;
    expectTypeOf<P["foreignKeyTable"]>().toEqualTypeOf<"users">();
    expectTypeOf<P["foreignKeyColumn"]>().toEqualTypeOf<"id">();
  });

  it("derives array:'[]' for array schema", () => {
    const s = v.array(v.string());
    type P = SafeParamDerivation<typeof s>;
    expectTypeOf<P["array"]>().toEqualTypeOf<"[]">();
  });

  it("derives empty object ({}) for plain string — all keys are never", () => {
    const s = v.string();
    type P = SafeParamDerivation<typeof s>;
    // OmitNever strips all never-valued keys, leaving {}
    type IsEmpty = keyof P extends never ? true : false;
    expectTypeOf<IsEmpty>().toEqualTypeOf<true>();
  });
});
