import * as d from "./zod-concrete.ts";
import { z } from "zod";

const InvoiceSchema = z.object({
  id: d.bigint().pkAutoInc(),
  title: d.string(),
  description: d.string(),
  dueDate: d.datetime(),
  rowversion: d.rowversion(),
  concurrencyStamp: d.uuid().concurrencyStamp(),
  createdAt: d.datetime(),
  updatedAt: d.datetime(),
  get rows() {
    return InvoiceRowSchema.array().optional().navigateMany();
  },
});

const InvoiceRowSchema = z.object({
  id: d.bigint().pkAutoInc(),
  title: d.string(),
  price: d.float64(),
  taxPercentage: d.float64(),
  quantity: d.int32(),
  invoiceId: d.bigint().foreignKey(InvoiceSchema, "id"),
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
