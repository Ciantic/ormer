/**
 * Type that represents the input and output types for a given DuckDB type mapping.
 *
 * Input = Type used for INSERT and UPDATE operations
 * Output = Type used for SELECT operations results
 */
type InputOutput<I, O = I> = {
  readonly __insert__: I;
  readonly __update__: I;
  readonly __select__: O;
};

export type DuckdbUnifiedTypeMapping = {
  // Numeric types
  int1: InputOutput<string | number | bigint, number>;
  int2: InputOutput<string | number | bigint, number>;
  int4: InputOutput<string | number | bigint, number>;
  int8: InputOutput<string | number | bigint, bigint>;
  hugeint: InputOutput<string | number | bigint, bigint>;
  bignum: InputOutput<string | number | bigint, bigint>;
  utinyint: InputOutput<string | number | bigint, number>;
  usmallint: InputOutput<string | number | bigint, number>;
  uinteger: InputOutput<string | number | bigint, number>;
  ubigint: InputOutput<string | number | bigint, bigint>;
  uhugeint: InputOutput<string | number | bigint, bigint>;
  float4: InputOutput<string | number | bigint, number>;
  float8: InputOutput<string | number | bigint, number>;
  decimal: InputOutput<string | number | bigint, string>;

  // Character types
  text: InputOutput<string>;
  varchar: InputOutput<string>;
  char: InputOutput<string>;

  // Binary types
  blob: InputOutput<Uint8Array>;

  // Date/Time types
  timestamp: InputOutput<string>;
  timestamptz: InputOutput<Date>;
  date: InputOutput<string>;
  time: InputOutput<string>;
  interval: InputOutput<string>;

  // Boolean type
  boolean: InputOutput<boolean>;

  // UUID type
  uuid: InputOutput<string>;

  // JSON type
  json: InputOutput<Record<string, any>>;

  // Bit string type
  bit: InputOutput<string>;
};

type DuckDB = {
  DuckDBBlobValue: any;
  DuckDBTimestampTZValue: any;
  DuckDBTimestampValue: any;
  DuckDBDateValue: any;
  DuckDBTimeValue: any;
  DuckDBTimeTZValue: any;
  DuckDBIntervalValue: any;
  DuckDBDecimalValue: any;
  DuckDBListValue: any;
  JSDuckDBValueConverter: any;
};

function createDuckDbMapper(duckdb: DuckDB) {
  const {
    DuckDBBlobValue,
    DuckDBTimestampTZValue,
    DuckDBListValue,
    JSDuckDBValueConverter,
  } = duckdb;
  // Inlined numeric DuckDBTypeId constants to avoid importing them (from @duckdb/node-api)
  const TYPE_BIGINT = 5;
  const TYPE_UBIGINT = 9;
  const TYPE_TIMESTAMP = 12;
  const TYPE_DATE = 13;
  const TYPE_TIME = 14;
  const TYPE_INTERVAL = 15;
  const TYPE_HUGEINT = 16;
  const TYPE_BLOB = 18;
  const TYPE_DECIMAL = 19;
  const TYPE_TIMESTAMP_S = 20;
  const TYPE_TIMESTAMP_MS = 21;
  const TYPE_TIMESTAMP_NS = 22;
  const TYPE_LIST = 24;
  const TYPE_BIT = 29;
  const TYPE_TIME_TZ = 30;
  const TYPE_TIMESTAMP_TZ = 31;
  const TYPE_UHUGEINT = 32;
  const TYPE_TIME_NS = 39;
  const TYPE_BIGNUM = 35;

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
      return new DuckDBListValue(value.map(getBindParam));
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
  function duckdbConverter(
    value: unknown,
    type: { typeId: number; alias?: string; valueType?: any },
    converter: unknown,
  ): unknown {
    if (value === null || value === undefined) return null;

    switch (type.typeId) {
      case TYPE_TIMESTAMP:
      case TYPE_TIMESTAMP_S:
      case TYPE_TIMESTAMP_MS:
      case TYPE_TIMESTAMP_NS: {
        return (value as any).toString();
      }
      case TYPE_TIMESTAMP_TZ: {
        const tstz = value as { micros: bigint };
        return new Date(Number(tstz.micros) / 1_000_000);
      }
      case TYPE_DATE: {
        return (value as any).toString();
      }
      case TYPE_TIME:
      case TYPE_TIME_TZ: {
        return (value as any).toString();
      }
      case TYPE_TIME_NS: {
        return (value as any).toString();
      }
      case TYPE_INTERVAL: {
        return (value as any).toString().replace("months", "mons");
      }
      case TYPE_DECIMAL: {
        return (value as any)
          .toString()
          .replace(/(\.\d*?)0+$/, "$1")
          .replace(/\.$/, "");
      }
      case TYPE_BLOB: {
        return new Uint8Array((value as { bytes: Uint8Array }).bytes);
      }
      case TYPE_BIT: {
        return String(value);
      }
      case TYPE_HUGEINT:
      case TYPE_UHUGEINT:
      case TYPE_BIGNUM:
      case TYPE_BIGINT:
      case TYPE_UBIGINT: {
        // DuckDB JSON conversion returns these as strings; convert to bigint
        return BigInt(value as string);
      }
      case TYPE_LIST: {
        const listVal = value as { items: unknown[] };
        return listVal.items.map((item) =>
          duckdbConverter(item, type.valueType!, converter),
        );
      }
      default:
        return JSDuckDBValueConverter(value, type, converter);
    }
  }

  /**
   * Convert DuckDB result rows to plain objects using the custom converter.
   * Also parses JSON columns from strings back into objects.
   */
  function getRowObjects(result: {
    columnTypes(): { alias?: string }[];
    columnNames(): string[];
    convertRowObjects(converter: unknown): Record<string, unknown>[];
  }): Record<string, unknown>[] {
    const colTypes = result.columnTypes();
    const colNames = result.columnNames();
    return result
      .convertRowObjects(duckdbConverter)
      .map((row: Record<string, unknown>) =>
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
  return {
    getBindParam,
    getRowObjects,
  };
}

type Kysely = {
  PostgresDriver: any;
  PostgresAdapter: any;
  PostgresQueryCompiler: any;
  PostgresIntrospector: any;
};

type KyselyQueryResult = {
  rows: any[];
  numAffectedRows: bigint;
  numChangedRows: bigint;
};

type KyselyDatabaseConnection = {
  executeQuery(compiledQuery: any): Promise<KyselyQueryResult>;
  streamQuery(compiledQuery: any, chunkSize?: number): AsyncIterable<any>;
};

type KyselyCompiledQuery = { sql: string; parameters: unknown[] };

type KyselyDriver = {
  acquireConnection(): Promise<KyselyDatabaseConnection>;
  beginTransaction(connection: any, settings: any): Promise<void>;
  commitTransaction(connection: any): Promise<void>;
  rollbackTransaction(connection: any): Promise<void>;
  destroy(): Promise<void>;
  init(): Promise<void>;
  releaseConnection(connection: any): Promise<void>;
};

/**
 * Creates a Kysely dialect for DuckDB using @duckdb/node-api.
 *
 * Takes the DuckDB module at runtime to avoid making @duckdb/node-api a hard
 * dependency of ormer (it's a devDependency that users install themselves).
 *
 * Properly converts DuckDB value types (DuckDBBlobValue, DuckDBTimestampValue,
 * etc.) to plain JS types matching DuckdbUnifiedTypeMapping.
 *
 * @example
 * ```
 * import * as k from "kysely";
 * import { DuckDBInstance } from "@duckdb/node-api";
 * import * as duckdb from "@duckdb/node-api";
 * import { createDuckDbKyselyDialect } from "ormer";
 *
 * const instance = await DuckDBInstance.create(":memory:");
 * const db = new k.Kysely({ dialect: createDuckDbKyselyDialect(k, duckdb, instance) });
 * ```
 */
export function createDuckDbKyselyDialect(
  k: Kysely,
  duckdb: DuckDB,
  instance: {
    connect: () => Promise<any>;
  },
): {
  createDriver: () => any;
  createAdapter: () => any;
  createQueryCompiler: () => any;
  createIntrospector: (db: any) => any;
} {
  // Track DuckDB connections for cleanup
  const duckConnections = new WeakMap<
    KyselyDatabaseConnection,
    { closeSync(): void }
  >();

  const { getBindParam, getRowObjects } = createDuckDbMapper(duckdb);

  return {
    createDriver: () =>
      ({
        acquireConnection: async () => {
          const conn = await instance.connect();
          const dbConn: KyselyDatabaseConnection = {
            async executeQuery(compiledQuery: KyselyCompiledQuery) {
              const sql = compiledQuery.sql;
              const params = compiledQuery.parameters.slice();
              const binds = params.map(getBindParam);

              const results = await conn.runAndReadAll(sql, binds);
              const rows = getRowObjects(results);

              return {
                rows: rows as any,
                numAffectedRows: BigInt(rows.length ?? 0),
                numChangedRows: BigInt(rows.length ?? 0),
              } satisfies KyselyQueryResult;
            },
            streamQuery(_compiledQuery: any, _chunkSize?: number) {
              throw new Error("streamQuery not implemented");
            },
          };
          duckConnections.set(dbConn, conn);
          return dbConn;
        },
        beginTransaction: async (connection: any, settings: any) => {
          await k.PostgresDriver.prototype.beginTransaction(
            connection,
            settings,
          );
        },
        commitTransaction: async (connection: any) => {
          await k.PostgresDriver.prototype.commitTransaction(connection);
        },
        rollbackTransaction: async (connection: any) => {
          await k.PostgresDriver.prototype.rollbackTransaction(connection);
        },
        destroy: async () => {},
        init: async () => {},
        releaseConnection: async (_connection: any) => {
          const duckConn = duckConnections.get(_connection);
          duckConn?.closeSync();
        },
      }) satisfies KyselyDriver,
    createAdapter: () => new k.PostgresAdapter(),
    createQueryCompiler: () => new k.PostgresQueryCompiler(),
    createIntrospector: (db: any) => new k.PostgresIntrospector(db),
  };
}
