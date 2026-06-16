import { duckdb, table } from "ormer";
import type { ColumnType, Table } from "ormer";
import type { Type } from "arktype";
import { deriveColumn } from "./derive.ts";
import type { TableName } from "./arktype-ext.ts";

/**
 * Map a generic arktype choice to a DuckDB ColumnType.
 *
 * For "string" and "number" we also inspect `params.dbformat` (set from
 * `.configure({ dbformat: ... })` or `db.varchar()` / `db.type("...")`) to
 * pick the correct DuckDB type.
 */
export function deriveDuckDbColumn(
  schema: Type<any, any>,
): ColumnType<string, any> {
  return deriveColumn(schema, ([domain, dbformat, params]) => {
    if (domain === "string") {
      if (dbformat === "uuid") return duckdb.uuid(params);
      if (dbformat === "timepart") return duckdb.time(params);
      if (dbformat === "datepart") return duckdb.date(params);
      if (dbformat === "naivedatetime") return duckdb.timestamp(params);
      if ("maxLength" in params && typeof params.maxLength === "number") {
        return duckdb.varchar(params);
      }
      return duckdb.text(params);
    }
    if (domain === "number") {
      if (dbformat === "float32") return duckdb.float4(params);
      if (dbformat === "float64") return duckdb.float8(params);
      if (dbformat === "int32") return duckdb.int4(params);
      if (dbformat === "int16") return duckdb.int2(params);
      if (dbformat === "int8") return duckdb.int1(params);
      if (dbformat === "uint8") return duckdb.utinyint(params);
      if (dbformat === "uint16") return duckdb.usmallint(params);
      if (dbformat === "uint32") return duckdb.uinteger(params);
      return duckdb.float8(params);
    }
    if (domain === "bigint") {
      if (dbformat === "int64" || dbformat === "") return duckdb.int8(params);
      if (dbformat === "uint64") return duckdb.ubigint(params);
      if (dbformat === "uint128") return duckdb.uhugeint(params);
      return duckdb.int8(params);
    }
    if (domain === "boolean") {
      return duckdb.boolean(params);
    }
    if (domain === "Date") {
      return duckdb.timestamptz(params);
    }
    if (domain === "object") {
      return duckdb.json({ ...params, schema });
    }
    throw new Error(
      `Unsupported arktype choice: ${domain} with dbformat ${dbformat}`,
    );
  });
}

/**
 * Derive an ormer DuckDbTable from an arktype table type created with `db.table()`.
 */
export function deriveDuckDbTable(
  schema: Type<any, any> & TableName<string>,
): Table<string, Record<string, ColumnType<string, any>>> {
  const tableName = (schema as any).meta?.tableName;
  if (typeof tableName !== "string") {
    throw new Error(
      "Arktype object must be created with db.table('name', ...).",
    );
  }

  const structure = (schema as any).structure;
  const fields = [
    ...(structure?.required ?? []),
    ...(structure?.optional ?? []),
  ];
  const columns: Record<string, ColumnType<string, any>> = {};

  for (const field of fields) {
    const key = field.key;
    const colType = field.value;
    columns[key] = deriveDuckDbColumn(colType);
  }

  return table(tableName as never, columns) as any;
}
