import * as v from "valibot";

export type DbMetadata = {
  tableName?: string;
  primaryKey?: true;
  foreignKeyTable?: string;
  foreignKeyColumn?: string;
  navigation?: {
    schema: unknown;
    key: string;
  };
  pgColumnType?: unknown;
  duckDbColumnType?: unknown;
  sqliteColumnType?: unknown;
};

export interface DbTypeIssue<T extends string> {
  dbtype: T;
  (): string;
}

const INT8_MIN = -128;
const INT8_MAX = 127;
const INT16_MIN = -32768;
const INT16_MAX = 32767;
const INT32_MIN = -2147483648;
const INT32_MAX = 2147483647;
const UINT8_MAX = 255;
const UINT16_MAX = 65535;
const UINT32_MAX = 4294967295;
const INT64_MIN = -9223372036854775808n;
const INT64_MAX = 9223372036854775807n;
const UINT64_MAX = 18446744073709551615n;
const HUGEINT_MIN = -170141183460469231731687303715884105728n;
const HUGEINT_MAX = 170141183460469231731687303715884105727n;
const UHUGEINT_MAX = 340282366920938463463374607431768211455n;

function dbCheck<TInput, const Discriminant extends string>(
  discriminant: Discriminant,
  checker: (i: TInput) => boolean,
  message: string,
) {
  const msgFn: DbTypeIssue<Discriminant> = Object.assign(() => message, {
    dbtype: discriminant,
  } as const);
  return v.check(checker, msgFn);
}

function dbMetadata<TInput, TExt extends Record<string, unknown>>(
  extension: TExt,
) {
  return v.metadata<TInput, { db: TExt }>({ db: extension });
}

export function table<TInput, const TName extends string>(tableName: TName) {
  return dbMetadata<TInput, { tableName: TName }>({ tableName });
}

export function primaryKey<TInput>() {
  return dbMetadata<TInput, { primaryKey: true }>({ primaryKey: true });
}

export function foreignKey<
  TInput,
  const TTable extends string,
  const TColumn extends string,
>(foreignKeyTable: TTable, foreignKeyColumn: TColumn) {
  return dbMetadata<
    TInput,
    { foreignKeyTable: TTable; foreignKeyColumn: TColumn }
  >({
    foreignKeyTable,
    foreignKeyColumn,
  });
}

export function navigation<TInput, TSchema, const TKey extends string>(
  schema: TSchema,
  key: TKey,
) {
  return dbMetadata<TInput, { navigation: { schema: TSchema; key: TKey } }>({
    navigation: { schema, key },
  });
}

export function pgColumnType<TInput, TColumnType>(columnType: TColumnType) {
  return dbMetadata<TInput, { pgColumnType: TColumnType }>({
    pgColumnType: columnType,
  });
}

export function duckDbColumnType<TInput, TColumnType>(columnType: TColumnType) {
  return dbMetadata<TInput, { duckDbColumnType: TColumnType }>({
    duckDbColumnType: columnType,
  });
}

export function sqliteColumnType<TInput, TColumnType>(columnType: TColumnType) {
  return dbMetadata<TInput, { sqliteColumnType: TColumnType }>({
    sqliteColumnType: columnType,
  });
}

export function int8() {
  return v.pipe(
    v.number(),
    dbCheck(
      "int8",
      (n) => Number.isInteger(n) && n >= INT8_MIN && n <= INT8_MAX,
      `Value must be an integer between ${INT8_MIN} and ${INT8_MAX}`,
    ),
  );
}

export function int16() {
  return v.pipe(
    v.number(),
    dbCheck(
      "int16",
      (n) => Number.isInteger(n) && n >= INT16_MIN && n <= INT16_MAX,
      `Value must be an integer between ${INT16_MIN} and ${INT16_MAX}`,
    ),
  );
}

export function int32() {
  return v.pipe(
    v.number(),
    dbCheck(
      "int32",
      (n) => Number.isInteger(n) && n >= INT32_MIN && n <= INT32_MAX,
      `Value must be an integer between ${INT32_MIN} and ${INT32_MAX}`,
    ),
  );
}

export function uint8() {
  return v.pipe(
    v.number(),
    dbCheck(
      "uint8",
      (n) => Number.isInteger(n) && n >= 0 && n <= UINT8_MAX,
      `Value must be an integer between 0 and ${UINT8_MAX}`,
    ),
  );
}

export function uint16() {
  return v.pipe(
    v.number(),
    dbCheck(
      "uint16",
      (n) => Number.isInteger(n) && n >= 0 && n <= UINT16_MAX,
      `Value must be an integer between 0 and ${UINT16_MAX}`,
    ),
  );
}

export function uint32() {
  return v.pipe(
    v.number(),
    dbCheck(
      "uint32",
      (n) => Number.isInteger(n) && n >= 0 && n <= UINT32_MAX,
      `Value must be an integer between 0 and ${UINT32_MAX}`,
    ),
  );
}

export function float32() {
  return v.pipe(
    v.number(),
    dbCheck(
      "float32",
      (n) => Number.isFinite(n) && n >= -3.4028235e38 && n <= 3.4028235e38,
      "Value must be a finite number between -3.4028235e38 and 3.4028235e38",
    ),
  );
}

export function float64() {
  return v.pipe(
    v.number(),
    dbCheck(
      "float64",
      (n) => Number.isFinite(n),
      "Value must be a finite number",
    ),
  );
}

export function int64() {
  return v.pipe(
    v.bigint(),
    dbCheck(
      "int64",
      (n) => n >= INT64_MIN && n <= INT64_MAX,
      `Value must be a bigint between ${INT64_MIN} and ${INT64_MAX}`,
    ),
  );
}

export function uint64() {
  return v.pipe(
    v.bigint(),
    dbCheck(
      "uint64",
      (n) => n >= 0n && n <= UINT64_MAX,
      `Value must be a bigint between 0 and ${UINT64_MAX}`,
    ),
  );
}

export function int128() {
  return v.pipe(
    v.bigint(),
    dbCheck(
      "int128",
      (n) => n >= HUGEINT_MIN && n <= HUGEINT_MAX,
      `Value must be a bigint between ${HUGEINT_MIN} and ${HUGEINT_MAX}`,
    ),
  );
}

export function uint128() {
  return v.pipe(
    v.bigint(),
    dbCheck(
      "uint128",
      (n) => n >= 0n && n <= UHUGEINT_MAX,
      `Value must be a bigint between 0 and ${UHUGEINT_MAX}`,
    ),
  );
}

const NAIVE_DATETIME_REGEX =
  /^\d{4}-\d{2}-\d{2} \d{2}:\d{2}(:\d{2}(\.\d{3})?)?$/;

/**
 * Valibot's v.isoDateTime almost works, but it doesn't allow seconds or
 * nanoseconds, which are used in SQL datetime formats.
 */
export function naiveDatetime() {
  const msgFn: DbTypeIssue<"naiveDatetime"> = Object.assign(
    () => "Invalid datetime format, expected YYYY-MM-DD HH:MM:SS[.SSS]",
    {
      dbtype: "naiveDatetime",
    } as const,
  );

  return v.pipe(v.string(), v.regex(NAIVE_DATETIME_REGEX, msgFn));
}
