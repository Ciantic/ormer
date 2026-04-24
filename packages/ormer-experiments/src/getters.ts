// deno-lint-ignore-file no-explicit-any
import type { ColumnType } from "./columns.ts";
import type { Table } from "./table.ts";
import type { Schema } from "./schemas.ts";
import type { ColumnTypeToDriver } from "./database.ts";
import type { StandardSchemaV1 } from "@standard-schema/spec";
import * as s from "./simplevalidation.ts";

type FinalType<T> = T extends infer U ? { [K in keyof U]: U[K] } : never;
type UnknownSchema = StandardSchemaV1<unknown, unknown>;
type RecordOfColumnTypes = Record<string, ColumnType<string, any>>;
type RecordOfSchemas = Record<
  string,
  (params?: any) => Schema<UnknownSchema, UnknownSchema, UnknownSchema>
>;

/**
 * Get Valibot schema for the columns
 *
 * @param columns Columns property of the table
 * @returns A record of schemas mapped to the column's keys
 */
export function getSchemasFromColumns<
  Columns extends Record<string, ColumnType<string, any>>,
  TypeTable extends RecordOfSchemas,
>(
  columns: Columns,
  types: TypeTable,
): {
    // prettier-ignore
    [K in keyof Columns as Columns[K]["type"] extends string ? K : never]: 
        Columns[K]["schema"] extends UnknownSchema
        ? Columns[K]["schema"]
        : ReturnType<TypeTable[Columns[K]["type"]]>["schema"];
} {
  return Object.keys(columns).reduce((acc, key) => {
    const column = columns[key]!;
    const schema = (types as any)[column.type](column ?? {})["schema"];
    acc[key] = schema;
    return acc;
  }, {} as any);
}

/**
 * Get primary key columns
 *
 * @param table
 * @returns
 */
export function getPrimaryKeyColumns<
  Columns extends Record<string, ColumnType<string, any>>,
>(
  table: Table<any, Columns>,
): {
  [K in keyof Columns as Columns[K]["primaryKey"] extends true
    ? K
    : never]: Columns[K];
} {
  return Object.keys(table.columns).reduce((acc, key) => {
    const column = table.columns[key];
    if (column?.primaryKey === true) {
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
export function getInsertColumns<
  Columns extends Record<string, ColumnType<string, any>>,
>(
  table: Table<any, Columns>,
): {
  [K in keyof Columns as Columns[K]["notInsertable"] extends true
    ? never
    : K]: Columns[K];
} {
  return Object.keys(table.columns).reduce((acc, key) => {
    const column = table.columns[key];
    if (column?.notInsertable !== true) {
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
export function getUpdateKeyColumns<
  Columns extends Record<string, ColumnType<string, any>>,
>(
  table: Table<any, Columns>,
): FinalType<{
  [K in keyof Columns as Columns[K]["updateKey"] extends true
    ? K
    : never]: Columns[K];
}> {
  return Object.keys(table.columns).reduce((acc, key) => {
    const column = table.columns[key];
    if (column?.updateKey === true) {
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
export function getPatchColumns<
  Columns extends Record<string, ColumnType<string, any>>,
>(
  table: Table<any, Columns>,
): {
  [K in keyof Columns as Columns[K]["notUpdatable"] extends true
    ? never
    : K]: Columns[K];
} {
  return Object.keys(table.columns).reduce((acc, key) => {
    const column = table.columns[key];
    if (column.notUpdatable !== true) {
      acc[key] = column;
    }
    return acc;
  }, {} as any);
}

type RecordOfColumnTypeToDriver = Record<
  string,
  (params?: any) => ColumnTypeToDriver
>;
type ArrayOfTables = Table<any, RecordOfColumnTypes>[];

export function getDatabaseSerializers<
  Tables extends ArrayOfTables,
  ColumnTypes extends RecordOfColumnTypeToDriver,
>(
  tables: Tables,
  columnTypes: ColumnTypes,
): {
  [K in Tables[number]["table"]]: {
    [C in keyof Extract<
      Tables[number],
      Table<K, RecordOfColumnTypes>
    >["columns"]]: {
      from: ReturnType<
        ColumnTypes[Extract<
          Tables[number],
          Table<K, RecordOfColumnTypes>
        >["columns"][C]["type"]]
      >["from"];
      to: ReturnType<
        ColumnTypes[Extract<
          Tables[number],
          Table<K, RecordOfColumnTypes>
        >["columns"][C]["type"]]
      >["to"];
    };
  };
} {
  const serializers = {} as any;

  for (const table of tables) {
    const tableName = table.table;
    serializers[tableName] = {};

    for (const columnName in table.columns) {
      const column = table.columns[columnName]!;
      const columnType = column.type;
      const serializer = columnTypes[columnType]!(column);

      serializers[tableName][columnName] = {
        from: serializer.from,
        to: serializer.to,
      };
    }
  }

  return serializers;
}

// Schema getters -------------------------------------------------------

export function getInsertSchema<
  Columns extends Record<string, ColumnType<string, any>>,
  TypeTable extends RecordOfSchemas,
>(table: Table<any, Columns>, types: TypeTable) {
  const insertSchema = getSchemasFromColumns(getInsertColumns(table), types);
  return s.schemaCombine(insertSchema);
}

export function getUpdateKeySchema<
  Columns extends Record<string, ColumnType<string, any>>,
  TypeTable extends RecordOfSchemas,
>(table: Table<any, Columns>, types: TypeTable) {
  const updateKeySchema = getSchemasFromColumns(
    getUpdateKeyColumns(table),
    types,
  );
  return s.schemaCombine(updateKeySchema);
}

export function getPatchSchema<
  Columns extends Record<string, ColumnType<string, any>>,
  TypeTable extends RecordOfSchemas,
>(table: Table<any, Columns>, types: TypeTable) {
  const patchSchema = getSchemasFromColumns(getPatchColumns(table), types);
  return s.schemaMapOpt(patchSchema);
}

export function getUpdateSchema<
  Columns extends Record<string, ColumnType<string, any>>,
  TypeTable extends RecordOfSchemas,
>(table: Table<any, Columns>, types: TypeTable) {
  const primaryKeySchema = getSchemasFromColumns(
    getPrimaryKeyColumns(table),
    types,
  );
  const updateKeySchema = getSchemasFromColumns(
    getUpdateKeyColumns(table),
    types,
  );
  const patchSchema = getSchemasFromColumns(getPatchColumns(table), types);
  return s.schemaCombine({
    ...primaryKeySchema,
    ...updateKeySchema,
    ...s.schemaMapOpt(patchSchema),
  });
}

export function getPrimaryKeySchema<
  Columns extends Record<string, ColumnType<string, any>>,
  TypeTable extends RecordOfSchemas,
>(table: Table<any, Columns>, types: TypeTable) {
  const primaryKeySchema = getSchemasFromColumns(
    getPrimaryKeyColumns(table),
    types,
  );
  return s.schemaCombine(primaryKeySchema);
}
