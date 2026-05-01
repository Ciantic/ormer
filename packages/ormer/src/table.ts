// deno-lint-ignore-file no-explicit-any

import type { ColumnType } from "./columns.ts";

type StringLiteral<T> = T extends string
  ? string extends T
    ? never
    : T
  : never;

export interface Table<
  TableName extends string = string,
  Columns extends Record<string, ColumnType<string, any>> = Record<
    string,
    ColumnType<string, any>
  >,
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
  Columns extends Record<string, any>,
>(
  table: StringLiteral<TableName>,
  columns: Columns,
): Table<TableName, Columns> {
  return {
    table,
    // Getter allows self-referential table definitions for foreign keys
    get columns() {
      return Object.entries(columns).reduce((acc, [key, column]) => {
        Object.defineProperty(acc, key, {
          enumerable: true,
          get() {
            return {
              ...(column as any),
              columnName: key,
              tableName: table,
            };
          },
        });
        return acc;
      }, {} as any);
    },
  };
}

export function navigationOne<
  T extends Table<any, any>,
  C extends keyof T["columns"] & string,
>(
  table: T,
  column: C,
): { relationshipTable: T; relationshipColumn: C; navigationOne: true } {
  return {
    navigationOne: true,
    relationshipTable: table,
    relationshipColumn: column,
  };
}

export function navigationMany<
  T extends Table<any, any>,
  C extends keyof T["columns"] & string,
>(
  table: T,
  column: C,
): { relationshipTable: T; relationshipColumn: C; navigationMany: true } {
  return {
    navigationMany: true,
    relationshipTable: table,
    relationshipColumn: column,
  };
}
