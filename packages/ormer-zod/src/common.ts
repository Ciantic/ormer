import { z } from "zod";
import type { ZodDbPrimaryKey } from "./zod-ext.ts";
import type { ColumnType, ColumnTypeSingualr, Table } from "ormer";

// ---------------------------------------------------------------------------
// General utility types
// ---------------------------------------------------------------------------

export type FinalType<T> = T extends infer U ? { [K in keyof U]: U[K] } : never;

export type ZodType = z.ZodType;

export type OmitNever<T> = Omit<
  T,
  { [K in keyof T]: T[K] extends never ? K : never }[keyof T]
>;

export type NonEmptyObject<T> = keyof T extends never ? never : T;

// ---------------------------------------------------------------------------
// Zod modifier unwrapping utilities (type-level)
// ---------------------------------------------------------------------------

// prettier-ignore
export type UnwrapUntilReturnTrue<T, Check> = T extends Check
  ? true
  : T extends z.ZodNullable<infer Inner extends ZodType> ? UnwrapUntilReturnTrue<Inner, Check>
  : T extends z.ZodOptional<infer Inner extends ZodType> ? UnwrapUntilReturnTrue<Inner, Check>
  : T extends z.ZodDefault<infer Inner extends ZodType>  ? UnwrapUntilReturnTrue<Inner, Check>
  : T extends z.ZodPrefault<infer Inner extends ZodType> ? UnwrapUntilReturnTrue<Inner, Check>
  : T extends z.ZodReadonly<infer Inner extends ZodType> ? UnwrapUntilReturnTrue<Inner, Check>
  : false;

// prettier-ignore
export type UnwrapModifiers<T extends ZodType> =
    T extends z.ZodNullable<infer Inner extends ZodType> ? UnwrapModifiers<Inner>
  : T extends z.ZodOptional<infer Inner extends ZodType> ? UnwrapModifiers<Inner>
  : T extends z.ZodDefault<infer Inner extends ZodType>  ? UnwrapModifiers<Inner>
  : T extends z.ZodPrefault<infer Inner extends ZodType> ? UnwrapModifiers<Inner>
  : T extends z.ZodReadonly<infer Inner extends ZodType> ? UnwrapModifiers<Inner>
  : T;

export type IsNullable<T extends ZodType> =
  UnwrapUntilReturnTrue<T, z.ZodNullable<any> | z.ZodOptional<any>> extends true
    ? true
    : false;

export type HasDefaultValue<T extends ZodType> =
  UnwrapUntilReturnTrue<T, z.ZodDefault<any> | z.ZodPrefault<any>> extends true
    ? true
    : false;

export type HasDbPk<T extends ZodType> =
  UnwrapUntilReturnTrue<T, ZodDbPrimaryKey> extends true ? true : false;

// This utility only cleans up the hover-type, it doesn't change it
export type RewrapToColumnType<T> = T extends {
  type: infer Type extends string;
} & infer Params
  ? Omit<Params, "type"> extends NonEmptyObject<Omit<Params, "type">>
    ? ColumnType<Type, FinalType<Omit<Params, "type">>>
    : ColumnTypeSingualr<Type>
  : T extends ColumnTypeSingualr<infer Type>
    ? ColumnTypeSingualr<Type>
    : never;

export type RewrapDeriveTable<T> =
  T extends Table<infer Name, infer Columns> ? Table<Name, Columns> : never;
