import { describe, it, expect, expectTypeOf } from "vitest";
import { PGlite } from "@electric-sql/pglite";
import * as c from "../columns.ts";
import * as h from "../columnhelpers.ts";
import { table } from "../table.ts";
import { database } from "../database.ts";
import { createTableSql } from "../sql.ts";
import { POSTGRES_TYPES, POSTGRES_OPTS } from "../drivers/postgres.ts";
import type { PgliteSelectTypes } from "./pglite.ts";

type Expect<T extends true> = T;
type Equal<X, Y> =
  (<T>() => T extends X ? 1 : 2) extends <T>() => T extends Y ? 1 : 2
    ? true
    : false;

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

describe("pglite createTableSql", () => {
  it("creates all tables successfully in an in-memory PGlite instance", async () => {
    const pglite = new PGlite();
    const sql = createTableSql(POSTGRES_TYPES, db, POSTGRES_OPTS);

    await pglite.exec(sql);

    // Verify all three tables exist
    const result = await pglite.query<{ tablename: string }>(
      `SELECT tablename FROM pg_tables WHERE schemaname = 'public' ORDER BY tablename`,
    );
    const tableNames = result.rows.map((r) => r.tablename);
    expect(tableNames).toEqual(["all_types", "referenced", "with_fk"]);
  });

  it("insert and select all_types row matches pglite mapping", async () => {
    const pglite = new PGlite();
    const sql = createTableSql(POSTGRES_TYPES, db, POSTGRES_OPTS);
    await pglite.exec(sql);

    const insertedDatetime = new Date("2024-06-15T12:34:56.000Z");

    const insertRow = {
      int32_col: 42,
      int32_nullable: null,
      int64_col: 9007199254740993, // beyond Number.MAX_SAFE_INTEGER
      bigint_col: "12345678901234567890", // numeric passed as string
      float32_col: 1.5,
      float64_col: 3.141592653589793,
      decimal_col: "9.99",
      string_col: "hello",
      varchar_col: "world",
      bool_col: true,
      uuid_col: "a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11",
      datetime_col: insertedDatetime.toISOString(),
      datetime_ts: insertedDatetime.toISOString(),
      datepart_col: "2024-06-15",
      timepart_col: "12:34:56",
      jsonb_col: JSON.stringify({ key: "value", num: 1 }),
      json_col: JSON.stringify({ arr: [1, 2, 3] }),
      unique_col: "unique-value",
    };
    const cols = Object.keys(insertRow)
      .map((k) => `"${k}"`)
      .join(", ");
    const placeholders = Object.keys(insertRow)
      .map((_, i) => `$${i + 1}`)
      .join(", ");
    await pglite.query(
      `INSERT INTO "all_types" (${cols}) VALUES (${placeholders})`,
      Object.values(insertRow),
    );

    const result = await pglite.query(`SELECT * FROM "all_types"`);
    const row = result.rows[0]!;
    const expectedRow = {
      id: 1 satisfies PgliteSelectTypes["int32"],
      int32_col: 42 satisfies PgliteSelectTypes["int32"],
      int32_nullable: null satisfies PgliteSelectTypes["int32"] | null,
      int64_col: 9007199254740992n satisfies PgliteSelectTypes["int64"],
      bigint_col: "12345678901234567890" satisfies PgliteSelectTypes["bigint"],
      float32_col: 1.5 satisfies PgliteSelectTypes["float32"],
      float64_col: 3.141592653589793 satisfies PgliteSelectTypes["float64"],
      decimal_col: "9.99" satisfies PgliteSelectTypes["decimal"],
      string_col: "hello" satisfies PgliteSelectTypes["string"],
      varchar_col: "world" satisfies PgliteSelectTypes["varchar"],
      bool_col: true satisfies PgliteSelectTypes["boolean"],
      uuid_col:
        "a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11" satisfies PgliteSelectTypes["uuid"],
      uuid_with_default: expect.any(String),
      datetime_col: new Date(
        "2024-06-15T12:34:56.000Z",
      ) satisfies PgliteSelectTypes["datetime"],
      datetime_now: expect.any(Date),
      datetime_ts: expect.any(Date),
      datepart_col: new Date(
        "2024-06-15T00:00:00.000Z",
      ) satisfies PgliteSelectTypes["datepart"],
      timepart_col: "12:34:56" satisfies PgliteSelectTypes["timepart"],
      jsonb_col: { key: "value", num: 1 } satisfies PgliteSelectTypes["jsonb"],
      json_col: { arr: [1, 2, 3] } satisfies PgliteSelectTypes["json"],
      unique_col: "unique-value" satisfies PgliteSelectTypes["string"],
    };
    expect(row).toEqual(expectedRow);
  });

  it("datepart column accepts Date object as input", async () => {
    const pglite = new PGlite();
    const dateTable = table("date_test", { d: c.datepart() });
    await pglite.exec(
      createTableSql(POSTGRES_TYPES, database({}, dateTable), POSTGRES_OPTS),
    );

    const inputDate = new Date("2024-06-15T12:34:56.000Z");
    await pglite.query(`INSERT INTO "date_test" (d) VALUES ($1)`, [inputDate]);

    const result = await pglite.query(`SELECT d FROM "date_test"`);
    expect((result.rows[0] as any).d).toMatchInlineSnapshot(
      `2024-06-15T00:00:00.000Z`,
    );
  });

  it("datepart column accepts string input '2025-12-24'", async () => {
    const pglite = new PGlite();
    const dateTable = table("date_test", { d: c.datepart() });
    await pglite.exec(
      createTableSql(POSTGRES_TYPES, database({}, dateTable), POSTGRES_OPTS),
    );

    await pglite.query(`INSERT INTO "date_test" (d) VALUES ($1)`, [
      "2025-12-24",
    ]);

    const result = await pglite.query(`SELECT d FROM "date_test"`);
    expect((result.rows[0] as any).d).toMatchInlineSnapshot(
      `2025-12-24T00:00:00.000Z`,
    );
  });
});
