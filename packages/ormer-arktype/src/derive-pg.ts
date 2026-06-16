import { pg, table } from "ormer";
import type { ColumnType, Params, Table } from "ormer";
import type { Type } from "arktype";
import { deriveColumn, type ParamsDerived } from "./derive.ts";
import type { TableName } from "./arktype-ext.ts";

export type PgParams = ParamsDerived<{
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
  return deriveColumn(schema, (triple) => {
    if (triple[0] === "string") {
      if (triple[1] === "uuid") return pg.uuid(triple[2]);
      if (triple[1] === "timepart") return pg.time(triple[2]);
      if (triple[1] === "datepart") return pg.date(triple[2]);
      if (triple[1] === "naivedatetime") return pg.timestamp(triple[2]);
      if ("maxLength" in triple[2] && typeof triple[2].maxLength === "number") {
        return pg.varchar(triple[2]);
      }
      return pg.text(triple[2]);
    }
    if (triple[0] === "number") {
      if (triple[1] === "float32") return pg.float4(triple[2]);
      if (triple[1] === "float64") return pg.float8(triple[2]);
      if (triple[1] === "int32") return pg.int4(triple[2]);
      if (triple[1] === "int16") return pg.int2(triple[2]);
      if (
        triple[1] === "int8" ||
        triple[1] === "uint8" ||
        triple[1] === "uint16" ||
        triple[1] === "uint32"
      ) {
        throw new Error(
          `PG has no symmetric mapping for number format: ${triple[1]}`,
        );
      }
      return pg.float8(triple[2]);
    }
    if (triple[0] === "bigint") {
      if (triple[1] === "int64" || triple[1] === "") return pg.int8(triple[2]);
      if (triple[1] === "uint64" || triple[1] === "uint128") {
        throw new Error(
          `PG has no symmetric mapping for bigint format: ${triple[1]}`,
        );
      }
      return pg.int8(triple[2]);
    }
    if (triple[0] === "boolean") {
      return pg.boolean(triple[2]);
    }
    if (triple[0] === "Date") {
      return pg.timestamptz(triple[2]);
    }
    if (triple[0] === "object") {
      return pg.jsonb({ ...triple[2], schema });
    }
    throw new Error(`Unsupported arktype choice: ${triple[0]}`);
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
