import { describe, it, expect } from "vitest";
import * as k from "kysely";
import * as sqlite from "./columns.ts";
import { table } from "../table.ts";
import { database } from "../database.ts";
import { createTableSql } from "../sql.ts";
import { SQLITECOLUMN_TO_SQLTYPE, SQLITE_OPTS } from "./driver.ts";
import type { SqliteUnifiedTypeMapping } from "./mapping.ts";
import type { InferKyselyTypes } from "../index.ts";
import Database from "libsql";

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

  it("executes CREATE TABLE in a real SQLite in-memory instance", async () => {
    const sqliteDb = new Database(":memory:", {});

    const sql = createTableSql(SQLITECOLUMN_TO_SQLTYPE, db, SQLITE_OPTS);
    const statements = sql.split(";").filter((s) => s.trim().length > 0);

    for (const stmt of statements) {
      sqliteDb.exec(stmt.trim() + ";", {});
    }

    // Verify tables were created by querying the schema
    const rows = sqliteDb
      .prepare(
        `SELECT name FROM sqlite_master WHERE type = 'table' AND name NOT LIKE 'sqlite_%' ORDER BY name`,
      )
      .all();
    const tableNames = rows.map((r: any) => r.name);
    expect(tableNames).toEqual(["all_types", "referenced", "with_fk"]);

    sqliteDb.close();
  });

  it("libsql: inserts a row with all columns via Kysely and reads it back", async () => {
    const db = database({}, allTypesTable);

    const sqliteDb = new Database(":memory:", {});

    const sql = createTableSql(SQLITECOLUMN_TO_SQLTYPE, db, SQLITE_OPTS);
    const statements = sql.split(";").filter((s) => s.trim().length > 0);
    for (const stmt of statements) {
      sqliteDb.exec(stmt.trim() + ";", {});
    }

    type KyselyTypes = InferKyselyTypes<typeof db, SqliteUnifiedTypeMapping>;

    const kyselyDb = new k.Kysely<KyselyTypes>({
      dialect: new k.SqliteDialect({
        database: sqliteDb,
      }),
    });

    const blobValue = Buffer.from([1, 2, 3]);

    const insertRow = {
      int_col: 1,
      int_nullable: null,
      integer_col: 2,
      real_col: 3.5,
      text_col: "hello",
      text_now: undefined,
      blob_col: blobValue,
      any_col: '{"key":"value"}',
      unique_col: "unique_value",
    } satisfies k.InsertObject<KyselyTypes, "all_types">;

    await kyselyDb.insertInto("all_types").values(insertRow).execute();

    const results = await kyselyDb
      .selectFrom("all_types")
      .selectAll()
      .execute();

    const row = results[0]!;
    expect(row.text_now).toEqual(expect.any(String));
    expect(row.id).toBe(1);
    expect(row.int_col).toBe(1);
    expect(row.int_nullable).toBe(null);
    expect(row.integer_col).toBe(2);
    expect(row.real_col).toBe(3.5);
    expect(row.text_col).toBe("hello");
    expect(row.any_col).toBe('{"key":"value"}');
    expect(row.unique_col).toBe("unique_value");

    sqliteDb.close();
  });
});
