// Strict table column types as defined by SQLite:
// https://sqlite.org/stricttables.html
export const BASE_SQLITE_TYPES = [
  "int",
  "integer",
  "real",
  "text",
  "blob",
  "any",
] as const;

export type BaseSqliteType = (typeof BASE_SQLITE_TYPES)[number];

export type SqliteType = BaseSqliteType;

export type SqliteTypeBuilder<T> = {
  [k in BaseSqliteType]: () => T;
};
