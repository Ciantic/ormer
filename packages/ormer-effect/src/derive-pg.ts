import { pg, table } from "ormer";
import type { ColumnType, ColumnTypeSingualr, Table } from "ormer";
import type { Schema } from "effect";
import {
  deriveColumn,
  type EffectSchemas,
  type ParamsDerived,
} from "./derive.ts";

/**
 * Map a generic Effect schema choice (returned by deriveColumn) to a
 * PostgreSQL ColumnType.
 */
export function derivePgColumn<T extends Schema.Top>(schema: {
  ast: T["ast"];
}): ColumnType<string, any> {
  return chooser(deriveColumn(schema));
}

function chooser([tag, params]: EffectSchemas): ColumnType<string, any> {
  const p = params as ParamsDerived & Record<string, unknown>;

  switch (tag) {
    // -----------------------------------------------------------------------
    // String variants
    // -----------------------------------------------------------------------
    case "uuid":
      return pg.uuid(params);
    case "url":
      return pg.text(params);
    case "email":
      return pg.varchar(params);
    case "isoTime":
    case "isoDateTime":
      throw new Error(`PG has no symmetric mapping for: ${tag}`);
    case "isoTimeSecond":
      return pg.time(params);
    case "isoDate":
      return pg.date(params);
    case "naiveDatetime":
      return pg.timestamp(params as any);
    case "string":
      if ("maxLength" in p && typeof p.maxLength === "number") {
        return pg.varchar(params as any);
      }
      return pg.text(params);

    // -----------------------------------------------------------------------
    // Network types (treated as string by deriveColumn, dispatched here)
    // -----------------------------------------------------------------------
    case "ipv4":
    case "ipv6":
      return pg.inet(params);
    case "mac":
      return pg.macaddr(params);

    // -----------------------------------------------------------------------
    // Number variants
    // -----------------------------------------------------------------------
    case "int8":
    case "uint8":
    case "uint16":
    case "uint32":
      throw new Error(`PG has no symmetric mapping for number format: ${tag}`);
    case "int16":
      return pg.int2(params);
    case "int32":
      return pg.int4(params);
    case "float32":
      return pg.float4(params);
    case "float64":
      return pg.float8(params);
    case "number":
      return pg.float8(params);

    // -----------------------------------------------------------------------
    // BigInt variants
    // -----------------------------------------------------------------------
    case "bigint":
      return pg.int8(params);
    case "int64":
      return pg.int8(params);
    case "uint64":
    case "int128":
    case "uint128":
      throw new Error(`PG has no symmetric mapping for bigint format: ${tag}`);

    // -----------------------------------------------------------------------
    // Boolean
    // -----------------------------------------------------------------------
    case "boolean":
      return pg.boolean(params);

    // -----------------------------------------------------------------------
    // Date
    // -----------------------------------------------------------------------
    case "date":
      return pg.timestamptz(params as any);

    // -----------------------------------------------------------------------
    // Object / JSON
    // -----------------------------------------------------------------------
    case "object":
      return pg.jsonb(params as any);

    // -----------------------------------------------------------------------
    // Fallback
    // -----------------------------------------------------------------------
    default:
      throw new Error(
        `derivePgColumn: Unhandled tag "${tag}" with params ${JSON.stringify(params)}`,
      );
  }
}

/**
 * Derive an ormer PgTable from an Effect Struct schema annotated with
 * `Table("name", ...)` or `dbTable` annotation.
 */
export function derivePgTable<S extends Schema.Struct<any>>(
  schema: S,
): Table<string, Record<string, ColumnType<string, any>>> {
  const tableName = (schema.ast.annotations as any)?.dbTable as
    | string
    | undefined;
  if (typeof tableName !== "string") {
    throw new Error(
      "Effect Struct must be annotated with Table('name', schema) or dbTable annotation.",
    );
  }

  const properties =
    (schema.ast as any)?.propertySignatures ??
    (schema.ast as any)?.fields ??
    [];

  const columns: Record<string, ColumnType<string, any>> = {};
  for (const prop of properties) {
    const key = typeof prop === "string" ? prop : (prop.name ?? prop.key);
    const propSchema =
      typeof prop === "string"
        ? (schema.ast as any)?.propertySignatures?.[prop]
        : (prop.type ?? prop.value ?? prop.schema);
    if (key && propSchema) {
      columns[key] = derivePgColumn({ ast: propSchema });
    }
  }

  return table(tableName as never, columns) as any;
}
