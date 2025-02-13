import { jsonArrayFrom } from "npm:kysely/helpers/sqlite";
import * as v from "npm:valibot";

import {
    createDbFactory,
    InferKyselyTable,
    getInsertSchema,
    getUpdateFieldsSchema,
    getPatchFieldsSchema,
    getUpdateKeySchema,
    pkAutoInc,
    col,
    foreignKey,
    foreignKeyUntyped,
    table,
    rowVersion,
    createdAt,
    updatedAt,
} from "./src/lib.ts";

const invoiceTable = table("invoice", {
    id: pkAutoInc(),
    title: col(v.string()),
    description: col(v.optional(v.string())),
    due_date: col(v.date()),
    rowversion: rowVersion(),
    created_at: createdAt(),
    updated_at: updatedAt(),
});

const invoiceRowTable = table("invoice_row", {
    id: pkAutoInc(),
    title: col(v.string()),
    price: col(v.number()),
    tax_percentage: col(v.number()),
    quantity: col(v.number()),
    invoice_id: foreignKey(invoiceTable, "id"),
});

const personTable = table("person", {
    id: pkAutoInc(),
    first_name: col(v.string()),
    last_name: col(v.optional(v.string())),
    email: col(
        v.pipe(
            v.string(),
            v.nonEmpty("Please enter your email."),
            v.email("The email is badly formatted."),
            v.maxLength(30, "Your email is too long.")
        )
    ),
    // Self referencing foreign key, requires untyped `foreignKeyUntyped`
    supervisor_id: foreignKeyUntyped(col(v.number()), "person", "id"),
    created_at: createdAt(),
    updated_at: updatedAt(),
});

// Alternative you can use mutational syntax, which is typed
personTable.columns.supervisor_id = foreignKey(personTable, "id");

const dbFactory = createDbFactory(invoiceTable, invoiceRowTable, personTable);
const dbSqlite = dbFactory.createKyselyDb({ dialect: "sqlite" } as any);
type Database = typeof dbSqlite;

// Alternate way of creating Kysely database table types
type InvoiceTable = InferKyselyTable<typeof invoiceTable>;
type InvoiceRowTable = InferKyselyTable<typeof invoiceRowTable>;
type PersonTable = InferKyselyTable<typeof personTable>;

// Creating valibot schemas for the tables
const invoiceInsertSchema = getInsertSchema(invoiceTable);
const invoiceUpdateSchema = getUpdateFieldsSchema(invoiceTable);
const patchUpdateSchema = getPatchFieldsSchema(invoiceTable);
const updateKeySchema = getUpdateKeySchema(invoiceTable);
const update = v.intersect([updateKeySchema, patchUpdateSchema]);

const insertPersonSchema = getInsertSchema(personTable);
type InsertPerson = v.InferInput<typeof insertPersonSchema>;

type UpdateWithPatch = v.InferInput<typeof update>;

/* UpdateWithPatch is inferred as :
{
    id: number;                         // required, because it's a primary key
    rowversion: number;                 // required for updating, because it's a row version
} & {
    title?: string | undefined;         // optional new field to update
    description?: string | undefined;   // optional new field to update
    due_date?: Date | undefined;        // optional new field to update
}
*/

// Some test queries

export function test(db: Database) {
    return db
        .selectFrom("invoice")
        .where("id", "=", 1)
        .selectAll()
        .select((inner) =>
            jsonArrayFrom(
                inner
                    .selectFrom("invoice_row")
                    .selectAll()
                    .whereRef("invoice_row.invoice_id", "=", "invoice.id")
            ).as("invoice_rows")
        )
        .execute();
}

export function test2(db: Database) {
    return db
        .insertInto("invoice")
        .values({
            title: "Invoice 1",
            due_date: new Date(),
        })
        .returning(["id"])
        .execute();
}

export function insertInvoice(db: Database, invoice: v.InferOutput<typeof invoiceInsertSchema>) {
    const res = v.safeParse(invoiceInsertSchema, invoice);
    if (res.success) {
        console.log("res", res);
        return db.insertInto("invoice").values(invoice).returning(["id"]).execute();
    } else {
        console.log(res.issues);
        throw new Error("Invalid invoice");
    }
}

await insertInvoice(dbSqlite, {
    due_date: new Date(),
    title: "foo",
    description: "bar",
});
