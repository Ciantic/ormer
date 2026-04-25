import type { AllColumnTypes } from "../columnhelpers.ts";

export type PgliteSelectTypes = {
  int32: number;
  int64: bigint;
  bigint: string; // numeric SQL type -> string
  float32: number;
  float64: number;
  decimal: string; // decimal SQL type -> string
  uuid: string;
  string: string;
  varchar: string;
  boolean: boolean;
  datetime: Date;
  datepart: Date; // date SQL type -> Date (midnight UTC)
  timepart: string;
  jsonb: object;
  json: object;
};

// Compile-time check: PgliteSelectTypes must cover every column type defined in
// columns.ts, with no extraneous keys
type _PgliteSelectTypesExhaustive = [AllColumnTypes] extends [
  keyof PgliteSelectTypes,
]
  ? [keyof PgliteSelectTypes] extends [AllColumnTypes]
    ? true
    : never
  : never;
const _assertPgliteSelectTypesExhaustive: _PgliteSelectTypesExhaustive = true;
