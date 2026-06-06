// Strict table column types as defined by SQLite: integer, real, text, blob,
// any, but numeric is not a strict type but it has unique affinity. See
// https://sqlite.org/datatype3.html for more details.
//
//
// https://sqlite.org/stricttables.html
export const BASE_SQLITE_TYPES = [
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
