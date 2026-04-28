import type { ColumnType } from "kysely";
import * as z from "zod";
import * as h from "./columnhelpers.ts";
import * as c from "./columns.ts";
import { table } from "./table.ts";
import { database } from "./database.ts";
import { describe, it, expect, expectTypeOf } from "vitest";
import {
  getSelectSchema,
  getInsertSchema,
  getPatchSchema,
  type InferKyselyTypes,
} from "./kysely.ts";
import type { StandardSchemaV1 } from "@standard-schema/spec";

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
  type TestJsonShape = {
    somestring: string;
    someint: number;
    somebool: boolean;
    somearray: string[];
    someobject: { foo: string; bar: number };
  };

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
        test_jsonb: ColumnType<TestJsonShape, TestJsonShape, TestJsonShape>;
        test_json: ColumnType<TestJsonShape, TestJsonShape, TestJsonShape>;
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

  it("kysely uses custom type mapping when provided", () => {
    const custom_table = table("custom_table", {
      id: c.int32(),
      name: c.string(),
      score: c.float64(),
    });

    const db = database({}, custom_table);

    type CustomTypeMap = {
      int32: string; // map int32 to string instead of number
      string: number; // map string to number instead of string
      float64: boolean; // map float64 to boolean instead of number
    };

    type KyselyTypes = InferKyselyTypes<
      typeof db,
      CustomTypeMap,
      CustomTypeMap,
      CustomTypeMap
    >;

    expectTypeOf<KyselyTypes>().toEqualTypeOf<{
      custom_table: {
        id: ColumnType<string, string, string>;
        name: ColumnType<number, number, number>;
        score: ColumnType<boolean, boolean, boolean>;
      };
    }>();
  });

  it("kysely uses schema output type when column has schema", () => {
    const schema_table = table("schema_table", {
      // string column with a Zod schema — output type should be the schema's output, not `object`
      tagged: c.string({
        schema: z.string().brand<"Tagged">(),
      }),
      // jsonb with a schema — output type should be the object shape, not generic `object`
      data: c.jsonb({
        schema: z.object({ id: z.number(), label: z.string() }),
      }),
    });

    const db = database({}, schema_table);
    type KyselyTypes = InferKyselyTypes<typeof db>;

    type TaggedString = string & z.BRAND<"Tagged">;
    type DataShape = { id: number; label: string };

    expectTypeOf<KyselyTypes>().toEqualTypeOf<{
      schema_table: {
        tagged: ColumnType<TaggedString, TaggedString, TaggedString>;
        data: ColumnType<DataShape, DataShape, DataShape>;
      };
    }>();
  });

  it("kysely falls back to TypeMap when schema output is incompatible", () => {
    const incompatible_table = table("incompatible_table", {
      // schema output is number, but column type is "string" (TypeMap: string) — incompatible, should fall back to string
      bad_schema: c.string({
        schema: z.number(),
      }),
    });

    const db = database({}, incompatible_table);
    type KyselyTypes = InferKyselyTypes<typeof db>;

    // Correctly falls back to string (TypeMap value), not number
    expectTypeOf<KyselyTypes>().toEqualTypeOf<{
      incompatible_table: {
        bad_schema: ColumnType<string, string, string>;
      };
    }>();

    // @ts-expect-error — schema output (number) is incompatible, so number is NOT used
    expectTypeOf<KyselyTypes>().toEqualTypeOf<{
      incompatible_table: {
        bad_schema: ColumnType<number, number, number>;
      };
    }>();
  });
});
describe("getSelectSchema", () => {
  it("getSelectSchema infers correct input/output types from type map", () => {
    const simpleTable = table("simple_table", {
      id: c.int32(),
      name: c.string(),
      active: c.boolean(),
    });

    const selectSchema = getSelectSchema(simpleTable.columns, {
      int32: z.number(),
      string: z.string(),
      boolean: z.boolean(),
    });

    type SchemaType = typeof selectSchema;

    // Should infer exact input/output types from the type map
    expectTypeOf<SchemaType>().toEqualTypeOf<
      StandardSchemaV1<
        { id: number; name: string; active: boolean },
        { id: number; name: string; active: boolean }
      >
    >();
  });

  it("getSelectSchema uses column schema when available", () => {
    const tableWithSchema = table("schema_table", {
      id: c.int32(),
      // Column has its own schema - should use this instead of type map
      email: c.string({ schema: z.string().email() }),
      // jsonb with object schema
      metadata: c.jsonb({
        schema: z.object({ count: z.number(), tags: z.string().array() }),
      }),
    });

    const selectSchema = getSelectSchema(tableWithSchema.columns, {
      int32: z.number(),
      string: z.string(),
      jsonb: z.object({}), // Fallback, but column schema should take precedence
    });

    type SchemaType = typeof selectSchema;

    // Output should use the column's email schema (string) and jsonb schema (object shape)
    expectTypeOf<SchemaType>().toEqualTypeOf<
      StandardSchemaV1<
        {
          id: number;
          email: string;
          metadata: { count: number; tags: string[] };
        },
        {
          id: number;
          email: string;
          metadata: { count: number; tags: string[] };
        }
      >
    >();
  });

  it("getSelectSchema handles nullable columns", () => {
    const nullableTable = table("nullable_table", {
      id: c.int32(),
      optional_name: c.string({ nullable: true }),
    });

    const selectSchema = getSelectSchema(nullableTable.columns, {
      int32: z.number(),
      string: z.string(),
    });

    type SchemaType = typeof selectSchema;

    // Nullable column should have string | null type
    expectTypeOf<SchemaType>().toEqualTypeOf<
      StandardSchemaV1<
        { id: number; optional_name: string | null },
        { id: number; optional_name: string | null }
      >
    >();
  });

  it("getSelectSchema uses column schema with different input/output types", () => {
    const transformTable = table("transform_table", {
      id: c.int32(),
      // String column with email schema - input is string, output is branded string
      email: c.string({ schema: z.email().brand<"Email">() }),
      // String column with transform - input is string, output is number
      count: c.string({ schema: z.string().transform((v) => parseInt(v, 10)) }),
    });

    const selectSchema = getSelectSchema(transformTable.columns, {
      int32: z.number(),
      string: z.string(), // Fallback, but column schemas should take precedence
    });

    type SchemaType = typeof selectSchema;
    type EmailString = string & z.BRAND<"Email">;

    // Column schemas should provide different input/output types
    expectTypeOf<SchemaType>().toEqualTypeOf<
      StandardSchemaV1<
        { id: number; email: string; count: string },
        { id: number; email: EmailString; count: number }
      >
    >();
  });
});

describe("getInsertSchema", () => {
  it("getInsertSchema infers correct input/output types from type map", () => {
    const simpleTable = table("simple_insert_table", {
      id: c.int32(),
      name: c.string(),
      active: c.boolean(),
    });

    const insertSchema = getInsertSchema(simpleTable.columns, {
      int32: z.number(),
      string: z.string(),
      boolean: z.boolean(),
    });

    type SchemaType = typeof insertSchema;

    // Insert schema should match the type map schemas
    expectTypeOf<SchemaType>().toEqualTypeOf<
      StandardSchemaV1<
        { id: number; name: string; active: boolean },
        { id: number; name: string; active: boolean }
      >
    >();
  });

  it("getInsertSchema omits notInsertable columns", () => {
    const autoGenTable = table("auto_gen_table", {
      id: h.pkAutoInc(), // notInsertable: true
      name: c.string(),
      created_at: h.createdAt(), // notInsertable: true
    });

    const insertSchema = getInsertSchema(autoGenTable.columns, {
      int64: z.bigint(),
      string: z.string(),
      datetime: z.date(),
    });

    type SchemaType = typeof insertSchema;

    // notInsertable columns (id, created_at) should be omitted
    expectTypeOf<SchemaType>().toEqualTypeOf<
      StandardSchemaV1<{ name: string }, { name: string }>
    >();
  });

  it("getInsertSchema makes nullable columns optional", () => {
    const nullableTable = table("nullable_insert_table", {
      id: c.int32(),
      optional_name: c.string({ nullable: true }),
    });

    const insertSchema = getInsertSchema(nullableTable.columns, {
      int32: z.number(),
      string: z.string(),
    });

    type SchemaType = typeof insertSchema;

    // Nullable column should be optional with string | null | undefined
    expectTypeOf<SchemaType>().toEqualTypeOf<
      StandardSchemaV1<
        { id: number; optional_name?: string | null | undefined },
        { id: number; optional_name?: string | null | undefined }
      >
    >();
  });

  it("getInsertSchema makes default columns optional", () => {
    const defaultTable = table("default_insert_table", {
      id: c.int32(),
      status: c.string({ default: "pending" }),
    });

    const insertSchema = getInsertSchema(defaultTable.columns, {
      int32: z.number(),
      string: z.string(),
    });

    type SchemaType = typeof insertSchema;

    // Column with default should be optional with string | undefined
    expectTypeOf<SchemaType>().toEqualTypeOf<
      StandardSchemaV1<
        { id: number; status?: string | undefined },
        { id: number; status?: string | undefined }
      >
    >();
  });

  it("getInsertSchema combines nullable and default modifiers", () => {
    const combinedTable = table("combined_insert_table", {
      id: c.int32(),
      description: c.string({ nullable: true, default: "no description" }),
    });

    const insertSchema = getInsertSchema(combinedTable.columns, {
      int32: z.number(),
      string: z.string(),
    });

    type SchemaType = typeof insertSchema;

    // Column with both nullable and default should be optional with string | null | undefined
    expectTypeOf<SchemaType>().toEqualTypeOf<
      StandardSchemaV1<
        { id: number; description?: string | null | undefined },
        { id: number; description?: string | null | undefined }
      >
    >();
  });

  it("getInsertSchema uses column schema when available", () => {
    const schemaTable = table("schema_insert_table", {
      id: c.int32(),
      email: c.string({ schema: z.string().email() }),
    });

    const insertSchema = getInsertSchema(schemaTable.columns, {
      int32: z.number(),
      string: z.string(), // Fallback, but column schema should take precedence
    });

    type SchemaType = typeof insertSchema;

    // Column schema should be used instead of type map
    expectTypeOf<SchemaType>().toEqualTypeOf<
      StandardSchemaV1<
        { id: number; email: string },
        { id: number; email: string }
      >
    >();
  });

  it("getInsertSchema handles jsonb with schema", () => {
    const jsonbTable = table("jsonb_insert_table", {
      id: c.int32(),
      metadata: c.jsonb({
        schema: z.object({ count: z.number(), tags: z.string().array() }),
      }),
    });

    const insertSchema = getInsertSchema(jsonbTable.columns, {
      int32: z.number(),
      jsonb: z.object({}), // Fallback
    });

    type SchemaType = typeof insertSchema;

    // Should use the column's jsonb schema
    expectTypeOf<SchemaType>().toEqualTypeOf<
      StandardSchemaV1<
        { id: number; metadata: { count: number; tags: string[] } },
        { id: number; metadata: { count: number; tags: string[] } }
      >
    >();
  });

  it("getInsertSchema handles json with schema", () => {
    const jsonTable = table("json_insert_table", {
      id: c.int32(),
      data: c.json({
        schema: z.object({ id: z.number(), label: z.string() }),
      }),
    });

    const insertSchema = getInsertSchema(jsonTable.columns, {
      int32: z.number(),
      json: z.object({}), // Fallback
    });

    type SchemaType = typeof insertSchema;

    // Should use the column's json schema
    expectTypeOf<SchemaType>().toEqualTypeOf<
      StandardSchemaV1<
        { id: number; data: { id: number; label: string } },
        { id: number; data: { id: number; label: string } }
      >
    >();
  });

  it("getInsertSchema handles jsonb with nullable schema", () => {
    const nullableJsonbTable = table("nullable_jsonb_insert_table", {
      id: c.int32(),
      optional_metadata: c.jsonb({
        nullable: true,
        schema: z.object({ count: z.number(), tags: z.string().array() }),
      }),
    });

    const insertSchema = getInsertSchema(nullableJsonbTable.columns, {
      int32: z.number(),
      jsonb: z.object({}), // Fallback
    });

    type SchemaType = typeof insertSchema;

    // Nullable jsonb should be optional with the schema shape
    expectTypeOf<SchemaType>().toEqualTypeOf<
      StandardSchemaV1<
        {
          id: number;
          optional_metadata?:
            | { count: number; tags: string[] }
            | null
            | undefined;
        },
        {
          id: number;
          optional_metadata?:
            | { count: number; tags: string[] }
            | null
            | undefined;
        }
      >
    >();
  });

  it("getInsertSchema handles json with default schema", () => {
    const defaultJsonTable = table("default_json_insert_table", {
      id: c.int32(),
      default_data: c.json({
        default: { id: 1, label: "default" },
        schema: z.object({ id: z.number(), label: z.string() }),
      }),
    });

    const insertSchema = getInsertSchema(defaultJsonTable.columns, {
      int32: z.number(),
      json: z.object({}), // Fallback
    });

    type SchemaType = typeof insertSchema;

    // Json with default should be optional with the schema shape
    expectTypeOf<SchemaType>().toEqualTypeOf<
      StandardSchemaV1<
        {
          id: number;
          default_data?: { id: number; label: string } | undefined;
        },
        { id: number; default_data?: { id: number; label: string } | undefined }
      >
    >();
  });
});

describe("getPatchSchema", () => {
  it("getPatchSchema makes all fields optional except primaryKey and updateKey", () => {
    const patchTable = table("patch_table", {
      id: h.pkAutoInc(), // primaryKey: true - required
      external_id: c.string({ updateKey: true }), // updateKey: true - required
      name: c.string(), // regular field - optional
      description: c.string(), // regular field - optional
    });

    const patchSchema = getPatchSchema(patchTable.columns, {
      int64: z.bigint(),
      string: z.string(),
    });

    type SchemaType = typeof patchSchema;

    // Primary key and update key should be required, others optional
    expectTypeOf<SchemaType>().toEqualTypeOf<
      StandardSchemaV1<
        {
          id: bigint;
          external_id: string;
          name?: string | undefined;
          description?: string | undefined;
        },
        {
          id: bigint;
          external_id: string;
          name?: string | undefined;
          description?: string | undefined;
        }
      >
    >();
  });

  it("getPatchSchema omits notUpdatable columns", () => {
    const readonlyTable = table("readonly_patch_table", {
      id: h.pkAutoInc(),
      name: c.string(),
      created_at: h.createdAt(), // notUpdatable: true
    });

    const patchSchema = getPatchSchema(readonlyTable.columns, {
      int64: z.bigint(),
      string: z.string(),
      datetime: z.date(),
    });

    type SchemaType = typeof patchSchema;

    // notUpdatable column (created_at) should be omitted
    expectTypeOf<SchemaType>().toEqualTypeOf<
      StandardSchemaV1<
        { id: bigint; name?: string | undefined },
        { id: bigint; name?: string | undefined }
      >
    >();
  });

  it("getPatchSchema handles nullable columns", () => {
    const nullablePatchTable = table("nullable_patch_table", {
      id: h.pkAutoInc(),
      name: c.string(),
      optional_description: c.string({ nullable: true }),
    });

    const patchSchema = getPatchSchema(nullablePatchTable.columns, {
      int64: z.bigint(),
      string: z.string(),
    });

    type SchemaType = typeof patchSchema;

    // Nullable column should have string | null | undefined for output
    expectTypeOf<SchemaType>().toEqualTypeOf<
      StandardSchemaV1<
        {
          id: bigint;
          name?: string | undefined;
          optional_description?: string | null | undefined;
        },
        {
          id: bigint;
          name?: string | undefined;
          optional_description?: string | null | undefined;
        }
      >
    >();
  });

  it("getPatchSchema uses column schema when available", () => {
    const schemaPatchTable = table("schema_patch_table", {
      id: h.pkAutoInc(),
      email: c.string({ schema: z.string().email() }),
    });

    const patchSchema = getPatchSchema(schemaPatchTable.columns, {
      int64: z.bigint(),
      string: z.string(), // Fallback, but column schema should take precedence
    });

    type SchemaType = typeof patchSchema;

    // Column schema should be used instead of type map
    expectTypeOf<SchemaType>().toEqualTypeOf<
      StandardSchemaV1<
        { id: bigint; email?: string | undefined },
        { id: bigint; email?: string | undefined }
      >
    >();
  });

  it("getPatchSchema combines primaryKey, updateKey, nullable, and notUpdatable", () => {
    const complexPatchTable = table("complex_patch_table", {
      id: h.pkAutoInc(), // primaryKey: true, notUpdatable: false (implicit) - required
      external_id: c.string({ updateKey: true }), // updateKey: true - required
      name: c.string(), // regular - optional
      status: c.string({ nullable: true }), // nullable - optional with null
      created_at: h.createdAt(), // notUpdatable: true - omitted
      updated_at: h.updatedAt(), // notUpdatable: true - omitted
    });

    const patchSchema = getPatchSchema(complexPatchTable.columns, {
      int64: z.bigint(),
      string: z.string(),
      datetime: z.date(),
    });

    type SchemaType = typeof patchSchema;

    // Complex combination of modifiers
    expectTypeOf<SchemaType>().toEqualTypeOf<
      StandardSchemaV1<
        {
          id: bigint;
          external_id: string;
          name?: string | undefined;
          status?: string | null | undefined;
        },
        {
          id: bigint;
          external_id: string;
          name?: string | undefined;
          status?: string | null | undefined;
        }
      >
    >();
  });

  it("getPatchSchema handles jsonb with schema", () => {
    const jsonbPatchTable = table("jsonb_patch_table", {
      id: h.pkAutoInc(),
      metadata: c.jsonb({
        schema: z.object({ count: z.number(), tags: z.string().array() }),
      }),
    });

    const patchSchema = getPatchSchema(jsonbPatchTable.columns, {
      int64: z.bigint(),
      jsonb: z.object({}), // Fallback
    });

    type SchemaType = typeof patchSchema;

    // Should use the column's jsonb schema
    expectTypeOf<SchemaType>().toEqualTypeOf<
      StandardSchemaV1<
        {
          id: bigint;
          metadata?: { count: number; tags: string[] } | undefined;
        },
        { id: bigint; metadata?: { count: number; tags: string[] } | undefined }
      >
    >();
  });

  it("getPatchSchema handles json with schema", () => {
    const jsonPatchTable = table("json_patch_table", {
      id: h.pkAutoInc(),
      data: c.json({
        schema: z.object({ id: z.number(), label: z.string() }),
      }),
    });

    const patchSchema = getPatchSchema(jsonPatchTable.columns, {
      int64: z.bigint(),
      json: z.object({}), // Fallback
    });

    type SchemaType = typeof patchSchema;

    // Should use the column's json schema
    expectTypeOf<SchemaType>().toEqualTypeOf<
      StandardSchemaV1<
        { id: bigint; data?: { id: number; label: string } | undefined },
        { id: bigint; data?: { id: number; label: string } | undefined }
      >
    >();
  });

  it("getPatchSchema handles jsonb with nullable schema", () => {
    const nullableJsonbPatchTable = table("nullable_jsonb_patch_table", {
      id: h.pkAutoInc(),
      optional_metadata: c.jsonb({
        nullable: true,
        schema: z.object({ count: z.number(), tags: z.string().array() }),
      }),
    });

    const patchSchema = getPatchSchema(nullableJsonbPatchTable.columns, {
      int64: z.bigint(),
      jsonb: z.object({}), // Fallback
    });

    type SchemaType = typeof patchSchema;

    // Nullable jsonb should be optional with the schema shape
    expectTypeOf<SchemaType>().toEqualTypeOf<
      StandardSchemaV1<
        {
          id: bigint;
          optional_metadata?:
            | { count: number; tags: string[] }
            | null
            | undefined;
        },
        {
          id: bigint;
          optional_metadata?:
            | { count: number; tags: string[] }
            | null
            | undefined;
        }
      >
    >();
  });

  it("getPatchSchema handles json with default schema", () => {
    const defaultJsonPatchTable = table("default_json_patch_table", {
      id: h.pkAutoInc(),
      default_data: c.json({
        default: { id: 1, label: "default" },
        schema: z.object({ id: z.number(), label: z.string() }),
      }),
    });

    const patchSchema = getPatchSchema(defaultJsonPatchTable.columns, {
      int64: z.bigint(),
      json: z.object({}), // Fallback
    });

    type SchemaType = typeof patchSchema;

    // Json with default should be optional with the schema shape
    expectTypeOf<SchemaType>().toEqualTypeOf<
      StandardSchemaV1<
        {
          id: bigint;
          default_data?: { id: number; label: string } | undefined;
        },
        { id: bigint; default_data?: { id: number; label: string } | undefined }
      >
    >();
  });

  it("getPatchSchema handles jsonb with notUpdatable", () => {
    const readonlyJsonbTable = table("readonly_jsonb_patch_table", {
      id: h.pkAutoInc(),
      metadata: c.jsonb({
        schema: z.object({ count: z.number(), tags: z.string().array() }),
        notUpdatable: true,
      }),
    });

    const patchSchema = getPatchSchema(readonlyJsonbTable.columns, {
      int64: z.bigint(),
      jsonb: z.object({}), // Fallback
    });

    type SchemaType = typeof patchSchema;

    // notUpdatable jsonb should be omitted
    expectTypeOf<SchemaType>().toEqualTypeOf<
      StandardSchemaV1<{ id: bigint }, { id: bigint }>
    >();
  });

  it("getPatchSchema handles json with notInsertable", () => {
    const readonlyJsonTable = table("readonly_json_patch_table", {
      id: h.pkAutoInc(),
      data: c.json({
        schema: z.object({ id: z.number(), label: z.string() }),
        notInsertable: true,
      }),
    });

    const patchSchema = getPatchSchema(readonlyJsonTable.columns, {
      int64: z.bigint(),
      json: z.object({}), // Fallback
    });

    type SchemaType = typeof patchSchema;

    // notInsertable json should be omitted
    expectTypeOf<SchemaType>().toEqualTypeOf<
      StandardSchemaV1<
        {
          data?:
            | {
                id: number;
                label: string;
              }
            | undefined;
          id: bigint;
        },
        {
          data?:
            | {
                id: number;
                label: string;
              }
            | undefined;
          id: bigint;
        }
      >
    >();
  });
});
