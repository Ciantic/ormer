import type { MapColumnsTo } from "./columnhelpers.ts";
import type { ColumnType } from "./columns.ts";
import type { Database } from "./database.ts";
import type { Table } from "./table.ts";

type RecordOfColumnTypes = Record<string, ColumnType<string, any>>;
type ArrayOfTables = Table<any, RecordOfColumnTypes>[];

export type Opts = {
  // Returns colname usable for CREATE TABLE SQL, usually by quoting it.
  colNameFn?: (colName: string) => string;
  // Returns SQL expression for DEFAULT clause, or null to omit DEFAULT.
  defaultExprFn?: (value: unknown, colType: string) => string | null;
  // Keyword to append after PRIMARY KEY for auto-increment columns (e.g. "AUTOINCREMENT" for SQLite).
  // Postgres handles this via the type itself (bigserial/serial), so this is not needed there.
  autoIncrementKeyword?: string;
  // For databases that implement auto-increment via sequences (e.g. DuckDB).
  // Returns statements to prepend before CREATE TABLE and the DEFAULT expression for the column.
  // When set, autoIncrementKeyword is ignored for auto-increment columns.
  autoIncrementSequenceFn?: (
    tableName: string,
    colName: string,
  ) => { prependSql: string; defaultExpr: string };
};

export function createTableSql<
  ColumnMapping extends MapColumnsTo<string>,
  DB extends Database<Tables>,
  Tables extends ArrayOfTables,
>(mapping: ColumnMapping, db: DB, opts: Opts): string {
  const colNameFn = opts.colNameFn ?? ((n: string) => n);
  const { defaultExprFn } = opts;

  const statements: string[] = [];

  for (const tableDef of Object.values(db) as Table<any, any>[]) {
    const colDefs: string[] = [];
    const foreignKeyConstraints: string[] = [];
    const prependStatements: string[] = [];

    for (const [colName, col] of Object.entries(tableDef.columns) as [
      string,
      any,
    ][]) {
      const typeFn = mapping[col.type as keyof ColumnMapping] as (
        params: any,
      ) => string;
      const sqlType = typeFn(col);

      const parts: string[] = [`${colNameFn(colName)} ${sqlType}`];

      if (!col.nullable) {
        parts.push("NOT NULL");
      }

      if (col.autoIncrement && opts.autoIncrementSequenceFn) {
        const seq = opts.autoIncrementSequenceFn(tableDef.table, colName);
        prependStatements.push(seq.prependSql);
        parts.push(`DEFAULT ${seq.defaultExpr}`);
      } else if (
        col.default !== undefined &&
        !col.autoIncrement &&
        defaultExprFn
      ) {
        const expr = defaultExprFn(col.default, col.type);
        if (expr !== null) {
          parts.push(`DEFAULT ${expr}`);
        }
      }

      if (col.unique) {
        parts.push("UNIQUE");
      }

      if (col.primaryKey) {
        parts.push(
          col.autoIncrement &&
            opts.autoIncrementKeyword &&
            !opts.autoIncrementSequenceFn
            ? `PRIMARY KEY ${opts.autoIncrementKeyword}`
            : "PRIMARY KEY",
        );
      }

      colDefs.push(parts.join(" "));

      if (col.foreignKeyTable && col.foreignKeyColumn) {
        foreignKeyConstraints.push(
          `FOREIGN KEY (${colNameFn(colName)}) REFERENCES ${colNameFn(col.foreignKeyTable)}(${colNameFn(col.foreignKeyColumn)})`,
        );
      }
    }

    const tableName = colNameFn(tableDef.table);
    const allDefs = [...colDefs, ...foreignKeyConstraints];
    const createTable = `CREATE TABLE ${tableName} (\n  ${allDefs.join(",\n  ")}\n)`;
    statements.push(...prependStatements, createTable);
  }

  return statements.join(";\n\n") + ";";
}
