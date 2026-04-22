import type { Table } from "./table.ts";
import type { StandardSchemaV1 } from "@standard-schema/spec";

type UnknownSchema = StandardSchemaV1<unknown, unknown>;

type FinalType<T> = T extends infer U ? { [K in keyof U]: U[K] } : never;

// Restrict record T to only keys from record B
type R<T, B> = {
  [K in keyof T]: K extends keyof B ? T[K] : never;
};

// deno-lint-ignore ban-types
export type Params<ExtraProps extends object = {}> = FinalType<
  Readonly<
    ExtraProps & {
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
    }
  >
>;

export type ColumnTypeSingualr<Type extends string> = { readonly type: Type };

export type ColumnType<Type extends string, Params> = {
  readonly type: Type;
} & Params;

// ----------------------------------------------------------------------------
// Primitive types
// ----------------------------------------------------------------------------

export function int32(): ColumnTypeSingualr<"int32">;
export function int32<T extends Params>(
  params: R<T, Params>,
): ColumnType<"int32", T>;
export function int32(params?: any) {
  return {
    type: "int32",
    ...params,
  };
}

export function int64(): ColumnTypeSingualr<"int64">;
export function int64<T extends Params>(
  params: R<T, Params>,
): ColumnType<"int64", T>;
export function int64(params?: object | undefined) {
  return {
    type: "int64",
    ...params,
  };
}

export function bigint(): ColumnTypeSingualr<"bigint">;
export function bigint<T extends Params>(
  params: R<T, Params>,
): ColumnType<"bigint", T>;
export function bigint(params?: object | undefined) {
  return {
    type: "bigint",
    ...params,
  };
}

export function float32(): ColumnTypeSingualr<"float32">;
export function float32<T extends Params>(
  params: R<T, Params>,
): ColumnType<"float32", T>;
export function float32(params?: object | undefined) {
  return {
    type: "float32",
    ...params,
  };
}

export function float64(): ColumnTypeSingualr<"float64">;
export function float64<T extends Params>(
  params: R<T, Params>,
): ColumnType<"float64", T>;
export function float64(params?: object | undefined) {
  return {
    type: "float64",
    ...params,
  };
}

export type DecimalCol = Params<{ precision: number; scale: number }>;
export function decimal<T extends DecimalCol>(
  params: R<T, DecimalCol>,
): ColumnType<"decimal", T> {
  return {
    type: "decimal",
    ...params,
  };
}

export type UuidCol = Params<{
  default?: "generate";
  onUpdateSet?: boolean;
}>;
export function uuid(): ColumnTypeSingualr<"uuid">;
export function uuid<T extends UuidCol>(
  params: R<T, UuidCol>,
): ColumnType<"uuid", T>;
export function uuid(params?: object | undefined) {
  return {
    type: "uuid",
    ...params,
  };
}

export function string(): ColumnTypeSingualr<"string">;
export function string<T extends Params>(
  params: R<T, Params>,
): ColumnType<"string", T>;
export function string(params?: object | undefined) {
  return {
    type: "string",
    ...params,
  };
}

export type VarCharCol = Params<{ maxLength: number }>;
export function varchar<T extends VarCharCol>(
  params: R<T, VarCharCol>,
): ColumnType<"varchar", T> {
  return {
    type: "varchar",
    ...params,
  };
}

export function foreignKey<
  C extends keyof T["columns"],
  // deno-lint-ignore no-explicit-any
  T extends Table<any, any>,
  // deno-lint-ignore ban-types
  P extends Params = {},
>(
  table: T,
  column: C,
  params?: R<P, Params>,
  // wrapped: ColumnType<T["columns"][C]["type"], unknown>
): ColumnType<
  T["columns"][C]["type"],
  FinalType<
    P & {
      foreignKeyTable: T["table"];
      foreignKeyColumn: C;
    }
  >
> {
  return {
    type: table.columns[column].type,
    ...({
      ...params,
      foreignKeyTable: table.table,
      foreignKeyColumn: column,
    } as FinalType<
      P & {
        foreignKeyTable: T["table"];
        foreignKeyColumn: C;
      }
    >),
  };
}

export function boolean(): ColumnTypeSingualr<"boolean">;
export function boolean<T extends Params>(
  params: R<T, Params>,
): ColumnType<"boolean", T>;
export function boolean(params?: object | undefined) {
  return {
    type: "boolean",
    ...params,
  };
}

export type DateTimeCol = Params<{
  onUpdateSet?: boolean;
  default?: "now";
  sqlite?: {
    type: "datetime" | "integer" | "real" | "text";
    format:
      | "unixepoch()"
      | "unixepoch('subsec')"
      | "datetime('now')"
      | "datetime('now', 'subsec')";
  };
  postgres?: {
    type: "timestamp" | "timestamptz";
  };
}>;

export function datetime(): ColumnTypeSingualr<"datetime">;
export function datetime<T extends DateTimeCol>(
  params: R<T, DateTimeCol>,
): ColumnType<"datetime", T>;
export function datetime(params?: object | undefined) {
  return {
    type: "datetime",
    ...params,
  };
}

export function datepart(): ColumnTypeSingualr<"datepart">;
export function datepart<T extends Params>(
  params: R<T, Params>,
): ColumnType<"datepart", T>;
export function datepart(params?: object | undefined) {
  return {
    type: "datepart",
    ...params,
  };
}

export function timepart(): ColumnTypeSingualr<"timepart">;
export function timepart<T extends Params>(
  params: R<T, Params>,
): ColumnType<"timepart", T>;
export function timepart(params?: object | undefined) {
  return {
    type: "timepart",
    ...params,
  };
}

export function jsonb<
  Schema extends UnknownSchema,
  T extends Params<{ schema: Schema }>,
>(params: R<T, Params<{ schema: Schema }>>): ColumnType<"jsonb", T> {
  return {
    type: "jsonb",
    ...params,
  };
}

export function json<
  Schema extends UnknownSchema,
  T extends Params<{ schema: Schema }>,
>(params: R<T, Params<{ schema: Schema }>>): ColumnType<"json", T> {
  return {
    type: "json",
    ...params,
  };
}
