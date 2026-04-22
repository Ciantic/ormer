import { z } from "zod";
import * as c from "../src/columns.ts";
import type { ColumnType } from "../src/columns.ts";
import { table, type Table } from "../src/table.ts";

const zodColumnTypes = {
  int32: z.number().int(),
  int64: z.bigint(),
  bigint: z.bigint(),
  float32: z.number(),
  float64: z.number(),
  decimal: z.string(),
  string: z.string(),
  datetime: z.date(),
  uuid: z.uuid(),
  json: z.record(z.string(), z.unknown()),
  jsonb: z.record(z.string(), z.unknown()),
} as const;

function inferZodColumn<T extends ColumnType<any, any>>(
  column: T,
): T extends ColumnType<infer Type, infer Params>
  ? Type extends keyof typeof zodColumnTypes
    ? (typeof zodColumnTypes)[Type]
    : never
  : never {
  return null as any;
}

// @prettier-ignore
type WithSchema<Z extends z.ZodType, T> = T extends { schema: any }
  ? T["schema"]
  : Z;
type WithNullable<Z extends z.ZodType, T> = T extends { nullable: true }
  ? z.ZodOptional<Z>
  : Z;
type WithDefault<Z extends z.ZodType, T> = T extends { default: any }
  ? z.ZodDefault<Z>
  : Z;
type InferZodParams<Z extends z.ZodType, T extends c.Params> = WithDefault<
  WithNullable<WithSchema<Z, T>, T>,
  T
>;

type InferZodSchema<T extends Table<any, any>> = z.ZodObject<{
  [K in keyof T["columns"]]: T["columns"][K] extends ColumnType<
    infer Type,
    infer Params
  >
    ? Params extends c.Params
      ? Type extends keyof typeof zodColumnTypes
        ? InferZodParams<(typeof zodColumnTypes)[Type], Params>
        : never
      : never
    : never;
}>;

function inferZodParams<Z extends z.ZodType, T extends c.Params>(
  zod: Z,
  params: T,
): InferZodParams<Z, T> {
  return null as any;
}

function inferZodSchema<T extends Table<any, any>>(
  table: T,
): InferZodSchema<T> {
  return null as any;
}

const someField = c.int32({ default: 42 });
const inferredField = inferZodColumn(someField);
const inferredResult = inferZodParams(inferredField, someField.params);

const someField2 = c.int32({ default: 42, nullable: true });
const inferredField2 = inferZodColumn(someField2);
const inferredResult2 = inferZodParams(inferredField2, someField2.params);

const someJsonField = c.json({
  schema: z.object({
    name: z.string(),
  }),
});
const inferredJsonField = inferZodColumn(someJsonField);
const inferredJsonResult = inferZodParams(
  inferredJsonField,
  someJsonField.params,
);

const exampleTable = table("example", {
  id: c.int32({ primaryKey: true, autoIncrement: true }),
  name: c.string({ nullable: true }),
  data: c.json({
    schema: z.object({
      foo: z.string(),
      bar: z.number(),
    }),
  }),
});

const exampleTableSchema = inferZodSchema(exampleTable);
