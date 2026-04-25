import type { ColumnType, Params } from "./columns.ts";
import type { Table } from "./table.ts";

type RecordOfColumnTypes = Record<string, ColumnType<string, any>>;
type ArrayOfTables = Table<any, RecordOfColumnTypes>[];
export type Database<Tables extends ArrayOfTables> = {
  [K in Tables[number]["table"]]: Extract<Tables[number], { table: K }>;
};

export function database<Tables extends ArrayOfTables>(
  opts: {},
  ...tables: Tables
): Database<Tables> {
  return tables.reduce((acc, table) => {
    if (acc[table.table]) {
      throw new Error(`Duplicate table name: ${table.table}`);
    }

    acc[table.table] = table;
    return acc;
  }, {} as any);
}
