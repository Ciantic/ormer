import { database } from "ormer";
import { derivePgTable } from "../src/index.ts";
import { z } from "zod";

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
    invoice_id: z
      .number()
      .brand("InvoiceId")
      .nullable()
      .dbFk(InvoiceSchema, "id"),
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
      return z.number().brand("PersonId").nullable().dbFk(PersonSchema, "id");
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

const db = database({}, rowTable, invoiceTable, personTable);
