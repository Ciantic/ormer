// deno-lint-ignore-file no-explicit-any

import { ColumnType } from "./columns.ts";

type StringLiteral<T> = T extends string ? (string extends T ? never : T) : never;

export interface Table<
    TableName extends string = string,
    Columns extends Record<string, ColumnType<string, any>> = Record<
        string,
        ColumnType<string, any>
    >
> {
    readonly table: StringLiteral<TableName>;
    readonly columns: Columns;
}

/**
 * Create a database table definition
 *
 * @param table Name of the table, must be string literal
 * @param columns Definition of columns as a record of ColumnTypes
 * @returns
 */
export function table<
    TableName extends string,
    // Note, following can't be Record<string, ColumnType>, inference stops working
    Columns extends Record<string, any>
>(table: StringLiteral<TableName>, columns: Columns): Table<TableName, Columns> {
    // Assign column names
    const new_columns = Object.entries(columns).reduce((acc, [key, column]) => {
        acc[key] = {
            type: (column as any).type,
            params: {
                ...(column as any).params,
                columnName: key,
                tableName: table,
            },
        };
        return acc;
    }, {} as any);

    return {
        table,
        columns: new_columns,
    };
}
