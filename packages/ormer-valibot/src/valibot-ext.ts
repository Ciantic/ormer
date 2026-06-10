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

const INT32_MIN = -2147483648;
const INT32_MAX = 2147483647;
const UINT32_MAX = 4294967295;
const INT64_MIN = -9223372036854775808n;
const INT64_MAX = 9223372036854775807n;
const UINT64_MAX = 18446744073709551615n;

function dbMetadata<TInput, TExt extends Record<string, unknown>>(
  extension: TExt,
) {
  return v.metadata<TInput, { db: TExt }>({ db: extension });
}

export function dbTable<TInput, const TName extends string>(tableName: TName) {
  return dbMetadata<TInput, { tableName: TName }>({ tableName });
}

export function dbPrimaryKey<TInput>() {
  return dbMetadata<TInput, { primaryKey: true }>({ primaryKey: true });
}

export function dbForeignKey<
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

export function dbNavigate<TInput, TSchema, const TKey extends string>(
  schema: TSchema,
  key: TKey,
) {
  return dbMetadata<TInput, { navigation: { schema: TSchema; key: TKey } }>({
    navigation: { schema, key },
  });
}

export function dbPgColumnType<TInput, TColumnType>(columnType: TColumnType) {
  return dbMetadata<TInput, { pgColumnType: TColumnType }>({
    pgColumnType: columnType,
  });
}

export function dbDuckDbColumnType<TInput, TColumnType>(
  columnType: TColumnType,
) {
  return dbMetadata<TInput, { duckDbColumnType: TColumnType }>({
    duckDbColumnType: columnType,
  });
}

export function dbSqliteColumnType<TInput, TColumnType>(
  columnType: TColumnType,
) {
  return dbMetadata<TInput, { sqliteColumnType: TColumnType }>({
    sqliteColumnType: columnType,
  });
}

export function int32() {
  return v.pipe(
    v.number(),
    v.check(
      (input) =>
        Number.isInteger(input) && input >= INT32_MIN && input <= INT32_MAX,
    ),
    v.brand("int32"),
  );
}

export function uint32() {
  return v.pipe(
    v.number(),
    v.check(
      (input) => Number.isInteger(input) && input >= 0 && input <= UINT32_MAX,
    ),
    v.brand("uint32"),
  );
}

export function float32() {
  return v.pipe(
    v.number(),
    v.check(
      (input) =>
        Number.isFinite(input) &&
        input >= -3.4028234663852886e38 &&
        input <= 3.4028234663852886e38,
    ),
    v.brand("float32"),
  );
}

export function float64() {
  return v.pipe(
    v.number(),
    v.check((input) => Number.isFinite(input)),
    v.brand("float64"),
  );
}

export function int64() {
  return v.pipe(
    v.bigint(),
    v.check((input) => input >= INT64_MIN && input <= INT64_MAX),
    v.brand("int64"),
  );
}

export function uint64() {
  return v.pipe(
    v.bigint(),
    v.check((input) => input >= 0n && input <= UINT64_MAX),
    v.brand("uint64"),
  );
}

const NAIVE_DATETIME_REGEX =
  /^\d{4}-\d{2}-\d{2} \d{2}:\d{2}(:\d{2}(\.\d{3})?)?$/;

/**
 * Valibot's v.isoDateTime almost works, but it doesn't allow seconds or
 * nanoseconds, which are used in SQL datetime formats.
 */
export function naiveDatetime() {
  return v.pipe(
    v.string(),
    v.regex(
      NAIVE_DATETIME_REGEX,
      "Invalid datetime format, expected YYYY-MM-DD HH:MM:SS[.SSS]",
    ),
    v.brand("naiveDatetime"),
  );
}
