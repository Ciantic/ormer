import {
  pg,
  table,
  database,
  navigationOne,
  navigationMany,
  createTableSql,
  type InferKyselyTypes,
  PGCOLUMN_TO_SQLTYPE,
  POSTGRES_OPTS,
} from "ormer";
import * as k from "kysely";
import { PGlite } from "@electric-sql/pglite";
import process from "node:process";

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
  get rows() {
    return navigationMany(invoiceRowTable, "invoice_id");
  },
});

const invoiceRowTable = table("invoice_row", {
  id: pg.serial8({
    primaryKey: true,
    notInsertable: true,
    notUpdatable: true,
  }),
  title: pg.text(),
  price: pg.float8(),
  tax_percentage: pg.float8(),
  quantity: pg.float8(),
  invoice_id: pg.foreignKey(invoiceTable, "id", {
    nullable: true,
  }),
  invoice: navigationOne(invoiceTable, "id"),
});

const personTable = table("person", {
  id: pg.serial8({
    primaryKey: true,
    notInsertable: true,
    notUpdatable: true,
  }),
  first_name: pg.text(),
  last_name: pg.text({
    nullable: true,
  }),
  email: pg.text(),
  // Self referencing foreign key, requires getter
  get supervisor_id() {
    return pg.foreignKey(personTable, "id");
  },
  get supervisor() {
    return navigationOne(personTable, "supervisor_id");
  },
  get subordinates() {
    return navigationMany(personTable, "supervisor_id");
  },
});

const exampleDb = database({}, invoiceTable, invoiceRowTable, personTable);

const pglite = new PGlite();
const schema = createTableSql(PGCOLUMN_TO_SQLTYPE, exampleDb, POSTGRES_OPTS);
await pglite.exec(schema);
console.log("Schema created", schema);

// type KyselyType = InferKyselyTypes<typeof exampleDb>;

// const db = new k.Kysely<KyselyType>({
//   dialect: new k.PGliteDialect({
//     pglite,
//   }),
// });

// // Insert example data
// await db
//   .insertInto("invoice")
//   .values({
//     title: "Test Invoice",
//     description: "This is a test invoice",
//   })
//   .execute();

// const results = await db
//   .selectFrom("invoice")
//   .where("id", "=", 1n)
//   .selectAll()
//   .execute();

// console.log(results);

// process.exit(0);
