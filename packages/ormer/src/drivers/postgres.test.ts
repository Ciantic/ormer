import { describe, it, expect } from "vitest";
import * as c from "../columns.ts";
import * as h from "../columnhelpers.ts";
import { table } from "../table.ts";
import { database } from "../database.ts";
import { createTableSql } from "../sql.ts";
import { POSTGRES_TYPES, POSTGRES_OPTS } from "./postgres.ts";

const allTypesTable = table("all_types", {
  // integer types
  id: h.pkAutoInc(),
  int32_col: c.int32(),
  int32_nullable: c.int32({ nullable: true }),
  int64_col: c.int64(),
  bigint_col: c.bigint(),
  // float types
  float32_col: c.float32(),
  float64_col: c.float64(),
  decimal_col: c.decimal({ precision: 10, scale: 2 }),
  // string types
  string_col: c.string(),
  varchar_col: c.varchar({ maxLength: 255 }),
  // other primitives
  bool_col: c.boolean(),
  uuid_col: c.uuid(),
  uuid_with_default: c.uuid({ default: "generate" }),
  // date/time types
  datetime_col: c.datetime(),
  datetime_now: c.datetime({ default: "now" }),
  datetime_ts: c.datetime({ postgres: { type: "timestamp" } }),
  datepart_col: c.datepart(),
  timepart_col: c.timepart(),
  // json types
  jsonb_col: c.jsonb({ schema: null as any }),
  json_col: c.json({ schema: null as any }),
  // unique
  unique_col: c.string({ unique: true }),
});

const referencedTable = table("referenced", {
  id: h.pkAutoInc(),
  name: c.string(),
});

const withFkTable = table("with_fk", {
  id: h.pkAutoInc(),
  ref_id: c.foreignKey(referencedTable, "id"),
});

const db = database({}, allTypesTable, referencedTable, withFkTable);

describe("postgres createTableSql", () => {
  it("generates correct SQL for all column types", () => {
    const sql = createTableSql(POSTGRES_TYPES, db, POSTGRES_OPTS);
    expect(sql).toMatchInlineSnapshot(`
      "CREATE TABLE "all_types" (
        "id" bigserial NOT NULL PRIMARY KEY,
        "int32_col" integer NOT NULL,
        "int32_nullable" integer,
        "int64_col" bigint NOT NULL,
        "bigint_col" numeric NOT NULL,
        "float32_col" real NOT NULL,
        "float64_col" double precision NOT NULL,
        "decimal_col" decimal(10, 2) NOT NULL,
        "string_col" text NOT NULL,
        "varchar_col" varchar(255) NOT NULL,
        "bool_col" boolean NOT NULL,
        "uuid_col" uuid NOT NULL,
        "uuid_with_default" uuid NOT NULL DEFAULT gen_random_uuid(),
        "datetime_col" timestamptz NOT NULL,
        "datetime_now" timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "datetime_ts" timestamp NOT NULL,
        "datepart_col" date NOT NULL,
        "timepart_col" time NOT NULL,
        "jsonb_col" jsonb NOT NULL,
        "json_col" json NOT NULL,
        "unique_col" text NOT NULL UNIQUE
      );

      CREATE TABLE "referenced" (
        "id" bigserial NOT NULL PRIMARY KEY,
        "name" text NOT NULL
      );

      CREATE TABLE "with_fk" (
        "id" bigserial NOT NULL PRIMARY KEY,
        "ref_id" bigint NOT NULL,
        FOREIGN KEY ("ref_id") REFERENCES "referenced"("id")
      );"
    `);
  });
});
