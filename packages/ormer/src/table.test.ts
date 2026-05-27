import { describe, it, expect } from "vitest";
import { table, type Table } from "./table.ts";
import * as pg from "./postgres/columns.ts";

type Expect<T extends true> = T;
type Equal<X, Y> =
  (<T>() => T extends X ? 1 : 2) extends <T>() => T extends Y ? 1 : 2
    ? true
    : false;

describe("table", () => {
  it("Test inference", () => {
    const invoiceTable = table("invoice", {
      id: pg.serial8({
        primaryKey: true,
        notInsertable: true,
        notUpdatable: true,
      }),
      title: pg.text(),
      description: pg.text({
        nullable: true,
      }),
      due_date: pg.timestamptz({
        default: "now",
      }),
      foo: pg.timestamptz(),
    });

    true satisfies Expect<
      Equal<
        (typeof invoiceTable.columns)["id"],
        pg.ColumnType<
          "serial8",
          {
            primaryKey: true;
            notInsertable: true;
            notUpdatable: true;
          }
        >
      >
    >;

    true satisfies Expect<
      Equal<
        (typeof invoiceTable.columns)["title"],
        pg.ColumnTypeSingualr<"text">
      >
    >;

    true satisfies Expect<
      Equal<
        (typeof invoiceTable.columns)["description"],
        pg.ColumnType<"text", { nullable: true }>
      >
    >;
    true satisfies Expect<
      Equal<
        (typeof invoiceTable.columns)["due_date"],
        pg.ColumnType<"timestamptz", { default: "now" }>
      >
    >;

    true satisfies Expect<
      Equal<
        (typeof invoiceTable.columns)["foo"],
        pg.ColumnTypeSingualr<"timestamptz">
      >
    >;

    expect(true).toBe(true);
  });

  it("Test invoice and invoice row", () => {
    const invoiceTable = table("invoice", {
      id: pg.serial8({
        primaryKey: true,
        notInsertable: true,
        notUpdatable: true,
      }),
      title: pg.text(),
      description: pg.text(),
      due_date: pg.timestamptz(),
    });

    const invoiceRowTable = table("invoice_row", {
      id: pg.serial8({
        primaryKey: true,
        notInsertable: true,
        notUpdatable: true,
      }),
      title: pg.text(),
      price: pg.float8(),
      taxPercentage: pg.float8(),
      quantity: pg.int4(),
      invoiceId: pg.foreignKey(invoiceTable, "id"),
    });

    true satisfies Expect<
      Equal<
        typeof invoiceTable,
        Table<
          "invoice",
          {
            id: pg.ColumnType<
              "serial8",
              {
                primaryKey: true;
                notInsertable: true;
                notUpdatable: true;
              }
            >;
            title: pg.ColumnTypeSingualr<"text">;
            description: pg.ColumnTypeSingualr<"text">;
            due_date: pg.ColumnTypeSingualr<"timestamptz">;
          }
        >
      >
    >;

    true satisfies Expect<
      Equal<
        typeof invoiceRowTable,
        Table<
          "invoice_row",
          {
            id: pg.ColumnType<
              "serial8",
              {
                primaryKey: true;
                notInsertable: true;
                notUpdatable: true;
              }
            >;
            title: pg.ColumnTypeSingualr<"text">;
            price: pg.ColumnTypeSingualr<"float8">;
            taxPercentage: pg.ColumnTypeSingualr<"float8">;
            quantity: pg.ColumnTypeSingualr<"int4">;
            invoiceId: pg.ColumnType<
              "serial8",
              {
                foreignKeyTable: "invoice";
                foreignKeyColumn: "id";
              }
            >;
          }
        >
      >
    >;
  });

  it("Test self referencing table", () => {
    const personTable = table("person", {
      id: pg.serial8({
        primaryKey: true,
        notInsertable: true,
        notUpdatable: true,
      }),
      firstName: pg.text(),
      lastName: pg.text(),
      email: pg.text(),
      get supervisorId() {
        return pg.foreignKey(personTable, "id");
      },
    });

    true satisfies Expect<
      Equal<
        typeof personTable,
        Table<
          "person",
          {
            id: pg.ColumnType<
              "serial8",
              {
                primaryKey: true;
                notInsertable: true;
                notUpdatable: true;
              }
            >;
            firstName: pg.ColumnTypeSingualr<"text">;
            lastName: pg.ColumnTypeSingualr<"text">;
            email: pg.ColumnTypeSingualr<"text">;
            readonly supervisorId: pg.ColumnType<
              "serial8",
              {
                foreignKeyTable: "person";
                foreignKeyColumn: "id";
              }
            >;
          }
        >
      >
    >;
  });
});
