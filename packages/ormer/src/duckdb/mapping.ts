/**
 * Type that represents the input and output types for a given DuckDB type mapping.
 *
 * Input = Type used for INSERT and UPDATE operations
 * Output = Type used for SELECT operations results
 */
export type InputOutput<I, O = I> = {
  readonly __insert__: I;
  readonly __update__: I;
  readonly __select__: O;
};

export type DuckdbUnifiedTypeMapping = {
  // Numeric types
  int1: InputOutput<string | number | bigint, number>;
  int2: InputOutput<string | number | bigint, number>;
  int4: InputOutput<string | number | bigint, number>;
  int8: InputOutput<string | number | bigint, bigint>;
  hugeint: InputOutput<string | number | bigint, bigint>;
  float4: InputOutput<string | number | bigint, number>;
  float8: InputOutput<string | number | bigint, number>;
  decimal: InputOutput<string | number | bigint, string>;

  // Character types
  text: InputOutput<string>;
  varchar: InputOutput<string>;
  char: InputOutput<string>;

  // Binary types
  blob: InputOutput<Uint8Array>;

  // Date/Time types
  timestamp: InputOutput<string>;
  timestamptz: InputOutput<Date>;
  date: InputOutput<string>;
  time: InputOutput<string>;
  interval: InputOutput<string>;

  // Boolean type
  boolean: InputOutput<boolean>;

  // UUID type
  uuid: InputOutput<string>;

  // JSON type
  json: InputOutput<Record<string, any>>;

  // Bit string type
  bit: InputOutput<string>;
};
