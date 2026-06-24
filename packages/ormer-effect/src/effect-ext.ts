import { Effect, Schema } from "effect";
import { type Bottom, type Top } from "effect/Schema";

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

const IPV4_REGEX = /^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/;

export const Ipv4String = Schema.String.check(
  Schema.makeFilter((s): s is typeof s => IPV4_REGEX.test(s), {
    message: "Invalid IPv4 address",
  }),
).pipe(withDbformat("ipv4"));

const IPV6_REGEX = /^([0-9a-fA-F]{0,4}:){2,7}[0-9a-fA-F]{0,4}$/;

export const Ipv6String = Schema.String.check(
  Schema.makeFilter((s): s is typeof s => IPV6_REGEX.test(s), {
    message: "Invalid IPv6 address",
  }),
).pipe(withDbformat("ipv6"));

const MAC_REGEX = /^([0-9a-fA-F]{2}[:-]){5}[0-9a-fA-F]{2}$/;

export const MacString = Schema.String.check(
  Schema.makeFilter((s): s is typeof s => MAC_REGEX.test(s), {
    message: "Invalid MAC address",
  }),
).pipe(withDbformat("mac"));

export interface TableWrapper<
  T extends string,
  S extends Schema.Struct<any>,
> extends Bottom<
  S["Type"],
  S["Encoded"],
  S["DecodingServices"],
  S["EncodingServices"],
  S["ast"],
  TableWrapper<T, S>,
  S["~type.make.in"],
  S["Type"],
  S["~type.parameters"],
  S["Type"],
  S["~type.mutability"],
  S["~type.optionality"],
  S["~type.constructor.default"],
  S["~encoded.mutability"],
  S["~encoded.optionality"]
> {
  readonly tableName: T;
  readonly shape: S;
}

export function Table<T extends string, S extends Schema.Struct<any>>(
  name: T,
  shape: S,
): TableWrapper<T, S> {
  return Schema.make(shape.ast, {
    tableName: name,
    shape,
  } as const).annotate({ dbTable: name }) as TableWrapper<T, S>;
}

// Acts like branding but without changing the Type
export interface DbFormat<S extends Top, B> extends Bottom<
  S["Type"],
  S["Encoded"],
  S["DecodingServices"],
  S["EncodingServices"],
  S["ast"],
  DbFormat<S, B>,
  S["~type.make.in"],
  S["Type"],
  S["~type.parameters"],
  S["Type"],
  S["~type.mutability"],
  S["~type.optionality"],
  S["~type.constructor.default"],
  S["~encoded.mutability"],
  S["~encoded.optionality"]
> {
  readonly schema: S;
  readonly dbformat: B;
}

export function withDbformat<B extends string>(dbformat: B) {
  return <S extends Top>(schema: S): DbFormat<S, B> => {
    return Schema.make(schema.ast, {
      schema,
      dbformat,
    } as const).annotate({ dbformat }) as DbFormat<S, B>;
  };
}

export interface AutoIncrement<S extends Top> extends Bottom<
  S["Type"],
  S["Encoded"],
  S["DecodingServices"],
  S["EncodingServices"],
  S["ast"],
  AutoIncrement<S>,
  S["~type.make.in"],
  S["Type"],
  S["~type.parameters"],
  S["Type"],
  S["~type.mutability"],
  S["~type.optionality"],
  S["~type.constructor.default"],
  S["~encoded.mutability"],
  S["~encoded.optionality"]
> {
  readonly schema: S;
  readonly autoIncrement: true;
}

export function AutoIncrement() {
  return <S extends Top>(schema: S): AutoIncrement<S> => {
    return Schema.make(schema.ast, {
      schema,
      autoIncrement: true,
    } as const).annotate({ autoIncrement: true }) as AutoIncrement<S>;
  };
}

export interface PrimaryKey<S extends Top> extends Bottom<
  S["Type"],
  S["Encoded"],
  S["DecodingServices"],
  S["EncodingServices"],
  S["ast"],
  PrimaryKey<S>,
  S["~type.make.in"],
  S["Type"],
  S["~type.parameters"],
  S["Type"],
  S["~type.mutability"],
  S["~type.optionality"],
  S["~type.constructor.default"],
  S["~encoded.mutability"],
  S["~encoded.optionality"]
> {
  readonly schema: S;
  readonly primaryKey: true;
}

export function PrimaryKey() {
  return <S extends Top>(schema: S): PrimaryKey<S> => {
    return Schema.make(schema.ast, {
      schema,
      primaryKey: true,
    } as const).annotate({ primaryKey: true }) as PrimaryKey<S>;
  };
}

export interface ForeignKey<
  S extends Top,
  Tbl extends string,
  Col extends string,
> extends Bottom<
  S["Type"],
  S["Encoded"],
  S["DecodingServices"],
  S["EncodingServices"],
  S["ast"],
  ForeignKey<S, Tbl, Col>,
  S["~type.make.in"],
  S["Type"],
  S["~type.parameters"],
  S["Type"],
  S["~type.mutability"],
  S["~type.optionality"],
  S["~type.constructor.default"],
  S["~encoded.mutability"],
  S["~encoded.optionality"]
> {
  readonly schema: S;
  readonly foreignKeyTable: Tbl;
  readonly foreignKeyColumn: Col;
}

export function ForeignKey<Tbl extends string, Col extends string>({
  table,
  column,
}: {
  table: Tbl;
  column: Col;
}) {
  return <S extends Top>(schema: S): ForeignKey<S, Tbl, Col> => {
    return Schema.make(schema.ast, {
      schema,
      foreignKeyTable: table,
      foreignKeyColumn: column,
    } as const).annotate({
      foreignKeyTable: table,
      foreignKeyColumn: column,
    }) as ForeignKey<S, Tbl, Col>;
  };
}

export interface VarCharWrapper<S extends Top, N extends number> extends Bottom<
  S["Type"],
  S["Encoded"],
  S["DecodingServices"],
  S["EncodingServices"],
  S["ast"],
  VarCharWrapper<S, N>,
  S["~type.make.in"],
  S["Type"],
  S["~type.parameters"],
  S["Type"],
  S["~type.mutability"],
  S["~type.optionality"],
  S["~type.constructor.default"],
  S["~encoded.mutability"],
  S["~encoded.optionality"]
> {
  readonly schema: S;
  readonly maxLength: N;
}

export function VarChar<N extends number>(
  maxLength: N,
): VarCharWrapper<typeof Schema.String, N> {
  const base = Schema.String.pipe(Schema.check(Schema.isMaxLength(maxLength)));
  return Schema.make(base.ast, {
    maxLength,
  } as const).annotate({ maxLength }) as unknown as VarCharWrapper<
    typeof Schema.String,
    N
  >;
}

export interface WithDefault<S extends Top, T> extends Bottom<
  S["Type"],
  S["Encoded"],
  S["DecodingServices"],
  S["EncodingServices"],
  S["ast"],
  WithDefault<S, T>,
  S["~type.make.in"],
  S["Type"],
  S["~type.parameters"],
  S["Type"],
  S["~type.mutability"],
  S["~type.optionality"],
  S["~type.constructor.default"],
  S["~encoded.mutability"],
  S["~encoded.optionality"]
> {
  readonly schema: S;
  readonly defaultValue: T;
}

export function WithDefault<T>(t: T) {
  return <S extends Top>(
    schema: S,
  ): WithDefault<Schema.withDecodingDefault<S>, T> => {
    return Schema.make(schema.ast, {
      schema,
      defaultValue: t,
    } as const)
      .pipe(Schema.withDecodingDefault(Effect.succeed(t)))
      .annotate({ defaultValue: t }) as unknown as WithDefault<
      Schema.withDecodingDefault<S>,
      T
    >;
  };
}

// export const UuidString2 = Schema.String.check(Schema.isUUID()).pipe(
//   withDbformat("uuid"),
// );

// const test = UuidString2;
// const test2 = UuidString2.pipe(Schema.brand("MyId"), PrimaryKey());
// const test3 = UuidString2.pipe(Schema.brand("MyId"), PrimaryKey()).annotate({
//   foo: 1,
// });

// console.log("test", test);
// console.log("test2", test2);
// console.log("test", test.dbformat);
// console.log("test", test.rebuild(test.ast).dbformat);
// console.log("test2", test2.primaryKey);
// console.log("test3 pk", test3.primaryKey);
// console.log("test3 id", test3.schema.identifier);

// // console.log("test3", test3.dbformat);
// console.log(Schema.resolveAnnotations(test3));
