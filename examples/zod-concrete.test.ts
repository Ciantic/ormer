import * as d from "./zod-concrete.ts";
import { z } from "zod";
import { it, expect, describe, expectTypeOf } from "vitest";

// --- Type-level test utilities ---
type Expect<T extends true> = T;
type Equal<X, Y> =
  (<T>() => T extends X ? 1 : 2) extends <T>() => T extends Y ? 1 : 2
    ? true
    : false;

function schemaShapeKeys<T extends z.ZodObject<any>>(schema: T) {
  return Object.keys(schema.shape) as Array<keyof z.output<T>>;
}

function expectTypedArrays<K extends readonly string[]>(
  actual: K,
  expected: K,
) {
  expect(actual).toEqual(expected);
}

function expectTypedRecords<K extends Record<string, any>>(
  actual: K,
  expected: K,
) {
  expect(actual).toEqual(expected);
}

const TEST_UUID = "550e8400-e29b-41d4-a716-446655440000";

const TestSchema = z.strictObject({
  int64Field: d.int64(),
  int32Field: d.int32(),
  float32Field: d.float32(),
  float64Field: d.float64(),
  bigintField: d.bigint(),
  decimalField: d.decimal(12, 2),
  uuidField: d.uuid(),
  stringField: d.string(),
  varcharField: d.varchar(255),
  booleanField: d.boolean(),
  datetimeField: d.datetime(),
  datepartField: d.datepart(),
  timepartField: d.timepart(),
  jsonbField: d.jsonb(z.object({ count: z.number() })),
  jsonField: d.json(z.object({ name: z.string() })),
  timestamptzField: d.timestamptz(z.date()),
  timestampField: d.timestamp(z.date()),
});

const ExtensionSchema = z.strictObject({
  pkField: d.int64().pk(),
  pkAutoIncField: d.bigint().pkAutoInc(),
  createdAtField: d.datetime().createdAt({ auto: true }),
  updatedAtField: d.timestamp(z.date()).updatedAt({ auto: false }),
  rowversionField: d.int32().rowversion(),
  concurrencyStampField: d.uuid().concurrencyStamp(),
  nonDbField: z.string(), // <-- Note this is vanilla zod field, without database backing type and is ignored
});

const AuthorSchema = z.strictObject({
  id: d.bigint().pkAutoInc(),
  name: d.string(),
  get posts() {
    return PostSchema.array().optional().navigateMany();
  },
});

const PostSchema = z.strictObject({
  id: d.bigint().pkAutoInc(),
  authorId: d.bigint().foreignKey(AuthorSchema, "id"),
  title: d.string(),
  author: AuthorSchema.optional().navigateOne(),
});

describe("zod-concrete", () => {
  it("should have correct TypeScript types", () => {
    type TestSchemaInput = z.input<typeof TestSchema>;
    type TestSchemaOutput = z.output<typeof TestSchema>;

    expectTypeOf<TestSchemaInput>().toMatchObjectType<{
      int64Field: number;
      int32Field: number;
      float32Field: number;
      float64Field: number;
      bigintField: bigint;
      decimalField: number;
      uuidField: string;
      stringField: string;
      varcharField: string;
      booleanField: boolean;
      datetimeField: Date;
      datepartField: string;
      timepartField: string;
      jsonbField: { count: number };
      jsonField: { name: string };
      timestamptzField: Date;
      timestampField: Date;
    }>();

    expectTypeOf<TestSchemaOutput>().toMatchObjectType<{
      int64Field: number;
      int32Field: number;
      float32Field: number;
      float64Field: number;
      bigintField: bigint;
      decimalField: number;
      uuidField: string;
      stringField: string;
      varcharField: string;
      booleanField: boolean;
      datetimeField: Date;
      datepartField: string;
      timepartField: string;
      jsonbField: { count: number };
      jsonField: { name: string };
      timestamptzField: Date;
      timestampField: Date;
    }>();
  });

  it("should have correct TypeScript types for extension fields", () => {
    type ExtensionSchemaInput = z.input<typeof ExtensionSchema>;
    type ExtensionSchemaOutput = z.output<typeof ExtensionSchema>;

    expectTypeOf<ExtensionSchemaInput>().toMatchObjectType<{
      pkField: number;
      pkAutoIncField: bigint;
      createdAtField: Date;
      updatedAtField: Date;
      rowversionField: number;
      concurrencyStampField: string;
    }>();

    expectTypeOf<ExtensionSchemaOutput>().toMatchObjectType<{
      pkField: number;
      pkAutoIncField: bigint;
      createdAtField: Date;
      updatedAtField: Date;
      rowversionField: number;
      concurrencyStampField: string;
    }>();
  });

  it("should have correct type for getDbSchema input and output", () => {
    const dbSchema = d.getDbSchema(ExtensionSchema);
    type DbSchemaInput = z.input<typeof dbSchema>;
    type DbSchemaOutput = z.output<typeof dbSchema>;

    expectTypeOf<DbSchemaInput>().toMatchObjectType<{
      pkField: number;
      pkAutoIncField: bigint;
      createdAtField: Date;
      updatedAtField: Date;
      rowversionField: number;
      concurrencyStampField: string;
    }>();

    expectTypeOf<DbSchemaOutput>().toMatchObjectType<{
      pkField: number;
      pkAutoIncField: bigint;
      createdAtField: Date;
      updatedAtField: Date;
      rowversionField: number;
      concurrencyStampField: string;
    }>();

    const date = new Date();
    const output = dbSchema.decode({
      pkField: 1,
      pkAutoIncField: 1n,
      createdAtField: date,
      updatedAtField: date,
      rowversionField: 1,
      concurrencyStampField: TEST_UUID,
    });

    expectTypedRecords(output, {
      pkField: 1,
      pkAutoIncField: 1n,
      createdAtField: date,
      updatedAtField: date,
      rowversionField: 1,
      concurrencyStampField: TEST_UUID,
    });
  });

  it("should have correct type for getPrimaryKeySchema input and output", () => {
    const primaryKeySchema = d.getPrimaryKeySchema(ExtensionSchema);
    type PrimaryKeySchemaInput = z.input<typeof primaryKeySchema>;
    type PrimaryKeySchemaOutput = z.output<typeof primaryKeySchema>;

    expectTypeOf<PrimaryKeySchemaInput>().toMatchObjectType<{
      pkField: number;
      pkAutoIncField: bigint;
    }>();

    expectTypeOf<PrimaryKeySchemaOutput>().toMatchObjectType<{
      pkField: number;
      pkAutoIncField: bigint;
    }>();

    const output = primaryKeySchema.decode({
      pkField: 1,
      pkAutoIncField: 1n,
    });

    expectTypedRecords(output, {
      pkField: 1,
      pkAutoIncField: 1n,
    });
  });

  it("should have correct type for getPatchSchema input and output", () => {
    const patchSchema = d.getPatchSchema(ExtensionSchema);
    type PatchSchemaInput = z.input<typeof patchSchema>;
    type PatchSchemaOutput = z.output<typeof patchSchema>;

    // pkField is required (PK), pkAutoIncField excluded (notUpdatable), rest optional
    expectTypeOf<PatchSchemaInput>().toMatchObjectType<{
      pkField: number;
      createdAtField?: Date | undefined;
      updatedAtField?: Date | undefined;
      rowversionField?: number | undefined;
      concurrencyStampField?: string | undefined;
    }>();

    expectTypeOf<PatchSchemaOutput>().toMatchObjectType<{
      pkField: number;
      createdAtField?: Date | undefined;
      updatedAtField?: Date | undefined;
      rowversionField?: number | undefined;
      concurrencyStampField?: string | undefined;
    }>();

    const date = new Date();
    const output = patchSchema.decode({
      pkField: 1,
      updatedAtField: date,
    });

    expectTypedRecords(output, {
      pkField: 1,
      updatedAtField: date,
    });
  });

  it("should have correct type for getInsertSchema input and output", () => {
    const insertSchema = d.getInsertSchema(ExtensionSchema);
    type InsertSchemaInput = z.input<typeof insertSchema>;
    type InsertSchemaOutput = z.output<typeof insertSchema>;

    // pkAutoIncField excluded (notInsertable), rest required
    expectTypeOf<InsertSchemaInput>().toMatchObjectType<{
      pkField: number;
      createdAtField: Date;
      updatedAtField: Date;
      rowversionField: number;
      concurrencyStampField: string;
    }>();

    expectTypeOf<InsertSchemaOutput>().toMatchObjectType<{
      pkField: number;
      createdAtField: Date;
      updatedAtField: Date;
      rowversionField: number;
      concurrencyStampField: string;
    }>();

    const date = new Date();
    const output = insertSchema.decode({
      pkField: 1,
      createdAtField: date,
      updatedAtField: date,
      rowversionField: 1,
      concurrencyStampField: TEST_UUID,
    });

    expectTypedRecords(output, {
      pkField: 1,
      createdAtField: date,
      updatedAtField: date,
      rowversionField: 1,
      concurrencyStampField: TEST_UUID,
    });
  });

  it("should exclude and reject non-db fields", () => {
    const dbSchema = d.getDbSchema(ExtensionSchema);
    const date = new Date();
    const payloadWithNonDbField = {
      pkField: 1,
      pkAutoIncField: 1n,
      createdAtField: date,
      updatedAtField: date,
      rowversionField: 1,
      concurrencyStampField: TEST_UUID,
      nonDbField: "should-fail",
    } as unknown;

    expect(() => dbSchema.decode(payloadWithNonDbField as any)).toThrow();
  });

  it("should have correct type for author/post derived schema input and output", () => {
    const authorInsertSchema = d.getInsertSchema(AuthorSchema);
    type AuthorInsertInput = z.input<typeof authorInsertSchema>;
    type AuthorInsertOutput = z.output<typeof authorInsertSchema>;

    // id excluded (notInsertable), posts excluded (navigateMany, no dbtype)
    expectTypeOf<AuthorInsertInput>().toMatchObjectType<{
      name: string;
    }>();

    expectTypeOf<AuthorInsertOutput>().toMatchObjectType<{
      name: string;
    }>();

    const authorInsertOutput = authorInsertSchema.decode({
      name: "Ada",
    });

    expectTypedRecords(authorInsertOutput, {
      name: "Ada",
    });

    const postPatchSchema = d.getPatchSchema(PostSchema);
    type PostPatchInput = z.input<typeof postPatchSchema>;
    type PostPatchOutput = z.output<typeof postPatchSchema>;

    // id excluded (pkAutoInc → notUpdatable), author excluded (navigateOne, no dbtype), rest optional
    expectTypeOf<PostPatchInput>().toMatchObjectType<{
      authorId?: bigint | undefined;
      title?: string | undefined;
    }>();

    expectTypeOf<PostPatchOutput>().toMatchObjectType<{
      authorId?: bigint | undefined;
      title?: string | undefined;
    }>();

    const postPatchOutput = postPatchSchema.decode({
      authorId: 10n,
      title: "Hello",
    });

    expectTypedRecords(postPatchOutput, {
      authorId: 10n,
      title: "Hello",
    });
  });
});
