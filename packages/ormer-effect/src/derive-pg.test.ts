import { describe, it, expect, expectTypeOf } from "vitest";
import { Schema } from "effect";
import {
  pg,
  type Table,
  type ColumnType,
  type ColumnTypeSingualr,
} from "ormer";
import {
  Table as DbTable,
  PrimaryKey,
  AutoIncrement,
  Int64,
  NaiveDatetime,
  Float64,
} from "./effect-ext.ts";
import { derivePgColumn, derivePgTable } from "./derive-pg.ts";

describe("derivePgColumn", () => {
  // This is just a sanity test — most of the fields are covered in tests/fields-pg.test.ts
  it("derives a simple text column", () => {
    const column = derivePgColumn(Schema.String);
    expectTypeOf(column).toEqualTypeOf<ColumnTypeSingualr<"text">>();
    expect(column).toEqual(pg.text());
  });
});

describe("derivePgTable", () => {
  it("derives an invoice table with common PG column types", () => {
    const InvoiceSchema = DbTable(
      "invoice",
      Schema.Struct({
        id: Int64.pipe(PrimaryKey(), AutoIncrement()),
        title: Schema.String,
        description: Schema.NullOr(Schema.String),
        due_date: NaiveDatetime,
        price: Float64,
        tax_percentage: Float64,
        quantity: Float64,
        is_paid: Schema.Boolean,
      }),
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

    // strip internal derive fields and compare
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
