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
export type Params<ExtraProps extends object = {}> = FinalType<
    Readonly<
        {
            primaryKey?: boolean;
            unique?: boolean;
            updateKey?: boolean;
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

// ----------------------------------------------------------------------------
// Primitive types
// ----------------------------------------------------------------------------

export function int32(): ColumnType<"int32", undefined>;
export function int32<T extends Params>(params: R<T, Params>): ColumnType<"int32", T>;
export function int32(params?: unknown) {
    return {
        type: "int32",
        params: params,
    };
}

export function int64(): ColumnType<"int64", undefined>;
export function int64<T extends Params>(params: R<T, Params>): ColumnType<"int64", T>;
export function int64(params?: unknown) {
    return {
        type: "int64",
        params: params,
    };
}

export function bigint(): ColumnType<"bigint", undefined>;
export function bigint<T extends Params>(params: R<T, Params>): ColumnType<"bigint", T>;
export function bigint(params?: unknown) {
    return {
        type: "bigint",
        params: params,
    };
}

export function float32(): ColumnType<"float32", undefined>;
export function float32<T extends Params>(params: R<T, Params>): ColumnType<"float32", T>;
export function float32(params?: unknown) {
    return {
        type: "float32",
        params: params,
    };
}

export function float64(): ColumnType<"float64", undefined>;
export function float64<T extends Params>(params: R<T, Params>): ColumnType<"float64", T>;
export function float64(params?: unknown) {
    return {
        type: "float64",
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
 * Serial is 32bit auto-incrementing column
 */
export function serial(): ColumnType<"serial", undefined>;
export function serial<T extends Params>(params: R<T, Params>): ColumnType<"serial", T>;
export function serial(params?: unknown) {
    return {
        type: "serial",
        params: params,
    };
}

/**
 * Big serial is 64bit auto-incrementing column
 */
export function bigserial(): ColumnType<"bigserial", undefined>;
export function bigserial<T extends Params>(params: R<T, Params>): ColumnType<"bigserial", T>;
export function bigserial(params?: unknown) {
    return {
        type: "bigserial",
        params: params,
    };
}

export function uuid(): ColumnType<"uuid", undefined>;
export function uuid<T extends Params>(params: R<T, Params>): ColumnType<"uuid", T>;
export function uuid(params?: unknown) {
    return {
        type: "uuid",
        params: params,
    };
}

export function string(): ColumnType<"string", undefined>;
export function string<T extends Params>(params: R<T, Params>): ColumnType<"string", T>;
export function string(params?: unknown) {
    return {
        type: "string",
        params,
    };
}

type VarCharCol = Params<{ maxLength: number }>;
export function varchar<T extends VarCharCol>(params: R<T, VarCharCol>): ColumnType<"varchar", T> {
    return {
        type: "varchar",
        params,
    };
}

export function boolean(): ColumnType<"boolean", undefined>;
export function boolean<T extends Params>(params: R<T, Params>): ColumnType<"boolean", T>;
export function boolean(params?: unknown) {
    return {
        type: "boolean",
        params: params,
    };
}

export function timestamp(): ColumnType<"timestamp", undefined>;
export function timestamp<T extends Params>(params: R<T, Params>): ColumnType<"timestamp", T>;
export function timestamp(params?: unknown) {
    return {
        type: "timestamp",
        params: params,
    };
}

export function timestamptz(): ColumnType<"timestamptz", undefined>;
export function timestamptz<T extends Params>(params: R<T, Params>): ColumnType<"timestamptz", T>;
export function timestamptz(params?: unknown) {
    return {
        type: "timestamptz",
        params: params,
    };
}

export function datepart(): ColumnType<"datepart", undefined>;
export function datepart<T extends Params>(params: R<T, Params>): ColumnType<"datepart", T>;
export function datepart(params?: unknown) {
    return {
        type: "datepart",
        params: params,
    };
}

export function timepart(): ColumnType<"timepart", undefined>;
export function timepart<T extends Params>(params: R<T, Params>): ColumnType<"timepart", T>;
export function timepart(params?: unknown) {
    return {
        type: "timepart",
        params: params,
    };
}

export function jsonb<Schema extends ValibotSchema, T extends Params<{ schema: Schema }>>(
    params: R<T, Params<{ schema: Schema }>>
): ColumnType<"jsonb", T> {
    return {
        type: "jsonb",
        params,
    };
}

export function json<Schema extends ValibotSchema, T extends Params<{ schema: Schema }>>(
    params: R<T, Params<{ schema: Schema }>>
): ColumnType<"jsonb", T> {
    return {
        type: "jsonb",
        params,
    };
}

// ----------------------------------------------------------------------------
// Helper types
// ----------------------------------------------------------------------------

/**
 * Primary key column with auto increment
 *
 * BIGSERIAL or PRIMARY KEY AUTOINCREMENT
 */
export function pkAutoInc(): ColumnType<
    "bigserial",
    {
        primaryKey: true;
        notInsertable: true;
        notUpdatable: true;
    }
>;
export function pkAutoInc<T extends Params>(params: R<T, Params>): ColumnType<"bigserial", T>;
export function pkAutoInc(params?: unknown) {
    return {
        type: "bigserial",
        params: params ?? {
            primaryKey: true,
            notInsertable: true,
            notUpdatable: true,
        },
    };
}

/**
 * Used as an update key to avoid concurrency issues
 *
 * Implementation can be an integer which is incremented on each update
 */
export function rowversion(): ColumnType<
    "rowversion",
    {
        notInsertable: true;
        notUpdatable: true;
        updateKey: true;
    }
> {
    return {
        type: "rowversion",
        params: {
            notInsertable: true,
            notUpdatable: true,
            updateKey: true,
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
        updateKey: true;
    }
> {
    return {
        type: "concurrencyStamp",
        params: {
            notInsertable: true,
            notUpdatable: true,
            updateKey: true,
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

export function email(): ColumnType<"email", undefined>;
export function email<T extends Params>(params: R<T, Params>): ColumnType<"email", T>;
export function email(params?: unknown) {
    return {
        type: "email",
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
 * Get insert value columns
 *
 * @param table
 * @returns
 */
export function getInsertColumns<Columns extends Record<string, ColumnType<string, any>>>(
    table: Table<any, Columns>
): {
    [K in keyof Columns as Columns[K]["params"]["notInsertable"] extends true
        ? never
        : K]: Columns[K];
} {
    return Object.keys(table.columns).reduce((acc, key) => {
        const column = table.columns[key];
        if (column.params?.notInsertable !== true) {
            acc[key] = column;
        }
        return acc;
    }, {} as any);
}

/**
 * Get update key columns, these are keys that are required for updating a row.
 *
 * These are: rowversion or concurrency stamp
 *
 * Updates are done with a WHERE clause that includes these columns
 *
 * @param table
 * @returns
 */
export function getUpdateKeyColumns<Columns extends Record<string, ColumnType<string, any>>>(
    table: Table<any, Columns>
): FinalType<{
    [K in keyof Columns as Columns[K]["params"]["updateKey"] extends true ? K : never]: Columns[K];
}> {
    return Object.keys(table.columns).reduce((acc, key) => {
        const column = table.columns[key];
        if (column.params?.updateKey === true) {
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
    int32() {
        return v.pipe(v.number(), v.integer());
    },
    int64() {
        // Note: JS supports up to 53 bit
        return v.pipe(
            v.number(),
            v.integer(),
            v.maxValue(Number.MAX_SAFE_INTEGER), // TODO: THINK
            v.minValue(Number.MIN_SAFE_INTEGER)
        );
    },
    bigint() {
        return v.bigint();
    },
    float32() {
        return v.pipe(v.number());
    },
    float64() {
        // TODO: Validate JS number limits, https://stackoverflow.com/questions/45929493/node-js-maximum-safe-floating-point-number
        return v.pipe(v.number());
    },
    decimal(params: DecimalCol) {
        return v.pipe(
            v.string(),
            v.minLength(3), // 0.0
            v.maxLength(params.precision + params.scale + 1),
            v.decimal()
        );
    },
    string() {
        return v.string();
    },
    varchar(params: VarCharCol) {
        return v.pipe(v.string(), v.maxLength(params.maxLength));
    },
    uuid() {
        return v.pipe(v.string(), v.uuid());
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
    rowversion() {
        return v.pipe(v.number(), v.integer());
    },
    timestamp() {
        return v.date();
    },
    timestamptz() {
        // TODO: Use temporal
        return v.string();
    },
    timepart() {
        return v.string();
    },
    datepart() {
        return v.string();
    },
    jsonb<T extends ValibotSchema>(params: Params<{ schema: T }>) {
        return params.schema;
    },
    json<T extends ValibotSchema>(params: Params<{ schema: T }>) {
        return params.schema;
    },

    userstring(params: UserStringCol) {
        return v.pipe(
            v.string(),
            v.minLength(params.minLength ?? 0),
            v.maxLength(params.maxLength)
        );
    },
    email() {
        return v.pipe(v.string(), v.email(), v.maxLength(320));
    },
    createdAt() {
        return v.pipe(v.date());
    },
    updatedAt() {
        return v.pipe(v.date());
    },
};

TYPES_TO_SCHEMAS satisfies Record<Types, (params?: any) => ValibotSchema>;

type Types = keyof typeof TYPES_TO_SCHEMAS;
