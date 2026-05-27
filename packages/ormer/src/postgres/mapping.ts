// Copied from https://github.com/Ciantic/pg-unified-mapping/

/**
 * Type that represents the input and output types for a given PostgreSQL type mapping.
 *
 * Input = Type used for INSERT and UPDATE operations
 * Output = Type used for SELECT operations results
 */
export type InputOutput<I, O = I> = {
  input: I;
  output: O;
};
export type PgUnifiedTypeMapping = {
  // Numeric types
  int2: InputOutput<string | number | bigint, number>;
  int4: InputOutput<string | number | bigint, number>;
  int8: InputOutput<string | number | bigint, bigint>;
  serial2: InputOutput<string | number | bigint, number>;
  serial4: InputOutput<string | number | bigint, number>;
  serial8: InputOutput<string | number | bigint, bigint>;
  float4: InputOutput<string | number | bigint, number>;
  float8: InputOutput<string | number | bigint, number>;
  decimal: InputOutput<string | number | bigint, string>;
  money: InputOutput<string, string>;

  // Character types
  text: InputOutput<string>;
  varchar: InputOutput<string>;
  char: InputOutput<string>;

  // Binary types
  bytea: InputOutput<Uint8Array>;

  // Date/Time types
  timestamp: InputOutput<string>;
  timestamptz: InputOutput<Date>;
  date: InputOutput<string>;
  time: InputOutput<string>;
  timetz: InputOutput<string>;
  interval: InputOutput<string>;

  // Boolean type
  boolean: InputOutput<boolean>;

  // UUID type
  uuid: InputOutput<string>;

  // JSON types
  jsonb: InputOutput<Record<string, any>>;
  json: InputOutput<Record<string, any>>;

  // Network address types
  inet: InputOutput<string>;
  cidr: InputOutput<string>;
  macaddr: InputOutput<string>;
  macaddr8: InputOutput<string>;

  // Bit string types
  bit: InputOutput<string>;
  varbit: InputOutput<string>;

  // Text search types
  tsvector: InputOutput<string>;
  tsquery: InputOutput<string>;

  // XML type
  xml: InputOutput<string>;

  // Geometric types
  point: InputOutput<string>;
  line: InputOutput<string>;
  lseg: InputOutput<string>;
  box: InputOutput<string>;
  path: InputOutput<string>;
  polygon: InputOutput<string>;
  circle: InputOutput<string>;

  // Object identifier / system types
  xmin: InputOutput<number>;
  pg_lsn: InputOutput<string>;
  pg_snapshot: InputOutput<string>;
};
