import * as d from "./zod-concrete.ts";
import { z } from "zod";

const InvoiceSchema = d.table("invoice", {
  id: d.bigint().pkAutoInc(),
  title: d.string(),
  description: d.string(),
  dueDate: d.datetime(),
  rowversion: d.rowversion(),
  concurrencyStamp: d.uuid().concurrencyStamp(),
  createdAt: d.datetime(),
  updatedAt: d.datetime(),
  get rows() {
    return InvoiceRowSchema.array()
      .optional()
      .navigateMany(InvoiceRowSchema, "invoiceId");
  },
});

const InvoiceRowSchema = d.table("invoice_row", {
  id: d.bigint().pkAutoInc(),
  title: d.string(),
  price: d.float64(),
  taxPercentage: d.float64(),
  quantity: d.int32(),
  invoiceId: d.bigint().foreignKey(InvoiceSchema, "id"),
  get invoice() {
    return d.relation(InvoiceRowSchema, "invoiceId");
  },
  concurrencyStamp: d.uuid().concurrencyStamp(),
});

const PersonSchema = d.table("person", {
  id: d.bigint().pkAutoInc(),
  firstName: d.string(),
  lastName: d.string(),
  email: d.string(),
  get supervisorId() {
    return d.bigint().foreignKey(PersonSchema, "id").optional();
  },
  get supervisor() {
    return d.relation(PersonSchema, "supervisorId");
    // return PersonSchema.optional().navigateOne(PersonSchema, "supervisorId");
  },
  createdAt: d.datetime(),
  updatedAt: d.datetime(),
});

type InvoiceInput = z.input<typeof InvoiceSchema>;
type InvoiceOutput = z.output<typeof InvoiceSchema>;

type InvoiceRowInput = z.input<typeof InvoiceRowSchema>;
type InvoiceRowOutput = z.output<typeof InvoiceRowSchema>;

type PersonInput = z.input<typeof PersonSchema>;
type PersonOutput = z.output<typeof PersonSchema>;
