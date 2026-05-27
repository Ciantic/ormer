/**
 * Type that represents the input and output types for a given SQLite type mapping.
 *
 * Input = Type used for INSERT and UPDATE operations
 * Output = Type used for SELECT operations results
 */
export type InputOutput<I, O = I> = {
  readonly __insert__: I;
  readonly __update__: I;
  readonly __select__: O;
};

export type SqliteUnifiedTypeMapping = {
  int: InputOutput<string | number | bigint, number>;
  integer: InputOutput<string | number | bigint, number>;
  real: InputOutput<string | number | bigint, number>;
  text: InputOutput<string>;
  blob: InputOutput<Buffer>;
  any: InputOutput<any>;
};
