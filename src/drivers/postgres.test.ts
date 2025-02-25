import * as k from "npm:kysely";
import * as v from "npm:valibot";
import { assertEquals, assertThrows } from "jsr:@std/assert";
import { table } from "../table.ts";
import * as c from "../columns.ts";
import { createKyselyDb, createTables } from "../database.ts";
import { POSTGRES_COLUMN_TYPES } from "./postgres.ts";

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
    const db = createKyselyDb({
        tables: [TEST_TABLE],
        kysely: {
            dialect: {
                createDriver: () => new k.DummyDriver(),
                createAdapter: () => new k.PostgresAdapter(),
                createQueryCompiler: () => new k.PostgresQueryCompiler(),
                createIntrospector: (db) => new k.PostgresIntrospector(db),
            },
        },
    });

    const queries = createTables(db, [TEST_TABLE], POSTGRES_COLUMN_TYPES);

    assertEquals(
        queries.map((f) => f.sql.replace(/\s+/g, "")),
        [
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
                "test_rowversion" bigint not null,
                "test_concurrencyStamp" uuid not null,
                "test_userstring" varchar(255) not null,
                "test_email" varchar(320) not null,
                "test_updated_at" timestamp not null,
                "test_created_at" timestamp not null
            )`.replace(/\s+/g, ""),
        ]
    );
});
