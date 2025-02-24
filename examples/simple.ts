import * as k from "npm:kysely";
import { jsonArrayFrom } from "npm:kysely/helpers/sqlite";
import * as v from "npm:valibot";
import * as o from "../mod.ts";

const invoiceTable = o.table("invoice", {
    id: o.pkAutoInc(),
    title: o.string(),
    description: o.string({
        nullable: true,
    }),
    due_date: o.timestamp({
        default: () => new Date(),
    }),
    rowversion: o.rowversion(),
    created_at: o.createdAt(),
    updated_at: o.updatedAt(),
});

const invoiceRowTable = o.table("invoice_row", {
    id: o.pkAutoInc(),
    title: o.string(),
    price: o.float64(),
    tax_percentage: o.float64(),
    quantity: o.float64(),
    invoice_id: o.foreignKey(invoiceTable, "id"),
});

const personTable = o.table("person", {
    id: o.pkAutoInc(),
    first_name: o.string(),
    last_name: o.string({
        nullable: true,
    }),
    email: o.email(),
    // Self referencing foreign key, requires untyped
    supervisor_id: o.int64({
        foreignKeyTable: "person",
        foreignKeyColumn: "id",
        nullable: true,
    }),
    created_at: o.createdAt(),
    updated_at: o.updatedAt(),
});

// Alternative you can use mutational syntax, which is typed
// personTable.columns.supervisor_id = o.nullable(o.foreignKey(personTable, "id"));

const dbFactory = o.createDbFactory(invoiceTable, invoiceRowTable, personTable);
const dbSqlite = dbFactory.createKyselyDb({
    dialect: {},
} as any);
type Database = typeof dbSqlite;

// Alternate way of creating Kysely database table types
// type InvoiceTable = o.InferKyselyTable<typeof invoiceTable>;
// type InvoiceRowTable = o.InferKyselyTable<typeof invoiceRowTable>;
// type PersonTable = o.InferKyselyTable<typeof personTable>;

// Creating valibot schemas for the tables
const invoiceInsertSchema = o.getInsertColumns(invoiceTable);
const patchUpdateSchema = o.getSchemasFromColumns(
    o.getPatchColumns(invoiceTable),
    o.TYPES_TO_SCHEMAS
);
const updateKeySchema = o.getSchemasFromColumns(
    o.getUpdateKeyColumns(invoiceTable),
    o.TYPES_TO_SCHEMAS
);
const update = v.intersect([v.object(updateKeySchema), v.object(patchUpdateSchema)]);

const insertPersonSchema = o.getInsertColumns(personTable);
// type InsertPerson = v.InferInput<typeof insertPersonSchema>;

// type UpdateWithPatch = v.InferInput<typeof update>;

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
            // title: "Invoice 1",
            // due_date: new Date(),
        })
        .returning(["id"])
        .execute();
}

// export function insertInvoice(db: Database, invoice: v.InferOutput<typeof invoiceInsertSchema>) {
//     const res = v.safeParse(invoiceInsertSchema, invoice);
//     if (res.success) {
//         console.log("res", res);
//         return db.insertInto("invoice").values(invoice).returning(["id"]).execute();
//     } else {
//         console.log(res.issues);
//         throw new Error("Invalid invoice");
//     }
// }

// await insertInvoice(dbSqlite, {
//     due_date: new Date(),
//     title: "foo",
//     description: "bar",
// });
