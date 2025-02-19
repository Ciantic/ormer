import * as v from "npm:valibot";

type FinalType<T> = T extends infer U ? { [K in keyof U]: U[K] } : never;

type StringLiteral<T> = T extends string ? (string extends T ? never : T) : never;
type ValibotSchema = v.BaseSchema<unknown, unknown, v.BaseIssue<unknown>>;

// Restrict record T to only keys from record B
type R<T, B> = {
    [K in keyof T]: K extends keyof B ? T[K] : never;
};

export type ColumnType<Type extends string, Params> = {
    readonly type: Type;
    readonly params: Params;
};

// deno-lint-ignore ban-types
export type Params<ExtraProps = {}> = FinalType<
    Readonly<
        {
            primaryKey?: boolean;
            unique?: boolean;
            notInsertable?: boolean;
            notUpdatable?: boolean;
            nullable?: boolean;
            default?: unknown;
            columnName?: string; // Automatically assigned by table()
        } & ExtraProps
    >
>;

export interface Table<TableName extends string, Columns extends Record<string, unknown>> {
    table: StringLiteral<TableName>;
    columns: Columns;
}

// --------------------------------

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

/**
 * Primary key column with auto increment
 *
 * BIGSERIAL or PRIMARY KEY AUTOINCREMENT
 */
export function pkAutoInc(): ColumnType<
    "pkAutoInc",
    {
        primaryKey: true;
        notInsertable: true;
        notUpdatable: true;
    }
>;
export function pkAutoInc<T extends Params>(params: R<T, Params>): ColumnType<"pkAutoInc", T>;
export function pkAutoInc(params?: unknown) {
    return {
        type: "pkAutoInc",
        params: params ?? {
            primaryKey: true,
            notInsertable: true,
            notUpdatable: true,
        },
    };
}

type UserStringCol = Params<{ minLength?: number; maxLength: number }>;

/**
 * User input string, typically used for names, addresses, etc.
 *
 * This is automatically trimmed and validated for length
 *
 * @param params
 */
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

export function updatedAt(): ColumnType<"updatedAt", { notInsertable: true; notUpdatable: true }> {
    return {
        type: "updatedAt",
        params: {
            notInsertable: true,
            notUpdatable: true,
        },
    };
}

export function createdAt(): ColumnType<"createdAt", { notInsertable: true; notUpdatable: true }> {
    return {
        type: "createdAt",
        params: {
            notInsertable: true,
            notUpdatable: true,
        },
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
export function getPrimaryKeyColumns<Columns extends Record<string, ColumnType<string, any>>>(
    table: Table<any, Columns>
): {
    [K in keyof Columns as Columns[K]["params"]["primaryKey"] extends true ? K : never]: Columns[K];
} {
    return Object.keys(table.columns).reduce((acc, key) => {
        const column = table.columns[key];
        if (column.params?.primaryKey === true) {
            acc[key] = column;
        }
        return acc;
    }, {} as any);
}

/**
 * Get update key columns, these are keys that are required for updating a row.
 *
 * These are: primary key, row version, concurrency stamp columns
 *
 * @param table
 * @returns
 */
export function getUpdateKeyColumns<Columns extends Record<string, ColumnType<string, any>>>(
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
    return Object.keys(table.columns).reduce((acc, key) => {
        const column = table.columns[key];
        if (
            column.params?.primaryKey === true ||
            column.type === "rowVersion" ||
            column.type === "concurrencyStamp"
        ) {
            acc[key] = column;
        }
        return acc;
    }, {} as any);
}

/**
 * Get patch updateable columns
 *
 * @param table
 * @returns
 */
export function getPatchColumns<Columns extends Record<string, ColumnType<string, any>>>(
    table: Table<any, Columns>
): {
    [K in keyof Columns as Columns[K]["params"]["notUpdatable"] extends true
        ? never
        : K]: Columns[K];
} {
    return Object.keys(table.columns).reduce((acc, key) => {
        const column = table.columns[key];
        if (column.params?.notUpdatable !== true) {
            acc[key] = column;
        }
        return acc;
    }, {} as any);
}

/**
 * Get Valibot schema for the columns
 *
 * @param columns Columns property of the table
 * @returns A record of schemas mapped to the column's keys
 */
export function getSchemasFromColumns<Columns extends Record<string, ColumnType<Types, any>>>(
    columns: Columns
): {
    [K in keyof Columns as Columns[K]["type"] extends Types ? K : never]: ReturnType<
        (typeof TYPES_TO_SCHEMAS)[Columns[K]["type"]]
    >;
} {
    return Object.keys(columns).reduce((acc, key) => {
        const column = columns[key];
        const schema = (TYPES_TO_SCHEMAS as any)[column.type](column.params ?? {});
        acc[key] = schema;
        return acc;
    }, {} as any);
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
    pkAutoInc() {
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

TYPES_TO_SCHEMAS satisfies Record<Types, (params?: any) => ValibotSchema>;

type Types = keyof typeof TYPES_TO_SCHEMAS;
