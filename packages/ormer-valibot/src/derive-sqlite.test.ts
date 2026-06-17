import { describe, it, expect, expectTypeOf } from "vitest";
import * as v from "valibot";
import * as d from "./valibot-ext.ts";
import {
  sqlite,
  type Table,
  type ColumnTypeSingualr,
  type ColumnType,
} from "ormer";
import { deriveSqliteColumn, deriveSqliteTable } from "./derive-sqlite.ts";

describe("deriveSqliteColumn", () => {
  it("derives a simple text column", () => {
    const column = deriveSqliteColumn(v.string());
    expectTypeOf(column).toEqualTypeOf<ColumnTypeSingualr<"text">>();
    expect(column).toEqual(sqlite.text());
  });
});

describe("deriveSqliteTable", () => {
  it("derives an invoice table with SQLite-compatible column types", () => {
    const InvoiceSchema = v.pipe(
      v.object({
        id: v.pipe(v.number(), d.int32(), d.dbPrimaryKey()),
        title: v.string(),
        description: v.nullable(v.string()),
        due_date: v.pipe(v.string(), d.naiveDatetime()),
        price: v.pipe(v.number(), d.float64()),
        tax_percentage: v.pipe(v.number(), d.float64()),
        quantity: v.pipe(v.number(), d.float64()),
      }),
      d.dbTable("invoice"),
    );

    const invoiceTable = deriveSqliteTable(InvoiceSchema);

    expectTypeOf<typeof invoiceTable>().toEqualTypeOf<
      Table<
        "invoice",
        {
          id: ColumnType<
            "integer",
            {
              primaryKey: true;
              autoIncrement: true;
            }
          >;
          title: ColumnTypeSingualr<"text">;
          description: ColumnType<
            "text",
            {
              nullable: true;
            }
          >;
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
