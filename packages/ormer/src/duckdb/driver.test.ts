import { describe, it, expect } from "vitest";
import * as duckdb from "./columns.ts";
import { table } from "../table.ts";
import { database } from "../database.ts";
import { createTableSql } from "../sql.ts";
import { DUCKDBCOLUMN_TO_SQLTYPE, DUCKDB_OPTS } from "./driver.ts";

const allTypesTable = table("all_types", {
  // integer types
  id: duckdb.int8({
    primaryKey: true,
    notInsertable: true,
    notUpdatable: true,
  }),
  tinyint_col: duckdb.tinyint(),
  tinyint_nullable: duckdb.tinyint({ nullable: true }),
  int2_col: duckdb.int2(),
  int4_col: duckdb.int4(),
  int8_col: duckdb.int8(),
  hugeint_col: duckdb.hugeint(),
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
    notInsertable: true,
    notUpdatable: true,
  }),
  name: duckdb.text(),
});

const withFkTable = table("with_fk", {
  id: duckdb.int8({
    primaryKey: true,
    notInsertable: true,
    notUpdatable: true,
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
        "tinyint_col" tinyint NOT NULL,
        "tinyint_nullable" tinyint,
        "int2_col" int2 NOT NULL,
        "int4_col" int4 NOT NULL,
        "int8_col" int8 NOT NULL,
        "hugeint_col" hugeint NOT NULL,
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
});
