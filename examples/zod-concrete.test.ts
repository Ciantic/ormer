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

function expectEqualAndTypes<K extends readonly string[]>(
  actual: K,
  expected: K,
) {
  expect(actual).toEqual(expected);
}

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

  it("should build helper schemas for extension schema", () => {
    const dbSchema = d.getDbSchema(ExtensionSchema);
    const primaryKeySchema = d.getPrimaryKeySchema(ExtensionSchema);
    const patchSchema = d.getPatchSchema(ExtensionSchema);
    const insertSchema = d.getInsertSchema(ExtensionSchema);

    const dbKeys = schemaShapeKeys(dbSchema);
    const primaryKeyKeys = schemaShapeKeys(primaryKeySchema);
    const patchKeys = schemaShapeKeys(patchSchema);
    const insertKeys = schemaShapeKeys(insertSchema);

    expectEqualAndTypes(dbKeys, [
      "pkField",
      "pkAutoIncField",
      "createdAtField",
      "updatedAtField",
      "rowversionField",
      "concurrencyStampField",
    ] as const);

    expectEqualAndTypes(primaryKeyKeys, ["pkField", "pkAutoIncField"] as const);

    expectEqualAndTypes(patchKeys, [
      "pkField",
      "createdAtField",
      "updatedAtField",
      "rowversionField",
      "concurrencyStampField",
    ] as const);

    expectEqualAndTypes(insertKeys, [
      "pkField",
      "createdAtField",
      "updatedAtField",
      "rowversionField",
      "concurrencyStampField",
    ] as const);
  });

  it("should build helper schemas for relation schema", () => {
    const authorDbSchema = d.getDbSchema(AuthorSchema);
    const authorPrimaryKeySchema = d.getPrimaryKeySchema(AuthorSchema);
    const authorPatchSchema = d.getPatchSchema(AuthorSchema);
    const authorInsertSchema = d.getInsertSchema(AuthorSchema);

    const postDbSchema = d.getDbSchema(PostSchema);
    const postPrimaryKeySchema = d.getPrimaryKeySchema(PostSchema);
    const postPatchSchema = d.getPatchSchema(PostSchema);
    const postInsertSchema = d.getInsertSchema(PostSchema);

    const authorDbKeys = schemaShapeKeys(authorDbSchema);
    const authorPrimaryKeyKeys = schemaShapeKeys(authorPrimaryKeySchema);
    const authorPatchKeys = schemaShapeKeys(authorPatchSchema);
    const authorInsertKeys = schemaShapeKeys(authorInsertSchema);

    const postDbKeys = schemaShapeKeys(postDbSchema);
    const postPrimaryKeyKeys = schemaShapeKeys(postPrimaryKeySchema);
    const postPatchKeys = schemaShapeKeys(postPatchSchema);
    const postInsertKeys = schemaShapeKeys(postInsertSchema);

    expectEqualAndTypes(authorDbKeys, ["id", "name"] as const);
    expectEqualAndTypes(authorPrimaryKeyKeys, ["id"] as const);
    expectEqualAndTypes(authorPatchKeys, ["name"] as const);
    expectEqualAndTypes(authorInsertKeys, ["name"] as const);

    expectEqualAndTypes(postDbKeys, ["id", "authorId", "title"] as const);
    expectEqualAndTypes(postPrimaryKeyKeys, ["id"] as const);
    expectEqualAndTypes(postPatchKeys, ["authorId", "title"] as const);
    expectEqualAndTypes(postInsertKeys, ["authorId", "title"] as const);
  });
});
