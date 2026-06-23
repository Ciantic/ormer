// Execute directly with node:
// node ./invoice.ts
//
// Mirror of packages/ormer-zod/examples/invoice-zod.ts using Effect Schema

import { Schema, Struct } from "effect";
import { Int64, EmailString } from "../src/effect-ext.ts";

const InvoiceId = Int64.pipe(Schema.brand("InvoiceId"));
const InvoiceRowId = Int64.pipe(Schema.brand("InvoiceRowId"));
const PersonId = Int64.pipe(Schema.brand("PersonId"));

const InvoiceSchema = Schema.Struct({
  id: InvoiceId,
  title: Schema.String,
  description: Schema.NullOr(Schema.String),
  due_date: Schema.String,
  rowversion: Schema.Number,
  concurrencyStamp: Schema.String,
  created_at: Schema.Date,
  updated_at: Schema.Date,
});

const InvoiceRowSchema = Schema.Struct({
  id: InvoiceRowId,
  title: Schema.String,
  price: Schema.Number,
  tax_percentage: Schema.Number,
  quantity: Schema.Number,
  invoice_id: Schema.NullOr(InvoiceId),
  concurrencyStamp: Schema.String,
});

const PersonSchema = Schema.Struct({
  id: PersonId,
  first_name: Schema.String,
  last_name: Schema.NullOr(Schema.String),
  email: EmailString,
  created_at: Schema.Date,
  updated_at: Schema.Date,
});
