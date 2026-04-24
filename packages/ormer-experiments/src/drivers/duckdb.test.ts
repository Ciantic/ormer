import * as k from "kysely";
import * as v from "valibot";
import { describe, it, expect } from "vitest";
import { table } from "../table.ts";
import * as c from "../columns.ts";
import * as h from "../columnhelpers.ts";
import { createDbBuilder } from "../database.ts";
import { ORMER_DUCKDB_DRIVER } from "./duckdb.ts";
import { createDuckDbDialect } from "../utils/duckdbkysely.ts";
import { DuckDBInstance } from "@duckdb/node-api";

const TEST_TABLE = table("test_table", {
  pk_auto_inc: h.pkAutoInc(),
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
  test_datetime2: c.datetime(),
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
  test_userstring: h.userstring({
    schema: v.pipe(v.string(), v.maxLength(255)),
    maxLength: 255,
  }),
  test_email: h.email(),
  test_updated_at: h.updatedAt(),
  test_created_at: h.createdAt(),
});
describe("duckdb", () => {
  it("create duckdb table", () => {
    const db = createDbBuilder()
      .withTables([TEST_TABLE])
      .withSchemas()
      .withDriver(ORMER_DUCKDB_DRIVER)
      .withKyselyConfig({
        dialect: {
          createDriver: () => new k.DummyDriver(),
          createAdapter: () => new k.PostgresAdapter(),
          createQueryCompiler: () => new k.PostgresQueryCompiler(),
          createIntrospector: (db) => new k.PostgresIntrospector(db),
        },
      })
      .build();
    const tablesResult = db.createTables();
    const queries = tablesResult.tables.test_table.compile().sql;

    expect(queries.replace(/\s+/g, "")).toBe(
      `create table "test_table" (
                "pk_auto_inc" int8 default nextval('test_table_pk_auto_inc_seq') not null primary key,
                "test_int32" int4 not null,
                "test_int64" int8 not null,
                "test_bigint" hugeint not null,
                "test_float32" real not null,
                "test_float64" float8 not null,
                "test_decimal" decimal(10, 2) not null,
                "test_uuid" uuid not null,
                "test_string" text not null,
                "test_varchar" varchar(255) not null,
                "test_boolean" boolean not null,
                "test_datetime" timestamptz not null,
                "test_datetime2" timestamptz not null,
                "test_datepart" date not null,
                "test_timepart" time not null,
                "test_jsonb" json not null,
                "test_json" json not null,
                "test_rowversion" int8 default 1 not null,
                "test_concurrencyStamp" uuid default gen_random_uuid() not null,
                "test_userstring" varchar(255) not null,
                "test_email" varchar(320) not null,
                "test_updated_at" timestamptz default current_timestamp not null,
                "test_created_at" timestamptz default current_timestamp not null
            )`.replace(/\s+/g, ""),
    );

    // console.log(tablesResult.appendSql.map((q) => q.sql).join("\n"));
  });

  it("create duckdb table, insert and update updatedAt", async () => {
    const instance = await DuckDBInstance.create(":memory:", {});
    const db = createDbBuilder()
      .withTables([TEST_TABLE])
      .withSchemas()
      .withDriver(ORMER_DUCKDB_DRIVER)
      .withKyselyConfig({
        dialect: createDuckDbDialect(instance),
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
      test_datetime: new Date("2024-01-01T12:00:00Z"),
      test_datetime2: new Date("2024-01-01T12:00:00Z"),
      test_datepart: "2024-01-01",
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
    if (!results[0]) {
      throw new Error("Expected to have results");
    }

    expect(results).toEqual([
      {
        pk_auto_inc: "1",
        ...insertValue,
        test_float32: 1.2300000190734863,
        test_datetime: "2024-01-01 15:00:00+03",
        test_datetime2: "2024-01-01 15:00:00+03",
        test_bigint: "3",
        test_rowversion: "1",
        test_int64: "3",
        test_json: JSON.stringify(insertValue.test_json),
        test_jsonb: JSON.stringify(insertValue.test_jsonb),
        test_concurrencyStamp: results[0].test_concurrencyStamp,
        test_created_at: results[0].test_created_at,
        test_updated_at: results[0].test_updated_at,
      },
    ]);

    const results2 = await kysely
      .updateTable("test_table")
      .set({ test_int32: 2 })
      .returningAll()
      .execute();

    if (!results2[0]) {
      throw new Error("Expected to have results");
    }

    // TODO: Ensure that the updated_at field is updated (by trigger)
    // expect(results2[0].test_updated_at).not.toBe(results[0].test_updated_at);
  });
});
