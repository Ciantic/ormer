// deno-lint-ignore-file no-explicit-any
import type * as v from "npm:valibot";
import type { ColumnType } from "./columns.ts";
import type { Table } from "./table.ts";

type FinalType<T> = T extends infer U ? { [K in keyof U]: U[K] } : never;
type ValibotSchema = v.BaseSchema<unknown, unknown, v.BaseIssue<unknown>>;

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
export function getSchemasFromColumns<
    Columns extends Record<string, ColumnType<string, any>>,
    TypeTable extends Record<string, (params?: any) => ValibotSchema>
>(
    columns: Columns,
    types: TypeTable
): {
    // prettier-ignore
    [K in keyof Columns as Columns[K]["type"] extends string ? K : never]: 
        Columns[K]["params"]["schema"] extends ValibotSchema
        ? Columns[K]["params"]["schema"]
        : ReturnType<TypeTable[Columns[K]["type"]]>;
} {
    return Object.keys(columns).reduce((acc, key) => {
        const column = columns[key];
        const schema = (types as any)[column.type](column.params ?? {});
        acc[key] = schema;
        return acc;
    }, {} as any);
}
