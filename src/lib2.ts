import * as v from "npm:valibot";

type FinalType<T> = T extends infer U ? { [K in keyof U]: U[K] } : never;

type StringLiteral<T> = T extends string ? (string extends T ? never : T) : never;
type ValibotSchema = v.BaseSchema<unknown, unknown, v.BaseIssue<unknown>>;

// Restrict record T to only keys from record B
type R<T, B> = {
    [K in keyof T]: K extends keyof B ? T[K] : never;
};

type ColumnType<Type, Params> = {
    readonly type: StringLiteral<Type>;
    readonly params: Params;
};

// deno-lint-ignore ban-types
type Params<Default, ExtraProps = {}> = FinalType<
    Readonly<
        {
            primaryKey?: boolean;
            unique?: boolean;
            notInsertable?: boolean;
            notUpdatable?: boolean;
            nullable?: boolean;
            default?: Default;
            columnName?: string;
        } & ExtraProps
    >
>;

type DefaultKeys = keyof Params<unknown>;

// function col<Type>(type: StringLiteral<Type>): ColumnType<Type, never>;

// function col<Type, Default, ExtraProps, Params extends ColParams<Default, ExtraProps> = any>(
//     type: StringLiteral<Type>,
//     params: Params
// ): ColumnType<Type, Params>;

// function col(type: string, params?: unknown) {
//     return { type, params: params };
// }

// const TEST_COL1 = col("integer", { primaryKey: true });
// const TEST_COL2 = col("integer");
// type Test1 = Expect<Equal<typeof TEST_COL1, ColumnType<"integer", { primaryKey: true }>>>;
// type Test2 = Expect<Equal<typeof TEST_COL2, ColumnType<"integer", never>>>;

// --------------------------------
// INFERENCE TEST!
type Expect<T extends true> = T;
type Equal<X, Y> = (<T>() => T extends X ? 1 : 2) extends <T>() => T extends Y ? 1 : 2
    ? true
    : false;

const TEST_INTEGER1 = integer({ primaryKey: true });
const TEST_INTEGER2 = integer();
type Test3 = Expect<Equal<typeof TEST_INTEGER1, ColumnType<"integer", { primaryKey: true }>>>;
type Test4 = Expect<Equal<typeof TEST_INTEGER2, ColumnType<"integer", undefined>>>;

// This must give error, because foo is not there!
// const zozooz = integer({ primaryKey: true, foo: 5 });

// This must have autocompletion!
// const fofofo = integer({
//     /* CURSOR HERE */
// });

type EmptyObject = Record<string, never>;

// --------------------------------

type IntCol = Params<number, { min?: number; max?: number }>;

export function integer(): ColumnType<"integer", undefined>;
export function integer<T extends IntCol>(params: R<T, IntCol>): ColumnType<"integer", T>;
export function integer(params?: unknown) {
    return {
        type: "integer",
        params: params,
    };
}

type DecimalCol = Params<string, { precision: number; scale: number }>;

export function decimal<T extends DecimalCol>(params: R<T, DecimalCol>): ColumnType<"decimal", T> {
    return {
        type: "decimal",
        params: params,
    };
}

export function bigserial(): ColumnType<"bigserial", undefined>;
export function bigserial<T extends Params<bigint>>(
    params: R<T, Params<bigint>>
): ColumnType<"bigserial", T>;
export function bigserial(params?: unknown) {
    return {
        type: "bigserial",
        params: params,
    };
}

type UserStringCol = Params<string, { minLength?: number; maxLength: number }>;
export function userstring<T extends UserStringCol>(
    params: R<T, UserStringCol>
): ColumnType<"userstring", T> {
    return {
        type: "userstring",
        params,
    };
}

export function boolean(): ColumnType<"boolean", undefined>;
export function boolean<T extends Params<boolean>>(
    params: R<T, Params<boolean>>
): ColumnType<"boolean", T>;
export function boolean(params?: unknown) {
    return {
        type: "boolean",
        params: params,
    };
}

export function createdAt(): ColumnType<"createdAt", undefined> {
    return {
        type: "createdAt",
        params: {} as never,
    };
}

export function rowVersion(): ColumnType<
    "rowVersion",
    {
        notInsertable: true;
        notUpdatable: true;
    }
> {
    return {
        type: "rowVersion",
        params: {
            notInsertable: true,
            notUpdatable: true,
        },
    };
}

export function updatedAt(): ColumnType<"updatedAt", undefined> {
    return {
        type: "updatedAt",
        params: {} as never,
    };
}

export function email(): ColumnType<"email", undefined>;
export function email<T extends Params<string>>(
    params: R<T, Params<string>>
): ColumnType<"email", T>;
export function email(params?: unknown) {
    return {
        type: "email",
        params: params,
    };
}

export function jsonb<T extends Params<v.InferOutput<Schema>>, Schema extends ValibotSchema>(
    schema: Schema,
    params: R<T, Params<v.InferOutput<Schema>>>
): ColumnType<"jsonb", FinalType<T & { schema: Schema }>>;
export function jsonb<Schema extends ValibotSchema>(
    schema: Schema
): ColumnType<"jsonb", { schema: Schema }>;
export function jsonb(schema: object, params?: object) {
    return {
        type: "jsonb",
        params: {
            schema,
            ...params,
        },
    } satisfies ColumnType<"jsonb", Params<unknown, { schema: object }>>;
}

export function json<T extends Params<v.InferOutput<Schema>>, Schema extends ValibotSchema>(
    schema: Schema,
    params: R<T, Params<v.InferOutput<Schema>>>
): ColumnType<"json", FinalType<T & { schema: Schema }>>;
export function json<Schema extends ValibotSchema>(
    schema: Schema
): ColumnType<"json", { schema: Schema }>;
export function json(schema: object, params?: object) {
    return {
        type: "json",
        params: {
            schema,
            ...params,
        },
    } satisfies ColumnType<"json", Params<unknown, { schema: object }>>;
}

export interface Table<TableName extends string, Columns extends Record<string, unknown>> {
    table: StringLiteral<TableName>;
    columns: Columns;
}

export function table<TableName extends string, Columns extends Record<string, unknown>>(
    table: StringLiteral<TableName>,
    columns: Columns
): Table<TableName, Columns> {
    // Assign column names
    const new_columns = Object.entries(columns).reduce((acc, [key, column]) => {
        acc[key] = {
            ...(column as any),
            columnName: key,
        };
        return acc;
    }, {} as any);

    return {
        table,
        columns: new_columns,
    };
}

const PERSON_TABLE = table("person", {
    id: bigserial({ default: 1n, primaryKey: true }),
    name: userstring({ maxLength: 300, default: "Alice" as const }),
    email: email(),
    age: integer(),
    price: decimal({ precision: 10, scale: 2 }),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
    billingAddress: jsonb(
        v.object({
            street: v.string(),
            city: v.string(),
            postcode: v.string(),
        })
    ),
    deliveryAddress: json(
        v.object({
            street: v.string(),
            city: v.string(),
            postcode: v.string(),
        }),
        {
            nullable: true,
        }
    ),
    version: rowVersion(),
    isActive: boolean(),
});

function getPrimaryKeySchema<Columns extends Record<string, any>>(
    table: Table<any, Columns>
): {
    [K in keyof Columns as Columns[K]["params"]["primaryKey"] extends true ? K : never]: Columns[K];
} {
    return null as any;
    // return Object.keys(table.columns).find((key) => {
    //     const column = table.columns[key];
    //     return column.params.primaryKey === true;
    // }) as any;
}

function getUpdateKeySchema<Columns extends Record<string, any>>(
    table: Table<any, Columns>
): {
    [K in keyof Columns as Columns[K]["params"]["primaryKey"] extends true
        ? K
        : Columns[K]["type"] extends "rowVersion"
        ? K
        : never]: Columns[K];
} {
    return null as any;
    // return Object.keys(table.columns).find((key) => {
    //     const column = table.columns[key];
    //     return column.params.primaryKey === true;
    // }) as any;
}

function getPatchSchema<Columns extends Record<string, any>>(
    table: Table<any, Columns>
): {
    [K in keyof Columns as Columns[K]["params"]["primaryKey"] extends true
        ? never
        : Columns[K]["params"]["notUpdatable"] extends true
        ? never
        : K]: Columns[K];
} {
    return null as any;
    // return Object.keys(table.columns).find((key) => {
    //     const column = table.columns[key];
    //     return column.params.primaryKey === true;
    // }) as any;
}

const foo = getPrimaryKeySchema(PERSON_TABLE);
const zoo = getUpdateKeySchema(PERSON_TABLE);
const goo = getPatchSchema(PERSON_TABLE);

// const ExampleTable = {
//     table: "person" as const,
//     columns: ,
// };
