import { z } from "zod";
import * as h from "../src/columnhelpers.ts";
import * as c from "../src/columns.ts";
import { table } from "../src/table.ts";
import { describe, it } from "vitest";
import {
  inferZodColumn,
  inferZodParams,
  inferZodSchema,
} from "./zod-inference.ts";

type Expect<T extends true> = T;
type Equal<X, Y> =
  (<T>() => T extends X ? 1 : 2) extends <T>() => T extends Y ? 1 : 2
    ? true
    : false;

describe("zod-inference", () => {
  it("inferZodColumn", () => {
    const someInt32 = c.int32();
    const inferredInt32 = inferZodColumn(someInt32);
    type Test1 = Expect<Equal<typeof inferredInt32, z.ZodNumber>>;
    true satisfies Test1;

    const someField = c.int32({ default: 42 });
    const inferredField = inferZodColumn(someField);
    type Test2 = Expect<Equal<typeof inferredField, z.ZodNumber>>;
    true satisfies Test2;

    const someJsonField = c.json({
      schema: z.object({ name: z.string() }),
    });
    const inferredJsonField = inferZodColumn(someJsonField);
    type Test3 = Expect<
      Equal<typeof inferredJsonField, z.ZodRecord<z.ZodString, z.ZodUnknown>>
    >;
    true satisfies Test3;
  });

  it("inferZodParams", () => {
    const someInt32 = c.int32();
    const result1 = inferZodParams(inferZodColumn(someInt32), someInt32.params);
    type Test1 = Expect<Equal<typeof result1, z.ZodNumber>>;
    true satisfies Test1;

    const someField = c.int32({ default: 42 });
    const result2 = inferZodParams(inferZodColumn(someField), someField.params);
    type Test2 = Expect<Equal<typeof result2, z.ZodDefault<z.ZodNumber>>>;
    true satisfies Test2;

    const someField2 = c.int32({ default: 42, nullable: true });
    const result3 = inferZodParams(
      inferZodColumn(someField2),
      someField2.params,
    );
    type Test3 = Expect<
      Equal<typeof result3, z.ZodDefault<z.ZodOptional<z.ZodNumber>>>
    >;
    true satisfies Test3;

    const someJsonField = c.json({
      schema: z.object({ name: z.string() }),
    });
    const result4 = inferZodParams(
      inferZodColumn(someJsonField),
      someJsonField.params,
    );
    type Test4 = Expect<
      Equal<typeof result4, z.ZodObject<{ name: z.ZodString }>>
    >;
    true satisfies Test4;
  });

  it("inferZodSchema - exampleTable", () => {
    const exampleTable = table("example", {
      id: c.int32({ primaryKey: true, autoIncrement: true }),
      name: c.string({ nullable: true }),
      data: c.json({
        schema: z.object({ foo: z.string(), bar: z.number() }),
      }),
    });
    const schema = inferZodSchema(exampleTable);
    type Result = z.infer<typeof schema>;
    type Test = Expect<
      Equal<
        Result,
        {
          id: number;
          name?: string | undefined;
          data: { foo: string; bar: number };
        }
      >
    >;
    true satisfies Test;
  });

  it("inferZodSchema - invoiceTable", () => {
    const invoiceTable = table("invoice", {
      id: h.pkAutoInc(),
      title: c.string(),
      description: c.string(),
      due_date: c.datetime(),
      rowversion: h.rowversion(),
    });
    const schema = inferZodSchema(invoiceTable);
    type Result = z.infer<typeof schema>;
    type Test = Expect<
      Equal<
        Result,
        {
          id: bigint;
          title: string;
          description: string;
          due_date: Date;
          rowversion: bigint;
        }
      >
    >;
    true satisfies Test;
  });

  it("inferZodSchema - invoiceRowTable", () => {
    const invoiceTable = table("invoice", {
      id: h.pkAutoInc(),
      title: c.string(),
      description: c.string(),
      due_date: c.datetime(),
      rowversion: h.rowversion(),
    });
    const invoiceRowTable = table("invoice_row", {
      id: h.pkAutoInc(),
      title: c.string(),
      price: c.float64(),
      taxPercentage: c.float64(),
      quantity: c.int32(),
      invoiceId: c.foreignKey(invoiceTable, "id"),
    });
    const schema = inferZodSchema(invoiceRowTable);
    type Result = z.infer<typeof schema>;
    type Test = Expect<
      Equal<
        Result,
        {
          id: bigint;
          title: string;
          price: number;
          taxPercentage: number;
          quantity: number;
          invoiceId: bigint;
        }
      >
    >;
    true satisfies Test;
  });
});
