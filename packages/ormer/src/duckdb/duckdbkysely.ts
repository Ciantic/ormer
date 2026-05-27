// deno-lint-ignore-file
import * as k from "kysely";
import type {
  DuckDBInstance,
  DuckDBConnection,
  DuckDBResultReader,
  DuckDBValue,
  DuckDBType,
  DuckDBValueConverter,
  JS,
} from "@duckdb/node-api";
import {
  DuckDBBlobValue,
  DuckDBTimestampTZValue,
  DuckDBTimestampValue,
  DuckDBDateValue,
  DuckDBTimeValue,
  DuckDBTimeTZValue,
  DuckDBIntervalValue,
  DuckDBDecimalValue,
  DuckDBListValue,
  DuckDBTypeId,
  JSDuckDBValueConverter,
} from "@duckdb/node-api";

/**
 * Convert JavaScript values to DuckDB bind parameter values.
 */
function getBindParam(value: unknown): unknown {
  if (value === null || value === undefined) {
    return null;
  }
  if (value instanceof Date) {
    return new DuckDBTimestampTZValue(BigInt(value.getTime()) * 1_000_000n);
  }
  if (value instanceof Uint8Array) {
    return new DuckDBBlobValue(value);
  }
  if (typeof value === "bigint") {
    return "" + value;
  }
  if (Array.isArray(value)) {
    return new DuckDBListValue(value.map(getBindParam) as DuckDBValue[]);
  }
  if (typeof value === "object") {
    return JSON.stringify(value);
  }
  return value;
}

/**
 * Custom DuckDB value converter that returns JS-native types
 * matching our DuckdbUnifiedTypeMapping expectations.
 */
const duckdbConverter: DuckDBValueConverter<JS> = (
  value: DuckDBValue,
  type: DuckDBType,
  converter: DuckDBValueConverter<JS>,
): JS => {
  if (value === null || value === undefined) return null;

  switch (type.typeId) {
    case DuckDBTypeId.TIMESTAMP:
    case DuckDBTypeId.TIMESTAMP_S:
    case DuckDBTypeId.TIMESTAMP_MS:
    case DuckDBTypeId.TIMESTAMP_NS: {
      const ts = value as DuckDBTimestampValue;
      return ts.toString() as any;
    }
    case DuckDBTypeId.TIMESTAMP_TZ: {
      const tstz = value as DuckDBTimestampTZValue;
      // Convert to Date: micros is bigint
      return new Date(Number((tstz as any).micros / 1_000_000n)) as any;
    }
    case DuckDBTypeId.DATE: {
      return (value as DuckDBDateValue).toString() as any;
    }
    case DuckDBTypeId.TIME: {
      return (value as DuckDBTimeValue).toString() as any;
    }
    case DuckDBTypeId.TIME_TZ: {
      return (value as DuckDBTimeTZValue).toString() as any;
    }
    case DuckDBTypeId.INTERVAL: {
      return (value as DuckDBIntervalValue)
        .toString()
        .replace("months", "mons") as any;
    }
    case DuckDBTypeId.DECIMAL: {
      return (value as DuckDBDecimalValue)
        .toString()
        .replace(/(\.\d*?)0+$/, "$1")
        .replace(/\.$/, "") as any;
    }
    case DuckDBTypeId.BLOB: {
      return new Uint8Array((value as DuckDBBlobValue).bytes) as any;
    }
    case DuckDBTypeId.BIT: {
      // DuckDBBitValue has a `toString()` method
      return String(value) as any;
    }
    case DuckDBTypeId.LIST: {
      const newItems = (value as DuckDBListValue).items.map((item, idx) =>
        duckdbConverter(item, type.valueType!, converter),
      );
      return newItems as any;
    }
    default:
      return JSDuckDBValueConverter(value, type, converter);
  }
};

/**
 * Convert DuckDB result rows to plain objects using the custom converter.
 * Also parses JSON columns from strings back into objects.
 */
function getRowObjects(result: DuckDBResultReader): Record<string, unknown>[] {
  const colTypes = result.columnTypes();
  const colNames = result.columnNames();
  return result.convertRowObjects(duckdbConverter).map((row) =>
    Object.fromEntries(
      Object.entries(row).map(([k, v]) => {
        const colType = colTypes[colNames.indexOf(k)];
        if (colType?.alias === "JSON") {
          try {
            return [k, JSON.parse(v as string)];
          } catch {
            // ignore parse errors
          }
        }
        return [k, v];
      }),
    ),
  );
}

/**
 * Creates a Kysely dialect for DuckDB using @duckdb/node-api.
 * Properly converts DuckDB value types (DuckDBBlobValue, DuckDBTimestampValue,
 * etc.) to plain JS types matching DuckdbUnifiedTypeMapping.
 */
export function createDuckDbKyselyDialect(instance: DuckDBInstance): k.Dialect {
  return {
    createDriver: () =>
      ({
        acquireConnection: async () => {
          const conn = await instance.connect();
          return {
            connection: conn,
            async executeQuery(compiledQuery) {
              const sql = compiledQuery.sql;
              const params = compiledQuery.parameters.slice();
              const binds = params.map(getBindParam);

              const results = await conn.runAndReadAll(sql, binds as any);
              const rows = getRowObjects(results);

              return {
                rows: rows as any,
                numAffectedRows: BigInt(rows.length ?? 0),
                numChangedRows: BigInt(rows.length ?? 0),
              } satisfies k.QueryResult<any>;
            },
            streamQuery(_compiledQuery, _chunkSize?) {
              throw new Error("streamQuery not implemented");
            },
          } satisfies k.DatabaseConnection & {
            connection: DuckDBConnection;
          };
        },
        beginTransaction: async (connection, settings) => {
          await k.PostgresDriver.prototype.beginTransaction(
            connection,
            settings,
          );
        },
        commitTransaction: async (connection) => {
          await k.PostgresDriver.prototype.commitTransaction(connection);
        },
        rollbackTransaction: async (connection) => {
          await k.PostgresDriver.prototype.rollbackTransaction(connection);
        },
        destroy: async () => {},
        init: async () => {},
        releaseConnection: async (_connection) => {
          (_connection as any).connection.closeSync();
        },
      }) satisfies k.Driver,
    createAdapter: () => new k.PostgresAdapter(),
    createQueryCompiler: () => new k.PostgresQueryCompiler(),
    createIntrospector: (db) => new k.PostgresIntrospector(db),
  };
}
