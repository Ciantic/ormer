import * as d from "./zod-concrete.ts";
import { z } from "zod";

const InvoiceSchema = z.object({
  id: d.bigint().pkAutoInc(),
  title: d.string(),
  description: d.string(),
  dueDate: d.datetime(),
  rowversion: d.int32().rowversion(),
  concurrencyStamp: d.string().concurrencyStamp(),
  createdAt: d.datetime(),
  updatedAt: d.datetime(),
  get rows() {
    return InvoiceRowSchema.array().optional().navigateMany();
  },
});

const InvoiceRowSchema = z.object({
  id: d.bigint().pkAutoInc(),
  title: d.string().optional().nullable(),
  price: d.float64().optional(),
  taxPercentage: d.float64().optional(),
  quantity: d.int32().optional(),
  invoiceId: d.bigint().foreignKey(InvoiceSchema, "id").optional(),
  invoice: InvoiceSchema.navigateOne().optional(),
  concurrencyStamp: d.uuid().concurrencyStamp(),
});

const PersonSchema = z.object({
  id: d.bigint().pkAutoInc(),
  firstName: d.string(),
  lastName: d.string(),
  email: d.string(),
  get supervisorId() {
    return d.bigint().foreignKey(PersonSchema, "id").optional();
  },
  get supervisor() {
    return PersonSchema.optional().navigateOne();
  },
  createdAt: d.datetime(),
  updatedAt: d.datetime(),
});

type InvoicePkSchema = d.InferPrimaryKeySchema<typeof InvoiceSchema>; // z.ZodBigInt & { pk: true; autoInc: true }

type InvoicePatch = d.InferPatchSchema<typeof InvoiceSchema>; // Partial<Invoice> & { id: bigint }

type InvoiceRowPatchSchema = d.InferPatchSchema<typeof InvoiceRowSchema>; // Partial<InvoiceRow> & { id: bigint }
