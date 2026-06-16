import { pg, table } from "ormer";
import type { ColumnType, Table } from "ormer";
import type { Type } from "arktype";
import { deriveColumn } from "./derive.ts";
import type { TableName } from "./arktype-ext.ts";

/**
 * Map a generic arktype choice to a PostgreSQL ColumnType.
 *
 * For "string" and "number" we also inspect `params.dbformat` (set from
 * `.configure({ dbformat: ... })` or `db.varchar()` / `db.type("...")`) to
 * pick the correct PG type.
 */
export function derivePgColumn(
  schema: Type<any, any>,
): ColumnType<string, any> {
  return deriveColumn(schema, ([domain, dbformat, params]) => {
    if (domain === "string") {
      if (dbformat === "uuid") return pg.uuid(params);
      if (dbformat === "timepart") return pg.time(params);
      if (dbformat === "datepart") return pg.date(params);
      if (dbformat === "naivedatetime") return pg.timestamp(params);
      if ("maxLength" in params && typeof params.maxLength === "number") {
        return pg.varchar(params);
      }
      return pg.text(params);
    }
    if (domain === "number") {
      if (dbformat === "float32") return pg.float4(params);
      if (dbformat === "float64") return pg.float8(params);
      if (dbformat === "int32") return pg.int4(params);
      if (dbformat === "int16") return pg.int2(params);
      if (
        dbformat === "int8" ||
        dbformat === "uint8" ||
        dbformat === "uint16" ||
        dbformat === "uint32"
      ) {
        throw new Error(
          `PG has no symmetric mapping for number format: ${dbformat}`,
        );
      }
      return pg.float8(params);
    }
    if (domain === "bigint") {
      if (dbformat === "int64" || dbformat === "") return pg.int8(params);
      if (dbformat === "uint64" || dbformat === "uint128") {
        throw new Error(
          `PG has no symmetric mapping for bigint format: ${dbformat}`,
        );
      }
      return pg.int8(params);
    }
    if (domain === "boolean") {
      return pg.boolean(params);
    }
    if (domain === "Date") {
      return pg.timestamptz(params);
    }
    if (domain === "object") {
      return pg.jsonb({ ...params, schema });
    }
    throw new Error(
      `Unsupported arktype choice: ${domain} with dbformat ${dbformat}`,
    );
  });
}

/**
 * Derive an ormer PgTable from an arktype table type created with `db.table()`.
 */
export function derivePgTable(
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
    columns[key] = derivePgColumn(colType);
  }

  return table(tableName as never, columns) as any;
}
