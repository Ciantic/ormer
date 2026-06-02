import { describe, it, expect } from "vitest";
import * as k from "kysely";
import * as pg from "./columns.ts";
import { table } from "../table.ts";
import { database } from "../database.ts";
import { createTableSql } from "../sql.ts";
import { PGCOLUMN_TO_SQLTYPE, POSTGRES_OPTS } from "./driver.ts";
import { PGlite } from "@electric-sql/pglite";
import { createPgliteParsers, type PgUnifiedTypeMapping } from "./mapping.ts";
import type { InferKyselyTypes } from "../index.ts";

const allTypesTable = table("all_types", {
  // integer types
  id: pg.int8({
    primaryKey: true,
    autoIncrement: true,
    notInsertable: true,
    notUpdatable: true,
  }),
  int2_col: pg.int2(),
  int2_nullable: pg.int2({ nullable: true }),
  int4_col: pg.int4(),
  int8_col: pg.int8(),
  serial2_col: pg.int2({ autoIncrement: true }),
  serial4_col: pg.int4({ autoIncrement: true }),
  serial8_col: pg.int8({ autoIncrement: true }),
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
  // array types
  int4_arr_col: pg.arrayOf(pg.int4()),
  text_arr_col: pg.arrayOf(pg.text()),
  bool_arr_col: pg.arrayOf(pg.boolean()),
  varchar_arr_col: pg.arrayOf(pg.varchar({ maxLength: 100 })),
  int4_nullable_arr_col: pg.arrayOf(pg.int4({ nullable: true })),
  // multi-dimensional arrays
  int4_2d_col: pg.arrayOf(pg.arrayOf(pg.int4())),
  int4_3x3_col: pg.arrayOf(pg.arrayOf(pg.int4(), 3), 3),
});

const referencedTable = table("referenced", {
  id: pg.int8({
    primaryKey: true,
    autoIncrement: true,
    notInsertable: true,
    notUpdatable: true,
  }),
  name: pg.text(),
});

const withFkTable = table("with_fk", {
  id: pg.int8({
    primaryKey: true,
    autoIncrement: true,
    notInsertable: true,
    notUpdatable: true,
  }),
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
        "unique_col" text NOT NULL UNIQUE,
        "int4_arr_col" int4[] NOT NULL,
        "text_arr_col" text[] NOT NULL,
        "bool_arr_col" boolean[] NOT NULL,
        "varchar_arr_col" varchar(100)[] NOT NULL,
        "int4_nullable_arr_col" int4[],
        "int4_2d_col" int4[][] NOT NULL,
        "int4_3x3_col" int4[3][3] NOT NULL
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
    const pgLite = new PGlite({
      parsers: createPgliteParsers(),
    });

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

  it("pglite: inserts a row with all columns via Kysely and reads it back", async () => {
    const db = database({}, allTypesTable);

    const pglite = new PGlite({
      parsers: createPgliteParsers(),
    });

    const sql = createTableSql(PGCOLUMN_TO_SQLTYPE, db, POSTGRES_OPTS);
    await pglite.exec(sql);

    type KyselyTypes = InferKyselyTypes<typeof db, PgUnifiedTypeMapping>;

    const kyselyDb = new k.Kysely<KyselyTypes>({
      dialect: new k.PGliteDialect({
        pglite,
      }),
    });

    const insertRow = {
      int2_col: 1,
      int2_nullable: null,
      int4_col: 2,
      int8_col: 3n,
      serial2_col: 1,
      serial4_col: 2,
      serial8_col: 3n,
      float4_col: 1.5,
      float8_col: 2.5,
      decimal_col: "10.99",
      money_col: "$10.99",
      text_col: "hello",
      varchar_col: "world",
      char_col: "abcdefg   ",
      bytea_col: new Uint8Array([1, 2, 3]),
      bool_col: true,
      uuid_col: "550e8400-e29b-41d4-a716-446655440000",
      timestamp_col: "2024-01-15 10:30:00",
      timestamptz_col: new Date("2024-01-15T10:30:00Z"),
      date_col: "2024-01-15",
      time_col: "10:30:00",
      timetz_col: "10:30:00+05",
      interval_col: "1 year 2 mons",
      jsonb_col: { key: "value" },
      json_col: { key: "value" },
      inet_col: "192.168.0.1",
      cidr_col: "192.168.0.0/24",
      macaddr_col: "08:00:2b:01:02:03",
      macaddr8_col: "08:00:2b:01:02:03:04:05",
      bit_col: "10101010",
      varbit_col: "10101",
      tsvector_col: "'hello' 'world'",
      tsquery_col: "'hello' & 'world'",
      xml_col: "<tag>content</tag>",
      point_col: "(1,2)",
      line_col: "{1,2,3}",
      lseg_col: "[(1,2),(3,4)]",
      box_col: "(3,4),(1,2)",
      path_col: "[(1,2),(3,4)]",
      polygon_col: "((1,2),(3,4),(5,6))",
      circle_col: "<(1,2),3>",
      pg_lsn_col: "0/16B3740",
      pg_snapshot_col: "10:20:",
      unique_col: "unique_value",
      int4_arr_col: [1, 2, 3],
      text_arr_col: ["hello", "world"],
      bool_arr_col: [true, false, true],
      varchar_arr_col: ["foo", "bar"],
      int4_nullable_arr_col: null,
      int4_2d_col: [
        [1, 2],
        [3, 4],
      ],
      int4_3x3_col: [
        [1, 2, 3],
        [4, 5, 6],
        [7, 8, 9],
      ],
    } satisfies k.InsertObject<KyselyTypes, "all_types">;

    await kyselyDb.insertInto("all_types").values(insertRow).execute();

    const results = await kyselyDb
      .selectFrom("all_types")
      .selectAll()
      .execute();

    expect(results[0]).toEqual({
      ...insertRow,
      id: 1n,
      timestamp_now: expect.any(String),
      timestamptz_now: expect.any(Date),
      uuid_with_default: expect.any(String),
    });

    await pglite.close();
  });
});
