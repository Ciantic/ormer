import { describe, it, expect } from "vitest";
import { table, type Table } from "./table.ts";
import * as c from "./columns.ts";
import * as h from "./columnhelpers.ts";

type Expect<T extends true> = T;
type Equal<X, Y> =
  (<T>() => T extends X ? 1 : 2) extends <T>() => T extends Y ? 1 : 2
    ? true
    : false;

describe("table", () => {
  it("Test inference", () => {
    const invoiceTable = table("invoice", {
      id: h.pkAutoInc(),
      title: c.string(),
      description: c.string({
        nullable: true,
      }),
      due_date: c.datetime({
        default: "now",
      }),
      foo: c.datetime(),
      rowversion: h.rowversion(),
    });

    true satisfies Expect<
      Equal<
        (typeof invoiceTable.columns)["id"],
        c.ColumnType<
          "int64",
          {
            autoIncrement: true;
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
        c.ColumnTypeSingualr<"string">
      >
    >;

    true satisfies Expect<
      Equal<
        (typeof invoiceTable.columns)["description"],
        c.ColumnType<"string", { nullable: true }>
      >
    >;
    true satisfies Expect<
      Equal<
        (typeof invoiceTable.columns)["due_date"],
        c.ColumnType<"datetime", { default: "now" }>
      >
    >;

    true satisfies Expect<
      Equal<
        (typeof invoiceTable.columns)["foo"],
        c.ColumnTypeSingualr<"datetime">
      >
    >;
    true satisfies Expect<
      Equal<
        (typeof invoiceTable.columns)["rowversion"],
        c.ColumnType<
          "int64",
          {
            rowversion: true;
            notInsertable: true;
            notUpdatable: true;
            updateKey: true;
            default: 1;
          }
        >
      >
    >;

    expect(true).toBe(true);
  });

  it("Test invoice and invoice row", () => {
    const invoiceTable = table("invoice", {
      id: h.pkAutoInc(),
      title: c.string(),
      description: c.string(),
      due_date: c.datetime(),
      rowversion: h.rowversion(),
    });

    const invoiceRowTable = table("invoice_row", {
      id: h.pkAutoInc(),
      title: c.string(),
      price: c.float64(),
      taxPercentage: c.float64(),
      quantity: c.int32(),
      invoiceId: c.foreignKey(invoiceTable, "id"),
    });

    true satisfies Expect<
      Equal<
        typeof invoiceTable,
        Table<
          "invoice",
          {
            id: c.ColumnType<
              "int64",
              {
                autoIncrement: true;
                primaryKey: true;
                notInsertable: true;
                notUpdatable: true;
              }
            >;
            title: c.ColumnTypeSingualr<"string">;
            description: c.ColumnTypeSingualr<"string">;
            due_date: c.ColumnTypeSingualr<"datetime">;
            rowversion: c.ColumnType<
              "int64",
              {
                rowversion: true;
                notInsertable: true;
                notUpdatable: true;
                updateKey: true;
                default: 1;
              }
            >;
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
            id: c.ColumnType<
              "int64",
              {
                autoIncrement: true;
                primaryKey: true;
                notInsertable: true;
                notUpdatable: true;
              }
            >;
            title: c.ColumnTypeSingualr<"string">;
            price: c.ColumnTypeSingualr<"float64">;
            taxPercentage: c.ColumnTypeSingualr<"float64">;
            quantity: c.ColumnTypeSingualr<"int32">;
            invoiceId: c.ColumnType<
              "int64",
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
      id: h.pkAutoInc(),
      firstName: c.string(),
      lastName: c.string(),
      email: c.string(),
      get supervisorId() {
        return c.foreignKey(personTable, "id");
      },
    });

    true satisfies Expect<
      Equal<
        typeof personTable,
        Table<
          "person",
          {
            id: c.ColumnType<
              "int64",
              {
                autoIncrement: true;
                primaryKey: true;
                notInsertable: true;
                notUpdatable: true;
              }
            >;
            firstName: c.ColumnTypeSingualr<"string">;
            lastName: c.ColumnTypeSingualr<"string">;
            email: c.ColumnTypeSingualr<"string">;
            readonly supervisorId: c.ColumnType<
              "int64",
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
