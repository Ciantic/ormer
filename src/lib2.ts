import * as v from "npm:valibot";

type FinalType<T> = T extends infer U ? { [K in keyof U]: U[K] } : never;

type StringLiteral<T> = T extends string ? (string extends T ? never : T) : never;
type ValibotSchema = v.BaseSchema<unknown, unknown, v.BaseIssue<unknown>>;

// Restrict record T to only keys from record B
type R<T, B> = {
    [K in keyof T]: K extends keyof B ? T[K] : never;
};

type ColumnType<Type extends string, Params> = {
    readonly type: Type;
    readonly params: Params;
};

// deno-lint-ignore ban-types
type Params<ExtraProps = {}> = FinalType<
    Readonly<
        {
            primaryKey?: boolean;
            unique?: boolean;
            notInsertable?: boolean;
            notUpdatable?: boolean;
            nullable?: boolean;
            default?: unknown;
            columnName?: string;
        } & ExtraProps
    >
>;

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
export const Test3 = true satisfies Test3;
export const Test4 = true satisfies Test4;

// This must give error, because foo is not there!
// const zozooz = integer({ primaryKey: true, foo: 5 });

// This must have autocompletion!
// const fofofo = integer({
//     /* CURSOR HERE */
// });

type EmptyObject = Record<string, never>;

// --------------------------------

export function humbug(): ColumnType<"humbug", undefined> {
    return {
        type: "humbug",
        params: undefined,
    };
}

type IntCol = Params<{ min?: number; max?: number }>;

export function integer(): ColumnType<"integer", undefined>;
export function integer<T extends IntCol>(params: R<T, IntCol>): ColumnType<"integer", T>;
export function integer(params?: unknown) {
    return {
        type: "integer",
        params: params,
    };
}

type DecimalCol = Params<{ precision: number; scale: number }>;

export function decimal<T extends DecimalCol>(params: R<T, DecimalCol>): ColumnType<"decimal", T> {
    return {
        type: "decimal",
        params: params,
    };
}

export function bigserial(): ColumnType<"bigserial", undefined>;
export function bigserial<T extends Params>(params: R<T, Params>): ColumnType<"bigserial", T>;
export function bigserial(params?: unknown) {
    return {
        type: "bigserial",
        params: params,
    };
}

type UserStringCol = Params<{ minLength?: number; maxLength: number }>;
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
        params: undefined,
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

/**
 * Concurrency stamp, used like rowversion but is randomized UUID
 *
 * Typically used in .NET applications
 *
 * @returns
 */
export function concurrencyStamp(): ColumnType<
    "concurrencyStamp",
    {
        notInsertable: true;
        notUpdatable: true;
    }
> {
    return {
        type: "concurrencyStamp",
        params: {
            notInsertable: true,
            notUpdatable: true,
        },
    };
}

export function updatedAt(): ColumnType<"updatedAt", undefined> {
    return {
        type: "updatedAt",
        params: undefined,
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
    } satisfies ColumnType<"jsonb", Params<{ schema: object }>>;
}

export function json<T extends Params, Schema extends ValibotSchema>(
    schema: Schema,
    params: R<T, Params>
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
    } satisfies ColumnType<"json", Params<{ schema: object }>>;
}

export interface Table<TableName extends string, Columns extends Record<string, unknown>> {
    table: StringLiteral<TableName>;
    columns: Columns;
}

/**
 * Create a database table definition
 *
 * @param table Name of the table, must be string literal
 * @param columns Definition of columns as a record of ColumnTypes
 * @returns
 */
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

/**
 * Get primary key columns
 *
 * @param table
 * @returns
 */
function getPrimaryKeyColumns<Columns extends Record<string, ColumnType<string, any>>>(
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

/**
 * Get update key columns, these are keys that are required for updating a row.
 *
 * These are: primary key, row version, concurrency stamp columns
 *
 * @param table
 * @returns
 */
function getUpdateKeyColumns<Columns extends Record<string, ColumnType<string, any>>>(
    table: Table<any, Columns>
): FinalType<
    {
        [K in keyof Columns as Columns[K]["params"]["primaryKey"] extends true
            ? K
            : never]: Columns[K];
    } & {
        [K in keyof Columns as Columns[K]["type"] extends "rowVersion" | "concurrencyStamp"
            ? K
            : never]: Columns[K];
    }
> {
    return null as any;
    // return Object.keys(table.columns).find((key) => {
    //     const column = table.columns[key];
    //     return column.params.primaryKey === true;
    // }) as any;
}

/**
 * Get patch updateable columns
 *
 * @param table
 * @returns
 */
function getPatchColumns<Columns extends Record<string, ColumnType<string, any>>>(
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

export const TYPES_TO_SCHEMAS = {
    integer(params: IntCol) {
        return v.pipe(
            v.number(),
            v.integer(),
            v.minValue(params.min ?? Number.MIN_SAFE_INTEGER),
            v.maxValue(params.max ?? Number.MAX_SAFE_INTEGER)
        );
    },
    decimal(params: DecimalCol) {
        return v.pipe(
            v.string(),
            v.minLength(params.precision + 1),
            v.maxLength(params.precision + params.scale + 1),
            v.decimal()
        );
    },
    userstring(params: UserStringCol) {
        return v.pipe(
            v.string(),
            v.minLength(params.minLength ?? 0),
            v.maxLength(params.maxLength)
        );
    },
    concurrencyStamp() {
        return v.pipe(v.string(), v.uuid());
    },
    bigserial() {
        return v.pipe(v.number(), v.integer());
    },
    boolean() {
        return v.pipe(v.boolean());
    },
    email() {
        return v.pipe(v.string(), v.email(), v.maxLength(320));
    },
    rowVersion() {
        return v.pipe(v.number(), v.integer());
    },
    createdAt() {
        return v.pipe(v.date());
    },
    updatedAt() {
        return v.pipe(v.date());
    },
    jsonb<T extends ValibotSchema>(params: Params<{ schema: T }>) {
        return params.schema;
    },
    json<T extends ValibotSchema>(params: Params<{ schema: T }>) {
        return params.schema;
    },
};

type Types = keyof typeof TYPES_TO_SCHEMAS;

function getSchemasFromColumns<Columns extends Record<string, ColumnType<Types, any>>>(
    columns: Columns
): {
    [K in keyof Columns as Columns[K]["type"] extends Types ? K : never]: ReturnType<
        (typeof TYPES_TO_SCHEMAS)[Columns[K]["type"]]
    >;
} {
    const schemas = {} as any;
    for (const key in columns) {
        const column = columns[key];
        const schema = (TYPES_TO_SCHEMAS as any)[column.type](column.params ?? {});
        schemas[key] = schema;
    }
    return schemas;
}

const PERSON_TABLE = table("person", {
    // humbug: humbug(),
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
    stamp: concurrencyStamp(),
    version: rowVersion(),
    isActive: boolean(),
});
const foo = getPrimaryKeyColumns(PERSON_TABLE);
const zoo = getUpdateKeyColumns(PERSON_TABLE);
const goo = getPatchColumns(PERSON_TABLE);

const fofo = getSchemasFromColumns(PERSON_TABLE.columns);
fofo.createdAt;

// const ExampleTable = {
//     table: "person" as const,
//     columns: ,
// };
