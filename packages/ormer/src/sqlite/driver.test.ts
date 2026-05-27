import { describe, it, expect } from "vitest";
import * as sqlite from "./columns.ts";
import { table } from "../table.ts";
import { database } from "../database.ts";
import { createTableSql } from "../sql.ts";
import { SQLITECOLUMN_TO_SQLTYPE, SQLITE_OPTS } from "./driver.ts";

const allTypesTable = table("all_types", {
  id: sqlite.integer({
    primaryKey: true,
    autoIncrement: true,
    notInsertable: true,
    notUpdatable: true,
  }),
  int_col: sqlite.int(),
  int_nullable: sqlite.int({ nullable: true }),
  integer_col: sqlite.integer(),
  real_col: sqlite.real(),
  text_col: sqlite.text(),
  text_now: sqlite.text({ default: "now" }),
  blob_col: sqlite.blob(),
  any_col: sqlite.any(),
  unique_col: sqlite.text({ unique: true }),
});

const referencedTable = table("referenced", {
  id: sqlite.integer({
    primaryKey: true,
    autoIncrement: true,
    notInsertable: true,
    notUpdatable: true,
  }),
  name: sqlite.text(),
});

const withFkTable = table("with_fk", {
  id: sqlite.integer({
    primaryKey: true,
    autoIncrement: true,
    notInsertable: true,
    notUpdatable: true,
  }),
  ref_id: sqlite.foreignKey(referencedTable, "id"),
});

const db = database({}, allTypesTable, referencedTable, withFkTable);

describe("sqlite createTableSql", () => {
  it("generates correct SQL for all column types", () => {
    const sql = createTableSql(SQLITECOLUMN_TO_SQLTYPE, db, SQLITE_OPTS);
    expect(sql).toMatchInlineSnapshot(`
      "CREATE TABLE "all_types" (
        "id" integer NOT NULL PRIMARY KEY AUTOINCREMENT,
        "int_col" int NOT NULL,
        "int_nullable" int,
        "integer_col" integer NOT NULL,
        "real_col" real NOT NULL,
        "text_col" text NOT NULL,
        "text_now" text NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "blob_col" blob NOT NULL,
        "any_col" any NOT NULL,
        "unique_col" text NOT NULL UNIQUE
      );

      CREATE TABLE "referenced" (
        "id" integer NOT NULL PRIMARY KEY AUTOINCREMENT,
        "name" text NOT NULL
      );

      CREATE TABLE "with_fk" (
        "id" integer NOT NULL PRIMARY KEY AUTOINCREMENT,
        "ref_id" integer NOT NULL,
        FOREIGN KEY ("ref_id") REFERENCES "referenced"("id")
      );"
    `);
  });
});
