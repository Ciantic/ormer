import { Schema, SchemaAST } from "effect";
import { annotate, make, type Bottom, type Top } from "effect/Schema";
import type { AST } from "effect/SchemaAST";
import { addGenAIAnnotations } from "effect/unstable/ai/Telemetry";

export const Int8 = Schema.Number.pipe(
  withDbformat("int8"),
  Schema.refine(
    (n): n is typeof n => Number.isInteger(n) && n >= -128 && n <= 127,
    { message: "Value must be an integer between -128 and 127" },
  ),
);

export const Int16 = Schema.Number.pipe(
  withDbformat("int16"),
  Schema.refine(
    (n): n is typeof n => Number.isInteger(n) && n >= -32768 && n <= 32767,
    { message: "Value must be an integer between -32768 and 32767" },
  ),
);

export const Int32 = Schema.Number.pipe(
  withDbformat("int32"),
  Schema.refine(
    (n): n is typeof n =>
      Number.isInteger(n) && n >= -2147483648 && n <= 2147483647,
    { message: "Value must be an integer between -2147483648 and 2147483647" },
  ),
);

export const Uint8 = Schema.Number.pipe(
  withDbformat("uint8"),
  Schema.refine(
    (n): n is typeof n => Number.isInteger(n) && n >= 0 && n <= 255,
    { message: "Value must be an integer between 0 and 255" },
  ),
);

export const Uint16 = Schema.Number.pipe(
  withDbformat("uint16"),
  Schema.refine(
    (n): n is typeof n => Number.isInteger(n) && n >= 0 && n <= 65535,
    { message: "Value must be an integer between 0 and 65535" },
  ),
);

export const Uint32 = Schema.Number.pipe(
  withDbformat("uint32"),
  Schema.refine(
    (n): n is typeof n => Number.isInteger(n) && n >= 0 && n <= 4294967295,
    { message: "Value must be an integer between 0 and 4294967295" },
  ),
);

export const Float32 = Schema.Number.pipe(
  withDbformat("float32"),
  Schema.refine(
    (n): n is typeof n =>
      Number.isFinite(n) && n >= -3.4028235e38 && n <= 3.4028235e38,
    {
      message:
        "Value must be a finite number between -3.4028235e38 and 3.4028235e38",
    },
  ),
);

export const Float64 = Schema.Number.pipe(
  withDbformat("float64"),
  Schema.refine((n): n is typeof n => Number.isFinite(n), {
    message: "Value must be a finite number",
  }),
);

export const Int64 = Schema.BigInt.pipe(
  withDbformat("int64"),
  Schema.refine(
    (n): n is typeof n =>
      n >= -9223372036854775808n && n <= 9223372036854775807n,
    {
      message:
        "Value must be a bigint between -9223372036854775808 and 9223372036854775807",
    },
  ),
);

export const Uint64 = Schema.BigInt.pipe(
  withDbformat("uint64"),
  Schema.refine((n): n is typeof n => n >= 0n && n <= 18446744073709551615n, {
    message: "Value must be a bigint between 0 and 18446744073709551615",
  }),
);

export const Int128 = Schema.BigInt.pipe(
  withDbformat("int128"),
  Schema.refine(
    (n): n is typeof n =>
      n >= -170141183460469231731687303715884105728n &&
      n <= 170141183460469231731687303715884105727n,
    {
      message:
        "Value must be a bigint between -170141183460469231731687303715884105728 and 170141183460469231731687303715884105727",
    },
  ),
);

export const Uint128 = Schema.BigInt.pipe(
  withDbformat("uint128"),
  Schema.refine(
    (n): n is typeof n =>
      n >= 0n && n <= 340282366920938463463374607431768211455n,
    {
      message:
        "Value must be a bigint between 0 and 340282366920938463463374607431768211455",
    },
  ),
);

const NAIVE_DATETIME_REGEX =
  /^\d{4}-\d{2}-\d{2} \d{2}:\d{2}(:\d{2}(\.\d{3})?)?$/;

export const NaiveDatetime = Schema.String.pipe(
  withDbformat("naiveDatetime"),
  Schema.refine((s): s is typeof s => NAIVE_DATETIME_REGEX.test(s), {
    message: "Invalid datetime format, expected YYYY-MM-DD HH:MM:SS[.SSS]",
  }),
);

const ISO_TIME_REGEX = /^\d{2}:\d{2}:\d{2}$/;

export const IsoTime = Schema.String.pipe(
  withDbformat("isoTime"),
  Schema.refine((s): s is typeof s => ISO_TIME_REGEX.test(s), {
    message: "Invalid time format, expected HH:MM:SS",
  }),
);

export const IsoTimeSecond = Schema.String.pipe(
  withDbformat("isoTimeSecond"),
  Schema.refine((s): s is typeof s => ISO_TIME_REGEX.test(s), {
    message: "Invalid time format, expected HH:MM:SS",
  }),
);

const ISO_DATE_REGEX = /^\d{4}-\d{2}-\d{2}$/;

export const IsoDate = Schema.String.pipe(
  withDbformat("isoDate"),
  Schema.refine((s): s is typeof s => ISO_DATE_REGEX.test(s), {
    message: "Invalid date format, expected YYYY-MM-DD",
  }),
);

const ISO_DATETIME_REGEX =
  /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(:\d{2}(\.\d+)?)?(Z|[+-]\d{2}:\d{2})$/;

export const IsoDateTime = Schema.String.pipe(
  withDbformat("isoDateTime"),
  Schema.refine((s): s is typeof s => ISO_DATETIME_REGEX.test(s), {
    message:
      "Invalid datetime format, expected YYYY-MM-DDTHH:MM:SS[.SSS](Z|±HH:MM)",
  }),
);

const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export const DbUuid = Schema.String.pipe(
  withDbformat("uuid"),
  Schema.refine((s): s is typeof s => UUID_REGEX.test(s), {
    message: "Invalid UUID format, expected 8-4-4-4-12 hex digits",
  }),
);

const URL_REGEX = /^https?:\/\/.+/;

export const UrlString = Schema.String.pipe(
  withDbformat("url"),
  Schema.refine((s): s is typeof s => URL_REGEX.test(s), {
    message: "Invalid URL format, expected http(s)://...",
  }),
);

const EMAIL_REGEX = /^[^@]+@[^@]+$/;

export const EmailString = Schema.String.pipe(
  withDbformat("email"),
  Schema.refine((s): s is typeof s => EMAIL_REGEX.test(s), {
    message: "Invalid email format",
  }),
);

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

// Type-level extractor for DbFormat marker
export type GetDbFormat<T> = T extends { readonly ___dbformat?: infer B }
  ? B extends string
    ? B
    : never
  : never;

export function withDbformat<B extends string>(identifier: B) {
  return <S extends Top>(
    schema: S,
  ): S["Rebuild"] & { readonly ___dbformat?: B } =>
    schema.annotate({ dbformat: identifier }) as any;
}

// const UUIDString = Schema.String.check(Schema.isUUID()).pipe(
//   withDbformat("uuid"),
// );

// console.log("UUIDString", UUIDString);
