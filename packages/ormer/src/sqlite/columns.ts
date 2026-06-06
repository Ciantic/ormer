import type { Table } from "../table.ts";
import type {
  Params,
  ColumnTypeSingualr,
  ColumnType,
  ForeignKeyCol,
} from "../columns.ts";
export type { Params, ColumnTypeSingualr, ColumnType } from "../columns.ts";

type UnknownSchema = unknown;

type FinalType<T> = T extends infer U ? { [K in keyof U]: U[K] } : never;

// Restrict record T to only keys from record B
type R<T, B> = {
  [K in keyof T]: K extends keyof B ? T[K] : never;
};

// ----------------------------------------------------------------------------
// Integer types
// ----------------------------------------------------------------------------

export type IntegerCol = Params<{
  autoIncrement?: boolean;
}>;
export function integer(): ColumnTypeSingualr<"integer">;
export function integer<T extends IntegerCol>(
  params: R<T, IntegerCol>,
): ColumnType<"integer", T>;
export function integer(params?: any) {
  return { type: "integer", ...params };
}

// ----------------------------------------------------------------------------
// Real type
// ----------------------------------------------------------------------------

export function real(): ColumnTypeSingualr<"real">;
export function real<T extends Params>(
  params: R<T, Params>,
): ColumnType<"real", T>;
export function real(params?: any) {
  return { type: "real", ...params };
}

// ----------------------------------------------------------------------------
// Text type
// ----------------------------------------------------------------------------

export type TextCol = Params<{
  default?: "now";
}>;
export function text(): ColumnTypeSingualr<"text">;
export function text<T extends TextCol>(
  params: R<T, TextCol>,
): ColumnType<"text", T>;
export function text(params?: any) {
  return { type: "text", ...params };
}

// ----------------------------------------------------------------------------
// Blob type
// ----------------------------------------------------------------------------

export function blob(): ColumnTypeSingualr<"blob">;
export function blob<T extends Params>(
  params: R<T, Params>,
): ColumnType<"blob", T>;
export function blob(params?: any) {
  return { type: "blob", ...params };
}

// ----------------------------------------------------------------------------
// Any type
// ----------------------------------------------------------------------------

export function any(): ColumnTypeSingualr<"any">;
export function any<T extends Params>(
  params: R<T, Params>,
): ColumnType<"any", T>;
export function any(params?: any) {
  return { type: "any", ...params };
}

// ----------------------------------------------------------------------------
// Foreign key
// ----------------------------------------------------------------------------

export function foreignKey<
  C extends keyof T["columns"],
  // deno-lint-ignore no-explicit-any
  T extends Table<any, any>,
  // deno-lint-ignore ban-types
  P extends ForeignKeyCol = {},
>(
  table: T,
  column: C,
  params?: R<P, ForeignKeyCol>,
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
    get type() {
      return table.columns[column].type;
    },
    ...params,
    ...({
      foreignKeyTable: table.table,
      foreignKeyColumn: column,
    } satisfies {
      foreignKeyTable: T["table"];
      foreignKeyColumn: C;
    }),
  } as any;
}
