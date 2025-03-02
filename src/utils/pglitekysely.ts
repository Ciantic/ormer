// deno-lint-ignore-file
import * as k from "npm:kysely";
import { PGlite } from "npm:@electric-sql/pglite";

export function createPgLiteDialect(db: PGlite) {
    return {
        createDriver: () =>
            ({
                acquireConnection: () => {
                    return Promise.resolve({
                        executeQuery: async (compiledQuery) => {
                            const results = await db.query(
                                compiledQuery.sql,
                                compiledQuery.parameters.slice()
                            );
                            return {
                                rows: results.rows as any,
                                numAffectedRows: BigInt(results.affectedRows ?? 0),
                                numChangedRows: BigInt(results.affectedRows ?? 0),
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
        createAdapter: () => new k.PostgresAdapter(),
        createQueryCompiler: () => new k.PostgresQueryCompiler(),
        createIntrospector: (db) => new k.PostgresIntrospector(db),
    } satisfies k.Dialect;
}
