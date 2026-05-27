import { describe, it, expect } from "vitest";
import * as pg from "./columns.ts";
import { table } from "../table.ts";
import { database } from "../database.ts";
import { createTableSql } from "../sql.ts";
import { PGCOLUMN_TO_SQLTYPE, POSTGRES_OPTS } from "./driver.ts";
import { PGlite } from "@electric-sql/pglite";

const allTypesTable = table("all_types", {
  // integer types
  id: pg.serial8({ primaryKey: true, notInsertable: true, notUpdatable: true }),
  int2_col: pg.int2(),
  int2_nullable: pg.int2({ nullable: true }),
  int4_col: pg.int4(),
  int8_col: pg.int8(),
  serial2_col: pg.serial2(),
  serial4_col: pg.serial4(),
  serial8_col: pg.serial8(),
  // float types
  float4_col: pg.float4(),
  float8_col: pg.float8(),
  decimal_col: pg.decimal({ precision: 10, scale: 2 }),
  money_col: pg.money(),
  // string types
  text_col: pg.text(),
  varchar_col: pg.varchar({ maxLength: 255 }),
  char_col: pg.char({ length: 10 }),
  // binary
  bytea_col: pg.bytea(),
  // boolean
  bool_col: pg.boolean(),
  // uuid
  uuid_col: pg.uuid(),
  uuid_with_default: pg.uuid({ default: "generate" }),
  // date/time types
  timestamp_col: pg.timestamp(),
  timestamp_now: pg.timestamp({ default: "now" }),
  timestamptz_col: pg.timestamptz(),
  timestamptz_now: pg.timestamptz({ default: "now" }),
  date_col: pg.date(),
  time_col: pg.time(),
  timetz_col: pg.timetz(),
  interval_col: pg.interval(),
  // json types
  jsonb_col: pg.jsonb({ schema: null as any }),
  json_col: pg.json({ schema: null as any }),
  // network types
  inet_col: pg.inet(),
  cidr_col: pg.cidr(),
  macaddr_col: pg.macaddr(),
  macaddr8_col: pg.macaddr8(),
  // bit string types
  bit_col: pg.bit({ length: 8 }),
  varbit_col: pg.varbit({ maxLength: 255 }),
  // text search types
  tsvector_col: pg.tsvector(),
  tsquery_col: pg.tsquery(),
  // xml
  xml_col: pg.xml(),
  // geometric types
  point_col: pg.point(),
  line_col: pg.line(),
  lseg_col: pg.lseg(),
  box_col: pg.box(),
  path_col: pg.path(),
  polygon_col: pg.polygon(),
  circle_col: pg.circle(),
  // system types
  // xmin_col: pg.xmin(),
  pg_lsn_col: pg.pg_lsn(),
  pg_snapshot_col: pg.pg_snapshot(),
  // unique
  unique_col: pg.text({ unique: true }),
});

const referencedTable = table("referenced", {
  id: pg.serial8({ primaryKey: true, notInsertable: true, notUpdatable: true }),
  name: pg.text(),
});

const withFkTable = table("with_fk", {
  id: pg.serial8({ primaryKey: true, notInsertable: true, notUpdatable: true }),
  ref_id: pg.foreignKey(referencedTable, "id"),
});

const db = database({}, allTypesTable, referencedTable, withFkTable);

describe("postgres createTableSql", () => {
  it("generates correct SQL for all column types", () => {
    const sql = createTableSql(PGCOLUMN_TO_SQLTYPE, db, POSTGRES_OPTS);
    expect(sql).toMatchInlineSnapshot(`
      "CREATE TABLE "all_types" (
        "id" serial8 NOT NULL PRIMARY KEY,
        "int2_col" int2 NOT NULL,
        "int2_nullable" int2,
        "int4_col" int4 NOT NULL,
        "int8_col" int8 NOT NULL,
        "serial2_col" serial2 NOT NULL,
        "serial4_col" serial4 NOT NULL,
        "serial8_col" serial8 NOT NULL,
        "float4_col" float4 NOT NULL,
        "float8_col" float8 NOT NULL,
        "decimal_col" decimal(10,2) NOT NULL,
        "money_col" money NOT NULL,
        "text_col" text NOT NULL,
        "varchar_col" varchar(255) NOT NULL,
        "char_col" char(10) NOT NULL,
        "bytea_col" bytea NOT NULL,
        "bool_col" boolean NOT NULL,
        "uuid_col" uuid NOT NULL,
        "uuid_with_default" uuid NOT NULL DEFAULT gen_random_uuid(),
        "timestamp_col" timestamp NOT NULL,
        "timestamp_now" timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "timestamptz_col" timestamptz NOT NULL,
        "timestamptz_now" timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "date_col" date NOT NULL,
        "time_col" time NOT NULL,
        "timetz_col" timetz NOT NULL,
        "interval_col" interval NOT NULL,
        "jsonb_col" jsonb NOT NULL,
        "json_col" json NOT NULL,
        "inet_col" inet NOT NULL,
        "cidr_col" cidr NOT NULL,
        "macaddr_col" macaddr NOT NULL,
        "macaddr8_col" macaddr8 NOT NULL,
        "bit_col" bit(8) NOT NULL,
        "varbit_col" varbit(255) NOT NULL,
        "tsvector_col" tsvector NOT NULL,
        "tsquery_col" tsquery NOT NULL,
        "xml_col" xml NOT NULL,
        "point_col" point NOT NULL,
        "line_col" line NOT NULL,
        "lseg_col" lseg NOT NULL,
        "box_col" box NOT NULL,
        "path_col" path NOT NULL,
        "polygon_col" polygon NOT NULL,
        "circle_col" circle NOT NULL,
        "pg_lsn_col" pg_lsn NOT NULL,
        "pg_snapshot_col" pg_snapshot NOT NULL,
        "unique_col" text NOT NULL UNIQUE
      );

      CREATE TABLE "referenced" (
        "id" serial8 NOT NULL PRIMARY KEY,
        "name" text NOT NULL
      );

      CREATE TABLE "with_fk" (
        "id" serial8 NOT NULL PRIMARY KEY,
        "ref_id" int8 NOT NULL,
        FOREIGN KEY ("ref_id") REFERENCES "referenced"("id")
      );"
    `);
  });

  it("executes CREATE TABLE in a PGlite in-memory instance", async () => {
    const pgLiteDb = database({}, allTypesTable, referencedTable, withFkTable);
    const pgLite = new PGlite();

    const sql = createTableSql(PGCOLUMN_TO_SQLTYPE, pgLiteDb, POSTGRES_OPTS);
    await pgLite.exec(sql);

    // Verify tables were created by querying the schema
    const result = await pgLite.query<{ table_name: string }>(
      `SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' ORDER BY table_name`,
    );
    const tableNames = result.rows.map((r) => r.table_name);
    expect(tableNames).toEqual(["all_types", "referenced", "with_fk"]);

    await pgLite.close();
  });
});
