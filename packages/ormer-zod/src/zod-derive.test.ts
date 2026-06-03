import { describe, it, expect, expectTypeOf } from "vitest";
import { z } from "zod";
import { pg, type ColumnType, type ColumnTypeSingualr } from "ormer";
import { derivePgColumn, derivePgTable } from "./zod-derive.ts";
import "./zod-ext.ts";

describe("derivePgColumn dbPg override", () => {
  it("z.string().dbPg(pg.uuid()) → pg.uuid()", () => {
    const col = derivePgColumn(z.string().dbPg(pg.uuid()));
    expectTypeOf<typeof col>().toEqualTypeOf<ColumnTypeSingualr<"uuid">>();
    expect(col.type).toBe("uuid");
  });

  it("z.string().nullable().dbPg(pg.uuid()) → pg.uuid()", () => {
    const col = derivePgColumn(z.string().nullable().dbPg(pg.uuid()));
    expectTypeOf<typeof col>().toEqualTypeOf<ColumnTypeSingualr<"uuid">>();
    expect(col.type).toBe("uuid");
    expect((col as any).nullable).toBeUndefined();
  });

  it("z.int().dbPg(pg.text()) → pg.text()", () => {
    const col = derivePgColumn(z.int().dbPg(pg.text()));
    expectTypeOf<typeof col>().toEqualTypeOf<ColumnTypeSingualr<"text">>();
    expect(col.type).toBe("text");
  });
});

describe("derivePgColumn nullable types", () => {
  it("z.string().nullable() -> text|varchar + nullable", () => {
    const col = derivePgColumn(z.string().nullable());
    expectTypeOf<typeof col>().toEqualTypeOf<
      ColumnType<"text", { nullable: true }>
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

  it("z.int64().nullable() -> { type: 'int8', nullable: true }", () => {
    const col = derivePgColumn(z.int64().nullable());
    expectTypeOf<typeof col>().toEqualTypeOf<
      ColumnType<"int8", { nullable: true }>
    >();
    expect(col.type).toBe("int8");
    expect(col.nullable).toBe(true);
  });
});

describe("derivePgColumn optional types", () => {
  it("z.string().optional() -> text|varchar + nullable", () => {
    const col = derivePgColumn(z.string().optional());
    expectTypeOf<typeof col>().toEqualTypeOf<
      ColumnType<"text", { nullable: true }>
    >();
    expect(col.type).toBe("text");
    expect(col.nullable).toBe(true);
  });

  it("z.number().optional() -> float8 + nullable", () => {
    const col = derivePgColumn(z.number().optional());
    expectTypeOf<typeof col>().toEqualTypeOf<
      ColumnType<"float8", { nullable: true }>
    >();
    expect(col.type).toBe("float8");
    expect(col.nullable).toBe(true);
  });

  it("z.boolean().optional() -> { type: 'boolean', nullable: true }", () => {
    const col = derivePgColumn(z.boolean().optional());
    expectTypeOf<typeof col>().toEqualTypeOf<
      ColumnType<"boolean", { nullable: true }>
    >();
    expect(col.type).toBe("boolean");
    expect(col.nullable).toBe(true);
  });

  it("z.date().optional() -> { type: 'timestamptz', nullable: true }", () => {
    const col = derivePgColumn(z.date().optional());
    expectTypeOf<typeof col>().toEqualTypeOf<
      ColumnType<"timestamptz", { nullable: true }>
    >();
    expect(col.type).toBe("timestamptz");
    expect(col.nullable).toBe(true);
  });

  it("z.uuid().optional() -> { type: 'uuid', nullable: true }", () => {
    const col = derivePgColumn(z.uuid().optional());
    expectTypeOf<typeof col>().toEqualTypeOf<
      ColumnType<"uuid", { nullable: true }>
    >();
    expect(col.type).toBe("uuid");
    expect(col.nullable).toBe(true);
  });

  it("z.int().optional() -> { type: 'int4', nullable: true }", () => {
    const col = derivePgColumn(z.int().optional());
    expectTypeOf<typeof col>().toEqualTypeOf<
      ColumnType<"int4", { nullable: true }>
    >();
    expect(col.type).toBe("int4");
    expect(col.nullable).toBe(true);
  });

  it("z.int64().optional() -> { type: 'int8', nullable: true }", () => {
    const col = derivePgColumn(z.int64().optional());
    expectTypeOf<typeof col>().toEqualTypeOf<
      ColumnType<"int8", { nullable: true }>
    >();
    expect(col.type).toBe("int8");
    expect(col.nullable).toBe(true);
  });

  it("z.string().optional().default('fallback') -> text|varchar + nullable + default", () => {
    const col = derivePgColumn(z.string().optional().default("fallback"));
    expectTypeOf<typeof col>().toEqualTypeOf<
      ColumnType<"text", { default: string; nullable: true }>
    >();
    expect(col.type).toBe("text");
    expect(col.nullable).toBe(true);
    expect(col.default).toBe("fallback");
  });

  it("z.number().default(0).optional() -> float8 + default + nullable", () => {
    const col = derivePgColumn(z.number().default(0).optional());
    expectTypeOf<typeof col>().toEqualTypeOf<
      ColumnType<"float8", { default: number | undefined; nullable: true }>
    >();
    expect(col.type).toBe("float8");
    expect(col.nullable).toBe(true);
    expect(col.default).toBe(0);
  });
});

describe("derivePgColumn default types", () => {
  it("z.string().default('hello') -> text|varchar + default", () => {
    const col = derivePgColumn(z.string().default("hello"));
    expectTypeOf<typeof col>().toEqualTypeOf<
      ColumnType<"text", { default: string }>
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

  it("z.int64().default(1n) -> int8 + default", () => {
    const col = derivePgColumn(z.int64().default(1n));
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
      ColumnType<"text", { default: string | null; nullable: true }>
    >();
    expect(col.type).toBe("text");
    expect(col.nullable).toBe(true);
    expect(col.default).toBe("fallback");
  });

  it("z.number().default(0).nullable() -> float8 + default + nullable ", () => {
    const col = derivePgColumn(z.number().default(0).nullable());
    expectTypeOf<typeof col>().toEqualTypeOf<
      ColumnType<"float8", { default: number | null; nullable: true }>
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

describe("test ordering doesn't break the behavior", () => {
  it("z.int().dbPk().meta({ description: 'test' })", () => {
    const col = derivePgColumn(z.int().dbPk().meta({ description: "test" }));
    expectTypeOf<typeof col>().toEqualTypeOf<
      ColumnType<"int4", { primaryKey: true; autoIncrement: true }>
    >();
    expect(col.type).toBe("int4");
    expect(col.primaryKey).toBe(true);
    expect(col.autoIncrement).toBe(true);
  });

  it("z.int().dbFk(...).meta({ description: 'test' })", () => {
    const otherSchema = z.object({ id: z.int().dbPk() }).dbTable("other");
    const col = derivePgColumn(
      z.int().dbFk(otherSchema, "id").meta({ description: "test" }),
    );
    expectTypeOf<typeof col>().toEqualTypeOf<
      ColumnType<
        "int4",
        {
          foreignKeyTable: "other";
          foreignKeyColumn: "id";
        }
      >
    >();
    expect(col.type).toBe("int4");
    expect(col.foreignKeyTable).toBe("other");
    expect(col.foreignKeyColumn).toBe("id");
  });
});

// ---------------------------------------------------------------------------
// readonly() wrapper tests
// ---------------------------------------------------------------------------

describe("derivePgColumn readonly wrapper", () => {
  it("z.string().readonly() → pg.text()", () => {
    const col = derivePgColumn(z.string().readonly());
    expectTypeOf<typeof col>().toEqualTypeOf<ColumnTypeSingualr<"text">>();
    expect(col.type).toBe("text");
  });

  it("z.number().readonly() → pg.float8()", () => {
    const col = derivePgColumn(z.number().readonly());
    expectTypeOf<typeof col>().toEqualTypeOf<ColumnTypeSingualr<"float8">>();
    expect(col.type).toBe("float8");
  });

  it("z.uuid().readonly() → pg.uuid()", () => {
    const col = derivePgColumn(z.uuid().readonly());
    expectTypeOf<typeof col>().toEqualTypeOf<ColumnTypeSingualr<"uuid">>();
    expect(col.type).toBe("uuid");
  });

  it("z.boolean().nullable().readonly() → pg.boolean({ nullable: true })", () => {
    const col = derivePgColumn(z.boolean().nullable().readonly());
    expectTypeOf<typeof col>().toEqualTypeOf<
      ColumnType<"boolean", { nullable: true }>
    >();
    expect(col.type).toBe("boolean");
    expect(col.nullable).toBe(true);
  });

  it("z.string().default('x').readonly() → pg.text({ default: 'x' })", () => {
    const col = derivePgColumn(z.string().default("x").readonly());
    expectTypeOf<typeof col>().toEqualTypeOf<
      ColumnType<"text", { default: string }>
    >();
    expect(col.type).toBe("text");
    expect(col.default).toBe("x");
  });

  it("z.int().dbPk().readonly() → pg.int4({ primaryKey, autoIncrement })", () => {
    const col = derivePgColumn(z.int().dbPk().readonly());
    expectTypeOf<typeof col>().toEqualTypeOf<
      ColumnType<"int4", { primaryKey: true; autoIncrement: true }>
    >();
    expect(col.type).toBe("int4");
    expect(col.primaryKey).toBe(true);
    expect(col.autoIncrement).toBe(true);
  });
});

describe("derivePgColumn prefault wrapper", () => {
  it("z.string().prefault('hello') → pg.text({ default: 'hello' })", () => {
    const col = derivePgColumn(z.string().prefault("hello"));
    expectTypeOf<typeof col>().toEqualTypeOf<
      ColumnType<"text", { default: string }>
    >();
    expect(col.type).toBe("text");
    expect(col.default).toBe("hello");
  });

  it("z.number().prefault(42) → pg.float8({ default: 42 })", () => {
    const col = derivePgColumn(z.number().prefault(42));
    expectTypeOf<typeof col>().toEqualTypeOf<
      ColumnType<"float8", { default: number }>
    >();
    expect(col.type).toBe("float8");
    expect(col.default).toBe(42);
  });

  it("z.boolean().prefault(true) → pg.boolean({ default: true })", () => {
    const col = derivePgColumn(z.boolean().prefault(true));
    expectTypeOf<typeof col>().toEqualTypeOf<
      ColumnType<"boolean", { default: boolean }>
    >();
    expect(col.type).toBe("boolean");
    expect(col.default).toBe(true);
  });

  it("z.string().prefault('x').nullable() → pg.text({ default: 'x', nullable: true })", () => {
    const col = derivePgColumn(z.string().prefault("x").nullable());
    expectTypeOf<typeof col>().toEqualTypeOf<
      ColumnType<"text", { default: string | null; nullable: true }>
    >();
    expect(col.type).toBe("text");
    expect(col.default).toBe("x");
    expect(col.nullable).toBe(true);
  });

  it("z.int().prefault(1).dbPk() → pg.int4({ default: 1, primaryKey, autoIncrement })", () => {
    const col = derivePgColumn(z.int().prefault(1).dbPk());
    expectTypeOf<typeof col>().toEqualTypeOf<
      ColumnType<
        "int4",
        { default: number; primaryKey: true; autoIncrement: true }
      >
    >();
    expect(col.type).toBe("int4");
    expect(col.default).toBe(1);
    expect(col.primaryKey).toBe(true);
    expect(col.autoIncrement).toBe(true);
  });

  it("z.string().prefault(() => 'lazy').readonly() → pg.text({ default: 'lazy' })", () => {
    const col = derivePgColumn(
      z
        .string()
        .prefault(() => "lazy")
        .readonly(),
    );
    expectTypeOf<typeof col>().toEqualTypeOf<
      ColumnType<"text", { default: string }>
    >();
    expect(col.type).toBe("text");
    expect(col.default).toBe("lazy");
  });
});

describe("derivePgColumn other wrappers (pure unwrap and catch)", () => {
  it("z.string().exactOptional() → pg.text({ nullable: true })", () => {
    const col = derivePgColumn(z.string().exactOptional());
    expectTypeOf<typeof col>().toEqualTypeOf<
      ColumnType<"text", { nullable: true }>
    >();
    expect(col.type).toBe("text");
    expect(col.nullable).toBe(true);
  });

  it("z.string().optional().nonoptional() → pg.text() is not nullable", () => {
    const col = derivePgColumn(z.string().optional().nonoptional());
    expectTypeOf<typeof col>().toEqualTypeOf<ColumnTypeSingualr<"text">>();
    expect(col.type).toBe("text");
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    expect((col as any).nullable).toBeUndefined();
  });

  it("z.string().nullable().optional().nonoptional() → pg.text() is nullable", () => {
    const col = derivePgColumn(z.string().nullable().optional().nonoptional());
    expectTypeOf<typeof col>().toEqualTypeOf<
      ColumnType<"text", { nullable: true }>
    >();
    expect(col.type).toBe("text");
    expect((col as any).nullable).toBe(true);
  });

  it("z.string().catch('fallback') → pg.text({ default: 'fallback' })", () => {
    const col = derivePgColumn(z.string().catch("fallback"));
    expectTypeOf<typeof col>().toEqualTypeOf<
      ColumnType<"text", { default: string }>
    >();
    expect(col.type).toBe("text");
    // Zod wraps catchValue in a function at runtime
    expect(typeof col.default).toBe("function");
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    expect((col.default as any)()).toBe("fallback");
  });

  it("z.string().pipe(z.coerce.number()) → pg.text()", () => {
    // ZodPipe unwraps to the IN type (ZodString → text/varchar),
    // NOT the OUT type (ZodNumber → float8).
    const col = derivePgColumn(z.string().pipe(z.coerce.number()));
    expectTypeOf<typeof col>().toEqualTypeOf<ColumnTypeSingualr<"text">>();
    expect(col.type).toBe("text");
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
        id: z.int64().dbPk(),
        title: z.string(),
      })
      .dbTable("invoice");

    const rowSchema = z
      .object({
        id: z.int().dbPk(),
        invoice_id: z.int64().nullable().dbFk(invoiceSchema, "id"),
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
      ColumnTypeSingualr<"text">
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
      .object({ id: z.int64().dbPk(), title: z.string() })
      .dbTable("invoice");

    const rowSchema = z
      .object({
        id: z.int64().dbPk(),
        invoice_id: z.int64().nullable().dbFk(invSchema, "id"),
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

// ---------------------------------------------------------------------------
// .extend() and .omit() with dbTable / derivePgTable
// ---------------------------------------------------------------------------

describe("derivePgTable with .extend()", () => {
  it("extend then dbTable produces correct column derivations", () => {
    const baseSchema = z.object({
      id: z.int().dbPk(),
      title: z.string(),
    });

    const extendedSchema = baseSchema
      .extend({
        description: z.string().nullable(),
        created_at: z.date(),
      })
      .dbTable("items");

    const tbl = derivePgTable(extendedSchema);

    expect(tbl.table).toBe("items");

    // Original fields
    expect(tbl.columns.id.type).toBe("int4");
    expect(tbl.columns.id.primaryKey).toBe(true);
    expect(tbl.columns.id.autoIncrement).toBe(true);
    expect(tbl.columns.title.type).toBe("text");

    // Extended fields
    expect(tbl.columns.description.type).toBe("text");
    expect(tbl.columns.description.nullable).toBe(true);
    expect(tbl.columns.created_at.type).toBe("timestamptz");
  });

  it("extend carries FK field metadata to derived table", () => {
    const invoiceSchema = z
      .object({
        id: z.int64().dbPk(),
        title: z.string(),
      })
      .dbTable("invoice");

    const baseRowSchema = z.object({
      id: z.int().dbPk(),
      invoice_id: z.int64().nullable().dbFk(invoiceSchema, "id"),
    });

    const extendedSchema = baseRowSchema
      .extend({
        amount: z.float64(),
      })
      .dbTable("invoice_row");

    const tbl = derivePgTable(extendedSchema);

    expect(tbl.table).toBe("invoice_row");
    expect(tbl.columns.invoice_id.foreignKeyTable).toBe("invoice");
    expect(tbl.columns.invoice_id.foreignKeyColumn).toBe("id");
    expect(tbl.columns.amount.type).toBe("float8");
  });
});

describe("derivePgTable with .omit()", () => {
  it("omit then dbTable produces correct subset", () => {
    const fullSchema = z.object({
      id: z.int().dbPk(),
      title: z.string(),
      description: z.string().nullable(),
      created_at: z.date(),
    });

    const omittedSchema = fullSchema
      .omit({
        description: true,
        created_at: true,
      })
      .dbTable("items");

    const tbl = derivePgTable(omittedSchema);

    expect(tbl.table).toBe("items");

    // Retained fields
    expect(tbl.columns.id.type).toBe("int4");
    expect(tbl.columns.id.primaryKey).toBe(true);
    expect(tbl.columns.title.type).toBe("text");

    // Omitted fields should not exist
    expect((tbl.columns as any).description).toBeUndefined();
    expect((tbl.columns as any).created_at).toBeUndefined();
  });

  it("omitted FK field is not present in derived table", () => {
    const invoiceSchema = z
      .object({
        id: z.int64().dbPk(),
        title: z.string(),
      })
      .dbTable("invoice");

    const fullRowSchema = z.object({
      id: z.int().dbPk(),
      invoice_id: z.int64().nullable().dbFk(invoiceSchema, "id"),
      amount: z.float64(),
    });

    const omittedSchema = fullRowSchema
      .omit({ invoice_id: true })
      .dbTable("invoice_row");

    const tbl = derivePgTable(omittedSchema);

    expect(tbl.table).toBe("invoice_row");
    expect(tbl.columns.id).toBeDefined();
    expect(tbl.columns.amount).toBeDefined();
    expect((tbl.columns as any).invoice_id).toBeUndefined();
  });

  it("omit + extend round-trip works", () => {
    const fullSchema = z.object({
      id: z.int().dbPk(),
      title: z.string(),
      description: z.string().nullable(),
      created_at: z.date(),
    });

    // Omit then re-extend (simulating partial schema reuse)
    const roundTrip = fullSchema
      .omit({ description: true, created_at: true })
      .extend({
        summary: z.string().default(""),
        updated_at: z.date().nullable(),
      })
      .dbTable("items");

    const tbl = derivePgTable(roundTrip);

    expect(tbl.table).toBe("items");

    // From original
    expect(tbl.columns.id.type).toBe("int4");
    expect(tbl.columns.id.primaryKey).toBe(true);
    expect(tbl.columns.title.type).toBe("text");

    // Not present (omitted)
    expect((tbl.columns as any).description).toBeUndefined();
    expect((tbl.columns as any).created_at).toBeUndefined();

    // New from re-extend
    expect(tbl.columns.summary.type).toBe("text");
    expect(tbl.columns.summary.default).toBe("");
    expect(tbl.columns.updated_at.type).toBe("timestamptz");
    expect(tbl.columns.updated_at.nullable).toBe(true);
  });
});

describe("derivePgTable with .pick()", () => {
  it("pick then dbTable produces subset of columns", () => {
    const fullSchema = z.object({
      id: z.int().dbPk(),
      title: z.string(),
      description: z.string().nullable(),
      created_at: z.date(),
    });

    const pickedSchema = fullSchema
      .pick({ id: true, title: true })
      .dbTable("items");

    const tbl = derivePgTable(pickedSchema);

    expect(tbl.table).toBe("items");
    expect(tbl.columns.id.type).toBe("int4");
    expect(tbl.columns.id.primaryKey).toBe(true);
    expect(tbl.columns.title.type).toBe("text");

    // Omitted fields should not exist
    expect((tbl.columns as any).description).toBeUndefined();
    expect((tbl.columns as any).created_at).toBeUndefined();
  });
});
