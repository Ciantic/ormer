export const BASE_POSTGRES_TYPES = [
  // Numeric types
  "int2", // smallint
  "int4", // integer
  "int8", // bigint
  "serial2",
  "serial4", // serial
  "serial8", // bigserial
  "float4", // real
  "float8", // double precision
  "money",
  "decimal", // numeric
  // Character types
  "text",
  // Binary types
  "bytea",
  // Date/Time types
  "timestamp",
  "timestamptz",
  "date",
  "time",
  "timetz",
  "interval",
  // Boolean type
  "boolean",
  // UUID type
  "uuid",
  // JSON types
  "jsonb",
  "json",
  // Network address types
  "inet",
  "cidr",
  "macaddr",
  "macaddr8",
  // Text search types
  "tsvector",
  "tsquery",
  // XML type
  "xml",
  // Geometric types
  "point",
  "line",
  "lseg",
  "box",
  "path",
  "polygon",
  "circle",
  // Object identifier / system types

  // "xmin" is a system column that exists in every table, but it is not a real
  // type that can be used in column definitions

  "pg_lsn",
  "pg_snapshot",
] as const;

export const BASE_POSTGRES_VARIADIC_TYPES = {
  decimal: (precision: number, scale: number) =>
    `decimal(${precision}, ${scale})` as const,
  varchar: (n: number) => `varchar(${n})` as const,
  char: (n: number) => `char(${n})` as const,
  bit: (n: number) => `bit(${n})` as const,
  varbit: (n: number) => `varbit(${n})` as const,
} as const;

type ArrayDim<
  T extends string,
  Dims extends (number | undefined)[],
> = Dims extends [
  infer First extends number | undefined,
  ...infer Rest extends (number | undefined)[],
]
  ? First extends number
    ? ArrayDim<`${T}[${First}]`, Rest>
    : ArrayDim<`${T}[]`, Rest>
  : T;

type EnsureOneDim<Dims extends (number | undefined)[]> = Dims extends {
  length: 0;
}
  ? [undefined]
  : Dims;

/**
 * Create an array type string based on a base type and dimensions.
 *
 * Examples:
 *
 * ```
 * makeArrayType("text"): "text[]"
 * makeArrayType("text", 4): "text[4]"
 * makeArrayType("text", undefined, undefined): "text[][]"
 * makeArrayType("text", 4, 5): "text[4][5]"
 * makeArrayType("text", undefined, 3): "text[][3]"
 * ```
 */
export function makeArrayType<
  T extends BasePostgresType | BasePostgresVariadicTypes,
  const N extends (number | undefined)[] = [],
>(baseType: T, ...dimensions: N): ArrayDim<T, EnsureOneDim<N>> {
  const dims: (number | undefined)[] =
    dimensions.length === 0 ? [undefined] : [...dimensions];
  const suffix = dims.map((d) => (d !== undefined ? `[${d}]` : "[]")).join("");
  return `${baseType}${suffix}` as any;
}

export type BasePostgresType = (typeof BASE_POSTGRES_TYPES)[number] | "xmin";

export type BasePostgresVariadicTypes = ReturnType<
  (typeof BASE_POSTGRES_VARIADIC_TYPES)[keyof typeof BASE_POSTGRES_VARIADIC_TYPES]
>;

export type BasePostgresVariadicTypeNames =
  BasePostgresVariadicTypes extends `${infer Name}(${string}` ? Name : never;

export type PostgresType =
  | BasePostgresType
  | BasePostgresVariadicTypes
  // Intentionally support only single dimension
  | `${BasePostgresType}[]`
  | `${BasePostgresVariadicTypes}[]`;

// Following would work for many dimensions and sizes, but it is probably too
// clever?
//
// type ArrayPostgresType<
//   T extends string,
//   Depth extends 0[] = [],
// > = Depth["length"] extends 4
//   ? T
//   : T extends any
//     ?
//         | T
//         | `${T}[]`
//         | `${T}[${number}]`
//         | ArrayPostgresType<`${T}[]`, [...Depth, 0]>
//         | ArrayPostgresType<`${T}[${number}]`, [...Depth, 0]>
//     : never;

// export type PostgresType = ArrayPostgresType<
//   BasePostgresType | BasePostgresVariadicTypes
// >;

export type PostgresTypeBuilder<T, V = T> = Omit<
  {
    [k in BasePostgresType]: T;
  },
  BasePostgresVariadicTypeNames
> & {
  [k in BasePostgresVariadicTypeNames]: V;
};
