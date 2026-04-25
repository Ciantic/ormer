import * as h from "../src/columnhelpers.ts";
import * as c from "../src/columns.ts";
import { database } from "../src/database.ts";
import { table } from "../src/table.ts";

const invoiceTable = table("invoice", {
  id: h.pkAutoInc(),
  title: c.string(),
  description: c.string({
    nullable: true,
  }),
  due_date: c.datetime({
    default: "now",
  }),
  rowversion: h.rowversion(),
  concurrencyStamp: h.concurrencyStamp(),
  created_at: h.createdAt(),
  updated_at: h.updatedAt(),
});

const invoiceRowTable = table("invoice_row", {
  id: h.pkAutoInc(),
  title: c.string(),
  price: c.float64(),
  tax_percentage: c.float64(),
  quantity: c.float64(),
  invoice_id: c.foreignKey(invoiceTable, "id"),
  concurrencyStamp: h.concurrencyStamp(),
});

const personTable = table("person", {
  id: h.pkAutoInc(),
  first_name: c.string(),
  last_name: c.string({
    nullable: true,
  }),
  email: h.email(),
  // Self referencing foreign key, requires untyped
  get supervisor_id() {
    return c.foreignKey(personTable, "id");
  },
  created_at: h.createdAt(),
  updated_at: h.updatedAt(),
});

const exampleDb = database({}, invoiceTable, invoiceRowTable, personTable);

type Foo = { foo: string } & {};
