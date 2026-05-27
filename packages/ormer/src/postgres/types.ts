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

// prettier-ignore
export const BASE_POSTGRES_VARIADIC_TYPES = {
  decimal: ((p) => !p ? "decimal" : `decimal(${p.precision},${p.scale})`) as DecimalFn,
  timestamp: ((p) => !p ? "timestamp" : `timestamp(${p.precision})`) as TimestampFn,
  timestamptz: ((p) => !p ? "timestamptz" : `timestamptz(${p.precision})`) as TimestamptzFn,
  time: ((p) => (!p ? "time" : `time(${p.precision})`)) as TimeFn,
  timetz: ((p) => (!p ? "timetz" : `timetz(${p.precision})`)) as TimetzFn,
  interval: ((p) => !p ? "interval" : `interval(${p.precision})`) as IntervalFn,

  varchar: ((p) => (!p ? "varchar" : `varchar(${p.maxLength})`)) as VarcharFn,
  char: ((p) => (!p ? "char" : `char(${p.length})`)) as CharFn,
  bit: ((p) => (!p ? "bit" : `bit(${p.length})`)) as BitFn,
  varbit: ((p) => (!p ? "varbit" : `varbit(${p.maxLength})`)) as VarbitFn,
} as const;

type DecimalFn = {
  (): "decimal";
  <const P extends number, const S extends number>(params: {
    precision: P;
    scale: S;
  }): `decimal(${P},${S})`;
};

type TimestampFn = {
  (): "timestamp";
  <const P extends number>(params: { precision: P }): `timestamp(${P})`;
};

type TimestamptzFn = {
  (): "timestamptz";
  <const P extends number>(params: { precision: P }): `timestamptz(${P})`;
};

type TimeFn = {
  (): "time";
  <const P extends number>(params: { precision: P }): `time(${P})`;
};

type TimetzFn = {
  (): "timetz";
  <const P extends number>(params: { precision: P }): `timetz(${P})`;
};

type IntervalFn = {
  (): "interval";
  <const P extends number>(params: { precision: P }): `interval(${P})`;
};

// These types have a parameter as requirement:
type VarcharFn = {
  <const N extends number>(params: { maxLength: N }): `varchar(${N})`;
};

type CharFn = {
  <const N extends number>(params: { length: N }): `char(${N})`;
};

type BitFn = {
  <const N extends number>(params: { length: N }): `bit(${N})`;
};

type VarbitFn = {
  <const N extends number>(params: { maxLength: N }): `varbit(${N})`;
};

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
 * makePgArrayType("text"): "text[]"
 * makePgArrayType("text", 4): "text[4]"
 * makePgArrayType("text", undefined, undefined): "text[][]"
 * makePgArrayType("text", 4, 5): "text[4][5]"
 * makePgArrayType("text", undefined, 3): "text[][3]"
 * ```
 */
export function makePgArrayType<
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

export type PostgresTypeBuilder<T> = Omit<
  {
    [k in BasePostgresType]: () => T;
  },
  BasePostgresVariadicTypeNames
> & {
  [k in keyof typeof BASE_POSTGRES_VARIADIC_TYPES]: (
    ...params: Parameters<(typeof BASE_POSTGRES_VARIADIC_TYPES)[k]>
  ) => T;
};

/*
 & {
  array: (baseType: T) => V;
};
*/
