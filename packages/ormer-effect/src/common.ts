import type { ColumnType, ColumnTypeSingualr } from "ormer";

// prettier-ignore
export type UnwrapUntilReturnTrue<T, Check> =
  T extends Check ? [true, T]
  // Schema.Union
  : T extends { readonly members: readonly [infer First extends Check, ...infer _] } ? [true, First]
  // DbFormat, PrimaryKey, AutoIncrement, ForeignKey, WithDefault
  : T extends { readonly schema: infer Inner } ? UnwrapUntilReturnTrue<Inner, Check> 
  // Schema.$Array
  : T extends { readonly value:  infer Inner } ? UnwrapUntilReturnTrue<Inner, Check> 
  : false;

export type RemoveReadOnly<T> = { -readonly [K in keyof T]: T[K] };

// prettier-ignore
export type GetBaseTypeWithoutArrays<T> =
    T extends { readonly members: readonly [infer First, ...infer _] } ? GetBaseTypeWithoutArrays<First>
  : T extends { readonly value: infer Inner } ? GetBaseTypeWithoutArrays<Inner>
  : T;

// prettier-ignore
export type DomainOfType<T> =
  T extends { Type: infer Type }
    ? string  extends Type ? "string"
    : number  extends Type ? "number"
    : bigint  extends Type ? "bigint"
    : boolean extends Type ? "boolean"
    : Date    extends Type ? "Date"
    : Type    extends {}   ? "object"
    : false
  : false;

type IsNullable<T> = T extends { Type: infer Type }
  ? null extends Type
    ? true
    : false
  : false;

type IsOptional<T> = T extends { Type: infer Type }
  ? undefined extends Type
    ? true
    : false
  : false;

type FinalType<T> = T extends infer U ? { [K in keyof U]: U[K] } : never;

type OmitNever<T> = Omit<
  T,
  { [K in keyof T]: T[K] extends never ? K : never }[keyof T]
>;

type NonEmptyObject<T> = keyof T extends never ? never : T;

export type RewrapToColumnType<T> = T extends { type: "ERROR" }
  ? { type: "ERROR" }
  : T extends {
        type: infer Type extends string;
      } & infer Params
    ? Omit<Params, "type"> extends NonEmptyObject<Omit<Params, "type">>
      ? ColumnType<Type, FinalType<Omit<Params, "type">>>
      : ColumnTypeSingualr<Type>
    : T extends ColumnTypeSingualr<infer Type>
      ? ColumnTypeSingualr<Type>
      : never;

export type GetMaxLength<T> =
  UnwrapUntilReturnTrue<T, { readonly maxLength: unknown }> extends [
    true,
    infer M,
  ]
    ? M extends { readonly maxLength: infer N extends number }
      ? N
      : false
    : false;

export type GetDbFormat<T> =
  UnwrapUntilReturnTrue<T, { readonly dbformat: unknown }> extends [
    true,
    infer Inner,
  ]
    ? Inner extends { readonly dbformat: infer F }
      ? F
      : never
    : never;

type HasDbPk<T> =
  UnwrapUntilReturnTrue<T, { readonly primaryKey: true }> extends [
    true,
    infer _,
  ]
    ? true
    : false;

type HasDbAutoInc<T> =
  UnwrapUntilReturnTrue<T, { readonly autoIncrement: true }> extends [
    true,
    infer _,
  ]
    ? true
    : false;

type GetDefaultValue<T> =
  UnwrapUntilReturnTrue<T, { readonly defaultValue: unknown }> extends [
    true,
    infer Inner,
  ]
    ? Inner extends { readonly defaultValue: infer D }
      ? D
      : never
    : never;

type ArrayDimHelper<A, Acc extends string = ""> = any[] extends A
  ? A extends readonly (infer Elem)[]
    ? Elem extends readonly any[]
      ? ArrayDimHelper<Elem, `${Acc}[]`>
      : `${Acc}[]`
    : never
  : Acc extends ""
    ? never
    : Acc;

type ArrayDimensions<T> = T extends {
  readonly Type: infer V;
}
  ? ArrayDimHelper<V, "">
  : never;

type ForeignkeyTable<T> =
  UnwrapUntilReturnTrue<T, { readonly foreignKeyTable: unknown }> extends [
    true,
    infer Inner,
  ]
    ? Inner extends { readonly foreignKeyTable: infer Tbl extends string }
      ? Tbl
      : never
    : never;

type ForeignkeyColumn<T> =
  UnwrapUntilReturnTrue<T, { readonly foreignKeyColumn: unknown }> extends [
    true,
    infer Inner,
  ]
    ? Inner extends { readonly foreignKeyColumn: infer Col extends string }
      ? Col
      : never
    : never;

// prettier-ignore
export type SafeParamDerivation<T> = OmitNever<{
  primaryKey: HasDbPk<T> extends true ? true : never;
  autoIncrement: HasDbAutoInc<T> extends true ? true : never;
  nullable: 
      IsNullable<T> extends true ? true 
    : IsOptional<T> extends true ? true 
    : never;

  default: GetDefaultValue<T>;
  foreignKeyTable: ForeignkeyTable<T>;
  foreignKeyColumn: ForeignkeyColumn<T>;
  array: ArrayDimensions<T>;
}>;
