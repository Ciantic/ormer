import { describe, it, expect, expectTypeOf } from "vitest";
import { type } from "arktype";
import {
  pg,
  type Table,
  type ColumnType,
  type ColumnTypeSingualr,
} from "ormer";
import { db } from "./arktype-ext.ts";
import { derivePgColumn, derivePgTable } from "./derive-pg.ts";

describe("derivePgColumn", () => {
  // This is just sanity test, most of the fields are covered in fields-pg.test.ts
  it("derives a simple text column", () => {
    const column = derivePgColumn(type("string"));
    expectTypeOf(column).toEqualTypeOf<ColumnTypeSingualr<"text">>();
    expect(column).toEqual(pg.text());
  });
});

describe("derivePgTable", () => {
  it("derives an invoice table with common PG column types", () => {
    const InvoiceSchema = db.table("invoice", {
      id: db.primaryKey("int64"),
      title: type("string"),
      description: type("string | null"),
      due_date: db.type("naivedatetime"),
      price: db.type("float64"),
      tax_percentage: db.type("float64"),
      quantity: db.type("float64"),
      is_paid: type("boolean"),
    });

    const invoiceTable = derivePgTable(InvoiceSchema);

    expectTypeOf<typeof invoiceTable>().toEqualTypeOf<
      Table<
        "invoice",
        {
          id: ColumnType<"int8", { primaryKey: true; autoIncrement: true }>;
          title: ColumnTypeSingualr<"text">;
          description: ColumnType<"text", { nullable: true }>;
          due_date: ColumnTypeSingualr<"timestamp">;
          price: ColumnTypeSingualr<"float8">;
          tax_percentage: ColumnTypeSingualr<"float8">;
          quantity: ColumnTypeSingualr<"float8">;
          is_paid: ColumnTypeSingualr<"boolean">;
        }
      >
    >();

    expect(invoiceTable.table).toBe("invoice");

    // strip internal derive fields and compare
    const cols = invoiceTable.columns;
    function clean(obj: any) {
      const { dbformat, columnName, tableName, ...rest } = obj;
      return rest;
    }

    expect(clean(cols.id)).toEqual(
      clean(pg.int8({ primaryKey: true, autoIncrement: true })),
    );
    expect(clean(cols.title)).toEqual(clean(pg.text()));
    expect(clean(cols.description)).toEqual(clean(pg.text({ nullable: true })));
    expect(clean(cols.due_date)).toEqual(clean(pg.timestamp()));
    expect(clean(cols.price)).toEqual(clean(pg.float8()));
    expect(clean(cols.tax_percentage)).toEqual(clean(pg.float8()));
    expect(clean(cols.quantity)).toEqual(clean(pg.float8()));
    expect(clean(cols.is_paid)).toEqual(clean(pg.boolean()));
  });
});
