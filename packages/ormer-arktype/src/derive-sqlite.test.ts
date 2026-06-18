import { describe, it, expect, expectTypeOf } from "vitest";
import { type } from "arktype";
import {
  sqlite,
  type Table,
  type ColumnType,
  type ColumnTypeSingualr,
} from "ormer";
import { db } from "./arktype-ext.ts";
import { deriveSqliteColumn, deriveSqliteTable } from "./derive-sqlite.ts";

describe("deriveSqliteColumn", () => {
  it("derives a simple text column", () => {
    const column = deriveSqliteColumn(type("string"));
    expectTypeOf(column).toEqualTypeOf<ColumnTypeSingualr<"text">>();
    expect(column).toEqual(sqlite.text());
  });
});

describe("deriveSqliteTable", () => {
  it("derives an invoice table with SQLite-compatible column types", () => {
    const InvoiceSchema = db.table("invoice", {
      id: db.primaryKey("int32"),
      title: type("string"),
      description: type("string | null"),
      due_date: db.type("naivedatetime"),
      price: db.type("float64"),
      tax_percentage: db.type("float64"),
      quantity: db.type("float64"),
    });

    const invoiceTable = deriveSqliteTable(InvoiceSchema);

    expectTypeOf<typeof invoiceTable>().toEqualTypeOf<
      Table<
        "invoice",
        {
          id: ColumnType<"integer", { primaryKey: true; autoIncrement: true }>;
          title: ColumnTypeSingualr<"text">;
          description: ColumnType<"text", { nullable: true }>;
          due_date: ColumnTypeSingualr<"text">;
          price: ColumnTypeSingualr<"real">;
          tax_percentage: ColumnTypeSingualr<"real">;
          quantity: ColumnTypeSingualr<"real">;
        }
      >
    >();

    expect(invoiceTable.table).toBe("invoice");

    const cols = invoiceTable.columns;
    function clean(obj: any) {
      const { columnName, tableName, ...rest } = obj;
      return rest;
    }

    expect(clean(cols.id)).toEqual(
      clean(sqlite.integer({ primaryKey: true, autoIncrement: true })),
    );
    expect(clean(cols.title)).toEqual(clean(sqlite.text()));
    expect(clean(cols.description)).toEqual(
      clean(sqlite.text({ nullable: true })),
    );
    expect(clean(cols.due_date)).toEqual(clean(sqlite.text()));
    expect(clean(cols.price)).toEqual(clean(sqlite.real()));
    expect(clean(cols.tax_percentage)).toEqual(clean(sqlite.real()));
    expect(clean(cols.quantity)).toEqual(clean(sqlite.real()));
  });
});
