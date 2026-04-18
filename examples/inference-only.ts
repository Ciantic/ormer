
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
    title: "opt string",
    price: "opt float64",
    tax_percentage: "opt float64",
    quantity: "opt float64",
    invoice: ["opt reference", "invoice"],
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

type IsOptional<V> = V extends `opt ${string}` | readonly ["opt reference", string] ? true : false;

type ResolveType<V, Tables extends TableDefs> =
    V extends readonly ["opt reference", infer TableName]
        ? TableName extends keyof Tables
            ? { [K in keyof Tables[TableName]]: ResolveType<Tables[TableName][K], Tables> } | undefined
            : never
        : V extends readonly ["reference", infer TableName]
            ? TableName extends keyof Tables
                ? { [K in keyof Tables[TableName]]: ResolveType<Tables[TableName][K], Tables> }
                : never
        : V extends `opt ${infer Rest}`
            ? ResolveType<Rest, Tables> | undefined
            : V extends keyof Types
                ? Types[V]
                : never;

type FinalType<T> = T extends infer U ? { [K in keyof U]: U[K] } : never;

type Materialize<T extends Record<string, string | readonly [string, string]>> = FinalType<{
    [K in keyof T as IsOptional<T[K]> extends true ? never : K]: ResolveType<T[K], TableDefs>;
} & {
    [K in keyof T as IsOptional<T[K]> extends true ? K : never]?: ResolveType<T[K], TableDefs>;
}>;

type Invoice = Materialize<typeof invoice>;
type InvoiceRow = Materialize<typeof invoiceRow>;
type Person = Materialize<typeof person>;

function materialize<T extends Record<string, string | readonly [string, string]>>(def: T): Materialize<T> {
    return null as any;
}

const materializedInvoice = materialize(invoice);
const materializedInvoiceRow = materialize(invoiceRow);
const materializedPerson = materialize(person);