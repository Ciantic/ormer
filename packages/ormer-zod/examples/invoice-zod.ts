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
    id: z.int().brand("InvoiceId").dbPk(),
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
    id: z.int().brand("InvoiceRowId").dbPk(),
    title: z.string(),
    price: z.number(),
    tax_percentage: z.number(),
    quantity: z.number(),
    invoice_id: z.int().brand("InvoiceId").nullable().dbFk(InvoiceSchema, "id"),
    concurrencyStamp: z.string(),
    get invoice() {
      return InvoiceSchema.dbNavigate(InvoiceRowSchema, "invoice_id");
    },
  })
  .dbTable("invoice_rows");

const PersonSchema = z
  .object({
    id: z.int().brand("PersonId").dbPk(),
    first_name: z.string(),
    last_name: z.string().nullable(),
    email: z.email(),
    get supervisor_id() {
      return z.int().brand("PersonId").nullable().dbFk(PersonSchema, "id");
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
