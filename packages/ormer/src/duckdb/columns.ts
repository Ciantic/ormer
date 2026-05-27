import type { Table } from "../table.ts";
import type { StandardSchemaV1 } from "@standard-schema/spec";
import type {
  Params,
  ColumnTypeSingualr,
  ColumnType,
  ForeignKeyCol,
} from "../columns.ts";
export type { Params, ColumnTypeSingualr, ColumnType } from "../columns.ts";

type UnknownSchema = StandardSchemaV1<unknown, unknown>;

type FinalType<T> = T extends infer U ? { [K in keyof U]: U[K] } : never;

// Restrict record T to only keys from record B
type R<T, B> = {
  [K in keyof T]: K extends keyof B ? T[K] : never;
};

// ----------------------------------------------------------------------------
// Numeric types
// ----------------------------------------------------------------------------

export function int1(): ColumnTypeSingualr<"int1">;
export function int1<T extends Params>(
  params: R<T, Params>,
): ColumnType<"int1", T>;
export function int1(params?: any) {
  return { type: "int1", ...params };
}

export function int2(): ColumnTypeSingualr<"int2">;
export function int2<T extends Params>(
  params: R<T, Params>,
): ColumnType<"int2", T>;
export function int2(params?: any) {
  return { type: "int2", ...params };
}

export function int4(): ColumnTypeSingualr<"int4">;
export function int4<T extends Params>(
  params: R<T, Params>,
): ColumnType<"int4", T>;
export function int4(params?: any) {
  return { type: "int4", ...params };
}

export function int8(): ColumnTypeSingualr<"int8">;
export function int8<T extends Params>(
  params: R<T, Params>,
): ColumnType<"int8", T>;
export function int8(params?: any) {
  return { type: "int8", ...params };
}

export function hugeint(): ColumnTypeSingualr<"hugeint">;
export function hugeint<T extends Params>(
  params: R<T, Params>,
): ColumnType<"hugeint", T>;
export function hugeint(params?: any) {
  return { type: "hugeint", ...params };
}

export function bignum(): ColumnTypeSingualr<"bignum">;
export function bignum<T extends Params>(
  params: R<T, Params>,
): ColumnType<"bignum", T>;
export function bignum(params?: any) {
  return { type: "bignum", ...params };
}

export function utinyint(): ColumnTypeSingualr<"utinyint">;
export function utinyint<T extends Params>(
  params: R<T, Params>,
): ColumnType<"utinyint", T>;
export function utinyint(params?: any) {
  return { type: "utinyint", ...params };
}

export function usmallint(): ColumnTypeSingualr<"usmallint">;
export function usmallint<T extends Params>(
  params: R<T, Params>,
): ColumnType<"usmallint", T>;
export function usmallint(params?: any) {
  return { type: "usmallint", ...params };
}

export function uinteger(): ColumnTypeSingualr<"uinteger">;
export function uinteger<T extends Params>(
  params: R<T, Params>,
): ColumnType<"uinteger", T>;
export function uinteger(params?: any) {
  return { type: "uinteger", ...params };
}

export function ubigint(): ColumnTypeSingualr<"ubigint">;
export function ubigint<T extends Params>(
  params: R<T, Params>,
): ColumnType<"ubigint", T>;
export function ubigint(params?: any) {
  return { type: "ubigint", ...params };
}

export function uhugeint(): ColumnTypeSingualr<"uhugeint">;
export function uhugeint<T extends Params>(
  params: R<T, Params>,
): ColumnType<"uhugeint", T>;
export function uhugeint(params?: any) {
  return { type: "uhugeint", ...params };
}

export function float4(): ColumnTypeSingualr<"float4">;
export function float4<T extends Params>(
  params: R<T, Params>,
): ColumnType<"float4", T>;
export function float4(params?: any) {
  return { type: "float4", ...params };
}

export function float8(): ColumnTypeSingualr<"float8">;
export function float8<T extends Params>(
  params: R<T, Params>,
): ColumnType<"float8", T>;
export function float8(params?: any) {
  return { type: "float8", ...params };
}

export type DecimalCol = Params<{ precision?: number; scale?: number }>;
export function decimal(): ColumnTypeSingualr<"decimal">;
export function decimal<T extends DecimalCol>(
  params: R<T, DecimalCol>,
): ColumnType<"decimal", T>;
export function decimal(params?: any) {
  return { type: "decimal", ...params };
}

// ----------------------------------------------------------------------------
// Character types
// ----------------------------------------------------------------------------

export function text(): ColumnTypeSingualr<"text">;
export function text<T extends Params>(
  params: R<T, Params>,
): ColumnType<"text", T>;
export function text(params?: any) {
  return { type: "text", ...params };
}

export type VarCharCol = Params<{ maxLength: number }>;
export function varchar<T extends VarCharCol>(
  params: R<T, VarCharCol>,
): ColumnType<"varchar", T> {
  return { type: "varchar", ...params };
}

export type CharCol = Params<{ length: number }>;
export function char<T extends CharCol>(
  params: R<T, CharCol>,
): ColumnType<"char", T> {
  return { type: "char", ...params };
}

// ----------------------------------------------------------------------------
// Binary types
// ----------------------------------------------------------------------------

export function blob(): ColumnTypeSingualr<"blob">;
export function blob<T extends Params>(
  params: R<T, Params>,
): ColumnType<"blob", T>;
export function blob(params?: any) {
  return { type: "blob", ...params };
}

// ----------------------------------------------------------------------------
// Date/Time types
// ----------------------------------------------------------------------------

export type TimestampCol = Params<{
  default?: "now";
}>;
export function timestamp(): ColumnTypeSingualr<"timestamp">;
export function timestamp<T extends TimestampCol>(
  params: R<T, TimestampCol>,
): ColumnType<"timestamp", T>;
export function timestamp(params?: any) {
  return { type: "timestamp", ...params };
}

export type TimestamptzCol = Params<{
  default?: "now";
}>;
export function timestamptz(): ColumnTypeSingualr<"timestamptz">;
export function timestamptz<T extends TimestamptzCol>(
  params: R<T, TimestamptzCol>,
): ColumnType<"timestamptz", T>;
export function timestamptz(params?: any) {
  return { type: "timestamptz", ...params };
}

export function date(): ColumnTypeSingualr<"date">;
export function date<T extends Params>(
  params: R<T, Params>,
): ColumnType<"date", T>;
export function date(params?: any) {
  return { type: "date", ...params };
}

export function time(): ColumnTypeSingualr<"time">;
export function time<T extends Params>(
  params: R<T, Params>,
): ColumnType<"time", T>;
export function time(params?: any) {
  return { type: "time", ...params };
}

export function interval(): ColumnTypeSingualr<"interval">;
export function interval<T extends Params>(
  params: R<T, Params>,
): ColumnType<"interval", T>;
export function interval(params?: any) {
  return { type: "interval", ...params };
}

// ----------------------------------------------------------------------------
// Boolean type
// ----------------------------------------------------------------------------

export function boolean(): ColumnTypeSingualr<"boolean">;
export function boolean<T extends Params>(
  params: R<T, Params>,
): ColumnType<"boolean", T>;
export function boolean(params?: any) {
  return { type: "boolean", ...params };
}

// ----------------------------------------------------------------------------
// UUID type
// ----------------------------------------------------------------------------

export type UuidCol = Params<{
  default?: "generate";
}>;
export function uuid(): ColumnTypeSingualr<"uuid">;
export function uuid<T extends UuidCol>(
  params: R<T, UuidCol>,
): ColumnType<"uuid", T>;
export function uuid(params?: any) {
  return { type: "uuid", ...params };
}

// ----------------------------------------------------------------------------
// JSON type
// ----------------------------------------------------------------------------

export function json<
  Schema extends UnknownSchema,
  T extends Params<{ schema: Schema }>,
>(params: R<T, Params<{ schema: Schema }>>): ColumnType<"json", T> {
  return { type: "json", ...params };
}

// ----------------------------------------------------------------------------
// Bit string type
// ----------------------------------------------------------------------------

export type BitCol = Params<{ length: number }>;
export function bit<T extends BitCol>(
  params: R<T, BitCol>,
): ColumnType<"bit", T> {
  return { type: "bit", ...params };
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
