// deno-lint-ignore-file
import * as k from "npm:kysely";
import type { DuckDBInstance, DuckDBConnection } from "npm:@duckdb/node-api";

export function createDuckDbDialect(db: DuckDBInstance) {
    return {
        createDriver: () =>
            ({
                acquireConnection: async () => {
                    return {
                        connection: await db.connect(),
                        async executeQuery(compiledQuery) {
                            const results = await this.connection.runAndReadAll(
                                compiledQuery.sql,
                                compiledQuery.parameters.slice() as any
                            );
                            const rows = results.getRowObjectsJson();

                            return {
                                rows: rows as any,
                                numAffectedRows: BigInt(rows.length ?? 0),
                                numChangedRows: BigInt(rows.length ?? 0),
                            } satisfies k.QueryResult<any>;
                        },
                        streamQuery(_compiledQuery, _chunkSize?) {
                            throw new Error("streamQuery not implemented");
                        },
                    } satisfies k.DatabaseConnection & { connection: DuckDBConnection };
                },
                beginTransaction: async (connection, settings) => {
                    await k.PostgresDriver.prototype.beginTransaction(connection, settings);
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
                    (_connection as any).connection.close();
                },
            } satisfies k.Driver),
        createAdapter: () => new k.PostgresAdapter(),
        createQueryCompiler: () => new k.PostgresQueryCompiler(),
        createIntrospector: (db) => new k.PostgresIntrospector(db),
    } satisfies k.Dialect;
}
