import { describe, it, expect, expectTypeOf } from "vitest";
import { Type, ArkErrors } from "arktype";
import { db, type Format, type FormatId } from "./arktype-ext.ts";

/** arktype brand type (from @ark/util, not re-exported by "arktype") */
type Brand<T = unknown, Id = unknown> = T | { readonly [" brand"]: [T, Id] };
type PrimaryKey = { readonly db: { readonly primaryKey: true } };
type ForeignKey<Table extends string, Column extends string> = {
  readonly db: {
    readonly foreignKeyTable: Table;
    readonly foreignKeyColumn: Column;
  };
};

/** Extracts the db metadata from a Type (the `db` property on the underlying def) */
type ExtractDb<T> =
  T extends Type<infer _A, infer _$>
    ? T extends { db: infer DB }
      ? DB
      : never
    : never;

describe("primaryKey", () => {
  it("adds PrimaryKey to the output type union", () => {
    const pk = db.primaryKey("int32");
    type Out = typeof pk.inferOut;
    expectTypeOf<Out>().toEqualTypeOf<number | Format<"int32"> | PrimaryKey>();
  });

  it("primaryKey with inline type works", () => {
    const pk = db.primaryKey(db.type("int32"));
    type Out = typeof pk.inferOut;
    expectTypeOf<Out>().toEqualTypeOf<number | Format<"int32"> | PrimaryKey>();
  });

  it("primaryKey with bigint", () => {
    const pk = db.primaryKey("int64");
    type Out = typeof pk.inferOut;
    expectTypeOf<Out>().toEqualTypeOf<bigint | Format<"int64"> | PrimaryKey>();
  });

  it("primaryKey rejects incorrect types", () => {
    try {
      // @ts-expect-error - Invalid
      db.primaryKey("foo");
    } catch (e) {
      expect(e).toBeInstanceOf(Error);
    }

    // No error
    db.primaryKey("int64");
  });

  // --- Runtime ---

  it("runtime: accepts valid primary key value", () => {
    const pk = db.primaryKey("int32");
    const result = pk(42);
    expect(result).toBe(42);
  });

  it("runtime: rejects float for integer primary key", () => {
    const pk = db.primaryKey("int32");
    const result = pk(3.14);
    expect(result instanceof ArkErrors).toBe(true);
  });

  it("runtime: rejects string for integer primary key", () => {
    const pk = db.primaryKey("int32");
    const result = pk("hello" as any);
    expect(result instanceof ArkErrors).toBe(true);
  });

  it("runtime: primaryKey with explicitly typed db.type works", () => {
    const pk = db.primaryKey(db.type("int32"));
    const result = pk(1);
    expect(result).toBe(1);
  });

  it("runtime: primaryKey db metadata is accessible", () => {
    const pk = db.primaryKey("int32");
    // The primaryKey function should carry db metadata
    expect((pk as any).db).toBeDefined();
    expect((pk as any).db.primaryKey).toBe(true);
  });
});

describe("foreignKey", () => {
  it("adds ForeignKey to the output type union", () => {
    const fk = db.foreignKey("int32", "users", "id");

    type Out = typeof fk.inferOut;
    expectTypeOf<Out>().toEqualTypeOf<
      number | Format<"int32"> | ForeignKey<"users", "id">
    >();
  });

  it("foreignKey preserves const string parameters", () => {
    const fk = db.foreignKey("int64", "orders", "user_id");

    type Out = typeof fk.inferOut;
    expectTypeOf<Out>().toEqualTypeOf<
      bigint | Format<"int64"> | ForeignKey<"orders", "user_id">
    >();
  });

  it("foreignKey with inline db.type def works", () => {
    const fk = db.foreignKey(db.type("int32"), "products", "sku");

    type Out = typeof fk.inferOut;
    expectTypeOf<Out>().toEqualTypeOf<
      number | Format<"int32"> | ForeignKey<"products", "sku">
    >();
  });

  it("foreignKey rejects incorrect types", () => {
    try {
      // @ts-expect-error - Invalid type
      db.foreignKey("foo", "users", "id");
    } catch (e) {
      expect(e).toBeInstanceOf(Error);
    }

    // @ts-expect-error - Table name must be const
    db.foreignKey("int32", "users" as string, "id");

    // @ts-expect-error - Column name must be const
    db.foreignKey("int32", "users", "id" as string);

    // No error
    db.foreignKey("int64", "orders", "user_id");
  });

  it("runtime: accepts valid foreign key value", () => {
    const fk = db.foreignKey("int32", "users", "id");
    const result = fk(42);
    expect(result).toBe(42);
  });

  it("runtime: rejects invalid foreign key value", () => {
    const fk = db.foreignKey("int32", "users", "id");
    const result = fk("hello" as any);
    expect(result instanceof ArkErrors).toBe(true);
  });

  it("runtime: foreignKey db metadata is accessible", () => {
    const fk = db.foreignKey("int32", "users", "id");
    expect((fk as any).db).toBeDefined();
    expect((fk as any).db.foreignKeyTable).toBe("users");
    expect((fk as any).db.foreignKeyColumn).toBe("id");
  });
});

describe("foreignKeyRef", () => {
  it("infers table name and column from the referenced table type", () => {
    const InvoiceTable = db.table("invoices", {
      id: db.primaryKey("int32"),
      title: "string",
    });

    const invoiceId = db.foreignKeyRef(InvoiceTable, "id");

    type Out = typeof invoiceId.inferOut;
    expectTypeOf<Out>().toEqualTypeOf<
      number | Format<"int32"> | ForeignKey<"invoices", "id">
    >();
  });

  it("foreignKeyRef excludes PrimaryKey from the referenced column type", () => {
    const InvoiceTable = db.table("invoices", {
      id: db.primaryKey("int32"),
      title: "string",
    });

    const invoiceId = db.foreignKeyRef(InvoiceTable, "id");

    type Out = typeof invoiceId.inferOut;
    expectTypeOf<Out>().toEqualTypeOf<
      number | Format<"int32"> | ForeignKey<"invoices", "id">
    >();
  });

  it("foreignKeyRef with bigint column", () => {
    const BigintTable = db.table("bigints", {
      id: db.primaryKey("int64"),
    });

    const fk = db.foreignKeyRef(BigintTable, "id");

    type Out = typeof fk.inferOut;
    expectTypeOf<Out>().toEqualTypeOf<
      bigint | Format<"int64"> | ForeignKey<"bigints", "id">
    >();
  });

  it("runtime: accepts valid foreign key value", () => {
    const InvoiceTable = db.table("invoices", {
      id: db.primaryKey("int32"),
      title: "string",
    });
    const invoiceId = db.foreignKeyRef(InvoiceTable, "id");
    const result = invoiceId(42);
    expect(result).toBe(42);
  });

  it("runtime: rejects invalid foreign key value", () => {
    const InvoiceTable = db.table("invoices", {
      id: db.primaryKey("int32"),
      title: "string",
    });
    const invoiceId = db.foreignKeyRef(InvoiceTable, "id");
    const result = invoiceId("hello" as any);
    expect(result instanceof ArkErrors).toBe(true);
  });

  it("runtime: foreignKeyRef db metadata is accessible", () => {
    const InvoiceTable = db.table("invoices", {
      id: db.primaryKey("int32"),
      title: "string",
    });
    const invoiceId = db.foreignKeyRef(InvoiceTable, "id");
    expect((invoiceId as any).db.foreignKeyTable).toBe("invoices");
    expect((invoiceId as any).db.foreignKeyColumn).toBe("id");
  });

  it("runtime: foreignKeyRef links to correct table name", () => {
    const OrdersTable = db.table("orders", {
      order_id: db.primaryKey("int64"),
    });
    const fk = db.foreignKeyRef(OrdersTable, "order_id");
    expect((fk as any).db.foreignKeyTable).toBe("orders");
    expect((fk as any).db.foreignKeyColumn).toBe("order_id");
  });
});

describe("table", () => {
  it("adds TableName to the result type", () => {
    const UserTable = db.table("users", {
      id: db.primaryKey("int32"),
      name: "string",
    });

    expectTypeOf<
      (typeof UserTable)["db"]["tableName"]
    >().toEqualTypeOf<"users">();
  });

  it("table name is preserved as const literal", () => {
    const t = db.table("products", { sku: "string" });

    type TableName = ExtractDb<typeof t>;
    expectTypeOf<TableName>().toEqualTypeOf<{
      readonly tableName: "products";
    }>();
  });

  it("table with multiple columns and different types", () => {
    const t = db.table("events", {
      id: db.primaryKey("int64"),
      name: "string",
      "count?": "int32",
      active: "boolean",
      created_at: "Date",
    });

    type TableName = ExtractDb<typeof t>;
    expectTypeOf<TableName>().toEqualTypeOf<{ readonly tableName: "events" }>();

    // Type-check the inferred output
    type Out = typeof t.inferOut;
    type OutId = Out["id"];
    type OutName = Out["name"];
    type OutActive = Out["active"];
    type OutCreatedAt = Out["created_at"];

    expectTypeOf<OutId>().toEqualTypeOf<
      bigint | Format<"int64"> | PrimaryKey
    >();
    expectTypeOf<OutName>().toEqualTypeOf<string>();
    expectTypeOf<OutActive>().toEqualTypeOf<boolean>();
    expectTypeOf<OutCreatedAt>().toEqualTypeOf<Date>();
  });

  it("table with foreign keys and foreignKeyRef composing", () => {
    const InvoiceTable = db.table("invoices", {
      id: db.primaryKey("int32"),
      title: "string",
    });

    const InvoiceRow = db.table("invoice_rows", {
      id: db.primaryKey("int32"),
      invoiceId: db.foreignKeyRef(InvoiceTable, "id"),
      description: "string",
    });

    type Out = typeof InvoiceRow.inferOut;
    expectTypeOf<Out>().toEqualTypeOf<{
      id: number | Format<"int32"> | PrimaryKey;
      invoiceId: number | Format<"int32"> | ForeignKey<"invoices", "id">;
      description: string;
    }>();

    // invoiceRow db.tableName should be "invoice_rows"
    type RowTableName = ExtractDb<typeof InvoiceRow>;
    expectTypeOf<RowTableName>().toEqualTypeOf<{
      readonly tableName: "invoice_rows";
    }>();
  });

  it("table rejects invalid table name", () => {
    // @ts-expect-error - Table name must be const string literal
    db.table("products" as string, { sku: "string" });

    // No error
    db.table("products", { sku: "string" });

    expectTypeOf<true>().toEqualTypeOf(true);
  });

  it("runtime: table accepts valid data", () => {
    const UserTable = db.table("users", {
      id: db.primaryKey("int32"),
      name: "string",
    });

    const result = UserTable({ id: 1, name: "Alice" });
    expect(result).toEqual({ id: 1, name: "Alice" });
  });

  it("runtime: table rejects invalid data", () => {
    const UserTable = db.table("users", {
      id: db.primaryKey("int32"),
      name: "string",
    });

    const result1 = UserTable({ id: "not-a-number" as any, name: "Alice" });
    expect(result1 instanceof ArkErrors).toBe(true);

    const result2 = UserTable({ id: 1, name: 123 as any });
    expect(result2 instanceof ArkErrors).toBe(true);
  });

  it("runtime: table db metadata is accessible", () => {
    const UserTable = db.table("users", {
      id: db.primaryKey("int32"),
      name: "string",
    });

    expect((UserTable as any).db.tableName).toBe("users");
  });

  it("runtime: table name is preserved in metadata", () => {
    const t = db.table("products", { sku: "string" });
    expect((t as any).db.tableName).toBe("products");
  });

  it("runtime: table with optional fields", () => {
    const t = db.table("items", {
      id: db.primaryKey("int32"),
      "name?": "string",
      "quantity?": "int32",
    });

    // With optional fields provided
    expect(t({ id: 1, name: "Widget", quantity: 5 })).toEqual({
      id: 1,
      name: "Widget",
      quantity: 5,
    });

    // Without optional fields
    expect(t({ id: 2 })).toEqual({ id: 2 });
  });

  it("runtime: table with foreign keys validates correctly", () => {
    const InvoiceTable = db.table("invoices", {
      id: db.primaryKey("int32"),
      title: "string",
    });

    const InvoiceRow = db.table("invoice_rows", {
      id: db.primaryKey("int32"),
      invoiceId: db.foreignKeyRef(InvoiceTable, "id"),
      description: "string",
    });

    expect(
      InvoiceRow({ id: 1, invoiceId: 42, description: "Line item 1" }),
    ).toEqual({ id: 1, invoiceId: 42, description: "Line item 1" });

    const badResult = InvoiceRow({
      id: 1,
      invoiceId: "nope" as any,
      description: "Bad",
    });
    expect(badResult instanceof ArkErrors).toBe(true);
  });
});

describe("composition", () => {
  it("full schema: table with primary key, foreign keys, and mixed types", () => {
    const UsersTable = db.table("users", {
      id: db.primaryKey("int64"),
      name: "string",
      email: "string.email",
      "age?": "int32",
    });

    const PostsTable = db.table("posts", {
      id: db.primaryKey("int64"),
      authorId: db.foreignKeyRef(UsersTable, "id"),
      title: "string",
      body: "string",
      published: "boolean",
    });

    // Runtime validation
    expect(
      UsersTable({
        id: 1n,
        name: "Alice",
        email: "alice@example.com",
        age: 30,
      }),
    ).toEqual({ id: 1n, name: "Alice", email: "alice@example.com", age: 30 });

    expect(
      PostsTable({
        id: 100n,
        authorId: 1n,
        title: "Hello World",
        body: "This is my first post",
        published: true,
      }),
    ).toEqual({
      id: 100n,
      authorId: 1n,
      title: "Hello World",
      body: "This is my first post",
      published: true,
    });

    // Type-level: verify metadata
    type UsersTableName = ExtractDb<typeof UsersTable>;
    expectTypeOf<UsersTableName>().toEqualTypeOf<{
      readonly tableName: "users";
    }>();

    type PostsTableName = ExtractDb<typeof PostsTable>;
    expectTypeOf<PostsTableName>().toEqualTypeOf<{
      readonly tableName: "posts";
    }>();
  });

  it("type-level: all db helper functions compose correctly", () => {
    // primaryKey
    const pk = db.primaryKey("int32");
    type PkType = typeof pk;
    expectTypeOf<typeof pk.inferOut>().toEqualTypeOf<
      number | Format<"int32"> | PrimaryKey
    >();

    // foreignKey
    const fk = db.foreignKey("int32", "users", "id");
    type FkType = typeof fk;
    expectTypeOf<typeof fk.inferOut>().toEqualTypeOf<
      number | Format<"int32"> | ForeignKey<"users", "id">
    >();

    // table
    const t = db.table("users", { id: db.primaryKey("int32"), name: "string" });
    type TableType = typeof t;
    type Out = typeof t.inferOut;
    expectTypeOf<Out>().toEqualTypeOf<{
      id: number | Format<"int32"> | PrimaryKey;
      name: string;
    }>();
  });
});
