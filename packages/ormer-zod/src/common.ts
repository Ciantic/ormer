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
  : T extends z.ZodNullable<infer Inner extends ZodType>      ? UnwrapUntilReturnTrue<Inner, Check>
  : T extends z.ZodOptional<infer Inner extends ZodType>      ? UnwrapUntilReturnTrue<Inner, Check>
  : T extends z.ZodExactOptional<infer Inner extends ZodType> ? UnwrapUntilReturnTrue<Inner, Check>
  : T extends z.ZodDefault<infer Inner extends ZodType>       ? UnwrapUntilReturnTrue<Inner, Check>
  : T extends z.ZodPrefault<infer Inner extends ZodType>      ? UnwrapUntilReturnTrue<Inner, Check>
  : T extends z.ZodCatch<infer Inner extends ZodType>         ? UnwrapUntilReturnTrue<Inner, Check>
  : T extends z.ZodNonOptional<infer Inner extends ZodType>   ? UnwrapUntilReturnTrue<Inner, Check>
  : T extends z.ZodOptional<infer Inner extends ZodType>      ? UnwrapUntilReturnTrue<Inner, Check>
  : T extends z.ZodExactOptional<infer Inner extends ZodType> ? UnwrapUntilReturnTrue<Inner, Check>
  : T extends z.ZodReadonly<infer Inner extends ZodType>      ? UnwrapUntilReturnTrue<Inner, Check>
  : T extends z.ZodPipe<infer Inner extends ZodType, infer _> ? UnwrapUntilReturnTrue<Inner, Check>
  : false;

//   Inner extends z.ZodOptional<infer Inner2 extends ZodType>      ? UnwrapUntilReturnTrue<Inner2, Check>
// : Inner extends z.ZodExactOptional<infer Inner2 extends ZodType> ? UnwrapUntilReturnTrue<Inner2, Check>
// : UnwrapUntilReturnTrue<Inner, Check>

// prettier-ignore
export type UnwrapModifiers<T extends ZodType> =
    T extends z.ZodNullable<infer Inner extends ZodType>      ? UnwrapModifiers<Inner>
  : T extends z.ZodOptional<infer Inner extends ZodType>      ? UnwrapModifiers<Inner>
  : T extends z.ZodExactOptional<infer Inner extends ZodType> ? UnwrapModifiers<Inner>
  : T extends z.ZodDefault<infer Inner extends ZodType>       ? UnwrapModifiers<Inner>
  : T extends z.ZodPrefault<infer Inner extends ZodType>      ? UnwrapModifiers<Inner>
  : T extends z.ZodCatch<infer Inner extends ZodType>         ? UnwrapModifiers<Inner>
  : T extends z.ZodNonOptional<infer Inner extends ZodType>   ? UnwrapModifiers<Inner>
  : T extends z.ZodOptional<infer Inner extends ZodType>      ? UnwrapModifiers<Inner>
  : T extends z.ZodExactOptional<infer Inner extends ZodType> ? UnwrapModifiers<Inner>
  : T extends z.ZodReadonly<infer Inner extends ZodType>      ? UnwrapModifiers<Inner>
  : T extends z.ZodPipe<infer Inner extends ZodType, infer _> ? UnwrapModifiers<Inner>
  : T;

// prettier-ignore
export type IsNullable<T extends ZodType> =
  // If any of the modifiers is nullable, then it's nullable
    UnwrapUntilReturnTrue<T, z.ZodNullable<any>> extends true ? true
  // If there are optionality modifiers, the top-most one determines nullability
  : UnwrapUntilReturnTrue<T,
      | z.ZodOptional<any> 
      | z.ZodExactOptional<any> 
      | z.ZodNonOptional<any>
    > extends true 
      // In case top-most is non-optional, then it's not nullable, 
      // otherwise it is.
      ? T extends z.ZodNonOptional<any> ? false : true
    : false;

export type HasDefaultValue<T extends ZodType> =
  UnwrapUntilReturnTrue<
    T,
    z.ZodDefault<any> | z.ZodPrefault<any> | z.ZodCatch<any>
  > extends true
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
