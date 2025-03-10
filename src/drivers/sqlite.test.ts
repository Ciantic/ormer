import * as k from "npm:kysely";
import * as v from "npm:valibot";
import { Database } from "jsr:@db/sqlite";
import { assertEquals, assertNotEquals } from "jsr:@std/assert";
import { table } from "../table.ts";
import * as c from "../columns.ts";
import * as h from "../columnhelpers.ts";
import { createDbBuilder } from "../database.ts";
import { $SQLITE_UUID_GEN, ORMER_SQLITE_DRIVER } from "./sqlite.ts";
import { createSqliteDialect } from "../utils/sqlitekysely.ts";

const TEST_TABLE = table("test_table", {
    bigserial: h.pkAutoInc(),
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
    test_datetime: c.datetime(),
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
    test_rowversion: h.rowversion(),
    test_concurrencyStamp: h.concurrencyStamp(),
    test_userstring: h.userstring({ schema: v.pipe(v.string(), v.maxLength(255)), maxLength: 255 }),
    test_email: h.email(),
    test_updated_at: h.updatedAt(),
    test_created_at: h.createdAt(),
});

Deno.test("create sqlite table", () => {
    const db = createDbBuilder()
        .withTables([TEST_TABLE])
        .withSchemas()
        .withDriver(ORMER_SQLITE_DRIVER)
        .withKyselyConfig({
            dialect: {
                createDriver: () => new k.DummyDriver(),
                createAdapter: () => new k.SqliteAdapter(),
                createQueryCompiler: () => new k.SqliteQueryCompiler(),
                createIntrospector: (db) => new k.SqliteIntrospector(db),
            },
        })
        .build();
    const tablesResult = db.createTables();
    const queries = tablesResult.tables.test_table.compile().sql;

    assertEquals(
        queries.replace(/\s+/g, ""),

        `create table "test_table" (
                "bigserial" integer not null primary key autoincrement,
                "test_int32" integer not null,
                "test_int64" integer not null,
                "test_bigint" text not null,
                "test_float32" real not null,
                "test_float64" real not null,
                "test_decimal" text not null,
                "test_uuid" text not null,
                "test_string" text not null,
                "test_varchar" text not null,
                "test_boolean" integer not null,
                "test_datetime" text not null,
                "test_datepart" text not null,
                "test_timepart" text not null,
                "test_jsonb" text not null,
                "test_json" text not null,
                "test_rowversion" integer default 1 not null,
                "test_concurrencyStamp" text default ${$SQLITE_UUID_GEN} not null,
                "test_userstring" text not null,
                "test_email" text not null,
                "test_updated_at" text default CURRENT_TIMESTAMP not null,
                "test_created_at" text default CURRENT_TIMESTAMP not null
            )`.replace(/\s+/g, "")
    );

    console.log(tablesResult.extraSql.map((q) => q.sql).join("\n"));
});

Deno.test("create sqlite table, insert and update updatedAt", async () => {
    const sqlite = new Database(":memory:");

    const db = createDbBuilder()
        .withTables([TEST_TABLE])
        .withSchemas()
        .withDriver(ORMER_SQLITE_DRIVER)
        .withKyselyConfig({
            dialect: createSqliteDialect(sqlite),
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
        test_datetime: new Date(),
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
    const insertResult = await kysely
        .insertInto("test_table")
        .values(insertValue)
        .returningAll()
        .execute();

    // Ensure concurrency stamp was generated
    assertNotEquals(insertResult[0].test_concurrencyStamp, null);
    assertEquals(insertResult[0].test_concurrencyStamp.length, 36);

    // Ensure datatype deserialization works
    // assertEquals(insertResult, [
    //     {
    //         bigserial: 1,
    //         ...insertValue,
    //         test_rowversion: 1,
    //         test_concurrencyStamp: insertResult[0].test_concurrencyStamp,
    //         test_created_at: insertResult[0].test_created_at,
    //         test_updated_at: insertResult[0].test_updated_at,
    //     },
    // ]);

    const updateResult = await kysely
        .updateTable("test_table")
        .set({ test_int32: 2 })
        .returningAll()
        .execute();

    // Ensure that the concurrency stamp is updated
    assertNotEquals(insertResult[0].test_concurrencyStamp, updateResult[0].test_concurrencyStamp);

    // Ensure that the updated_at field is updated (by trigger)
    assertNotEquals(updateResult[0].test_updated_at, insertResult[0].test_updated_at);
});
