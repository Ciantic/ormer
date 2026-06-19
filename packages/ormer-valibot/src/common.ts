import type {
  SchemaWithPipe,
  NullableSchema,
  OptionalSchema,
  NullishSchema,
  NonOptionalSchema,
  NonNullableSchema,
  NonNullishSchema,
  ExactOptionalSchema,
  ArraySchema,
  InferMetadata,
} from "valibot";
import * as v from "valibot";
import type { ColumnType, ColumnTypeSingualr, Table } from "ormer";

// ---------------------------------------------------------------------------
// General utility types
// ---------------------------------------------------------------------------

export type ValibotSchema = v.GenericSchema;

type FinalType<T> = T extends infer U ? { [K in keyof U]: U[K] } : never;

type OmitNever<T> = Omit<
  T,
  { [K in keyof T]: T[K] extends never ? K : never }[keyof T]
>;

type NonEmptyObject<T> = keyof T extends never ? never : T;

// ---------------------------------------------------------------------------
// Pipe union extraction (recursive through modifiers)
// ---------------------------------------------------------------------------

/**
 * Extract the union of all pipe items from a schema, walking through
 * modifier schemas (nullable, optional, etc.) to find the piped schema.
 * Also recursively flattens nested SchemaWithPipe items (e.g., d.int32()
 * creates a pipe that is itself a pipe item).
 */
// prettier-ignore
type PipeUnion<T extends ValibotSchema> =
    T extends SchemaWithPipe<infer TPipe>
      ? TPipe[number] extends infer Item
        ? Item extends SchemaWithPipe<infer NestedPipe>
          ? TPipe[number] | NestedPipe[number]
          : TPipe[number]
        : never
  : T extends NullableSchema<infer Inner extends ValibotSchema, any>                ? PipeUnion<Inner>
  : T extends OptionalSchema<infer Inner extends ValibotSchema, any>                ? PipeUnion<Inner>
  : T extends NullishSchema<infer Inner extends ValibotSchema, any>                 ? PipeUnion<Inner>
  : T extends NonNullableSchema<infer Inner extends ValibotSchema, any>             ? PipeUnion<Inner>
  : T extends NonNullishSchema<infer Inner extends ValibotSchema, any>              ? PipeUnion<Inner>
  : T extends NonOptionalSchema<infer Inner extends ValibotSchema, any>             ? PipeUnion<Inner>
  : T extends ExactOptionalSchema<infer Inner extends ValibotSchema, any>           ? PipeUnion<Inner>
  : never;

// ---------------------------------------------------------------------------
// Pipe item helpers — search pipe items by type
// ---------------------------------------------------------------------------

/**
 * Check if a schema has a pipe item with the given type.
 */
export type HasPipeItem<T extends ValibotSchema, Type extends string> = [
  PipeUnion<T>,
] extends [never]
  ? false
  : Extract<PipeUnion<T>, { type: Type }> extends never
    ? false
    : true;

export type HasBaseSchema<T extends ValibotSchema, E extends ValibotSchema> =
  UnwrapUntilReturnTrue<T, E> extends [true, infer _] ? true : false;

export type HasBrand<T extends ValibotSchema, B extends string> =
  HasPipeItem<T, "brand"> extends true
    ? GetPipeItemProp<T, "brand", "name"> extends B
      ? true
      : false
    : false;

export type HasDbTypeCheck<T extends ValibotSchema, D extends string> =
  GetPipeItemProp<T, "check", "message"> extends { dbtype: infer DB }
    ? DB extends D
      ? true
      : false
    : false;

export type HasDbTypeRegex<T extends ValibotSchema, D extends string> =
  GetPipeItemProp<T, "regex", "message"> extends { dbtype: infer DB }
    ? DB extends D
      ? true
      : false
    : false;

export type GetPipeItemProp<
  T extends ValibotSchema,
  Type extends string,
  Prop extends string,
> =
  Extract<PipeUnion<T>, { type: Type }> extends infer Item
    ? Item extends Record<Prop, infer V>
      ? V
      : never
    : never;

/**
 * Unwrap modifier schemas to get the inner (base) schema.
 * Walks through nullable, optional, nullish, nonOptional, nonNullable,
 * nonNullish, exactOptional, fallback, and array wrappers.
 */
// prettier-ignore
export type UnwrapModifiers<T extends ValibotSchema> =
    T extends NullableSchema<infer Inner extends ValibotSchema, any>       ? UnwrapModifiers<Inner>
  : T extends OptionalSchema<infer Inner extends ValibotSchema, any>       ? UnwrapModifiers<Inner>
  : T extends NullishSchema<infer Inner extends ValibotSchema, any>        ? UnwrapModifiers<Inner>
  : T extends NonNullableSchema<infer Inner extends ValibotSchema, any>    ? UnwrapModifiers<Inner>
  : T extends NonNullishSchema<infer Inner extends ValibotSchema, any>     ? UnwrapModifiers<Inner>
  : T extends NonOptionalSchema<infer Inner extends ValibotSchema, any>    ? UnwrapModifiers<Inner>
  : T extends ExactOptionalSchema<infer Inner extends ValibotSchema, any>  ? UnwrapModifiers<Inner>
  : T extends SchemaWithPipe<infer Pipe>                                   ? UnwrapModifiers<Extract<Pipe[0], ValibotSchema>>
//   : T extends ArraySchema<infer Inner extends ValibotSchema, any>          ? UnwrapModifiers<Inner>
  : T;

/**
 * Recursively unwrap modifiers until Check matches, or return false.
 */
// prettier-ignore
type UnwrapUntilReturnTrue<
  T extends ValibotSchema,
  Check extends ValibotSchema,
> = T extends Check
  ? [true, T]
  : T extends NullableSchema<infer Inner extends ValibotSchema, any>       ? UnwrapUntilReturnTrue<Inner, Check>
  : T extends OptionalSchema<infer Inner extends ValibotSchema, any>       ? UnwrapUntilReturnTrue<Inner, Check>
  : T extends NullishSchema<infer Inner extends ValibotSchema, any>        ? UnwrapUntilReturnTrue<Inner, Check>
  : T extends NonNullableSchema<infer Inner extends ValibotSchema, any>    ? UnwrapUntilReturnTrue<Inner, Check>
  : T extends NonNullishSchema<infer Inner extends ValibotSchema, any>     ? UnwrapUntilReturnTrue<Inner, Check>
  : T extends NonOptionalSchema<infer Inner extends ValibotSchema, any>    ? UnwrapUntilReturnTrue<Inner, Check>
  : T extends ExactOptionalSchema<infer Inner extends ValibotSchema, any>  ? UnwrapUntilReturnTrue<Inner, Check>
  : T extends SchemaWithPipe<infer Pipe>                                   ? UnwrapUntilReturnTrue<Extract<Pipe[0], ValibotSchema>, Check>
//   : T extends ArraySchema<infer Inner extends ValibotSchema, any>          ? UnwrapUntilReturnTrue<Inner, Check>
  : false;

// prettier-ignore
export type IsNullable<T extends ValibotSchema> =
  UnwrapUntilReturnTrue<T,
    | NullableSchema<any, any> 
    | NullishSchema<any, any>
  > extends [true, infer _]
    ? T extends 
        | NonNullableSchema<any, any> 
        | NonNullishSchema<any, any> 
      ? false 
      : true
    : false;

// prettier-ignore
export type IsOptional<T extends ValibotSchema> =
  UnwrapUntilReturnTrue<T, 
    | OptionalSchema<any, any> 
    | NullishSchema<any, any> 
    | ExactOptionalSchema<any, any>
  > extends [true, infer _]
    ? T extends NonOptionalSchema<any, any> ? false : true
    : false;

/**
 * Check if the schema or any wrapped modifier has a default value (via
 * optional/exactOptional/nullable/nullish with non-undefined default,
 * or via fallback()).
 */
// prettier-ignore
export type HasDefaultValue<T extends ValibotSchema> =
    T extends NullableSchema<infer Inner extends ValibotSchema, any>       ? SchemaHasDefault<T> extends true ? true : HasDefaultValue<Inner>
  : T extends OptionalSchema<infer Inner extends ValibotSchema, any>       ? SchemaHasDefault<T> extends true ? true : HasDefaultValue<Inner>
  : T extends NullishSchema<infer Inner extends ValibotSchema, any>        ? SchemaHasDefault<T> extends true ? true : HasDefaultValue<Inner>
  : T extends ExactOptionalSchema<infer Inner extends ValibotSchema, any>  ? SchemaHasDefault<T> extends true ? true : HasDefaultValue<Inner>
  : T extends NonNullableSchema<infer Inner extends ValibotSchema, any>    ? HasDefaultValue<Inner>
  : T extends NonNullishSchema<infer Inner extends ValibotSchema, any>     ? HasDefaultValue<Inner>
  : T extends NonOptionalSchema<infer Inner extends ValibotSchema, any>    ? HasDefaultValue<Inner>
  : T extends SchemaWithPipe<infer Pipe>                                   ? HasDefaultValue<Extract<Pipe[0], ValibotSchema>>
  : T extends ArraySchema<infer Inner extends ValibotSchema, any>          ? HasDefaultValue<Inner>
  : SchemaHasDefault<T>;

type SchemaHasDefault<T> = T extends { fallback: infer F }
  ? [undefined] extends [F]
    ? false
    : true
  : T extends { default: infer D }
    ? [undefined] extends [D]
      ? false
      : true
    : false;

// ---------------------------------------------------------------------------
// DB metadata extraction (via InferMetadata + modifier unwrap)
// ---------------------------------------------------------------------------

type HasDbPk<T extends ValibotSchema> =
  InferMetadata<T> extends { primaryKey: true } ? true : false;

type HasDbAutoIncrement<T extends ValibotSchema> =
  InferMetadata<T> extends { autoIncrement: true } ? true : false;

type DbFkTable<T extends ValibotSchema> =
  InferMetadata<T> extends { foreignKeyTable: infer N }
    ? N extends string
      ? N
      : never
    : never;

type DbFkColumn<T extends ValibotSchema> =
  InferMetadata<T> extends { foreignKeyColumn: infer C }
    ? C extends string
      ? C
      : never
    : never;

export type DbTableName<T extends ValibotSchema> =
  InferMetadata<T> extends { tableName: infer N }
    ? N extends string
      ? N
      : never
    : never;

export type HasDbNavigation<T extends ValibotSchema> =
  InferMetadata<T> extends { navigation: infer _ } ? true : false;

// ---------------------------------------------------------------------------
// Array dimensions
// ---------------------------------------------------------------------------

export type ArrayDimensions<T extends ValibotSchema, Acc extends string = ""> =
  UnwrapUntilReturnTrue<T, ArraySchema<any, any>> extends [
    true,
    infer Inner extends ValibotSchema,
  ]
    ? Inner extends ArraySchema<infer Inner2 extends ValibotSchema, any>
      ? ArrayDimensions<Inner2, `${Acc}[]`>
      : `${Acc}[]`
    : Acc extends ""
      ? never
      : Acc;

// ---------------------------------------------------------------------------
// Column rewrap helpers
// ---------------------------------------------------------------------------

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

export type RewrapDeriveTable<T> =
  T extends Table<infer Name, infer Columns> ? Table<Name, Columns> : never;

// ---------------------------------------------------------------------------
// Safe param derivation — type-level params from valibot schema
// ---------------------------------------------------------------------------

// prettier-ignore
export type SafeParamDerivation<T extends ValibotSchema> = OmitNever<{
  primaryKey: HasDbPk<T> extends true ? true : never;
  nullable: HasDefaultValue<T> extends true ? never
          : IsNullable<T> extends true ? true
          : IsOptional<T> extends true ? true
          : never;
  default: HasDefaultValue<T> extends true ? v.InferOutput<T> : never;
  autoIncrement: HasDbAutoIncrement<T> extends true ? true : never;
  foreignKeyTable: DbFkTable<T>;
  foreignKeyColumn: DbFkColumn<T>;
  array: ArrayDimensions<T>;
}>;
