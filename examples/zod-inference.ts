import { z } from "zod";
import * as h from "../src/columnhelpers.ts";
import * as c from "../src/columns.ts";
import type { ColumnType } from "../src/columns.ts";
import { table, type Table } from "../src/table.ts";

type Simplify<T> = { [K in keyof T]: T[K] } & {};

const zodColumnTypes = {
  int32: z.number().int(),
  int64: z.bigint(),
  bigint: z.bigint(),
  float32: z.number(),
  float64: z.number(),
  decimal: z.string(),
  string: z.string(),
  varchar: z.string(),
  datetime: z.date(),
  datepart: z.string(),
  timepart: z.string(),
  uuid: z.uuid(),
  boolean: z.boolean(),
  json: z.record(z.string(), z.unknown()),
  jsonb: z.record(z.string(), z.unknown()),
} as const;

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
type InferZodParams<
  Z extends z.ZodType,
  T extends c.Params | undefined,
> = WithDefault<WithNullable<WithSchema<Z, T>, T>, T>;

type InferZodSchema<T extends Table<any, any>> = z.ZodObject<{
  [K in keyof T["columns"]]: T["columns"][K] extends ColumnType<
    infer Type,
    infer Params
  >
    ? Params extends c.Params | undefined
      ? Type extends keyof typeof zodColumnTypes
        ? InferZodParams<(typeof zodColumnTypes)[Type], Params>
        : never
      : never
    : never;
}>;

export function inferZodColumn<T extends ColumnType<any, any>>(
  column: T,
): T extends ColumnType<infer Type, infer Params>
  ? Params extends c.Params | undefined
    ? Type extends keyof typeof zodColumnTypes
      ? InferZodParams<(typeof zodColumnTypes)[Type], Params>
      : never
    : never
  : never {
  return null as any;
}

export function inferZodSchema<T extends Table<any, any>>(
  table: T,
): z.ZodObject<Simplify<InferZodSchema<T>["shape"]>> {
  return null as any;
}
