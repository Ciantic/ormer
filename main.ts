import * as v from "npm:valibot";
import * as k from "npm:kysely";
import { jsonArrayFrom } from "npm:kysely/helpers/sqlite";

// This simplifies the type when hovering over a type
type FinalType<T> = T extends infer U ? { [K in keyof U]: U[K] } : never;

type StringLiteral<T> = T extends string ? (string extends T ? never : T) : never;

type ValibotSchema = v.BaseSchema<unknown, unknown, v.BaseIssue<unknown>>;

// Omit properties of type T from object O,
//
// OmitProperties<string, { a: string, b: number }> => { b: number }
type OmitProperties<T, O> = { [K in keyof O as O[K] extends T ? never : K]: O[K] };

// TODO: Split to PrimaryKey, AutoIncrement, RowVersion, CreatedAt, UpdatedAt, ForeignKey types

type ColumnKind =
    | ""
    | "primaryKey"
    | "autoIncrement"
    | "rowVersion"
    | "createdAt"
    | "updatedAt"
    | "foreignKey";

type ColumnType<
    Select extends ValibotSchema,
    Insert extends ValibotSchema = Select,
    Update extends ValibotSchema = Insert,
    Kind extends ColumnKind = ""
> = {
    readonly kind: Kind;
    readonly insert: Insert;
    readonly select: Select;
    readonly update: Update;
    readonly __kysely__: k.ColumnType<
        v.InferOutput<Select>,
        v.InferOutput<Insert>,
        v.InferOutput<Update>
    >;
    readonly defaultValue?: v.InferOutput<Select>;

    // I wanted to use `& Kind extends "foreignKey" ? { foreignKeyTable: string;
    // foreignKeyColumn: string } : {}` But it made the hover types of tables
    // too complex to look at in the editor
    readonly foreignKeyTable?: Kind extends "foreignKey" ? string : never;
    readonly foreignKeyColumn?: Kind extends "foreignKey" ? string : never;
};

type RecordOfColumnTypes = Record<
    string,
    ColumnType<ValibotSchema, ValibotSchema, ValibotSchema, any>
>;

export interface Table<TableName extends string, Columns extends RecordOfColumnTypes> {
    table: StringLiteral<TableName>;
    columns: Columns;
}

type InferKyselyColumns<T extends Record<string, ColumnType<ValibotSchema>>> = {
    [K in keyof T]: T[K]["__kysely__"];
};

type InferKyselyTable<
    T extends Table<
        // deno-lint-ignore no-explicit-any
        any,
        // deno-lint-ignore no-explicit-any
        Record<string, ColumnType<ValibotSchema, ValibotSchema, ValibotSchema, any>>
    >
> = {
    [K in T["table"]]: FinalType<InferKyselyColumns<T["columns"]>>;
};

export function navigation<T>(fn: () => T) {
    return {
        select: v.never(),
        insert: v.never(),
        update: v.never(),
        // deno-lint-ignore no-explicit-any
        __kysely__: null as any,
        kind: "navigation",
        navigationFn: fn,
    };
    
}

/**
 * Column with a same schema for selecting, inserting and updating
 *
 * @param schema
 * @returns
 */
export function col<Schema extends ValibotSchema>(schema: Schema): ColumnType<Schema> {
    return {
        select: schema,
        insert: schema,
        update: schema,
        // deno-lint-ignore no-explicit-any
        __kysely__: null as any,
        kind: "",
    };
}

export function col3<
    Select extends ValibotSchema,
    Insert extends ValibotSchema,
    Update extends ValibotSchema,
    Kind extends ColumnKind = ""
>(
    select: Select,
    insert: Insert,
    update: Update,
    kind: Kind = "" as Kind,
    props: Partial<ColumnType<Select, Insert, Update, Kind>>
): ColumnType<Select, Insert, Update, Kind> {
    return {
        select,
        insert,
        update,
        // deno-lint-ignore no-explicit-any
        __kysely__: null as any,
        kind,
        ...props,
    };
}

export function pkAutoInc(): ColumnType<
    v.NumberSchema<undefined>,
    v.NeverSchema<undefined>,
    v.NeverSchema<undefined>,
    "primaryKey"
> {
    return {
        ...col3(v.number(), v.never(), v.never(), "", {}),
        kind: "primaryKey",
    };
}

export function pk<
    Select extends ValibotSchema,
    Insert extends ValibotSchema,
    Update extends ValibotSchema
>(
    column: ColumnType<Select, Insert, Update, "">
): ColumnType<Select, Insert, Update, "primaryKey"> {
    return {
        ...column,
        kind: "primaryKey",
    };
}

export function rowVersion(): ColumnType<
    v.NumberSchema<undefined>,
    v.NeverSchema<undefined>,
    v.NeverSchema<undefined>,
    "rowVersion"
> {
    /*
    TODO for SQLITE:
    CREATE TRIGGER update_row_version_on_update
    AFTER UPDATE ON your_table
    BEGIN
    UPDATE your_table SET row_version = row_version + 1 WHERE id = NEW.id;
    END;
    */

    return {
        ...col3(v.number(), v.never(), v.never(), "rowVersion", {}),
        defaultValue: 0,
    };
}

export function createdAt(): ColumnType<
    v.DateSchema<undefined>,
    v.NeverSchema<undefined>,
    v.NeverSchema<undefined>,
    "createdAt"
> {
    return {
        ...col3(v.date(), v.never(), v.never(), "", {}),
        kind: "createdAt",
    };
}
export function updatedAt(): ColumnType<
    v.DateSchema<undefined>,
    v.NeverSchema<undefined>,
    v.NeverSchema<undefined>,
    "updatedAt"
> {
    return {
        ...col3(v.date(), v.never(), v.never(), "", {}),
        kind: "updatedAt",
    };
}

export function foreignKey<
    TableName extends string,
    Columns extends RecordOfColumnTypes,
    K extends keyof Columns
>(
    table: Table<TableName, Columns>,
    column: K
): ColumnType<Columns[K]["select"], Columns[K]["select"], Columns[K]["select"], "foreignKey"> {
    // Foreign key points to a primary key of another table, primary keys are
    // not insertable or updateable, but foreignkey must be insertable and
    // updateable
    return {
        select: table.columns[column].select,
        insert: table.columns[column].select, // intended
        update: table.columns[column].select, // intended
        __kysely__: table.columns[column].__kysely__,
        kind: "foreignKey",
        foreignKeyTable: table.table,
        // deno-lint-ignore no-explicit-any
        foreignKeyColumn: column as any,
    };
}
export function foreignKeyUntyped<Select extends ValibotSchema>(
    column: ColumnType<Select>,
    foreignKeyTable: string,
    foreignKeyColumn: string
): ColumnType<Select, Select, Select, "foreignKey"> {
    return {
        ...column,
        kind: "foreignKey",
        foreignKeyTable,
        foreignKeyColumn,
    };
}

export function table<TableName extends string, Columns extends RecordOfColumnTypes>(
    table: StringLiteral<TableName>,
    columns: Columns
): Table<TableName, Columns> {
    return {
        table,
        columns,
    };
}

export function getPrimaryKeySchema<TableName extends string, Columns extends RecordOfColumnTypes>(
    table: Table<TableName, Columns>
): v.ObjectSchema<
    FinalType<{
        [K in keyof Columns as Columns[K] extends ColumnType<any, any, any, "primaryKey">
            ? K
            : never]: Columns[K]["select"];
    }>,
    undefined
> {
    return v.object(
        Object.keys(table.columns).reduce((acc, key) => {
            const c = table.columns[key];
            const s = c.select;

            // Only primary keys
            if (c.kind !== "primaryKey") {
                return acc;
            }

            acc[key] = s;
            return acc;
        }, {} as Record<string, ValibotSchema>)
    ) as any;
}

export function getUpdateKeySchema<TableName extends string, Columns extends RecordOfColumnTypes>(
    table: Table<TableName, Columns>
): v.ObjectSchema<
    FinalType<{
        [K in keyof Columns as Columns[K] extends
            | ColumnType<any, any, any, "primaryKey">
            | ColumnType<any, any, any, "rowVersion">
            ? K
            : never]: Columns[K]["select"];
    }>,
    undefined
> {
    return v.object(
        Object.keys(table.columns).reduce((acc, key) => {
            const c = table.columns[key];
            const s = c.select;

            // Only primary keys and row versions can be used as update keys
            if (c.kind !== "primaryKey" && c.kind !== "rowVersion") {
                return acc;
            }

            acc[key] = s;
            return acc;
        }, {} as Record<string, ValibotSchema>)
    ) as any;
}

export function getSelectSchema<TableName extends string, Columns extends RecordOfColumnTypes>(
    table: Table<TableName, Columns>
): v.ObjectSchema<
    FinalType<
        OmitProperties<
            | v.NeverSchema<undefined>
            | v.UndefinedSchema<undefined>
            | v.OptionalSchema<v.NeverSchema<undefined>, undefined>,
            {
                [K in keyof Columns]: Columns[K]["select"];
            }
        >
    >,
    undefined
> {
    return v.object(
        Object.keys(table.columns).reduce((acc, key) => {
            const v = table.columns[key].select;
            // Remove never and empty validators
            if (
                v.expects === "never" ||
                v.expects === "undefined" ||
                v.expects === "(never | undefined)"
            ) {
                return acc;
            }
            acc[key] = v;
            return acc;
        }, {} as Record<string, ValibotSchema>)
    ) as any;
}

export function getInsertSchema<TableName extends string, Columns extends RecordOfColumnTypes>(
    table: Table<TableName, Columns>
): v.ObjectSchema<
    FinalType<
        OmitProperties<
            | v.NeverSchema<undefined>
            | v.UndefinedSchema<undefined>
            | v.OptionalSchema<v.NeverSchema<undefined>, undefined>,
            {
                [K in keyof Columns]: Columns[K]["insert"];
            }
        >
    >,
    undefined
> {
    return v.object(
        Object.keys(table.columns).reduce((acc, key) => {
            const v = table.columns[key].insert;
            // Remove never and empty validators
            if (
                v.expects === "never" ||
                v.expects === "undefined" ||
                v.expects === "(never | undefined)"
            ) {
                return acc;
            }
            acc[key] = v;
            return acc;
        }, {} as Record<string, ValibotSchema>)
    ) as any;
}

export function getUpdateFieldsSchema<TableName extends string, Columns extends RecordOfColumnTypes>(
    table: Table<TableName, Columns>
): v.ObjectSchema<
    FinalType<
        OmitProperties<
            | v.NeverSchema<undefined>
            | v.UndefinedSchema<undefined>
            | v.OptionalSchema<v.NeverSchema<undefined>, undefined>,
            {
                [K in keyof Columns]: Columns[K]["update"];
            }
        >
    >,
    undefined
> {
    return v.object(
        Object.keys(table.columns).reduce((acc, key) => {
            const v = table.columns[key].update;
            // Remove never and empty validators
            if (
                v.expects === "never" ||
                v.expects === "undefined" ||
                v.expects === "(never | undefined)"
            ) {
                return acc;
            }
            acc[key] = v;
            return acc;
        }, {} as Record<string, ValibotSchema>)
    ) as any;
}

export function getPatchFieldsSchema<TableName extends string, Columns extends RecordOfColumnTypes>(
    table: Table<TableName, Columns>
): v.ObjectSchema<
    FinalType<
        OmitProperties<
            | v.NeverSchema<undefined>
            | v.UndefinedSchema<undefined>
            | v.OptionalSchema<v.NeverSchema<undefined>, undefined>,
            {
                [K in keyof Columns]: Columns[K]["update"] extends v.OptionalSchema<
                    ValibotSchema,
                    unknown
                >
                    ? Columns[K]["update"]
                    : v.OptionalSchema<Columns[K]["update"], undefined>;
            }
        >
    >,
    undefined
> {
    return v.object(
        Object.keys(table.columns).reduce((acc, key) => {
            let s = table.columns[key].update;
            if (s.type !== "optional") {
                s = v.optional(s);
            }
            // Remove never and empty validators
            if (
                s.expects === "never" ||
                s.expects === "undefined" ||
                s.expects === "(never | undefined)"
            ) {
                return acc;
            }
            acc[key] = s;
            return acc;
        }, {} as Record<string, ValibotSchema>)
    ) as any;
}

// ----------------------------------------------------------------------
// Some type assertions

// Test cols
export const TEST_COL: ColumnType<v.NumberSchema<undefined>> = col(v.number());
export const TEST_JSON_COL: ColumnType<
    v.ObjectSchema<
        {
            readonly foo: v.NumberSchema<undefined>;
            readonly bar: v.StringSchema<undefined>;
        },
        undefined
    >
> = col(
    v.object({
        foo: v.number(),
        bar: v.string(),
    })
);

// Test column wrappers
// export const TEST_IS_GENERATED: ColumnType<v.NumberSchema<undefined>> = generated(col(v.number()));
export const TEST_IS_GENERATED2: ColumnType<
    v.NumberSchema<undefined>,
    v.NeverSchema<undefined>,
    v.NeverSchema<undefined>,
    "primaryKey"
> = pkAutoInc();
export const TEST_PK: ColumnType<
    v.StringSchema<undefined>,
    v.StringSchema<undefined>,
    v.StringSchema<undefined>,
    "primaryKey"
> = pk(col(v.string()));

export const TEST_CREATED_AT: ColumnType<
    v.DateSchema<undefined>,
    v.NeverSchema<undefined>,
    v.NeverSchema<undefined>,
    "createdAt"
> = createdAt();
export const TEST_UPDATED_AT: ColumnType<
    v.DateSchema<undefined>,
    v.NeverSchema<undefined>,
    v.NeverSchema<undefined>,
    "updatedAt"
> = updatedAt();

// Test table inference
export const TEST_TABLE: Table<
    "some_table",
    {
        id: ColumnType<
            v.NumberSchema<undefined>,
            v.NeverSchema<undefined>,
            v.NeverSchema<undefined>,
            "primaryKey"
        >;
        someCol: ColumnType<v.StringSchema<undefined>>;
    }
> = table("some_table", {
    id: pkAutoInc(),
    someCol: col(v.string()),
});

// ----------------------------------------------------------------------
// Example usage

const invoiceTable = table("invoice", {
    id: pkAutoInc(),
    title: col(v.string()),
    description: col(v.optional(v.string())),
    due_date: col(v.date()),
    rowversion: rowVersion(),
    created_at: createdAt(),
    updated_at: updatedAt(),
    invoice_rows: navigation(() => {
        return 5;
    }),
});

invoiceTable.columns.invoice_rows.navigationFn()

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
    // Self referencing foreign key, requires untyped `foreignKeyUntyped`
    supervisor_id: foreignKeyUntyped(col(v.number()), "person", "id"),
    created_at: createdAt(),
    updated_at: updatedAt(),
});

// Alternative you can use mutational syntax, which is typed
personTable.columns.supervisor_id = foreignKey(personTable, "id");

const invoiceInsertSchema = getInsertSchema(invoiceTable);
const invoiceUpdateSchema = getUpdateFieldsSchema(invoiceTable);
const patchUpdateSchema = getPatchFieldsSchema(invoiceTable);
const updateKeySchema = getUpdateKeySchema(invoiceTable);
const update = v.intersect([patchUpdateSchema, updateKeySchema]);
type Foo = v.InferInput<typeof update>;

type InvoiceTable = InferKyselyTable<typeof invoiceTable>;
type InvoiceRowTable = InferKyselyTable<typeof invoiceRowTable>;
type PersonTable = InferKyselyTable<typeof personTable>;
type Database = k.Kysely<InvoiceTable & InvoiceRowTable & PersonTable>;

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

await insertInvoice(null as any, {
    due_date: new Date(),
    title: "foo",
    description: "bar",
});
