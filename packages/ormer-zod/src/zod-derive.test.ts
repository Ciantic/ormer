import { describe, it, expect, expectTypeOf } from "vitest";
import { z } from "zod";
import { derivePgColumn, derivePgTable } from "./zod-derive.ts";
import "./zod-ext.ts";
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

  it("z.number() -> float8", () => {
    const col = derivePgColumn(z.number());
    expectTypeOf<typeof col>().toEqualTypeOf<ColumnTypeSingualr<"float8">>();
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

  it("z.int().dbPk() -> int4 with primaryKey and autoIncrement", () => {
    const col = derivePgColumn(z.int().dbPk());
    expectTypeOf<typeof col>().toEqualTypeOf<
      ColumnType<"int4", { primaryKey: true; autoIncrement: true }>
    >();
    expect(col.type).toBe("int4");
    expect(col.primaryKey).toBe(true);
    expect(col.autoIncrement).toBe(true);
  });

  it("z.bigint().dbPk() -> int8 with primaryKey and autoIncrement", () => {
    const col = derivePgColumn(z.bigint().dbPk());
    expectTypeOf<typeof col>().toEqualTypeOf<
      ColumnType<"int8", { primaryKey: true; autoIncrement: true }>
    >();
    expect(col.type).toBe("int8");
    expect(col.primaryKey).toBe(true);
    expect(col.autoIncrement).toBe(true);
  });

  it("z.number().int() -> float8", () => {
    const col = derivePgColumn(z.number().int());
    expectTypeOf<typeof col>().toEqualTypeOf<ColumnTypeSingualr<"float8">>();
    expect(col.type).toBe("float8");
  });

  it("z.string().email() -> text", () => {
    const col = derivePgColumn(z.email());
    expectTypeOf<typeof col>().toEqualTypeOf<
      ColumnTypeSingualr<"text"> | ColumnType<"varchar", { maxLength: number }>
    >();
    expect(col.type).toBe("text");
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
      | ColumnType<"varchar", { maxLength: number; nullable: true }>
    >();
    expect(col.type).toBe("text");
    expect(col.nullable).toBe(true);
  });

  it("z.number().nullable() -> float8 + nullable", () => {
    const col = derivePgColumn(z.number().nullable());
    expectTypeOf<typeof col>().toEqualTypeOf<
      ColumnType<"float8", { nullable: true }>
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

describe("derivePgColumn default types", () => {
  it("z.string().default('hello') -> text|varchar + default", () => {
    const col = derivePgColumn(z.string().default("hello"));
    expectTypeOf<typeof col>().toEqualTypeOf<
      | ColumnType<"text", { default: string }>
      | ColumnType<"varchar", { maxLength: number; default: string }>
    >();
    expect(col.type).toBe("text");
    expect(col.default).toBe("hello");
  });

  it("z.number().default(5) -> float8 + default", () => {
    const col = derivePgColumn(z.number().default(5));
    expectTypeOf<typeof col>().toEqualTypeOf<
      ColumnType<"float8", { default: number }>
    >();
    expect(col.type).toBe("float8");
    expect(col.default).toBe(5);
  });

  it("z.int().default(42) -> int4 + default", () => {
    const col = derivePgColumn(z.int().default(42));
    expectTypeOf<typeof col>().toEqualTypeOf<
      ColumnType<"int4", { default: number }>
    >();
    expect(col.type).toBe("int4");
    expect(col.default).toBe(42);
  });

  it("z.bigint().default(1n) -> int8 + default", () => {
    const col = derivePgColumn(z.bigint().default(1n));
    expectTypeOf<typeof col>().toEqualTypeOf<
      ColumnType<"int8", { default: bigint }>
    >();
    expect(col.type).toBe("int8");
    expect(col.default).toBe(1n);
  });

  it("z.boolean().default(true) -> boolean + default", () => {
    const col = derivePgColumn(z.boolean().default(true));
    expectTypeOf<typeof col>().toEqualTypeOf<
      ColumnType<"boolean", { default: boolean }>
    >();
    expect(col.type).toBe("boolean");
    expect(col.default).toBe(true);
  });

  it("z.date().default(new Date()) -> timestamptz + default", () => {
    const d = new Date();
    const col = derivePgColumn(z.date().default(d));
    expectTypeOf<typeof col>().toEqualTypeOf<
      ColumnType<"timestamptz", { default: Date }>
    >();
    expect(col.type).toBe("timestamptz");
    expect(col.default).toBe(d);
  });

  it("z.uuid().default('...') -> uuid + default", () => {
    const col = derivePgColumn(
      z.uuid().default("550e8400-e29b-41d4-a716-446655440000"),
    );
    expectTypeOf<typeof col>().toEqualTypeOf<
      ColumnType<"uuid", { default: string }>
    >();
    expect(col.type).toBe("uuid");
    expect(col.default).toBe("550e8400-e29b-41d4-a716-446655440000");
  });

  it("z.string().nullable().default('fallback') -> text|varchar + nullable + default", () => {
    const col = derivePgColumn(z.string().nullable().default("fallback"));
    expectTypeOf<typeof col>().toEqualTypeOf<
      | ColumnType<"text", { default: string | null; nullable: true }>
      | ColumnType<
          "varchar",
          { maxLength: number; default: string | null; nullable: true }
        >
    >();
    expect(col.type).toBe("text");
    expect(col.nullable).toBe(true);
    expect(col.default).toBe("fallback");
  });

  it("z.number().default(0).nullable() -> float8 + default + nullable ", () => {
    const col = derivePgColumn(z.number().default(0).nullable());
    expectTypeOf<typeof col>().toEqualTypeOf<
      ColumnType<"float8", { default: number; nullable: true }>
    >();
    expect(col.type).toBe("float8");
    expect(col.nullable).toBe(true);
    expect(col.default).toBe(0);
  });

  it("z.int().default(1).dbPk() -> int4 + primaryKey + default", () => {
    const col = derivePgColumn(z.int().default(1).dbPk());
    expectTypeOf<typeof col>().toEqualTypeOf<
      ColumnType<
        "int4",
        {
          default: number;
          primaryKey: true;
          autoIncrement: true;
        }
      >
    >();
    expect(col.type).toBe("int4");
    expect(col.primaryKey).toBe(true);
    expect(col.autoIncrement).toBe(true);
    expect(col.default).toBe(1);
  });
});

describe("unsupported type throws", () => {
  it("z.array(z.string()) throws", () => {
    expect(() => derivePgColumn(z.array(z.string()) as any)).toThrow(
      "ZodArray",
    );
  });
});

// ---------------------------------------------------------------------------
// derivePgTable tests
// ---------------------------------------------------------------------------

describe("derivePgTable", () => {
  it("derives a simple table from a ZodObject", () => {
    const schema = z
      .object({
        id: z.int().dbPk(),
        title: z.string(),
        description: z.string().nullable(),
      })
      .dbTable("items");

    const tbl = derivePgTable(schema);

    expect(tbl.table).toBe("items");
    expect(tbl.columns.id.type).toBe("int4");
    expect(tbl.columns.id.primaryKey).toBe(true);
    expect(tbl.columns.id.autoIncrement).toBe(true);
    expect(tbl.columns.title.type).toBe("text");
    expect(tbl.columns.description.type).toBe("text");
    expect(tbl.columns.description.nullable).toBe(true);
  });

  it("derives a table with foreign keys", () => {
    const invoiceSchema = z
      .object({
        id: z.number().dbPk(),
        title: z.string(),
      })
      .dbTable("invoice");

    const rowSchema = z
      .object({
        id: z.number().dbPk(),
        invoice_id: z.number().nullable().dbFk(invoiceSchema, "id"),
        amount: z.number(),
      })
      .dbTable("invoice_row");

    const tbl = derivePgTable(rowSchema);

    expect(tbl.table).toBe("invoice_row");
    expect(tbl.columns.id.type).toBe("float8");
    expect(tbl.columns.id.primaryKey).toBe(true);
    expect(tbl.columns.invoice_id.type).toBe("float8");
    expect(tbl.columns.invoice_id.nullable).toBe(true);
    expect(tbl.columns.invoice_id.foreignKeyTable).toBe("invoice");
    expect(tbl.columns.invoice_id.foreignKeyColumn).toBe("id");
    expect(tbl.columns.amount.type).toBe("float8");
  });

  it("derives a table with foreign keys to PK", () => {
    const invoiceSchema = z
      .object({
        id: z.bigint().dbPk(),
        title: z.string(),
      })
      .dbTable("invoice");

    const rowSchema = z
      .object({
        id: z.int().dbPk(),
        invoice_id: z.bigint().nullable().dbFk(invoiceSchema, "id"),
        amount: z.int(),
      })
      .dbTable("invoice_row");

    const tbl = derivePgTable(rowSchema);

    expect(tbl.table).toBe("invoice_row");
    // PK from z.int().dbPk() -> int4
    expectTypeOf<typeof tbl.columns.id.type>().toEqualTypeOf<"int4">();
    expect(tbl.columns.id.type).toBe("int4");
    expect(tbl.columns.id.primaryKey).toBe(true);
    expect(tbl.columns.id.autoIncrement).toBe(true);
    // FK from z.bigint() -> int8 (NOT serial8)
    expectTypeOf<typeof tbl.columns.invoice_id.type>().toEqualTypeOf<"int8">();
    expect(tbl.columns.invoice_id.type).toBe("int8");
    expect(tbl.columns.invoice_id.nullable).toBe(true);
    expect(tbl.columns.invoice_id.foreignKeyTable).toBe("invoice");
    expect(tbl.columns.invoice_id.foreignKeyColumn).toBe("id");
    expect(tbl.columns.amount.type).toBe("int4");
  });

  it("skips navigation fields (dbRef)", () => {
    const rowSchema = z
      .object({
        id: z.int().dbPk(),
        title: z.string(),
        get rows() {
          return z.array(rowSchema).dbNavigate(rowSchema, "id");
        },
      })
      .dbTable("items");

    const tbl = derivePgTable(rowSchema);

    expect(tbl.table).toBe("items");
    expect(tbl.columns.id).toBeDefined();
    expect(tbl.columns.title).toBeDefined();
    // rows is a navigation, should NOT appear as a column
    expect((tbl.columns as any).rows).toBeUndefined();
  });

  it("derives a self-referencing table with foreign key", () => {
    const personSchema = z
      .object({
        id: z.int().dbPk(),
        first_name: z.string(),
        get supervisor_id() {
          return z.int().nullable().dbFk(personSchema, "id");
        },
        get supervisor() {
          return personSchema.dbNavigateSelf("id");
        },
      })
      .dbTable("person");

    const tbl = derivePgTable(personSchema);

    expect(tbl.table).toBe("person");
    expect(tbl.columns.id.type).toBe("int4");
    expect(tbl.columns.id.primaryKey).toBe(true);
    expect(tbl.columns.id.autoIncrement).toBe(true);
    expect(tbl.columns.first_name.type).toBe("text");
    expect(tbl.columns.supervisor_id.type).toBe("int4");
    expect(tbl.columns.supervisor_id.nullable).toBe(true);
    expect(tbl.columns.supervisor_id.foreignKeyTable).toBe("person");
    expect(tbl.columns.supervisor_id.foreignKeyColumn).toBe("id");
    // supervisor is a navigation, should NOT appear as a column
    expect((tbl.columns as any).supervisor).toBeUndefined();
  });

  it("throws if ZodObject has no dbTable metadata", () => {
    const schema = z.object({
      id: z.number(),
    });

    expect(() => derivePgTable(schema as any)).toThrow("dbTable");
  });
});

describe("derivePgTable types", () => {
  it("returns correct Table type for simple schema", () => {
    const schema = z
      .object({
        id: z.int().dbPk(),
        title: z.string(),
      })
      .dbTable("items");

    // expectTypeOf<Foo>().toEqualTypeOf<"items">();

    const tbl = derivePgTable(schema);
    expectTypeOf<typeof tbl.table>().toEqualTypeOf<"items">();
    expectTypeOf<(typeof tbl.columns)["id"]>().toEqualTypeOf<
      ColumnType<"int4", { primaryKey: true; autoIncrement: true }>
    >();
    expectTypeOf<(typeof tbl.columns)["title"]>().toEqualTypeOf<
      ColumnTypeSingualr<"text"> | ColumnType<"varchar", { maxLength: number }>
    >();
  });

  it("type-only: navigation keys are excluded from columns", () => {
    const schema = z
      .object({
        id: z.int().dbPk(),
        title: z.string(),
        get rows() {
          return z.array(schema as any).dbNavigate(schema as any, "id");
        },
      })
      .dbTable("items");

    const tbl = derivePgTable(schema);

    // id and title should exist, rows should be excluded
    type ColKeys = keyof typeof tbl.columns;
    expectTypeOf<ColKeys>().toEqualTypeOf<"id" | "title">();
  });

  it("type-only: foreign key has foreignKeyTable and foreignKeyColumn", () => {
    const invSchema = z
      .object({ id: z.number().dbPk(), title: z.string() })
      .dbTable("invoice");

    const rowSchema = z
      .object({
        id: z.int().dbPk(),
        invoice_id: z.int().nullable().dbFk(invSchema, "id"),
        amount: z.int(),
      })
      .dbTable("invoice_row");

    const tbl = derivePgTable(rowSchema);

    expectTypeOf<
      (typeof tbl.columns)["invoice_id"]["foreignKeyTable"]
    >().toEqualTypeOf<"invoice">();

    expectTypeOf<
      (typeof tbl.columns)["invoice_id"]["foreignKeyColumn"]
    >().toEqualTypeOf<"id">();

    expectTypeOf<(typeof tbl.columns)["invoice_id"]>().toEqualTypeOf<
      ColumnType<
        "int4",
        { nullable: true; foreignKeyTable: "invoice"; foreignKeyColumn: "id" }
      >
    >();
  });

  it("type-only: FK -> PK has int8 type", () => {
    const invSchema = z
      .object({ id: z.bigint().dbPk(), title: z.string() })
      .dbTable("invoice");

    const rowSchema = z
      .object({
        id: z.int().dbPk(),
        invoice_id: z.bigint().nullable().dbFk(invSchema, "id"),
        amount: z.int(),
      })
      .dbTable("invoice_row");

    const tbl = derivePgTable(rowSchema);

    expectTypeOf<
      (typeof tbl.columns)["invoice_id"]["foreignKeyTable"]
    >().toEqualTypeOf<"invoice">();

    expectTypeOf<
      (typeof tbl.columns)["invoice_id"]["foreignKeyColumn"]
    >().toEqualTypeOf<"id">();

    expectTypeOf<(typeof tbl.columns)["invoice_id"]>().toEqualTypeOf<
      ColumnType<
        "int8",
        { nullable: true; foreignKeyTable: "invoice"; foreignKeyColumn: "id" }
      >
    >();
  });
});
