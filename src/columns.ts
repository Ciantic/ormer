import type * as v from "npm:valibot";
import { Table } from "./table.ts";

type ValibotSchema = v.BaseSchema<unknown, unknown, v.BaseIssue<unknown>>;

type FinalType<T> = T extends infer U ? { [K in keyof U]: U[K] } : never;

// Restrict record T to only keys from record B
type R<T, B> = {
    [K in keyof T]: K extends keyof B ? T[K] : never;
};

// deno-lint-ignore ban-types
export type Params<ExtraProps extends object = {}> = FinalType<
    Readonly<
        ExtraProps & {
            primaryKey?: boolean;
            unique?: boolean;
            updateKey?: boolean;
            notInsertable?: boolean;
            notUpdatable?: boolean;
            nullable?: boolean;
            default?: unknown;
            foreignKeyTable?: string;
            foreignKeyColumn?: string;
            autoIncrement?: boolean;

            // Should not use these
            // columnName?: string; // Automatically assigned by table()
            // tableName?: string; // Automatically assigned by table()
        }
    >
>;
export type ColumnType<Type extends string, Params> = {
    readonly type: Type;
    readonly params: Params;
};

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

export type DecimalCol = Params<{ precision: number; scale: number }>;
export function decimal<T extends DecimalCol>(params: R<T, DecimalCol>): ColumnType<"decimal", T> {
    return {
        type: "decimal",
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

export type VarCharCol = Params<{ maxLength: number }>;
export function varchar<T extends VarCharCol>(params: R<T, VarCharCol>): ColumnType<"varchar", T> {
    return {
        type: "varchar",
        params,
    };
}

export function foreignKey<
    C extends keyof T["columns"],
    // deno-lint-ignore no-explicit-any
    T extends Table<any, any>,
    // deno-lint-ignore ban-types
    P extends Params = {}
>(
    table: T,
    column: C,
    params?: R<P, Params>
    // wrapped: ColumnType<T["columns"][C]["type"], unknown>
): ColumnType<
    T["columns"][C]["type"],
    FinalType<
        P & {
            foreignKeyTable: T["table"];
            foreignKeyColumn: C;
        }
    >
> {
    return {
        type: table.columns[column].type,
        params: {
            ...params,
            foreignKeyTable: table.table,
            foreignKeyColumn: column,
        } as FinalType<
            P & {
                foreignKeyTable: T["table"];
                foreignKeyColumn: C;
            }
        >,
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
): ColumnType<"json", T> {
    return {
        type: "json",
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
    "int64",
    {
        autoIncrement: true;
        primaryKey: true;
        notInsertable: true;
        notUpdatable: true;
    }
>;
export function pkAutoInc<T extends Params>(params: R<T, Params>): ColumnType<"int64", T>;
export function pkAutoInc(params?: unknown) {
    return {
        type: "int64",
        params: params ?? {
            primaryKey: true,
            notInsertable: true,
            notUpdatable: true,
            autoIncrement: true,
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
        default: 1;
    }
> {
    return {
        type: "rowversion",
        params: {
            notInsertable: true,
            notUpdatable: true,
            updateKey: true,
            default: 1,
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

export type UserStringCol = Params<{ minLength?: number; maxLength: number }>;

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
