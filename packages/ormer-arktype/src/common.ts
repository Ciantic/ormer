import type { Type } from "arktype";
import type {
  DbFormat,
  ForeignKey,
  PrimaryKey,
  VarChar,
} from "./arktype-ext.ts";
import type { ColumnType, ColumnTypeSingualr } from "ormer";

export type DbFormatOfType<T> =
  T extends Type<infer A, any>
    ? A extends DbFormat<infer F>
      ? F
      : false
    : false;

// prettier-ignore
export type DomainOfType<T extends Type<any, any>> =
  T extends Type<infer A, any>
    ? string extends A ? "string"
    : number extends A ? "number"
    : bigint extends A ? "bigint"
    : boolean extends A ? "boolean"
    : Date extends A ? "Date"
    : object extends A ? "object"
    : false
  : false;

export type RemovePlainArrays<T> = T extends any[]
  ? RemovePlainArrays<T[number]>
  : T;

export type IsVarchar<T> =
  T extends Type<infer A, any>
    ? VarChar<any> extends A
      ? true
      : false
    : false;

export type GetMaxLength<T> =
  T extends Type<infer A, any>
    ? A extends VarChar<infer N>
      ? N
      : false
    : false;

type HasDbPk<T> =
  T extends Type<infer A, any> ? (PrimaryKey extends A ? true : false) : false;

type IsNullable<T> =
  T extends Type<infer A, any> ? (null extends A ? true : false) : false;

type IsOptional<T> =
  T extends Type<infer A, any> ? (undefined extends A ? true : false) : false;

type HasDefaultValue<T> = false;

type GetAutoIncrement<T> =
  T extends Type<any, any>
    ? HasDbPk<T> extends true
      ? DomainOfType<T> extends "number" | "bigint"
        ? true
        : never
      : never
    : never;

type DbFkTable<T> =
  T extends Type<infer A, any>
    ? A extends ForeignKey<infer Table, any>
      ? Table
      : never
    : never;

type DbFkColumn<T> =
  T extends Type<infer A, any>
    ? A extends ForeignKey<any, infer Column>
      ? Column
      : never
    : never;

// ---------------------------------------------------------------------------
// Array dimensions — traverses nested array types in A.
// ---------------------------------------------------------------------------

type ArrayDimHelper<A, Acc extends string = ""> = A extends any[]
  ? A extends (infer Elem)[]
    ? Elem extends any[]
      ? ArrayDimHelper<Elem, `${Acc}[]`>
      : `${Acc}[]`
    : never
  : Acc extends ""
    ? never
    : Acc;

type ArrayDimensions<T> =
  T extends Type<infer A, any> ? ArrayDimHelper<A> : never;

type OmitNever<T> = Omit<
  T,
  { [K in keyof T]: T[K] extends never ? K : never }[keyof T]
>;

// prettier-ignore
export type SafeParamDerivation<T> = OmitNever<{
  primaryKey: HasDbPk<T> extends true ? true : never;
  nullable: HasDefaultValue<T> extends true ? never
          : IsNullable<T> extends true ? true
          : IsOptional<T> extends true ? true
          : never;
  default: HasDefaultValue<T> extends true ? never : never;
  autoIncrement: GetAutoIncrement<T>;
  foreignKeyTable: DbFkTable<T>;
  foreignKeyColumn: DbFkColumn<T>;
  array: ArrayDimensions<T>;
}>;

type NonEmptyObject<T> = keyof T extends never ? never : T;

type FinalType<T> = T extends infer U ? { [K in keyof U]: U[K] } : never;

/**
 * Rewrap a { type, ...params } into ColumnType or ColumnTypeSingualr.
 */
export type RewrapToColumnType<T> = T extends {
  type: infer Type extends string;
} & infer Params
  ? Omit<Params, "type"> extends NonEmptyObject<Omit<Params, "type">>
    ? ColumnType<Type, FinalType<Omit<Params, "type">>>
    : ColumnTypeSingualr<Type>
  : T extends ColumnTypeSingualr<infer Type>
    ? ColumnTypeSingualr<Type>
    : never;
