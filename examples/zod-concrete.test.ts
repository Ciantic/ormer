import * as d from "./zod-concrete.ts";
import { z } from "zod";
import { describe, it, expect } from "vitest";

// --- Type-level test utilities ---
type Expect<T extends true> = T;
type Equal<X, Y> =
  (<T>() => T extends X ? 1 : 2) extends <T>() => T extends Y ? 1 : 2
    ? true
    : false;
type ShapeOf<T extends z.ZodObject<any>> =
  T extends z.ZodObject<infer S> ? S : never;

const InvoiceSchema = z.object({
  id: d.bigint().pkAutoInc(),
  title: d.string(),
  description: d.string(),
  dueDate: d.datetime(),
  rowversion: d.int32().rowversion(),
  concurrencyStamp: d.string().concurrencyStamp(),
  createdAt: d.datetime(),
  updatedAt: d.datetime(),
  get rows() {
    return InvoiceRowSchema.array().optional().navigateMany();
  },
});

const InvoiceRowSchema = z.object({
  id: d.bigint().pkAutoInc(),
  title: d.string(),
  price: d.float64(),
  taxPercentage: d.float64(),
  quantity: d.int32(),
  invoiceId: d.bigint().foreignKey(InvoiceSchema, "id"),
  invoice: InvoiceSchema.navigateOne().optional(),
  concurrencyStamp: d.uuid().concurrencyStamp(),
});

const PersonSchema = z.object({
  id: d.bigint().pkAutoInc(),
  firstName: d.string(),
  lastName: d.string(),
  email: d.string(),
  get supervisorId() {
    return d.bigint().foreignKey(PersonSchema, "id").optional();
  },
  get supervisor() {
    return PersonSchema.optional().navigateOne();
  },
  createdAt: d.datetime(),
  updatedAt: d.datetime(),
});

// --- Type-level tests ---

describe("InferDbFields", () => {
  it("includes only db-typed fields, excludes navigation fields", () => {
    type DbFields = d.InferDbFields<typeof InvoiceSchema>;
    type Test = Expect<
      Equal<
        keyof DbFields,
        | "id"
        | "title"
        | "description"
        | "dueDate"
        | "rowversion"
        | "concurrencyStamp"
        | "createdAt"
        | "updatedAt"
      >
    >;
    true satisfies Test;
    expect(true).toBe(true);
  });

  it("excludes optional navigation fields (navigateOne, navigateMany)", () => {
    type DbFields = d.InferDbFields<typeof InvoiceRowSchema>;
    type Test = Expect<
      Equal<
        keyof DbFields,
        | "id"
        | "title"
        | "price"
        | "taxPercentage"
        | "quantity"
        | "invoiceId"
        | "concurrencyStamp"
      >
    >;
    true satisfies Test;
    expect(true).toBe(true);
  });

  it("excludes optional foreign key wrapped in ZodOptional", () => {
    type DbFields = d.InferDbFields<typeof PersonSchema>;
    type Test = Expect<
      Equal<
        keyof DbFields,
        | "id"
        | "firstName"
        | "lastName"
        | "email"
        | "supervisorId"
        | "createdAt"
        | "updatedAt"
      >
    >;
    true satisfies Test;
    expect(true).toBe(true);
  });
});

describe("InferFieldsWithParams", () => {
  it("filters to only primaryKey fields", () => {
    type PkFields = d.InferFieldsWithParams<
      typeof InvoiceSchema,
      { primaryKey: true }
    >;
    type Test = Expect<Equal<keyof PkFields, "id">>;
    true satisfies Test;
    expect(true).toBe(true);
  });

  it("filters to only rowVersion fields", () => {
    type RvFields = d.InferFieldsWithParams<
      typeof InvoiceSchema,
      { rowversion: true }
    >;
    type Test = Expect<Equal<keyof RvFields, "rowversion">>;
    true satisfies Test;
    expect(true).toBe(true);
  });

  it("filters to only concurrencyStamp fields", () => {
    type CsFields = d.InferFieldsWithParams<
      typeof InvoiceRowSchema,
      { concurrencyStamp: true }
    >;
    type Test = Expect<Equal<keyof CsFields, "concurrencyStamp">>;
    true satisfies Test;
    expect(true).toBe(true);
  });
});

describe("InferPrimaryKeySchema", () => {
  it("returns ZodObject with only primary key fields", () => {
    type PkSchema = d.InferPrimaryKeySchema<typeof InvoiceSchema>;
    type Test = Expect<Equal<keyof ShapeOf<PkSchema>, "id">>;
    true satisfies Test;
    expect(true).toBe(true);
  });
});

describe("InferPatchSchema", () => {
  it("excludes notUpdatable fields (pkAutoInc id)", () => {
    type PatchSchema = d.InferPatchSchema<typeof InvoiceSchema>;
    type Keys = keyof ShapeOf<PatchSchema>;
    type Test = Expect<
      Equal<
        Keys,
        | "title"
        | "description"
        | "dueDate"
        | "rowversion"
        | "concurrencyStamp"
        | "createdAt"
        | "updatedAt"
      >
    >;
    true satisfies Test;
    expect(true).toBe(true);
  });

  it("excludes notUpdatable fields from InvoiceRowSchema", () => {
    type PatchSchema = d.InferPatchSchema<typeof InvoiceRowSchema>;
    type Keys = keyof ShapeOf<PatchSchema>;
    type Test = Expect<
      Equal<
        Keys,
        | "title"
        | "price"
        | "taxPercentage"
        | "quantity"
        | "invoiceId"
        | "concurrencyStamp"
      >
    >;
    true satisfies Test;
    expect(true).toBe(true);
  });

  it("excludes notUpdatable fields from PersonSchema", () => {
    type PatchSchema = d.InferPatchSchema<typeof PersonSchema>;
    type Keys = keyof ShapeOf<PatchSchema>;
    type Test = Expect<
      Equal<
        Keys,
        | "firstName"
        | "lastName"
        | "email"
        | "supervisorId"
        | "createdAt"
        | "updatedAt"
      >
    >;
    true satisfies Test;
    expect(true).toBe(true);
  });
});

// --- Functional tests ---

describe("getDbSchema", () => {
  it("returns schema with only db-typed fields", () => {
    const dbSchema = d.getDbSchema(InvoiceSchema);
    expect(Object.keys(dbSchema.shape)).toEqual([
      "id",
      "title",
      "description",
      "dueDate",
      "rowversion",
      "concurrencyStamp",
      "createdAt",
      "updatedAt",
    ]);
  });

  it("excludes navigation fields", () => {
    const dbSchema = d.getDbSchema(InvoiceRowSchema);
    expect(Object.keys(dbSchema.shape)).not.toContain("invoice");
    expect(Object.keys(dbSchema.shape)).not.toContain("rows");
  });
});

describe("getPrimaryKeySchema", () => {
  it("returns schema with only primary key fields", () => {
    const pkSchema = d.getPrimaryKeySchema(InvoiceSchema);
    expect(Object.keys(pkSchema.shape)).toEqual(["id"]);
  });

  it("parses valid primary key", () => {
    const pkSchema = d.getPrimaryKeySchema(InvoiceSchema);
    const result = pkSchema.safeDecode({ id: 1n });
    expect(result.success).toBe(true);
  });

  it("rejects missing primary key", () => {
    const pkSchema = d.getPrimaryKeySchema(InvoiceSchema);
    // @ts-expect-error
    const result = pkSchema.safeDecode({});
    expect(result.success).toBe(false);
  });
});

describe("getPatchSchema", () => {
  it("excludes notUpdatable fields from shape", () => {
    const patchSchema = d.getPatchSchema(InvoiceSchema);
    expect(Object.keys(patchSchema.shape)).not.toContain("id");
    expect(Object.keys(patchSchema.shape)).toEqual([
      "title",
      "description",
      "dueDate",
      "rowversion",
      "concurrencyStamp",
      "createdAt",
      "updatedAt",
    ]);
  });

  it("allows partial updates (all fields optional)", () => {
    const patchSchema = d.getPatchSchema(InvoiceSchema);
    const result = patchSchema.safeDecode({});
    expect(result.success).toBe(true);
  });

  it("allows setting individual fields", () => {
    const patchSchema = d.getPatchSchema(InvoiceSchema);
    const result = patchSchema.safeDecode({ title: "Updated" });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.title).toBe("Updated");
    }
  });

  it("allows setting all patchable fields", () => {
    const patchSchema = d.getPatchSchema(InvoiceSchema);
    const now = new Date();
    const result = patchSchema.safeDecode({
      title: "Full update",
      description: "Desc",
      dueDate: now,
      rowversion: 1,
      concurrencyStamp: "stamp",
      createdAt: now,
      updatedAt: now,
    });
    expect(result.success).toBe(true);
  });

  it("rejects invalid field values", () => {
    const patchSchema = d.getPatchSchema(InvoiceSchema);
    // @ts-expect-error
    const result = patchSchema.safeDecode({ title: 123 });
    expect(result.success).toBe(false);
  });

  it("excludes navigation fields from InvoiceRowSchema", () => {
    const patchSchema = d.getPatchSchema(InvoiceRowSchema);
    expect(Object.keys(patchSchema.shape)).not.toContain("invoice");
    expect(Object.keys(patchSchema.shape)).not.toContain("id");
  });

  it("excludes navigation fields from PersonSchema", () => {
    const patchSchema = d.getPatchSchema(PersonSchema);
    expect(Object.keys(patchSchema.shape)).not.toContain("supervisor");
    expect(Object.keys(patchSchema.shape)).not.toContain("id");
  });
});

// --- Type-level tests: InferInsertSchema ---

describe("InferInsertSchema", () => {
  it("excludes notInsertable fields (pkAutoInc id) from InvoiceSchema", () => {
    type InsertSchema = d.InferInsertSchema<typeof InvoiceSchema>;
    type Keys = keyof ShapeOf<InsertSchema>;
    type Test = Expect<
      Equal<
        Keys,
        | "title"
        | "description"
        | "dueDate"
        | "rowversion"
        | "concurrencyStamp"
        | "createdAt"
        | "updatedAt"
      >
    >;
    true satisfies Test;
    expect(true).toBe(true);
  });

  it("excludes notInsertable fields from InvoiceRowSchema", () => {
    type InsertSchema = d.InferInsertSchema<typeof InvoiceRowSchema>;
    type Keys = keyof ShapeOf<InsertSchema>;
    type Test = Expect<
      Equal<
        Keys,
        | "title"
        | "price"
        | "taxPercentage"
        | "quantity"
        | "invoiceId"
        | "concurrencyStamp"
      >
    >;
    true satisfies Test;
    expect(true).toBe(true);
  });

  it("excludes notInsertable fields from PersonSchema", () => {
    type InsertSchema = d.InferInsertSchema<typeof PersonSchema>;
    type Keys = keyof ShapeOf<InsertSchema>;
    type Test = Expect<
      Equal<
        Keys,
        | "firstName"
        | "lastName"
        | "email"
        | "supervisorId"
        | "createdAt"
        | "updatedAt"
      >
    >;
    true satisfies Test;
    expect(true).toBe(true);
  });
});

// --- Functional tests: getInsertSchema ---

describe("getInsertSchema", () => {
  it("excludes notInsertable fields from shape", () => {
    const insertSchema = d.getInsertSchema(InvoiceSchema);
    expect(Object.keys(insertSchema.shape)).not.toContain("id");
    expect(Object.keys(insertSchema.shape)).toEqual([
      "title",
      "description",
      "dueDate",
      "rowversion",
      "concurrencyStamp",
      "createdAt",
      "updatedAt",
    ]);
  });

  it("rejects empty object (all fields required)", () => {
    const insertSchema = d.getInsertSchema(InvoiceSchema);
    // @ts-expect-error
    const result = insertSchema.safeDecode({});
    expect(result.success).toBe(false);
  });

  it("rejects partial data", () => {
    const insertSchema = d.getInsertSchema(InvoiceSchema);
    // @ts-expect-error
    const result = insertSchema.safeDecode({ title: "Only title" });
    expect(result.success).toBe(false);
  });

  it("accepts all required fields", () => {
    const insertSchema = d.getInsertSchema(InvoiceSchema);
    const now = new Date();
    const result = insertSchema.safeDecode({
      title: "New Invoice",
      description: "A description",
      dueDate: now,
      rowversion: 0,
      concurrencyStamp: "initial",
      createdAt: now,
      updatedAt: now,
    });
    expect(result.success).toBe(true);
  });

  it("rejects invalid field values", () => {
    const insertSchema = d.getInsertSchema(InvoiceSchema);

    const result = insertSchema.safeDecode({
      // @ts-expect-error
      title: 123,
      description: "desc",
      dueDate: new Date(),
      rowversion: 0,
      concurrencyStamp: "stamp",
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    expect(result.success).toBe(false);
  });

  it("excludes navigation fields from InvoiceRowSchema", () => {
    const insertSchema = d.getInsertSchema(InvoiceRowSchema);
    expect(Object.keys(insertSchema.shape)).not.toContain("invoice");
    expect(Object.keys(insertSchema.shape)).not.toContain("id");
  });

  it("excludes navigation fields from PersonSchema", () => {
    const insertSchema = d.getInsertSchema(PersonSchema);
    expect(Object.keys(insertSchema.shape)).not.toContain("supervisor");
    expect(Object.keys(insertSchema.shape)).not.toContain("id");
  });
});
