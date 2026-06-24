import { describe, it, expect, expectTypeOf } from "vitest";
import { Schema } from "effect";
import {
  sqlite,
  type Table,
  type ColumnType,
  type ColumnTypeSingualr,
} from "ormer";
import {
  Table as DbTable,
  PrimaryKey,
  AutoIncrement,
  Int32,
  Float64,
} from "./effect-ext.ts";
import { deriveSqliteColumn, deriveSqliteTable } from "./derive-sqlite.ts";

describe("deriveSqliteColumn", () => {
  it("derives a simple text column", () => {
    const column = deriveSqliteColumn(Schema.String);
    expectTypeOf(column).toEqualTypeOf<ColumnTypeSingualr<"text">>();
    expect(column).toEqual(sqlite.text());
  });

  it("derives an integer column from Int32", () => {
    const column = deriveSqliteColumn(Int32);
    expectTypeOf(column).toEqualTypeOf<ColumnTypeSingualr<"integer">>();
    expect(column).toEqual(sqlite.integer());
  });
});

describe("deriveSqliteTable", () => {
  it("derives an invoice table with common SQLite column types", () => {
    const InvoiceSchema = DbTable(
      "invoice",
      Schema.Struct({
        id: Int32.pipe(PrimaryKey(), AutoIncrement()),
        title: Schema.String,
        description: Schema.NullOr(Schema.String),
        price: Float64,
        tax_percentage: Float64,
        quantity: Float64,
      }),
    );

    const invoiceTable = deriveSqliteTable(InvoiceSchema);

    expectTypeOf<typeof invoiceTable>().toEqualTypeOf<
      Table<
        "invoice",
        {
          id: ColumnType<"integer", { primaryKey: true; autoIncrement: true }>;
          title: ColumnTypeSingualr<"text">;
          description: ColumnType<"text", { nullable: true }>;
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
    expect(clean(cols.price)).toEqual(clean(sqlite.real()));
    expect(clean(cols.tax_percentage)).toEqual(clean(sqlite.real()));
    expect(clean(cols.quantity)).toEqual(clean(sqlite.real()));
  });
});
