import * as k from "npm:kysely";
import * as v from "npm:valibot";
import { assertEquals } from "jsr:@std/assert";
import { table } from "../table.ts";
import * as c from "../columns.ts";
import { createDbBuilder } from "../database.ts";
import { PGlite, types } from "npm:@electric-sql/pglite";

function createPgLiteDialect(db: PGlite) {
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

const TEST_TABLE = table("test_table", {
    bigserial: c.pkAutoInc(),
    test_int32: c.int32(),
    test_int64: c.int64(),
    test_bigint: c.bigint(),
    test_float32: c.float32(),
    test_float64: c.float64(),
    test_decimal: c.decimal({ precision: 10, scale: 2 }),
    test_uuid: c.uuid(),
    test_string: c.string(),
    test_varchar: c.varchar({ maxLength: 255 }),
    test_boolean: c.boolean(),
    test_timestamp: c.timestamp(),
    test_timestamptz: c.timestamptz(),
    test_datepart: c.datepart(),
    test_timepart: c.timepart(),
    test_jsonb: c.jsonb({
        schema: v.object({
            somestring: v.string(),
            someint: v.number(),
            somebool: v.boolean(),
            somearray: v.array(v.string()),
            someobject: v.object({
                foo: v.string(),
                bar: v.number(),
            }),
        }),
    }),
    test_json: c.json({
        schema: v.object({
            somestring: v.string(),
            someint: v.number(),
            somebool: v.boolean(),
            somearray: v.array(v.string()),
            someobject: v.object({
                foo: v.string(),
                bar: v.number(),
            }),
        }),
    }),
    test_rowversion: c.rowversion(),
    test_concurrencyStamp: c.concurrencyStamp(),
    test_userstring: c.userstring({ maxLength: 255 }),
    test_email: c.email(),
    test_updated_at: c.updatedAt(),
    test_created_at: c.createdAt(),
});

Deno.test("create postgres table", () => {
    const db = createDbBuilder()
        .withTables([TEST_TABLE])
        .withSchemas()
        .withPostgres()
        .withKyselyConfig({
            dialect: {
                createDriver: () => new k.DummyDriver(),
                createAdapter: () => new k.PostgresAdapter(),
                createQueryCompiler: () => new k.PostgresQueryCompiler(),
                createIntrospector: (db) => new k.PostgresIntrospector(db),
            },
        })
        .build();

    const queries = db.createTables().tables.test_table.compile().sql;

    console.log(queries);

    assertEquals(
        queries.replace(/\s+/g, ""),

        `create table "test_table" (
                "bigserial" bigserial not null primary key,
                "test_int32" integer not null,
                "test_int64" bigint not null,
                "test_bigint" numeric not null,
                "test_float32" real not null,
                "test_float64" double precision not null,
                "test_decimal" decimal(10, 2) not null,
                "test_uuid" uuid not null,
                "test_string" text not null,
                "test_varchar" varchar(255) not null,
                "test_boolean" boolean not null,
                "test_timestamp" timestamp not null,
                "test_timestamptz" timestamptz not null,
                "test_datepart" date not null,
                "test_timepart" time not null,
                "test_jsonb" jsonb not null,
                "test_json" json not null,
                "test_rowversion" bigint default 1 not null,
                "test_concurrencyStamp" uuid default gen_random_uuid() not null,
                "test_userstring" varchar(255) not null,
                "test_email" varchar(320) not null,
                "test_updated_at" timestamptz default now() not null,
                "test_created_at" timestamptz default now() not null
            )`.replace(/\s+/g, "")
    );
});

Deno.test("create postgres table with schema", async () => {
    const db = createDbBuilder()
        .withTables([TEST_TABLE])
        .withSchemas()
        .withPostgres()
        .withKyselyConfig({
            dialect: createPgLiteDialect(
                new PGlite({
                    parsers: {
                        [types.TIMESTAMP]: (value) => {
                            // Parse timestamps as UTC
                            return new Date(value + "Z");
                        },
                        [types.NUMERIC]: (value) => {
                            try {
                                return BigInt(value);
                            } catch (_e) {
                                return value;
                            }
                        },
                        [types.DATE]: (value) => {
                            return value;
                        },
                    },
                })
            ),
        })
        .build();

    await db.createTables().execute();

    const kysely = db.getKysely();
    const insertValue = {
        test_int32: 1,
        test_bigint: 3n,
        test_boolean: true,
        test_string: "test",
        test_varchar: "test",
        test_timestamp: new Date(),
        test_timestamptz: new Date(),
        test_datepart: "2021-01-01",
        test_timepart: "12:00:00",
        test_jsonb: {
            somestring: "test",
            someint: 1,
            somebool: true,
            somearray: ["foo", "bar"],
            someobject: { foo: "bar", bar: 1 },
        },
        test_decimal: "1.23",
        test_email: "john@example.com",
        test_float32: 1.23,
        test_float64: 1.23,
        test_int64: 3,
        test_json: {
            somestring: "test",
            someint: 1,
            somebool: true,
            somearray: ["foo", "bar"],
            someobject: { foo: "bar", bar: 1 },
        },
        test_userstring: "test",
        test_uuid: "3aa2d82f-241f-4a31-a364-99736dd49d96",
    };
    await kysely.insertInto("test_table").values(insertValue).execute();

    const results = await kysely.selectFrom("test_table").selectAll().execute();

    assertEquals(results, [
        {
            bigserial: 1,
            ...insertValue,
            test_rowversion: 1,
            test_concurrencyStamp: results[0].test_concurrencyStamp,
            test_created_at: results[0].test_created_at,
            test_updated_at: results[0].test_updated_at,
        },
    ]);
});
