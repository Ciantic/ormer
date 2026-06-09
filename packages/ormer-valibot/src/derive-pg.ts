import { pg, table } from "ormer";
import type { ColumnType, Params, Table } from "ormer";
import {
  deriveColumn,
  extractDbMetadata,
  type AnyValibotSchema,
} from "./derive.ts";

// ---------------------------------------------------------------------------
// Runtime implementation
// ---------------------------------------------------------------------------

/**
 * Derive a PgColumn from a valibot schema.
 */
export function derivePgColumn(
  schema: AnyValibotSchema,
): ColumnType<string, any> {
  // Check for explicit dbPgColumnType override in metadata
  const dbMeta = extractDbMetadata(schema);
  if (dbMeta?.pgColumnType) {
    return dbMeta.pgColumnType as ColumnType<any, any>;
  }

  return deriveColumn(schema, ([t, params]) => {
    switch (t) {
      case "uuid":
        return pg.uuid(params);
      case "url":
      case "emoji":
      case "cuid2":
      case "base64":
      case "email":
        return pg.text(params);
      case "nanoid":
      case "ulid":
      case "string":
        return "maxLength" in params ? pg.varchar(params) : pg.text(params);
      case "ipv4":
      case "ipv6":
        return pg.inet(params);
      case "mac":
        return pg.macaddr(params);
      case "isoTime":
        throw new Error(
          `v.isoTime() is not supported by derivePgColumn. Use v.isoTimeSecond() instead.`,
        );
      case "isoTimeSecond":
        return pg.time(params);
      case "isoDate":
        return pg.date(params);
      case "isoDatetime":
        throw new Error(
          `v.isoDateTime() is not supported by derivePgColumn. Use d.naiveDatetime() instead.`,
        );
      case "naiveDatetime":
        return pg.timestamp(params as Params);
      case "int64":
      case "bigint":
        return pg.int8(params);
      case "uint64":
        throw new Error(`PG has no mapping for uint64`);
      case "int32":
        return pg.int4(params);
      case "uint32":
        throw new Error(`PG has no mapping for uint32`);
      case "float32":
        return pg.float4(params);
      case "float64":
      case "number":
        return pg.float8(params);
      case "boolean":
        return pg.boolean(params);
      case "date":
        return pg.timestamptz(params as Params);
      case "json":
      case "object": {
        if (!("schema" in params)) {
          throw new Error(
            `Object types must have a "schema" property for deriveColumn.`,
          );
        }
        return pg.jsonb(params as any);
      }
    }
  }) as any;
}

// ---------------------------------------------------------------------------
// derivePgTable
// ---------------------------------------------------------------------------

/**
 * Derive an ormer PgTable from a valibot object schema.
 */
export function derivePgTable(
  schema: AnyValibotSchema,
): Table<string, Record<string, ColumnType<any, any>>> {
  const dbMeta = extractDbMetadata(schema);
  if (!dbMeta || typeof dbMeta.tableName !== "string") {
    throw new Error(
      "Valibot object must have .dbTable() metadata. Call d.dbTable('table_name') in the pipe.",
    );
  }
  const tableName = dbMeta.tableName;

  const entries = schema.entries ?? {};
  const columns: Record<string, ColumnType<any, any>> = {};

  for (const key of Object.keys(entries)) {
    const entry = entries[key];
    if (!entry) continue;
    const entryMeta = extractDbMetadata(entry);
    if (entryMeta?.navigation) {
      // Skip navigations (dbRef) — handled as relationship metadata
      continue;
    }
    columns[key] = derivePgColumn(entry);
  }

  return table(tableName as never, columns) as any;
}
