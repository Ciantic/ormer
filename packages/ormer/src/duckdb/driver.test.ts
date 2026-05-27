import { describe, it, expect } from "vitest";
import * as k from "kysely";
import * as duckdb from "./columns.ts";
import { table } from "../table.ts";
import { database } from "../database.ts";
import { createTableSql } from "../sql.ts";
import { DUCKDBCOLUMN_TO_SQLTYPE, DUCKDB_OPTS } from "./driver.ts";
import {
  createDuckDbKyselyDialect,
  type DuckdbUnifiedTypeMapping,
} from "./mapping.ts";
import type { InferKyselyTypes } from "../index.ts";
import { DuckDBInstance } from "@duckdb/node-api";
import * as duckdbModule from "@duckdb/node-api";

const allTypesTable = table("all_types", {
  // integer types
  id: duckdb.int8({
    primaryKey: true,
  }),
  int1_col: duckdb.int1(),
  int1_nullable: duckdb.int1({ nullable: true }),
  int2_col: duckdb.int2(),
  int4_col: duckdb.int4(),
  int8_col: duckdb.int8(),
  hugeint_col: duckdb.hugeint(),
  bignum_col: duckdb.bignum(),
  utinyint_col: duckdb.utinyint(),
  usmallint_col: duckdb.usmallint(),
  uinteger_col: duckdb.uinteger(),
  ubigint_col: duckdb.ubigint(),
  uhugeint_col: duckdb.uhugeint(),
  // float types
  float4_col: duckdb.float4(),
  float8_col: duckdb.float8(),
  decimal_col: duckdb.decimal({ precision: 10, scale: 2 }),
  // string types
  text_col: duckdb.text(),
  varchar_col: duckdb.varchar({ maxLength: 255 }),
  char_col: duckdb.char({ length: 10 }),
  // binary
  blob_col: duckdb.blob(),
  // boolean
  bool_col: duckdb.boolean(),
  // uuid
  uuid_col: duckdb.uuid(),
  uuid_with_default: duckdb.uuid({ default: "generate" }),
  // date/time types
  timestamp_col: duckdb.timestamp(),
  timestamp_now: duckdb.timestamp({ default: "now" }),
  timestamptz_col: duckdb.timestamptz(),
  timestamptz_now: duckdb.timestamptz({ default: "now" }),
  date_col: duckdb.date(),
  time_col: duckdb.time(),
  interval_col: duckdb.interval(),
  // json
  json_col: duckdb.json({ schema: null as any }),
  // bit string
  bit_col: duckdb.bit({ length: 8 }),
  // unique
  unique_col: duckdb.text({ unique: true }),
});

const referencedTable = table("referenced", {
  id: duckdb.int8({
    primaryKey: true,
  }),
  name: duckdb.text(),
});

const withFkTable = table("with_fk", {
  id: duckdb.int8({
    primaryKey: true,
  }),
  ref_id: duckdb.foreignKey(referencedTable, "id"),
});

const db = database({}, allTypesTable, referencedTable, withFkTable);

describe("duckdb createTableSql", () => {
  it("generates correct SQL for all column types", () => {
    const sql = createTableSql(DUCKDBCOLUMN_TO_SQLTYPE, db, DUCKDB_OPTS);
    expect(sql).toMatchInlineSnapshot(`
      "CREATE TABLE "all_types" (
        "id" int8 NOT NULL PRIMARY KEY,
        "int1_col" int1 NOT NULL,
        "int1_nullable" int1,
        "int2_col" int2 NOT NULL,
        "int4_col" int4 NOT NULL,
        "int8_col" int8 NOT NULL,
        "hugeint_col" hugeint NOT NULL,
        "bignum_col" bignum NOT NULL,
        "utinyint_col" utinyint NOT NULL,
        "usmallint_col" usmallint NOT NULL,
        "uinteger_col" uinteger NOT NULL,
        "ubigint_col" ubigint NOT NULL,
        "uhugeint_col" uhugeint NOT NULL,
        "float4_col" float4 NOT NULL,
        "float8_col" float8 NOT NULL,
        "decimal_col" decimal(10,2) NOT NULL,
        "text_col" text NOT NULL,
        "varchar_col" varchar(255) NOT NULL,
        "char_col" char(10) NOT NULL,
        "blob_col" blob NOT NULL,
        "bool_col" boolean NOT NULL,
        "uuid_col" uuid NOT NULL,
        "uuid_with_default" uuid NOT NULL DEFAULT gen_random_uuid(),
        "timestamp_col" timestamp NOT NULL,
        "timestamp_now" timestamp NOT NULL DEFAULT current_timestamp,
        "timestamptz_col" timestamptz NOT NULL,
        "timestamptz_now" timestamptz NOT NULL DEFAULT current_timestamp,
        "date_col" date NOT NULL,
        "time_col" time NOT NULL,
        "interval_col" interval NOT NULL,
        "json_col" json NOT NULL,
        "bit_col" bit(8) NOT NULL,
        "unique_col" text NOT NULL UNIQUE
      );

      CREATE TABLE "referenced" (
        "id" int8 NOT NULL PRIMARY KEY,
        "name" text NOT NULL
      );

      CREATE TABLE "with_fk" (
        "id" int8 NOT NULL PRIMARY KEY,
        "ref_id" int8 NOT NULL,
        FOREIGN KEY ("ref_id") REFERENCES "referenced"("id")
      );"
    `);
  });

  it("executes CREATE TABLE in a real DuckDB in-memory instance", async () => {
    const instance = await DuckDBInstance.create(":memory:");
    const connection = await instance.connect();

    const sql = createTableSql(DUCKDBCOLUMN_TO_SQLTYPE, db, DUCKDB_OPTS);
    const statements = sql.split(";").filter((s) => s.trim().length > 0);

    for (const stmt of statements) {
      await connection.run(stmt.trim() + ";");
    }

    // Verify tables were created by querying the schema
    const result = await connection.runAndReadAll(
      `SELECT table_name FROM information_schema.tables WHERE table_schema = 'main' ORDER BY table_name`,
    );
    const rows = result.getRows();
    const tableNames = rows.map((r) => String(r[0]));
    expect(tableNames).toEqual(["all_types", "referenced", "with_fk"]);

    connection.closeSync();
  });

  it("DuckDB: inserts a row with all columns via Kysely and reads it back", async () => {
    const instance = await DuckDBInstance.create(":memory:");
    const conn = await instance.connect();

    const db = database({}, allTypesTable);
    const sql = createTableSql(DUCKDBCOLUMN_TO_SQLTYPE, db, DUCKDB_OPTS);
    const statements = sql.split(";").filter((s) => s.trim().length > 0);
    for (const stmt of statements) {
      await conn.run(stmt.trim() + ";");
    }
    conn.closeSync();

    type KyselyTypes = InferKyselyTypes<typeof db, DuckdbUnifiedTypeMapping>;

    const kyselyDb = new k.Kysely<KyselyTypes>({
      dialect: createDuckDbKyselyDialect(k, duckdbModule, instance),
    });

    const blobValue = new Uint8Array([1, 2, 3]);

    const insertRow = {
      id: 100n,
      int1_col: 1,
      int1_nullable: null,
      int2_col: 2,
      int4_col: 3,
      int8_col: 4n,
      hugeint_col: 5n,
      bignum_col: 6n,
      utinyint_col: 7,
      usmallint_col: 8,
      uinteger_col: 9,
      ubigint_col: 10n,
      uhugeint_col: 11n,
      float4_col: 1.5,
      float8_col: 2.5,
      decimal_col: "10.99",
      text_col: "hello",
      varchar_col: "world",
      char_col: "abcdefg",
      blob_col: blobValue,
      bool_col: true,
      uuid_col: "550e8400-e29b-41d4-a716-446655440000",
      timestamp_col: "2024-01-15 10:30:00",
      timestamptz_col: new Date("2024-01-15T10:30:00Z"),
      date_col: "2024-01-15",
      time_col: "10:30:00",
      interval_col: "1 year",
      json_col: { key: "value" },
      bit_col: "10101010",
      unique_col: "unique_value",
    } satisfies k.InsertObject<KyselyTypes, "all_types">;

    await kyselyDb.insertInto("all_types").values(insertRow).execute();

    const results = await kyselyDb
      .selectFrom("all_types")
      .selectAll()
      .execute();

    const row = results[0]!;
    expect(row.int1_col).toBe(1);
    expect(row.int1_nullable).toBe(null);
    expect(row.int2_col).toBe(2);
    expect(row.int4_col).toBe(3);
    expect(row.int8_col).toBe(4n);
    expect(row.hugeint_col).toBe(5n);
    expect(row.bignum_col).toBe(6n);
    expect(row.utinyint_col).toBe(7);
    expect(row.usmallint_col).toBe(8);
    expect(row.uinteger_col).toBe(9);
    expect(row.ubigint_col).toBe(10n);
    expect(row.uhugeint_col).toBe(11n);
    expect(row.float4_col).toBe(1.5);
    expect(row.float8_col).toBe(2.5);
    expect(row.decimal_col).toBe("10.99");
    expect(row.text_col).toBe("hello");
    expect(row.varchar_col).toBe("world");
    expect(row.char_col).toBe("abcdefg");
    expect(row.blob_col).toEqual(blobValue);
    expect(row.bool_col).toBe(true);
    expect(row.uuid_col).toBe("550e8400-e29b-41d4-a716-446655440000");
    expect(row.timestamp_col).toBe("2024-01-15 10:30:00");
    expect(row.timestamptz_col).toEqual(new Date("2024-01-15T10:30:00Z"));
    expect(row.date_col).toBe("2024-01-15");
    expect(row.time_col).toBe("10:30:00");
    expect(row.interval_col).toBe("1 year");
    expect(row.json_col).toEqual({ key: "value" });
    expect(row.bit_col).toBe("10101010");
    expect(row.unique_col).toBe("unique_value");
    expect(row.id).toBe(100n);
    expect(row.timestamp_now).toEqual(expect.any(String));
    expect(row.timestamptz_now).toEqual(expect.any(Date));
    expect(row.uuid_with_default).toEqual(expect.any(String));

    await instance.closeSync();
  });
});
