
const invoice = {
    id: "pk",
    title: "string",
    describetion: "string",
    due_date: "datetime",
    rowversion: "rowversion",
    concurrencyStamp: "concurrencyStamp",
    created_at: "createdAt",
    updated_at: "updatedAt",    
} as const;

const invoiceRow = {
    id: "pk",
    title: "string",
    price: "float64",
    tax_percentage: "float64",
    quantity: "float64",
    invoice: ["reference", "invoice"],
    concurrencyStamp: "concurrencyStamp",    
} as const;

const person = {
    id: "pk",
    first_name: "string",
    last_name: "string",
    email: "string",
    supervisor: ["reference", "person"],
    created_at: "createdAt",
    updated_at: "updatedAt",    
} as const;

type Types = {
    pk: string;
    string: string;
    datetime: Date;
    rowversion: number;
    concurrencyStamp: string;
    createdAt: Date;
    updatedAt: Date;
    float64: number;
    object: object;
} 

type TableDefs = {
    person: typeof person;
    invoice: typeof invoice;
    invoiceRow: typeof invoiceRow;
};

type ResolveType<V, Tables extends TableDefs> =
    V extends readonly ["reference", infer TableName]
        ? TableName extends keyof Tables
            ? { [K in keyof Tables[TableName]]: ResolveType<Tables[TableName][K], Tables> }
            : never
        : V extends keyof Types
            ? Types[V]
            : never;

type Materialize<T extends Record<string, string | readonly [string, string]>> = { [K in keyof T]: ResolveType<T[K], TableDefs> };

type Invoice = Materialize<typeof invoice>;
type InvoiceRow = Materialize<typeof invoiceRow>;
type Person = Materialize<typeof person>;

function materialize<T extends Record<string, string | readonly [string, string]>>(def: T): Materialize<T> {
    return null as any;
}

const materializedInvoice = materialize(invoice);
const materializedInvoiceRow = materialize(invoiceRow);
const materializedPerson = materialize(person);