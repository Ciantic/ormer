import { Schema } from "effect";
import { annotate, type Top } from "effect/Schema";

export const Int8 = Schema.Number.check(
  Schema.makeFilter(
    (n): n is typeof n => Number.isInteger(n) && n >= -128 && n <= 127,
    { message: "Value must be an integer between -128 and 127" },
  ),
).pipe(withDbformat("int8"));

export const Int16 = Schema.Number.check(
  Schema.makeFilter(
    (n): n is typeof n => Number.isInteger(n) && n >= -32768 && n <= 32767,
    { message: "Value must be an integer between -32768 and 32767" },
  ),
).pipe(withDbformat("int16"));

export const Int32 = Schema.Number.check(
  Schema.makeFilter(
    (n): n is typeof n =>
      Number.isInteger(n) && n >= -2147483648 && n <= 2147483647,
    { message: "Value must be an integer between -2147483648 and 2147483647" },
  ),
).pipe(withDbformat("int32"));

export const Uint8 = Schema.Number.check(
  Schema.makeFilter(
    (n): n is typeof n => Number.isInteger(n) && n >= 0 && n <= 255,
    { message: "Value must be an integer between 0 and 255" },
  ),
).pipe(withDbformat("uint8"));

export const Uint16 = Schema.Number.check(
  Schema.makeFilter(
    (n): n is typeof n => Number.isInteger(n) && n >= 0 && n <= 65535,
    { message: "Value must be an integer between 0 and 65535" },
  ),
).pipe(withDbformat("uint16"));

export const Uint32 = Schema.Number.check(
  Schema.makeFilter(
    (n): n is typeof n => Number.isInteger(n) && n >= 0 && n <= 4294967295,
    { message: "Value must be an integer between 0 and 4294967295" },
  ),
).pipe(withDbformat("uint32"));

export const Float32 = Schema.Number.check(
  Schema.makeFilter(
    (n): n is typeof n =>
      Number.isFinite(n) && n >= -3.4028235e38 && n <= 3.4028235e38,
    {
      message:
        "Value must be a finite number between -3.4028235e38 and 3.4028235e38",
    },
  ),
).pipe(withDbformat("float32"));

export const Float64 = Schema.Number.check(Schema.isFinite()).pipe(
  withDbformat("float64"),
);

export const Int64 = Schema.BigInt.check(
  Schema.makeFilter(
    (n): n is typeof n =>
      n >= -9223372036854775808n && n <= 9223372036854775807n,
    {
      message:
        "Value must be a bigint between -9223372036854775808 and 9223372036854775807",
    },
  ),
).pipe(withDbformat("int64"));

export const Uint64 = Schema.BigInt.check(
  Schema.makeFilter(
    (n): n is typeof n => n >= 0n && n <= 18446744073709551615n,
    { message: "Value must be a bigint between 0 and 18446744073709551615" },
  ),
).pipe(withDbformat("uint64"));

export const Int128 = Schema.BigInt.check(
  Schema.makeFilter(
    (n): n is typeof n =>
      n >= -170141183460469231731687303715884105728n &&
      n <= 170141183460469231731687303715884105727n,
    {
      message:
        "Value must be a bigint between -170141183460469231731687303715884105728 and 170141183460469231731687303715884105727",
    },
  ),
).pipe(withDbformat("int128"));

export const Uint128 = Schema.BigInt.check(
  Schema.makeFilter(
    (n): n is typeof n =>
      n >= 0n && n <= 340282366920938463463374607431768211455n,
    {
      message:
        "Value must be a bigint between 0 and 340282366920938463463374607431768211455",
    },
  ),
).pipe(withDbformat("uint128"));

const NAIVE_DATETIME_REGEX =
  /^\d{4}-\d{2}-\d{2} \d{2}:\d{2}(:\d{2}(\.\d{3})?)?$/;

export const NaiveDatetime = Schema.String.check(
  Schema.makeFilter((s): s is typeof s => NAIVE_DATETIME_REGEX.test(s), {
    message: "Invalid datetime format, expected YYYY-MM-DD HH:MM:SS[.SSS]",
  }),
).pipe(withDbformat("naiveDatetime"));

const ISO_TIME_REGEX = /^\d{2}:\d{2}:\d{2}$/;

export const IsoTime = Schema.String.check(
  Schema.makeFilter((s): s is typeof s => ISO_TIME_REGEX.test(s), {
    message: "Invalid time format, expected HH:MM:SS",
  }),
).pipe(withDbformat("isoTime"));

export const IsoTimeSecond = Schema.String.check(
  Schema.makeFilter((s): s is typeof s => ISO_TIME_REGEX.test(s), {
    message: "Invalid time format, expected HH:MM:SS",
  }),
).pipe(withDbformat("isoTimeSecond"));

const ISO_DATE_REGEX = /^\d{4}-\d{2}-\d{2}$/;

export const IsoDate = Schema.String.check(
  Schema.makeFilter((s): s is typeof s => ISO_DATE_REGEX.test(s), {
    message: "Invalid date format, expected YYYY-MM-DD",
  }),
).pipe(withDbformat("isoDate"));

const ISO_DATETIME_REGEX =
  /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(:\d{2}(\.\d+)?)?(Z|[+-]\d{2}:\d{2})$/;

export const IsoDateTime = Schema.String.check(
  Schema.makeFilter((s): s is typeof s => ISO_DATETIME_REGEX.test(s), {
    message:
      "Invalid datetime format, expected YYYY-MM-DDTHH:MM:SS[.SSS](Z|±HH:MM)",
  }),
).pipe(withDbformat("isoDateTime"));

export const UuidString = Schema.String.check(Schema.isUUID()).pipe(
  withDbformat("uuid"),
);

const URL_REGEX = /^https?:\/\/.+/;

export const UrlString = Schema.String.check(
  Schema.makeFilter((s): s is typeof s => URL_REGEX.test(s), {
    message: "Invalid URL format, expected http(s)://...",
  }),
).pipe(withDbformat("url"));

const EMAIL_REGEX = /^[^@]+@[^@]+$/;

export const EmailString = Schema.String.check(
  Schema.makeFilter((s): s is typeof s => EMAIL_REGEX.test(s), {
    message: "Invalid email format",
  }),
).pipe(withDbformat("email"));

export const Table = <T extends string, S extends Schema.Struct<any>>(
  name: T,
  shape: S,
) => {
  return shape.annotate({ dbTable: name });
};

/*
DbFormat: a brand-like phantom type marker that does NOT change Type/Encoded.
Uses an optional never-property to tag the schema at the type level only.
At runtime, stores the identifier as an AST annotation (via annotate).
*/

export type DbFormat<R, T extends string> = R & { readonly ___dbformat?: T };

// Type-level extractor for DbFormat marker
export type GetDbFormat<T> = T extends { readonly ___dbformat?: infer B }
  ? B extends string
    ? B
    : never
  : never;

export function withDbformat<B extends string>(identifier: B) {
  return <S extends Top>(schema: S): DbFormat<S["Rebuild"], B> =>
    schema.annotate({ dbformat: identifier }) as any;
}
