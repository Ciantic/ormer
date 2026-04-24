import type { StandardSchemaV1 } from "@standard-schema/spec";
import { z } from "zod";

type UnknownSchema = StandardSchemaV1<unknown, unknown>;

type R<T, B> = {
  [K in keyof T]: K extends keyof B ? T[K] : never;
};

type Params = {
  primaryKey?: boolean;
  unique?: boolean;
  updateKey?: boolean;
  notInsertable?: boolean;
  notUpdatable?: boolean;
  nullable?: boolean;
  default?: unknown;
  foreignKeyTable?: string;
  foreignKeyColumn?: string;
  autoIncrement?: boolean;
  schema?: UnknownSchema;

  // Should not use these
  // columnName?: string; // Automatically assigned by table()
  // tableName?: string; // Automatically assigned by table()
};

type ColumnType<T extends string> = { type: T };
type ColumnTypeParams<T extends string, P> = {
  type: T;
} & P;

export function int32(): ColumnType<"int32">;
export function int32<T extends Omit<Params, "schema">>(
  params: R<T, Params>,
): ColumnTypeParams<"int32", T>;
export function int32(params?: any) {
  return {
    type: "int32",
    ...params,
  };
}

const foo = int32();
const zoo = int32({ primaryKey: true });

console.log(foo);
console.log(zoo);

export function jsonb<
  Schema extends UnknownSchema,
  T extends { schema: Schema },
>(params: R<T, { schema: Schema }>): ColumnTypeParams<"jsonb", T> {
  return {
    type: "jsonb",
    ...params,
  };
}

const bar = jsonb({
  schema: z.object({
    foo: z.string(),
  }),
});

console.log(bar);
