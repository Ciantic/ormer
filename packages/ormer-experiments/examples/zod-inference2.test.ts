import { z } from "zod";

const InvoiceSchema = z.object({
  id: z.int64().pg("bigserial", { autoIncrement: true }),
  title: z.string().pg("text"),
  description: z.string().pg("text"),
  dueDate: z.date().pg("timestamp"),
  rowversion: z.string().pg("text"),
  concurrencyStamp: z.string().pg("uuid", { concurrencyStamp: true }),
  createdAt: z
    .date()
    .pg("timestamp", { notUpdatable: true, notInsertable: true }),
  updatedAt: z
    .date()
    .pg("timestamp", { notUpdatable: true, notInsertable: true }),
  get rows() {
    return InvoiceRowSchema.array().optional();
  },
});

const InvoiceRowSchema = z.object({
  id: z.int64().pg("bigserial", { autoIncrement: true }),
  title: z.string().pg("text"),
  price: z.number().pg("numeric"),
  taxPercentage: z.number().pg("numeric"),
  quantity: z.int32().pg("integer"),
  invoiceId: z.int64().pg("bigint").foreignKey(InvoiceSchema, "id"),
  get invoice() {
    return InvoiceSchema.optional();
  },
  concurrencyStamp: z.uuid().pg("uuid", { concurrencyStamp: true }),
});

const PersonSchema = z.object({
  id: z.int64().pg("bigserial", { autoIncrement: true }),
  firstName: z.string().pg("text"),
  lastName: z.string().pg("text"),
  email: z.string().pg("text"),
  get supervisorId() {
    return z.int64().pg("bigint").foreignKey(PersonSchema, "id").optional();
  },
  get supervisor() {
    return PersonSchema.optional();
  },
  createdAt: z
    .date()
    .pg("timestamp", { notUpdatable: true, notInsertable: true }),
  updatedAt: z
    .date()
    .pg("timestamp", { notUpdatable: true, notInsertable: true }),
});
