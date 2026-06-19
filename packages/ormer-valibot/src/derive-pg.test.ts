import { describe, it, expect, expectTypeOf } from "vitest";
import * as v from "valibot";
import * as d from "./valibot-ext.ts";
import {
  pg,
  type Table,
  type ColumnType,
  type ColumnTypeSingualr,
} from "ormer";
import { derivePgColumn, derivePgTable } from "./derive-pg.ts";

describe("derivePgColumn", () => {
  it("derives a simple text column", () => {
    const column = derivePgColumn(v.string());
    expectTypeOf(column).toEqualTypeOf<ColumnTypeSingualr<"text">>();
    expect(column).toEqual(pg.text());
  });
});

describe("derivePgTable", () => {
  it("derives an invoice table with common PG column types", () => {
    const InvoiceSchema = v.pipe(
      v.object({
        id: v.pipe(v.bigint(), d.int64(), d.primaryKey(), d.autoIncrement()),
        title: v.string(),
        description: v.nullable(v.string()),
        due_date: v.pipe(v.string(), d.naiveDatetime()),
        price: v.pipe(v.number(), d.float64()),
        tax_percentage: v.pipe(v.number(), d.float64()),
        quantity: v.pipe(v.number(), d.float64()),
        is_paid: v.boolean(),
      }),
      d.table("invoice"),
    );

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

    const cols = invoiceTable.columns;
    function clean(obj: any) {
      const { columnName, tableName, ...rest } = obj;
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
