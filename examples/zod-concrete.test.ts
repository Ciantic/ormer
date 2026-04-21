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

    // pkField is required (PK), pkAutoIncField excluded (notUpdatable), rowversionField required (updateKey), concurrencyStampField required (updateKey), rest optional
    expectTypeOf<PatchSchemaInput>().toMatchObjectType<{
      pkField: number;
      rowversionField: number;
      concurrencyStampField: string;
      createdAtField?: Date | undefined;
      updatedAtField?: Date | undefined;
    }>();

    expectTypeOf<PatchSchemaOutput>().toMatchObjectType<{
      pkField: number;
      rowversionField: number;
      concurrencyStampField: string;
      createdAtField?: Date | undefined;
      updatedAtField?: Date | undefined;
    }>();

    const date = new Date();
    const output = patchSchema.decode({
      pkField: 1,
      rowversionField: 1,
      concurrencyStampField: TEST_UUID,
      updatedAtField: date,
    });

    expectTypedRecords(output, {
      pkField: 1,
      rowversionField: 1,
      concurrencyStampField: TEST_UUID,
      updatedAtField: date,
    });
  });

  it("should have correct type for getInsertSchema input and output", () => {
    const insertSchema = d.getInsertSchema(ExtensionSchema);
    type InsertSchemaInput = z.input<typeof insertSchema>;
    type InsertSchemaOutput = z.output<typeof insertSchema>;

    // pkAutoIncField excluded (notInsertable), rowversionField excluded (notInsertable), rest required
    expectTypeOf<InsertSchemaInput>().toMatchObjectType<{
      pkField: number;
      createdAtField: Date;
      updatedAtField: Date;
      concurrencyStampField: string;
    }>();

    expectTypeOf<InsertSchemaOutput>().toMatchObjectType<{
      pkField: number;
      createdAtField: Date;
      updatedAtField: Date;
      concurrencyStampField: string;
    }>();

    const date = new Date();
    const output = insertSchema.decode({
      pkField: 1,
      createdAtField: date,
      updatedAtField: date,
      concurrencyStampField: TEST_UUID,
    });

    expectTypedRecords(output, {
      pkField: 1,
      createdAtField: date,
      updatedAtField: date,
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

describe("zod-concrete edge cases", () => {
  // --- Edge case schemas ---

  const NoPkSchema = z.strictObject({
    name: d.string(),
    email: d.varchar(255),
  });

  const NoDbFieldsSchema = z.strictObject({
    computedA: z.number(),
    computedB: z.string(),
  });

  const CompositePkSchema = z.strictObject({
    tenantId: d.int64().pk(),
    userId: d.int64().pk(),
    name: d.string(),
  });

  const UpdateKeySchema = z.strictObject({
    id: d.bigint().pkAutoInc(),
    email: d.string(),
    version: d.int32().rowversion(),
  });

  const OptionalDbFieldSchema = z.strictObject({
    requiredField: d.int64(),
    optionalField: z.optional(d.string()),
  });

  // --- getPrimaryKeySchema edge cases ---

  it("should return empty schema when no primary keys exist", () => {
    const pkSchema = d.getPrimaryKeySchema(NoPkSchema);
    type PkInput = z.input<typeof pkSchema>;
    type PkOutput = z.output<typeof pkSchema>;

    expectTypeOf<PkInput>().toMatchObjectType<{}>();
    expectTypeOf<PkOutput>().toMatchObjectType<{}>();

    expect(Object.keys(pkSchema.shape)).toEqual([]);
  });

  it("should return composite primary key schema", () => {
    const pkSchema = d.getPrimaryKeySchema(CompositePkSchema);
    type PkInput = z.input<typeof pkSchema>;
    type PkOutput = z.output<typeof pkSchema>;

    expectTypeOf<PkInput>().toMatchObjectType<{
      tenantId: number;
      userId: number;
    }>();

    expectTypeOf<PkOutput>().toMatchObjectType<{
      tenantId: number;
      userId: number;
    }>();

    const output = pkSchema.decode({ tenantId: 1, userId: 2 });
    expectTypedRecords(output, { tenantId: 1, userId: 2 });
  });

  // --- getDbSchema edge cases ---

  it("should return empty schema when no db fields exist", () => {
    const dbSchema = d.getDbSchema(NoDbFieldsSchema);
    type DbInput = z.input<typeof dbSchema>;
    type DbOutput = z.output<typeof dbSchema>;

    expectTypeOf<DbInput>().toMatchObjectType<{}>();
    expectTypeOf<DbOutput>().toMatchObjectType<{}>();

    expect(Object.keys(dbSchema.shape)).toEqual([]);
  });

  it("should include optional-wrapped db fields", () => {
    const dbSchema = d.getDbSchema(OptionalDbFieldSchema);
    type DbInput = z.input<typeof dbSchema>;
    type DbOutput = z.output<typeof dbSchema>;

    expectTypeOf<DbInput>().toMatchObjectType<{
      requiredField: number;
      optionalField?: string | undefined;
    }>();

    expectTypeOf<DbOutput>().toMatchObjectType<{
      requiredField: number;
      optionalField?: string | undefined;
    }>();

    expect(Object.keys(dbSchema.shape)).toEqual([
      "requiredField",
      "optionalField",
    ]);

    // Decode with optional field present
    const withOptional = dbSchema.decode({
      requiredField: 1,
      optionalField: "hello",
    });
    expectTypedRecords(withOptional, {
      requiredField: 1,
      optionalField: "hello",
    });

    // Decode with optional field absent
    const withoutOptional = dbSchema.decode({ requiredField: 1 });
    expectTypedRecords(withoutOptional, { requiredField: 1 });
  });

  it("should exclude navigation fields from db schema", () => {
    const authorDbSchema = d.getDbSchema(AuthorSchema);
    type AuthorDbInput = z.input<typeof authorDbSchema>;
    type AuthorDbOutput = z.output<typeof authorDbSchema>;

    // posts (navigateMany) excluded
    expectTypeOf<AuthorDbInput>().toMatchObjectType<{
      id: bigint;
      name: string;
    }>();

    expectTypeOf<AuthorDbOutput>().toMatchObjectType<{
      id: bigint;
      name: string;
    }>();

    expect(Object.keys(authorDbSchema.shape)).toEqual(["id", "name"]);

    const postDbSchema = d.getDbSchema(PostSchema);
    type PostDbInput = z.input<typeof postDbSchema>;
    type PostDbOutput = z.output<typeof postDbSchema>;

    // author (navigateOne) excluded
    expectTypeOf<PostDbInput>().toMatchObjectType<{
      id: bigint;
      authorId: bigint;
      title: string;
    }>();

    expectTypeOf<PostDbOutput>().toMatchObjectType<{
      id: bigint;
      authorId: bigint;
      title: string;
    }>();

    expect(Object.keys(postDbSchema.shape)).toEqual([
      "id",
      "authorId",
      "title",
    ]);
  });

  // --- getPatchSchema edge cases ---

  it("should keep rowversion as required updateKey in patch schema", () => {
    const patchSchema = d.getPatchSchema(UpdateKeySchema);
    type PatchInput = z.input<typeof patchSchema>;
    type PatchOutput = z.output<typeof patchSchema>;

    // id excluded (pkAutoInc → notUpdatable, no updateKey), version required (rowversion → updateKey), email optional
    expectTypeOf<PatchInput>().toMatchObjectType<{
      version: number;
      email?: string | undefined;
    }>();

    expectTypeOf<PatchOutput>().toMatchObjectType<{
      version: number;
      email?: string | undefined;
    }>();

    expect(Object.keys(patchSchema.shape)).toEqual(["email", "version"]);

    // version is required at runtime
    expect(() => patchSchema.decode({ email: "a@b.com" } as any)).toThrow();
    const output = patchSchema.decode({ version: 1, email: "a@b.com" });
    expectTypedRecords(output, { version: 1, email: "a@b.com" });
  });

  it("should keep updateKey fields required in patch schema", () => {
    // Create a field with updateKey set directly
    const tenantIdWithUpdateKey = d.int64();
    (tenantIdWithUpdateKey as any).updateKey = true;

    const UpdateKeyMixedSchema = z.strictObject({
      id: d.bigint().pkAutoInc(),
      email: d.string(),
      tenantId: tenantIdWithUpdateKey,
    });

    const patchSchema = d.getPatchSchema(UpdateKeyMixedSchema);

    // id excluded (notUpdatable), tenantId required (updateKey), email optional
    expect(Object.keys(patchSchema.shape)).toEqual(["email", "tenantId"]);

    // Should require tenantId at runtime
    expect(() => patchSchema.decode({ email: "a@b.com" })).toThrow();
    const output = patchSchema.decode({ tenantId: 1, email: "a@b.com" });
    expectTypedRecords(output, { tenantId: 1, email: "a@b.com" });
  });

  // --- getInsertSchema edge cases ---

  it("should return empty schema when all fields are notInsertable", () => {
    const AllAutoIncSchema = z.strictObject({
      id: d.bigint().pkAutoInc(),
    });

    const insertSchema = d.getInsertSchema(AllAutoIncSchema);
    type InsertInput = z.input<typeof insertSchema>;
    type InsertOutput = z.output<typeof insertSchema>;

    expectTypeOf<InsertInput>().toMatchObjectType<{}>();
    expectTypeOf<InsertOutput>().toMatchObjectType<{}>();

    expect(Object.keys(insertSchema.shape)).toEqual([]);
  });

  // --- Runtime validation rejection ---

  it("should reject invalid types for each type category", () => {
    const date = new Date();

    // Wrong type for int64
    expect(() =>
      TestSchema.decode({
        ...validTestSchemaData(),
        int64Field: "not-a-number" as any,
      }),
    ).toThrow();

    // Wrong type for bigint
    expect(() =>
      TestSchema.decode({
        ...validTestSchemaData(),
        bigintField: "not-a-bigint" as any,
      }),
    ).toThrow();

    // Wrong type for uuid
    expect(() =>
      TestSchema.decode({
        ...validTestSchemaData(),
        uuidField: "not-a-uuid" as any,
      }),
    ).toThrow();

    // Wrong type for boolean
    expect(() =>
      TestSchema.decode({
        ...validTestSchemaData(),
        booleanField: "not-a-boolean" as any,
      }),
    ).toThrow();

    // Wrong type for datetime
    expect(() =>
      TestSchema.decode({
        ...validTestSchemaData(),
        datetimeField: "not-a-date" as any,
      }),
    ).toThrow();

    // Wrong inner shape for jsonb
    expect(() =>
      TestSchema.decode({
        ...validTestSchemaData(),
        jsonbField: { wrong: "shape" } as any,
      }),
    ).toThrow();

    // Wrong inner shape for json
    expect(() =>
      TestSchema.decode({
        ...validTestSchemaData(),
        jsonField: { count: 123 } as any,
      }),
    ).toThrow();

    // varchar max length enforcement
    expect(() =>
      TestSchema.decode({
        ...validTestSchemaData(),
        varcharField: "x".repeat(256),
      }),
    ).toThrow();
  });

  it("should accept valid TestSchema data", () => {
    const output = TestSchema.decode(validTestSchemaData());
    // Compare keys and non-date values (Date instances differ by reference)
    expect(Object.keys(output)).toEqual(Object.keys(validTestSchemaData()));
    expect(output.int64Field).toBe(1);
    expect(output.bigintField).toBe(100n);
    expect(output.uuidField).toBe(TEST_UUID);
    expect(output.jsonbField).toEqual({ count: 1 });
    expect(output.jsonField).toEqual({ name: "test" });
  });

  // --- Stored params verification ---

  it("should store decimal precision and scale", () => {
    const field = d.decimal(12, 2);
    expect((field as any).precision).toBe(12);
    expect((field as any).scale).toBe(2);
    expect((field as any).dbtype).toBe("decimal");
  });

  it("should store varchar maxLength", () => {
    const field = d.varchar(255);
    expect((field as any).maxLength).toBe(255);
    expect((field as any).dbtype).toBe("varchar");
  });

  it("should store foreignKey params", () => {
    const field = d.bigint().foreignKey(AuthorSchema, "id");
    expect((field as any).foreignKeyTable).toBe(AuthorSchema);
    expect((field as any).foreignKeyColumn).toBe("id");
  });

  it("should store pkAutoInc params", () => {
    const field = d.bigint().pkAutoInc();
    expect((field as any).primaryKey).toBe(true);
    expect((field as any).autoIncrement).toBe(true);
    expect((field as any).notUpdatable).toBe(true);
    expect((field as any).notInsertable).toBe(true);
  });

  it("should store createdAt/updatedAt params", () => {
    const createdField = d.datetime().createdAt({ auto: true });
    expect((createdField as any).createdAt).toBe(true);
    expect((createdField as any).createdAtAuto).toBe(true);

    const updatedField = d.timestamp(z.date()).updatedAt({ auto: false });
    expect((updatedField as any).updatedAt).toBe(true);
    expect((updatedField as any).updatedAtAuto).toBe(false);
  });
});

function validTestSchemaData() {
  return {
    int64Field: 1,
    int32Field: 2,
    float32Field: 1.5,
    float64Field: 2.5,
    bigintField: 100n,
    decimalField: 99.99,
    uuidField: TEST_UUID,
    stringField: "hello",
    varcharField: "fitting",
    booleanField: true,
    datetimeField: new Date(),
    datepartField: "2024-01-15",
    timepartField: "12:30:00",
    jsonbField: { count: 1 },
    jsonField: { name: "test" },
    timestamptzField: new Date(),
    timestampField: new Date(),
  };
}
