import * as k from "npm:kysely";
import { jsonArrayFrom } from "npm:kysely/helpers/sqlite";
import * as v from "npm:valibot";
import * as o from "./src/lib.ts";

const invoiceTable = o.table("invoice", {
    id: o.pkAutoInc(),
    title: o.string(),
    description: o.nullable(o.string()),
    due_date: o.datetime(),
    rowversion: o.rowVersion(),
    created_at: o.createdAt(),
    updated_at: o.updatedAt(),
});

const invoiceRowTable = o.table("invoice_row", {
    id: o.pkAutoInc(),
    title: o.string(),
    price: o.float(),
    tax_percentage: o.float(),
    quantity: o.float(),
    invoice_id: o.foreignKey(invoiceTable, "id"),
});

const personTable = o.table("person", {
    id: o.pkAutoInc(),
    first_name: o.string(),
    last_name: o.nullable(o.string()),
    email: o.col(
        v.pipe(
            v.string(),
            v.nonEmpty("Please enter your email."),
            v.email("The email is badly formatted."),
            v.maxLength(30, "Your email is too long.")
        )
    ),
    // Self referencing foreign key, requires untyped `foreignKeyUntyped`
    supervisor_id: o.nullable(o.foreignKeyUntyped(o.integer(), "person", "id")),
    created_at: o.createdAt(),
    updated_at: o.updatedAt(),
});

// Alternative you can use mutational syntax, which is typed
personTable.columns.supervisor_id = o.nullable(o.foreignKey(personTable, "id"));

const dbFactory = o.createDbFactory(invoiceTable, invoiceRowTable, personTable);
const dbSqlite = dbFactory.createKyselyDb({ dialect: "sqlite" } as any);
type Database = typeof dbSqlite;

// Alternate way of creating Kysely database table types
type InvoiceTable = o.InferKyselyTable<typeof invoiceTable>;
type InvoiceRowTable = o.InferKyselyTable<typeof invoiceRowTable>;
type PersonTable = o.InferKyselyTable<typeof personTable>;

// Creating valibot schemas for the tables
const invoiceInsertSchema = o.getInsertSchema(invoiceTable);
const invoiceUpdateSchema = o.getUpdateFieldsSchema(invoiceTable);
const patchUpdateSchema = o.getPatchFieldsSchema(invoiceTable);
const updateKeySchema = o.getUpdateKeySchema(invoiceTable);
const update = v.intersect([updateKeySchema, patchUpdateSchema]);

const insertPersonSchema = o.getInsertSchema(personTable);
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
