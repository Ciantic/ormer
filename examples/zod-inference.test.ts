import { z } from "zod";
import * as h from "../src/columnhelpers.ts";
import * as c from "../src/columns.ts";
import { table } from "../src/table.ts";
import { describe, it } from "vitest";
import { inferZodColumn, inferZodTable } from "./zod-inference.ts";

type Expect<T extends true> = T;
type Equal<X, Y> =
  (<T>() => T extends X ? 1 : 2) extends <T>() => T extends Y ? 1 : 2
    ? true
    : false;

describe("inferZodColumn", () => {
  it("plain int32 -> ZodNumber", () => {
    const col = c.int32();
    const schema = inferZodColumn(col);
    type Result = z.input<typeof schema>;
    type Test = Expect<Equal<Result, number>>;
    true satisfies Test;
  });

  it("plain string -> ZodString", () => {
    const col = c.string();
    const schema = inferZodColumn(col);
    type Result = z.input<typeof schema>;
    type Test = Expect<Equal<Result, string>>;
    true satisfies Test;
  });

  it("nullable string -> ZodOptional<ZodString>", () => {
    const col = c.string({ nullable: true });
    const schema = inferZodColumn(col);
    type Result = z.input<typeof schema>;
    type Test = Expect<Equal<Result, string | undefined>>;
    true satisfies Test;
  });

  it("string with default -> ZodDefault<ZodString>", () => {
    const col = c.string({ default: "hello" });
    const schema = inferZodColumn(col);
    type Result = z.input<typeof schema>;
    type Test = Expect<Equal<Result, string | undefined>>;
    true satisfies Test;
  });

  it("int64 -> ZodBigInt", () => {
    const col = c.int64();
    const schema = inferZodColumn(col);
    type Result = z.input<typeof schema>;
    type Test = Expect<Equal<Result, bigint>>;
    true satisfies Test;
  });

  it("float64 -> ZodNumber", () => {
    const col = c.float64();
    const schema = inferZodColumn(col);
    type Result = z.input<typeof schema>;
    type Test = Expect<Equal<Result, number>>;
    true satisfies Test;
  });

  it("boolean -> ZodBoolean", () => {
    const col = c.boolean();
    const schema = inferZodColumn(col);
    type Result = z.input<typeof schema>;
    type Test = Expect<Equal<Result, boolean>>;
    true satisfies Test;
  });

  it("datetime -> ZodDate", () => {
    const col = c.datetime();
    const schema = inferZodColumn(col);
    type Result = z.input<typeof schema>;
    type Test = Expect<Equal<Result, Date>>;
    true satisfies Test;
  });

  it("json with custom schema -> uses custom schema type", () => {
    const col = c.json({
      schema: z.object({ foo: z.string(), count: z.number() }),
    });
    const schema = inferZodColumn(col);
    type Result = z.input<typeof schema>;
    type Test = Expect<Equal<Result, { foo: string; count: number }>>;
    true satisfies Test;
  });

  it("nullable int32 with default -> ZodDefault<ZodOptional<ZodNumber>>", () => {
    const col = c.int32({ nullable: true, default: 0 });
    const schema = inferZodColumn(col);
    type Result = z.input<typeof schema>;
    type Test = Expect<Equal<Result, number | undefined>>;
    true satisfies Test;
  });
});

describe("zod-inference", () => {
  it("inferZodTable - exampleTable", () => {
    const exampleTable = table("example", {
      id: c.int32({ primaryKey: true, autoIncrement: true }),
      name: c.string({ nullable: true }),
      data: c.json({
        schema: z.object({ foo: z.string(), bar: z.number() }),
      }),
    });
    const schema = inferZodTable(exampleTable);
    type Result = z.input<typeof schema>;
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

  it("inferZodTable - invoiceTable", () => {
    const invoiceTable = table("invoice", {
      id: h.pkAutoInc(),
      title: c.string(),
      description: c.string(),
      due_date: c.datetime(),
      rowversion: h.rowversion(),
    });
    const schema = inferZodTable(invoiceTable);
    type Result = z.input<typeof schema>;
    type Test = Expect<
      Equal<
        Result,
        {
          id: bigint;
          title: string;
          description: string;
          due_date: Date;
          rowversion?: bigint | undefined;
        }
      >
    >;
    true satisfies Test;
  });

  it("inferZodTable - invoiceRowTable", () => {
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
    const schema = inferZodTable(invoiceRowTable);
    type Result = z.input<typeof schema>;
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
