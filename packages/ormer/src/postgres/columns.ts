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
// Array type wrapper
// ----------------------------------------------------------------------------

/**
 * Wraps any column definition to produce a PostgreSQL array type.
 *
 * @example
 *   arrayOf(text())           // text[]
 *   arrayOf(int4(), 5)        // int4[5]
 *   arrayOf(arrayOf(int4()))  // int4[][]
 */
export function arrayOf<C extends { type: string }>(
  col: C,
): Omit<C, "type"> & { type: `${C["type"]}[]` };
export function arrayOf<C extends { type: string }, N extends number>(
  col: C,
  length: N,
): Omit<C, "type"> & { type: `${C["type"]}[${N}]` };
export function arrayOf<C extends { type: string }>(col: C, length?: number) {
  const suffix = length !== undefined ? `[${length}]` : "[]";
  return { ...col, type: `${col.type}${suffix}` } as any;
}

// ----------------------------------------------------------------------------
// Numeric types
// ----------------------------------------------------------------------------

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

// export function serial2(): ColumnTypeSingualr<"serial2">;
// export function serial2<T extends Params>(
//   params: R<T, Params>,
// ): ColumnType<"serial2", T>;
// export function serial2(params?: any) {
//   return { type: "serial2", ...params };
// }

// export function serial4(): ColumnTypeSingualr<"serial4">;
// export function serial4<T extends Params>(
//   params: R<T, Params>,
// ): ColumnType<"serial4", T>;
// export function serial4(params?: any) {
//   return { type: "serial4", ...params };
// }

// export function serial8(): ColumnTypeSingualr<"serial8">;
// export function serial8<T extends Params>(
//   params: R<T, Params>,
// ): ColumnType<"serial8", T>;
// export function serial8(params?: any) {
//   return { type: "serial8", ...params };
// }

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

export type DecimalCol = Params<{ precision: number; scale: number }>;
export function decimal<T extends DecimalCol>(): ColumnTypeSingualr<"decimal">;
export function decimal<T extends DecimalCol>(
  params: R<T, DecimalCol>,
): ColumnType<"decimal", T>;
export function decimal(params?: any) {
  return { type: "decimal", ...params };
}

export function money(): ColumnTypeSingualr<"money">;
export function money<T extends Params>(
  params: R<T, Params>,
): ColumnType<"money", T>;
export function money(params?: any) {
  return { type: "money", ...params };
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

export function bytea(): ColumnTypeSingualr<"bytea">;
export function bytea<T extends Params>(
  params: R<T, Params>,
): ColumnType<"bytea", T>;
export function bytea(params?: any) {
  return { type: "bytea", ...params };
}

// ----------------------------------------------------------------------------
// Date/Time types
// ----------------------------------------------------------------------------

export type TimestampCol = Params<{
  precision?: number;
  default?: "now";
  onUpdateSet?: boolean;
}>;
export function timestamp(): ColumnTypeSingualr<"timestamp">;
export function timestamp<T extends TimestampCol>(
  params: R<T, TimestampCol>,
): ColumnType<"timestamp", T>;
export function timestamp(params?: any) {
  return { type: "timestamp", ...params };
}

export type TimestamptzCol = Params<{
  precision?: number;
  default?: "now";
  onUpdateSet?: boolean;
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

export type TimeCol = Params<{ precision?: number }>;
export function time(): ColumnTypeSingualr<"time">;
export function time<T extends TimeCol>(
  params: R<T, TimeCol>,
): ColumnType<"time", T>;
export function time(params?: any) {
  return { type: "time", ...params };
}

export type TimetzCol = Params<{ precision?: number }>;
export function timetz(): ColumnTypeSingualr<"timetz">;
export function timetz<T extends TimetzCol>(
  params: R<T, TimetzCol>,
): ColumnType<"timetz", T>;
export function timetz(params?: any) {
  return { type: "timetz", ...params };
}

export type IntervalCol = Params<{ precision?: number }>;
export function interval(): ColumnTypeSingualr<"interval">;
export function interval<T extends IntervalCol>(
  params: R<T, IntervalCol>,
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
  onUpdateSet?: boolean;
}>;
export function uuid(): ColumnTypeSingualr<"uuid">;
export function uuid<T extends UuidCol>(
  params: R<T, UuidCol>,
): ColumnType<"uuid", T>;
export function uuid(params?: any) {
  return { type: "uuid", ...params };
}

// ----------------------------------------------------------------------------
// JSON types
// ----------------------------------------------------------------------------

export function jsonb<
  Schema extends UnknownSchema,
  T extends Params<{ schema: Schema }>,
>(params: R<T, Params<{ schema: Schema }>>): ColumnType<"jsonb", T> {
  return { type: "jsonb", ...params };
}

export function json<
  Schema extends UnknownSchema,
  T extends Params<{ schema: Schema }>,
>(params: R<T, Params<{ schema: Schema }>>): ColumnType<"json", T> {
  return { type: "json", ...params };
}

// ----------------------------------------------------------------------------
// Network address types
// ----------------------------------------------------------------------------

export function inet(): ColumnTypeSingualr<"inet">;
export function inet<T extends Params>(
  params: R<T, Params>,
): ColumnType<"inet", T>;
export function inet(params?: any) {
  return { type: "inet", ...params };
}

export function cidr(): ColumnTypeSingualr<"cidr">;
export function cidr<T extends Params>(
  params: R<T, Params>,
): ColumnType<"cidr", T>;
export function cidr(params?: any) {
  return { type: "cidr", ...params };
}

export function macaddr(): ColumnTypeSingualr<"macaddr">;
export function macaddr<T extends Params>(
  params: R<T, Params>,
): ColumnType<"macaddr", T>;
export function macaddr(params?: any) {
  return { type: "macaddr", ...params };
}

export function macaddr8(): ColumnTypeSingualr<"macaddr8">;
export function macaddr8<T extends Params>(
  params: R<T, Params>,
): ColumnType<"macaddr8", T>;
export function macaddr8(params?: any) {
  return { type: "macaddr8", ...params };
}

// ----------------------------------------------------------------------------
// Bit string types
// ----------------------------------------------------------------------------

export type BitCol = Params<{ length: number }>;
export function bit<T extends BitCol>(
  params: R<T, BitCol>,
): ColumnType<"bit", T> {
  return { type: "bit", ...params };
}

export type VarbitCol = Params<{ maxLength: number }>;
export function varbit<T extends VarbitCol>(
  params: R<T, VarbitCol>,
): ColumnType<"varbit", T> {
  return { type: "varbit", ...params };
}

// ----------------------------------------------------------------------------
// Text search types
// ----------------------------------------------------------------------------

export function tsvector(): ColumnTypeSingualr<"tsvector">;
export function tsvector<T extends Params>(
  params: R<T, Params>,
): ColumnType<"tsvector", T>;
export function tsvector(params?: any) {
  return { type: "tsvector", ...params };
}

export function tsquery(): ColumnTypeSingualr<"tsquery">;
export function tsquery<T extends Params>(
  params: R<T, Params>,
): ColumnType<"tsquery", T>;
export function tsquery(params?: any) {
  return { type: "tsquery", ...params };
}

// ----------------------------------------------------------------------------
// XML type
// ----------------------------------------------------------------------------

export function xml(): ColumnTypeSingualr<"xml">;
export function xml<T extends Params>(
  params: R<T, Params>,
): ColumnType<"xml", T>;
export function xml(params?: any) {
  return { type: "xml", ...params };
}

// ----------------------------------------------------------------------------
// Geometric types
// ----------------------------------------------------------------------------

export function point(): ColumnTypeSingualr<"point">;
export function point<T extends Params>(
  params: R<T, Params>,
): ColumnType<"point", T>;
export function point(params?: any) {
  return { type: "point", ...params };
}

export function line(): ColumnTypeSingualr<"line">;
export function line<T extends Params>(
  params: R<T, Params>,
): ColumnType<"line", T>;
export function line(params?: any) {
  return { type: "line", ...params };
}

export function lseg(): ColumnTypeSingualr<"lseg">;
export function lseg<T extends Params>(
  params: R<T, Params>,
): ColumnType<"lseg", T>;
export function lseg(params?: any) {
  return { type: "lseg", ...params };
}

export function box(): ColumnTypeSingualr<"box">;
export function box<T extends Params>(
  params: R<T, Params>,
): ColumnType<"box", T>;
export function box(params?: any) {
  return { type: "box", ...params };
}

export function path(): ColumnTypeSingualr<"path">;
export function path<T extends Params>(
  params: R<T, Params>,
): ColumnType<"path", T>;
export function path(params?: any) {
  return { type: "path", ...params };
}

export function polygon(): ColumnTypeSingualr<"polygon">;
export function polygon<T extends Params>(
  params: R<T, Params>,
): ColumnType<"polygon", T>;
export function polygon(params?: any) {
  return { type: "polygon", ...params };
}

export function circle(): ColumnTypeSingualr<"circle">;
export function circle<T extends Params>(
  params: R<T, Params>,
): ColumnType<"circle", T>;
export function circle(params?: any) {
  return { type: "circle", ...params };
}

// ----------------------------------------------------------------------------
// System / object identifier types
// ----------------------------------------------------------------------------

export function xmin(): ColumnTypeSingualr<"xmin">;
export function xmin<T extends Params>(
  params: R<T, Params>,
): ColumnType<"xmin", T>;
export function xmin(params?: any) {
  return { type: "xmin", ...params };
}

export function pg_lsn(): ColumnTypeSingualr<"pg_lsn">;
export function pg_lsn<T extends Params>(
  params: R<T, Params>,
): ColumnType<"pg_lsn", T>;
export function pg_lsn(params?: any) {
  return { type: "pg_lsn", ...params };
}

export function pg_snapshot(): ColumnTypeSingualr<"pg_snapshot">;
export function pg_snapshot<T extends Params>(
  params: R<T, Params>,
): ColumnType<"pg_snapshot", T>;
export function pg_snapshot(params?: any) {
  return { type: "pg_snapshot", ...params };
}

// ----------------------------------------------------------------------------
// Foreign key
// ----------------------------------------------------------------------------

/**
 * Map serial/auto-increment types to their underlying plain integer type,
 * since foreign key columns should reference the plain type, not serial.
 */
function fkColType(rawType: string): string {
  if (rawType === "serial2") return "int2";
  if (rawType === "serial4") return "int4";
  if (rawType === "serial8") return "int8";
  return rawType;
}

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
      return fkColType(table.columns[column].type);
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
