// Execute directly with node:
// node ./invoice-zod.ts

import {
  database,
  createTableSql,
  PGCOLUMN_TO_SQLTYPE,
  POSTGRES_OPTS,
  type InferKyselyTypes,
} from "ormer";
import { createPgliteParsers, type PgUnifiedTypeMapping } from "ormer";
import { derivePgTable } from "../src/index.ts";
import { z } from "zod";
import * as k from "kysely";
import { PGlite } from "@electric-sql/pglite";

const InvoiceSchema = z
  .object({
    id: z.int64().brand("InvoiceId").dbPk().dbAutoInc(),
    title: z.string(),
    description: z.string().nullable(),
    due_date: z.string(),
    rowversion: z.number(),
    concurrencyStamp: z.string(),
    created_at: z.date(),
    updated_at: z.date(),
    get rows() {
      return z.array(InvoiceRowSchema).dbNavigate(InvoiceRowSchema, "id");
    },
  })
  .dbTable("invoice");

const InvoiceRowSchema = z
  .object({
    id: z.int64().brand("InvoiceRowId").dbPk().dbAutoInc(),
    title: z.string(),
    price: z.number(),
    tax_percentage: z.number(),
    quantity: z.number(),
    invoice_id: z
      .int64()
      .brand("InvoiceId")
      .nullable()
      .dbFk(InvoiceSchema, "id"),
    concurrencyStamp: z.string(),
    get invoice() {
      return InvoiceSchema.dbNavigate(InvoiceRowSchema, "invoice_id");
    },
  })
  .dbTable("invoice_rows");

// declare var superjson: any;
// fetch("https://example.com/api/query", {
//   body: superjson.stringify({
//     organizationId: "1df408da-9f5f-40aa-8e0d-eec4921efc2c",
//     pagination: {
//       startAt: new Date(),
//       count: 120,
//     },

//     // This would allow fully typed output, with shared schemas
//     results: InvoiceSchema.pick({
//       id: true,
//       title: true,
//       updated_at: true,
//     }).extend({
//       rows: InvoiceRowSchema.pick({
//         id: true,
//         title: true,
//         price: true,
//       }).array(),
//     }),
//   }),
// });

const PersonSchema = z
  .object({
    id: z.int64().brand("PersonId").dbPk().dbAutoInc(),
    first_name: z.string(),
    last_name: z.string().nullable(),
    email: z.email(),
    get supervisor_id() {
      return z.int64().brand("PersonId").nullable().dbFk(PersonSchema, "id");
    },
    get supervisor() {
      return PersonSchema.dbNavigateSelf("id");
    },
    created_at: z.date(),
    updated_at: z.date(),
  })
  .dbTable("person");

const rowTable = derivePgTable(InvoiceRowSchema);
const invoiceTable = derivePgTable(InvoiceSchema);
const personTable = derivePgTable(PersonSchema);

const db = database({}, invoiceTable, rowTable, personTable);

// --- PGlite: create in-memory Postgres and run schema SQL ---
const pglite = new PGlite({
  parsers: createPgliteParsers(),
});
const schema = createTableSql(PGCOLUMN_TO_SQLTYPE, db, POSTGRES_OPTS);
await pglite.exec(schema);
console.log("Schema created", schema);

// --- Kysely: typed query builder backed by PGlite ---
type KyselyTypes = InferKyselyTypes<typeof db, PgUnifiedTypeMapping>;

const kyselyDb = new k.Kysely<KyselyTypes>({
  dialect: new k.PGliteDialect({
    pglite,
  }),
});

// Insert an invoice (serial id is auto-generated)
const insertedId = await kyselyDb
  .insertInto("invoice")
  .values({
    title: "Test Invoice",
    description: "A test invoice created with Ormer + Zod",
    due_date: "2026-06-30",
    rowversion: 1,
    concurrencyStamp: crypto.randomUUID(),
    created_at: new Date(),
    updated_at: new Date(),
  })
  .returning("id")
  .execute();

if (!insertedId[0]?.id) throw new Error("Failed to insert invoice");

// Insert an invoice row referencing the invoice
await kyselyDb
  .insertInto("invoice_rows")
  .values({
    title: "Line item 1",
    price: 100.0,
    tax_percentage: 24.0,
    quantity: 2,
    invoice_id: insertedId[0].id,
    concurrencyStamp: crypto.randomUUID(),
  })
  .execute();

// Insert a person
await kyselyDb
  .insertInto("person")
  .values({
    first_name: "Jane",
    last_name: "Doe",
    email: "jane@example.com",
    created_at: new Date(),
    updated_at: new Date(),
  })
  .execute();

// Query invoices
const invoices = await kyselyDb.selectFrom("invoice").selectAll().execute();
console.log("Invoices:", invoices);

// Query persons
const persons = await kyselyDb.selectFrom("person").selectAll().execute();
console.log("Persons:", persons);

await pglite.close();
