import type { ColumnType } from "kysely";
import * as z from "zod";
import * as h from "./columnhelpers.ts";
import * as c from "./columns.ts";
import { table } from "./table.ts";
import { database } from "./database.ts";
import { describe, it, expect, expectTypeOf } from "vitest";
import type { InferKyselyTypes } from "./kysely.ts";

const TEST_TABLE = table("test_table", {
  bigserial: h.pkAutoInc(),
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
  test_datetime2: c.datetime({
    postgres: {
      type: "timestamp",
    },
  }),
  test_datepart: c.datepart(),
  test_timepart: c.timepart(),
  test_jsonb: c.jsonb({
    schema: z.object({
      somestring: z.string(),
      someint: z.number(),
      somebool: z.boolean(),
      somearray: z.string().array(),
      someobject: z.object({
        foo: z.string(),
        bar: z.number(),
      }),
    }),
  }),
  test_json: c.json({
    schema: z.object({
      somestring: z.string(),
      someint: z.number(),
      somebool: z.boolean(),
      somearray: z.string().array(),
      someobject: z.object({
        foo: z.string(),
        bar: z.number(),
      }),
    }),
  }),
  test_rowversion: h.rowversion(),
  test_concurrencyStamp: h.concurrencyStamp(),
  test_userstring: h.userstring({
    schema: z.string().regex(/\d+.*/).max(255), // Digit followed by anything, max length 255
    maxLength: 255,
  }),
  test_email: h.email(),
  test_updated_at: h.updatedAt(),
  test_created_at: h.createdAt(),
});

describe("kysely", () => {
  it("kysely infers correct types", () => {
    const db = database({}, TEST_TABLE);

    type KyselyTypes = InferKyselyTypes<typeof db>;

    expectTypeOf<KyselyTypes>().toEqualTypeOf<{
      test_table: {
        bigserial: ColumnType<bigint, never, never>;
        test_int32: ColumnType<number, number, number>;
        test_int64: ColumnType<bigint, bigint, bigint>;
        test_bigint: ColumnType<bigint, bigint, bigint>;
        test_float32: ColumnType<number, number, number>;
        test_float64: ColumnType<number, number, number>;
        test_decimal: ColumnType<number, number, number>;
        test_uuid: ColumnType<string, string, string>;
        test_string: ColumnType<string, string, string>;
        test_varchar: ColumnType<string, string, string>;
        test_boolean: ColumnType<boolean, boolean, boolean>;
        test_datetime: ColumnType<Date, Date, Date>;
        test_datetime2: ColumnType<Date, Date, Date>;
        test_datepart: ColumnType<string, string, string>;
        test_timepart: ColumnType<string, string, string>;
        test_jsonb: ColumnType<object, object, object>;
        test_json: ColumnType<object, object, object>;
        test_rowversion: ColumnType<bigint, never, never>;
        test_concurrencyStamp: ColumnType<string, never, never>;
        test_userstring: ColumnType<string, string, string>;
        test_email: ColumnType<string, string, string>;
        test_updated_at: ColumnType<Date, never, never>;
        test_created_at: ColumnType<Date, never, never>;
      };
    }>();
  });

  it("kysely infers nullable, default, and notInsertable/notUpdatable combinations", () => {
    const modifiers_table = table("modifiers_table", {
      // nullable: select/insert/update all get | null
      nullable: c.string({ nullable: true }),
      // default (insertable): insert gets | undefined
      with_default: c.string({ default: "foo" }),
      // nullable + default: insert gets | null | undefined
      nullable_with_default: c.string({ nullable: true, default: "foo" }),
      // notInsertable: insert = never
      not_insertable: c.string({ notInsertable: true }),
      // notUpdatable: update = never
      not_updatable: c.string({ notUpdatable: true }),
      // nullable + notUpdatable: update = never, select/insert get | null
      nullable_not_updatable: c.string({ nullable: true, notUpdatable: true }),
      // nullable + notInsertable: insert = never, select/update get | null
      nullable_not_insertable: c.string({
        nullable: true,
        notInsertable: true,
      }),
    });

    const db = database({}, modifiers_table);
    type KyselyTypes = InferKyselyTypes<typeof db>;

    expectTypeOf<KyselyTypes>().toEqualTypeOf<{
      modifiers_table: {
        nullable: ColumnType<
          string | null,
          string | null | undefined,
          string | null
        >;
        with_default: ColumnType<string, string | undefined, string>;
        nullable_with_default: ColumnType<
          string | null,
          string | null | undefined,
          string | null
        >;
        not_insertable: ColumnType<string, never, string>;
        not_updatable: ColumnType<string, string, never>;
        nullable_not_updatable: ColumnType<
          string | null,
          string | null | undefined,
          never
        >;
        nullable_not_insertable: ColumnType<
          string | null,
          never,
          string | null
        >;
      };
    }>();
  });
});
