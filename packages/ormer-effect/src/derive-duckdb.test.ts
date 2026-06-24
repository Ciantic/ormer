import { describe, it, expect, expectTypeOf } from "vitest";
import { Schema } from "effect";
import {
  duckdb,
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
import { deriveDuckDbColumn, deriveDuckDbTable } from "./derive-duckdb.ts";

describe("deriveDuckDbColumn", () => {
  it("derives a simple text column", () => {
    const column = deriveDuckDbColumn(Schema.String);
    expectTypeOf(column).toEqualTypeOf<ColumnTypeSingualr<"text">>();
    expect(column).toEqual(duckdb.text());
  });
});

describe("deriveDuckDbTable", () => {
  it("derives an invoice table with common DuckDB column types", () => {
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

    const invoiceTable = deriveDuckDbTable(InvoiceSchema);

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
      clean(duckdb.int8({ primaryKey: true, autoIncrement: true })),
    );
    expect(clean(cols.title)).toEqual(clean(duckdb.text()));
    expect(clean(cols.description)).toEqual(
      clean(duckdb.text({ nullable: true })),
    );
    expect(clean(cols.due_date)).toEqual(clean(duckdb.timestamp()));
    expect(clean(cols.price)).toEqual(clean(duckdb.float8()));
    expect(clean(cols.tax_percentage)).toEqual(clean(duckdb.float8()));
    expect(clean(cols.quantity)).toEqual(clean(duckdb.float8()));
    expect(clean(cols.is_paid)).toEqual(clean(duckdb.boolean()));
  });
});
