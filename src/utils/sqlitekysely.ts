// deno-lint-ignore-file
import * as k from "npm:kysely";
import type { Database } from "jsr:@db/sqlite";

export function createSqliteDialect(db: Database) {
    return {
        createDriver: () =>
            ({
                acquireConnection: () => {
                    return Promise.resolve({
                        executeQuery: async (compiledQuery) => {
                            let stmt;
                            try {
                                stmt = db.prepare(compiledQuery.sql);
                            } catch (e) {
                                console.error("Error preparing statement", e, compiledQuery.sql);
                                throw e;
                            }

                            const rows = stmt.all(...(compiledQuery.parameters.slice() as any));
                            return {
                                rows: rows as any,
                                numAffectedRows: BigInt(rows.length),
                                numChangedRows: BigInt(rows.length),
                            } satisfies k.QueryResult<any>;
                        },
                        streamQuery: (_compiledQuery, _chunkSize?) => {
                            throw new Error("streamQuery not implemented");
                        },
                    } satisfies k.DatabaseConnection);
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
                releaseConnection: async (_connection) => {},
            } satisfies k.Driver),
        createAdapter: () => new k.SqliteAdapter(),
        createQueryCompiler: () => new k.SqliteQueryCompiler(),
        createIntrospector: (db) => new k.SqliteIntrospector(db),
    } satisfies k.Dialect;
}
