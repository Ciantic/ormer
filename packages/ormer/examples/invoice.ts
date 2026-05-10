import * as o from "ormer";
import * as k from "kysely";
import { PGlite } from "@electric-sql/pglite";
import { assert } from "vitest";
import process from "node:process";

const invoiceTable = o.table("invoice", {
  id: o.pkAutoInc(),
  title: o.string(),
  description: o.string({
    nullable: true,
  }),
  due_date: o.datetime({
    default: "now",
  }),
  rowversion: o.rowversion(),
  concurrencyStamp: o.concurrencyStamp(),
  created_at: o.createdAt(),
  updated_at: o.updatedAt(),
  get rows() {
    return o.navigationMany(invoiceRowTable, "invoice_id");
  },
});

const invoiceRowTable = o.table("invoice_row", {
  id: o.pkAutoInc(),
  title: o.string(),
  price: o.float64(),
  tax_percentage: o.float64(),
  quantity: o.float64(),
  invoice_id: o.foreignKey(invoiceTable, "id", {
    onDeleteSetNull: true,
  }),
  get invoice() {
    return o.navigationOne(invoiceRowTable, "invoice_id");
  },
  concurrencyStamp: o.concurrencyStamp(),
});

const personTable = o.table("person", {
  id: o.pkAutoInc(),
  first_name: o.string(),
  last_name: o.string({
    nullable: true,
  }),
  email: o.email(),
  // Self referencing foreign key, requires untyped
  get supervisor_id() {
    return o.foreignKey(personTable, "id");
  },
  created_at: o.createdAt(),
  updated_at: o.updatedAt(),
});

const exampleDb = o.database({}, invoiceTable, invoiceRowTable, personTable);

const pglite = new PGlite();
const db = new k.Kysely<KyselyType>({
  dialect: new k.PGliteDialect({
    pglite,
  }),
});
const schema = o.createTableSql(
  o.COMMON_TO_POSTGRES,
  exampleDb,
  o.POSTGRES_OPTS,
);
await pglite.exec(schema);
console.log("Schema created", schema);

type KyselyType = o.InferKyselyTypes<typeof exampleDb>;

// Insert example data
await db
  .insertInto("invoice")
  .values({
    title: "Test Invoice",
    description: "This is a test invoice",
  })
  .execute();

const results = await db
  .selectFrom("invoice")
  .where("id", "=", 1n)
  .selectAll()
  .execute();

console.log(results);

process.exit(0);
