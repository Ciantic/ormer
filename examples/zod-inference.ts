import { z } from "zod";
import type { Params as AllParams } from "../src/columns.ts";
import { type Table } from "../src/table.ts";

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

type ZodBaseTypeMap = typeof zodColumnTypes;

type InferZodBase<Col extends { type: string }> = Col["type"] extends
  | "json"
  | "jsonb"
  ? Col extends { schema: infer S extends z.ZodTypeAny }
    ? S
    : ZodBaseTypeMap[Col["type"] & ("json" | "jsonb")]
  : Col["type"] extends keyof ZodBaseTypeMap
    ? ZodBaseTypeMap[Col["type"]]
    : z.ZodUnknown;

type WithSchema<Z extends z.ZodType, T> = T extends { schema: any }
  ? T["schema"]
  : Z;
type WithNullable<Z extends z.ZodType, T> = T extends { nullable: true }
  ? z.ZodOptional<Z>
  : Z;
type WithDefault<Z extends z.ZodType, T> = T extends { default: any }
  ? z.ZodDefault<Z>
  : Z;
type InferZodParams<Z extends z.ZodType, T extends AllParams> = WithDefault<
  WithNullable<WithSchema<Z, T>, T>,
  T
>;

type InferZodColumn<Col extends { type: string }> = InferZodParams<
  InferZodBase<Col>,
  Col extends AllParams ? Col : AllParams
>;

type InferZodShape<Cols extends Record<string, { type: string }>> = {
  [K in keyof Cols]: InferZodColumn<Cols[K]>;
};

export function inferZodColumn<Col extends { type: string }>(
  column: Col,
): InferZodColumn<Col> {
  const type = column.type;
  let base: z.ZodTypeAny;

  if (type === "json" || type === "jsonb") {
    base = (column as any).schema ?? z.record(z.string(), z.unknown());
  } else if (type in zodColumnTypes) {
    base = zodColumnTypes[type as keyof typeof zodColumnTypes];
  } else {
    base = z.unknown();
  }

  const hasNullable = (column as any).nullable === true;
  const hasDefault = "default" in column;

  if (hasNullable && hasDefault) {
    return base.optional().default((column as any).default) as any;
  } else if (hasNullable) {
    return base.optional() as any;
  } else if (hasDefault) {
    return base.default((column as any).default) as any;
  }
  return base as any;
}

export function inferZodSchema<T extends Table<any, any>>(
  table: T,
): z.ZodObject<Simplify<InferZodShape<T["columns"]>>> {
  const shape: Record<string, z.ZodTypeAny> = {};
  for (const [key, col] of Object.entries(table.columns)) {
    shape[key] = inferZodColumn(col as any);
  }
  return z.object(shape) as any;
}
