import * as v from "npm:valibot";
import { ColumnType, Params } from "./columns.ts";
type ValibotSchema = v.BaseSchema<unknown, unknown, v.BaseIssue<unknown>>;
// Restrict record T to only keys from record B
type R<T, B> = {
    [K in keyof T]: K extends keyof B ? T[K] : never;
};

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
    "int64",
    {
        rowversion: true;
        notInsertable: true;
        notUpdatable: true;
        updateKey: true;
        default: 1;
    }
> {
    return {
        type: "int64",
        params: {
            rowversion: true,
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
    "uuid",
    {
        default: "generate";
        concurrencyStamp: true;
        notInsertable: true;
        notUpdatable: true;
        updateKey: true;
    }
> {
    return {
        type: "uuid",
        params: {
            default: "generate",
            concurrencyStamp: true,
            notInsertable: true,
            notUpdatable: true,
            updateKey: true,
        },
    };
}

export type UserStringCol<T extends ValibotSchema> = Params<{ schema: T; maxLength: number }>;

/**
 * User input string, typically used for names, addresses, etc.
 *
 * This is automatically trimmed and validated for length
 *
 * @param params
 */
export function userstring<S extends ValibotSchema, T extends UserStringCol<S>>(
    params: R<T, UserStringCol<S>>
): ColumnType<"varchar", T> {
    return {
        type: "varchar",
        params,
    };
}

export function email(): ColumnType<
    "varchar",
    { schema: v.BaseSchema<string, string, v.BaseIssue<unknown>> }
>;
export function email<T extends Params>(
    params: R<T, Params>
): ColumnType<"varchar", T & { maxLength: 320 }>;
export function email(params?: unknown): unknown {
    return {
        type: "varchar",
        params: {
            ...(params ?? {}),
            maxLength: 320,
            schema: v.pipe(v.string(), v.trim(), v.email(), v.maxLength(320)),
        },
    };
}

export function updatedAt(): ColumnType<
    "timestamptz",
    { notInsertable: true; notUpdatable: true; onUpdateSet: true; default: "now" }
> {
    return {
        type: "timestamptz",
        params: {
            notInsertable: true,
            notUpdatable: true,
            onUpdateSet: true,
            default: "now",
        },
    };
}

export function createdAt(): ColumnType<
    "timestamptz",
    { notInsertable: true; notUpdatable: true; onInsertSet: true; default: "now" }
> {
    return {
        type: "timestamptz",
        params: {
            notInsertable: true,
            notUpdatable: true,
            onInsertSet: true,
            default: "now",
        },
    };
}
