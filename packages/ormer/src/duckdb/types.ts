export const BASE_DUCKDB_TYPES = [
  // Numeric types
  "int1", // tinyint
  "int2", // smallint
  "int4", // integer
  "int8", // bigint
  "hugeint",
  "float4", // real
  "float8", // double
  "decimal",
  // Character types
  "text",
  // Binary types
  "blob",
  // Date/Time types
  "timestamp",
  "timestamptz",
  "date",
  "time",
  "interval",
  // Boolean type
  "boolean",
  // UUID type
  "uuid",
  // JSON type
  "json",
  // Bit string type
  "bit",
] as const;

// prettier-ignore
export const BASE_DUCKDB_VARIADIC_TYPES = {
  decimal: ((p) => !p ? "decimal" : `decimal(${p.precision},${p.scale})`) as DecimalFn,
  varchar: ((p) => (!p ? "varchar" : `varchar(${p.maxLength})`)) as VarcharFn,
  char: ((p) => (!p ? "char" : `char(${p.length})`)) as CharFn,
  bit: ((p) => (!p ? "bit" : `bit(${p.length})`)) as BitFn,
} as const;

type DecimalFn = {
  (): "decimal";
  <const P extends number, const S extends number>(params: {
    precision: P;
    scale: S;
  }): `decimal(${P},${S})`;
};

type VarcharFn = {
  <const N extends number>(params: { maxLength: N }): `varchar(${N})`;
};

type CharFn = {
  <const N extends number>(params: { length: N }): `char(${N})`;
};

type BitFn = {
  <const N extends number>(params: { length: N }): `bit(${N})`;
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
 * makeDuckDbArrayType("text"): "text[]"
 * makeDuckDbArrayType("text", 4): "text[4]"
 * makeDuckDbArrayType("text", undefined, undefined): "text[][]"
 * makeDuckDbArrayType("text", 4, 5): "text[4][5]"
 * makeDuckDbArrayType("text", undefined, 3): "text[][3]"
 * ```
 */
export function makeDuckDbArrayType<
  T extends BaseDuckdbType | BaseDuckdbVariadicTypes,
  const N extends (number | undefined)[] = [],
>(baseType: T, ...dimensions: N): ArrayDim<T, EnsureOneDim<N>> {
  const dims: (number | undefined)[] =
    dimensions.length === 0 ? [undefined] : [...dimensions];
  const suffix = dims.map((d) => (d !== undefined ? `[${d}]` : "[]")).join("");
  return `${baseType}${suffix}` as any;
}

export type BaseDuckdbType = (typeof BASE_DUCKDB_TYPES)[number];

export type BaseDuckdbVariadicTypes = ReturnType<
  (typeof BASE_DUCKDB_VARIADIC_TYPES)[keyof typeof BASE_DUCKDB_VARIADIC_TYPES]
>;

export type BaseDuckdbVariadicTypeNames =
  BaseDuckdbVariadicTypes extends `${infer Name}(${string}` ? Name : never;

export type DuckdbType =
  | BaseDuckdbType
  | BaseDuckdbVariadicTypes
  // decimal without scale (precision only)
  | `decimal(${number})`
  | `${BaseDuckdbType}[]`
  | `${BaseDuckdbVariadicTypes}[]`
  | `decimal(${number})[]`;

export type DuckdbTypeBuilder<T> = Omit<
  {
    [k in BaseDuckdbType]: () => T;
  },
  BaseDuckdbVariadicTypeNames
> & {
  [k in keyof typeof BASE_DUCKDB_VARIADIC_TYPES]: (
    ...params: Parameters<(typeof BASE_DUCKDB_VARIADIC_TYPES)[k]>
  ) => T;
};
