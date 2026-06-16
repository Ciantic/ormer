import { pg, table } from "ormer";
import type { ColumnType, Params, Table } from "ormer";
import type { Type } from "arktype";
import { deriveColumn, type ParamsDerived } from "./derive.ts";
import type { TableName } from "./arktype-ext.ts";

export type PgParams = ParamsDerived<{
  dbformat?: string;
  schema?: Type<any, any>;
}>;

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
  return deriveColumn(schema, ([choice, rawParams]) => {
    const params = rawParams as PgParams;
    const pgParams = { ...params } as any;
    switch (choice) {
      case "string": {
        const fmt = params.dbformat;
        if (fmt === "uuid") return pg.uuid(pgParams);
        if (fmt === "timepart") return pg.time(pgParams);
        if (fmt === "datepart") return pg.date(pgParams);
        if (fmt === "naivedatetime") return pg.timestamp(pgParams as Params);
        if (typeof params.maxLength === "number") {
          return pg.varchar({ ...pgParams, maxLength: params.maxLength });
        }
        return pg.text(pgParams);
      }
      case "number": {
        const fmt = params.dbformat;
        if (fmt === "float32") return pg.float4(pgParams);
        if (fmt === "float64") return pg.float8(pgParams);
        if (fmt === "int32") return pg.int4(pgParams);
        if (fmt === "int16") return pg.int2(pgParams);
        if (
          fmt === "int8" ||
          fmt === "uint8" ||
          fmt === "uint16" ||
          fmt === "uint32"
        ) {
          throw new Error(
            `PG has no symmetric mapping for number format: ${fmt}`,
          );
        }
        return pg.float8(pgParams);
      }
      case "bigint": {
        const fmt = params.dbformat;
        if (fmt === "int64" || fmt === undefined) return pg.int8(pgParams);
        if (fmt === "uint64" || fmt === "uint128") {
          throw new Error(
            `PG has no symmetric mapping for bigint format: ${fmt}`,
          );
        }
        return pg.int8(pgParams);
      }
      case "boolean":
        return pg.boolean(pgParams);
      case "Date":
        return pg.timestamptz(pgParams as Params);
      case "object": {
        return pg.jsonb({ ...pgParams, schema });
      }
      default:
        throw new Error(`Unsupported arktype choice: ${choice}`);
    }
  }) as ColumnType<string, any>;
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
