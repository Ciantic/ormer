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

const INT32_MIN = -2147483648;
const INT32_MAX = 2147483647;
const UINT32_MAX = 4294967295;
const INT64_MIN = -9223372036854775808n;
const INT64_MAX = 9223372036854775807n;
const UINT64_MAX = 18446744073709551615n;

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
    dbCheck(
      "int32",
      (n) => Number.isInteger(n) && n >= INT32_MIN && n <= INT32_MAX,
      `Value must be an integer between ${INT32_MIN} and ${INT32_MAX}`,
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
