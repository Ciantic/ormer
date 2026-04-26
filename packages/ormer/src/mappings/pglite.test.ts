import * as z from "zod";
import { describe, it, expect, expectTypeOf } from "vitest";
import { PGlite } from "@electric-sql/pglite";
import type { StandardSchemaV1 } from "@standard-schema/spec";
import * as c from "../columns.ts";
import * as h from "../columnhelpers.ts";
import * as s from "../simplevalidation.ts";
import { table } from "../table.ts";
import { database } from "../database.ts";
import { createTableSql } from "../sql.ts";
import { POSTGRES_TYPES, POSTGRES_OPTS } from "../drivers/postgres.ts";
import { PGLITE_SELECT_SCHEMAS } from "./pglite.ts";

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
      id: 1,
      int32_col: 42,
      int32_nullable: null,
      int64_col: 9007199254740992n,
      bigint_col: "12345678901234567890",
      float32_col: 1.5,
      float64_col: 3.141592653589793,
      decimal_col: "9.99",
      string_col: "hello",
      varchar_col: "world",
      bool_col: true,
      uuid_col: "a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11",
      uuid_with_default: expect.any(String),
      datetime_col: new Date("2024-06-15T12:34:56.000Z"),
      datetime_now: expect.any(Date),
      datetime_ts: expect.any(Date),
      datepart_col: new Date("2024-06-15T00:00:00.000Z"),
      timepart_col: "12:34:56",
      jsonb_col: { key: "value", num: 1 },
      json_col: { arr: [1, 2, 3] },
      unique_col: "unique-value",
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

describe("PGLITE_SELECT_SCHEMAS", () => {
  it("int32: infers number and validates numbers", () => {
    const schema = PGLITE_SELECT_SCHEMAS.int32({});
    expectTypeOf(schema).toEqualTypeOf<StandardSchemaV1<number, number>>();
    expect(s.typedValidate(schema, 42)).toEqual({ value: 42 });
  });

  it("int64: infers bigint and validates bigints", () => {
    const schema = PGLITE_SELECT_SCHEMAS.int64({});
    expectTypeOf(schema).toEqualTypeOf<StandardSchemaV1<bigint, bigint>>();
    expect(s.typedValidate(schema, 42n)).toEqual({ value: 42n });
  });

  it("bigint: infers string and validates strings", () => {
    const schema = PGLITE_SELECT_SCHEMAS.bigint({});
    expectTypeOf(schema).toEqualTypeOf<StandardSchemaV1<string, string>>();
    expect(s.typedValidate(schema, "12345678901234567890")).toEqual({
      value: "12345678901234567890",
    });
  });

  it("float32: infers number and validates numbers", () => {
    const schema = PGLITE_SELECT_SCHEMAS.float32({});
    expectTypeOf(schema).toEqualTypeOf<StandardSchemaV1<number, number>>();
    expect(s.typedValidate(schema, 1.5)).toEqual({ value: 1.5 });
  });

  it("float64: infers number and validates numbers", () => {
    const schema = PGLITE_SELECT_SCHEMAS.float64({});
    expectTypeOf(schema).toEqualTypeOf<StandardSchemaV1<number, number>>();
    expect(s.typedValidate(schema, 3.141592653589793)).toEqual({
      value: 3.141592653589793,
    });
  });

  it("decimal: infers string and validates strings", () => {
    const schema = PGLITE_SELECT_SCHEMAS.decimal({});
    expectTypeOf(schema).toEqualTypeOf<StandardSchemaV1<string, string>>();
    expect(s.typedValidate(schema, "9.99")).toEqual({ value: "9.99" });
  });

  it("uuid: infers string and validates strings", () => {
    const schema = PGLITE_SELECT_SCHEMAS.uuid({});
    expectTypeOf(schema).toEqualTypeOf<StandardSchemaV1<string, string>>();
    expect(
      s.typedValidate(schema, "a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11"),
    ).toEqual({ value: "a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11" });
  });

  it("string: infers string and validates strings", () => {
    const schema = PGLITE_SELECT_SCHEMAS.string({});
    expectTypeOf(schema).toEqualTypeOf<StandardSchemaV1<string, string>>();
    expect(s.typedValidate(schema, "hello")).toEqual({ value: "hello" });
  });

  it("varchar: infers string and validates strings", () => {
    const schema = PGLITE_SELECT_SCHEMAS.varchar({});
    expectTypeOf(schema).toEqualTypeOf<StandardSchemaV1<string, string>>();
    expect(s.typedValidate(schema, "world")).toEqual({ value: "world" });
  });

  it("boolean: infers boolean and validates booleans", () => {
    const schema = PGLITE_SELECT_SCHEMAS.boolean({});
    expectTypeOf(schema).toEqualTypeOf<StandardSchemaV1<boolean, boolean>>();
    expect(s.typedValidate(schema, true)).toEqual({ value: true });
  });

  it("datetime: infers Date and validates Date objects", () => {
    const schema = PGLITE_SELECT_SCHEMAS.datetime({});
    expectTypeOf(schema).toEqualTypeOf<StandardSchemaV1<Date, Date>>();
    const d = new Date("2024-06-15T12:34:56.000Z");
    expect(s.typedValidate(schema, d)).toEqual({ value: d });
  });

  it("datepart: infers Date and validates Date objects", () => {
    const schema = PGLITE_SELECT_SCHEMAS.datepart({});
    expectTypeOf(schema).toEqualTypeOf<StandardSchemaV1<Date, Date>>();
    const d = new Date("2024-06-15T00:00:00.000Z");
    expect(s.typedValidate(schema, d)).toEqual({ value: d });
  });

  it("timepart: infers string and validates strings", () => {
    const schema = PGLITE_SELECT_SCHEMAS.timepart({});
    expectTypeOf(schema).toEqualTypeOf<StandardSchemaV1<string, string>>();
    expect(s.typedValidate(schema, "12:34:56")).toEqual({ value: "12:34:56" });
  });

  it("nullable modifier: wraps schema to accept null", () => {
    const schema = PGLITE_SELECT_SCHEMAS.string({ nullable: true });
    expectTypeOf(schema).toEqualTypeOf<
      StandardSchemaV1<string | null, string | null>
    >();
    expect(s.typedValidate(schema, null)).toEqual({ value: null });
    expect(s.typedValidate(schema, "hello")).toEqual({ value: "hello" });
  });

  it("default modifier: wraps schema to accept undefined", () => {
    const schema = PGLITE_SELECT_SCHEMAS.string({ default: "fallback" });
    expect(s.typedValidate(schema, undefined)).toEqual({ value: undefined });
    expect(s.typedValidate(schema, "hello")).toEqual({ value: "hello" });
  });

  it("jsonb: returns schema-based validator using the provided schema", () => {
    const schema = PGLITE_SELECT_SCHEMAS.jsonb({
      schema: z.object({ key: z.string(), num: z.number() }),
    });
    expectTypeOf(schema).toEqualTypeOf<
      StandardSchemaV1<
        { key: string; num: number },
        { key: string; num: number }
      >
    >();
    expect(s.typedValidate(schema, { key: "value", num: 42 })).toEqual({
      value: { key: "value", num: 42 },
    });
  });

  it("jsonb: nullable modifier accepts null", () => {
    const schema = PGLITE_SELECT_SCHEMAS.jsonb({
      schema: z.object({ key: z.string() }),
      nullable: true,
    });
    expectTypeOf(schema).toEqualTypeOf<
      StandardSchemaV1<{ key: string } | null, { key: string } | null>
    >();
    expect(s.typedValidate(schema, null)).toEqual({ value: null });
    expect(s.typedValidate(schema, { key: "hello" })).toEqual({
      value: { key: "hello" },
    });
  });

  it("jsonb: default modifier accepts undefined", () => {
    const schema = PGLITE_SELECT_SCHEMAS.jsonb({
      schema: z.object({ key: z.string() }),
      default: null,
    });
    expectTypeOf(schema).toEqualTypeOf<
      StandardSchemaV1<{ key: string } | undefined, { key: string } | undefined>
    >();
    expect(s.typedValidate(schema, undefined)).toEqual({ value: undefined });
    expect(s.typedValidate(schema, { key: "hello" })).toEqual({
      value: { key: "hello" },
    });
  });

  it("json: returns schema-based validator using the provided schema", () => {
    const schema = PGLITE_SELECT_SCHEMAS.json({
      schema: z.object({ key: z.string(), num: z.number() }),
    });
    expectTypeOf(schema).toEqualTypeOf<
      StandardSchemaV1<
        { key: string; num: number },
        { key: string; num: number }
      >
    >();
    expect(s.typedValidate(schema, { key: "value", num: 42 })).toEqual({
      value: { key: "value", num: 42 },
    });
  });

  it("json: nullable modifier accepts null", () => {
    const schema = PGLITE_SELECT_SCHEMAS.json({
      schema: z.object({ key: z.string() }),
      nullable: true,
    });
    expectTypeOf(schema).toEqualTypeOf<
      StandardSchemaV1<{ key: string } | null, { key: string } | null>
    >();
    expect(s.typedValidate(schema, null)).toEqual({ value: null });
    expect(s.typedValidate(schema, { key: "hello" })).toEqual({
      value: { key: "hello" },
    });
  });

  it("json: default modifier accepts undefined", () => {
    const schema = PGLITE_SELECT_SCHEMAS.json({
      schema: z.object({ key: z.string() }),
      default: null,
    });
    expectTypeOf(schema).toEqualTypeOf<
      StandardSchemaV1<{ key: string } | undefined, { key: string } | undefined>
    >();
    expect(s.typedValidate(schema, undefined)).toEqual({ value: undefined });
    expect(s.typedValidate(schema, { key: "hello" })).toEqual({
      value: { key: "hello" },
    });
  });
});
