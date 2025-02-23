// deno-lint-ignore-file no-explicit-any

type StringLiteral<T> = T extends string ? (string extends T ? never : T) : never;

export interface Table<TableName extends string, Columns extends Record<string, unknown>> {
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
