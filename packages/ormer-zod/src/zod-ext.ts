import type { ColumnType } from "kysely";
import type { ColumnTypeSingualr } from "ormer";
import { z, type ZodBigIntFormat, type ZodNumberFormat } from "zod";

// ---------------------------------------------------------------------------
// Db params — union of all possible shapes the `db` property can take
// ---------------------------------------------------------------------------
type FinalTypeDb<T> = T extends { def: { db: infer U } }
  ? { [K in keyof U]: U[K] }
  : never;

type ZodTypeLite = {
  def: z.core.$ZodTypeDef & { db?: Partial<ZodDbParams> };
};

// ZodObject is kind of heavy for inference, this is the subset we only need.
// With regular old ZodObject I encountered tsc max stack issues.
type ZodObjectLite = {
  def: { shape: Record<string, any>; db?: Partial<ZodDbParams> };
};

export type ZodDbParams = FinalTypeDb<
  ZodDbFk<any, string> &
    ZodDbNavigate<any, string> &
    ZodDbPrimaryKey &
    ZodDbTableName<string> &
    ZodDbPgColumnType<any> &
    ZodDbDuckDbColumnType<any> &
    ZodDbSqliteColumnType<any>
>;

// ---------------------------------------------------------------------------
// Reusable db metadata types (each carries the full `db: { ... }` wrapper)
// ---------------------------------------------------------------------------

export type ZodDbTableName<T extends string> = {
  def: { db: { tableName: T } };
};

export type ZodDbPrimaryKey = {
  def: { db: { primaryKey: true } };
};

export type ZodDbNavigate<R, K> = {
  def: { db: { navigation: { schema: R; key: K } } };
};

export type ZodDbFk<N, C> = {
  def: { db: { foreignKeyTable: N; foreignKeyColumn: C } };
};

export type ZodDbPgColumnType<
  C extends ColumnTypeSingualr<string> | ColumnType<string, any>,
> = {
  def: { db: { pgColumnType: C } };
};

export type ZodDbDuckDbColumnType<
  C extends ColumnTypeSingualr<string> | ColumnType<string, any>,
> = {
  def: { db: { duckDbColumnType: C } };
};

export type ZodDbSqliteColumnType<
  C extends ColumnTypeSingualr<string> | ColumnType<string, any>,
> = {
  def: { db: { sqliteColumnType: C } };
};

function dbTable<T extends ZodTypeLite, const N extends string>(
  this: T,
  tableName: N,
): T & ZodDbTableName<N> {
  this.def.db = {
    ...this.def.db,
    tableName: tableName,
  };
  return this as T & ZodDbTableName<N>;
}

function dbNavigate<
  T extends ZodTypeLite,
  R extends ZodObjectLite,
  K extends keyof R["def"]["shape"],
>(this: T, refSchema: R, refKey: K): T & ZodDbNavigate<R, K> {
  this.def.db = {
    ...this.def.db,
    navigation: { schema: refSchema, key: refKey as string },
  };
  return this as T & ZodDbNavigate<R, K>;
}

function dbNavigateSelf<
  T extends ZodObjectLite,
  K extends keyof T["def"]["shape"],
>(this: T, refKey: K): T & ZodDbNavigate<T, K> {
  this.def.db = {
    ...this.def.db,
    navigation: { schema: this, key: refKey as string },
  };
  return this as T & ZodDbNavigate<T, K>;
}

function dbFk<
  T extends ZodTypeLite,
  R extends { def: { shape: Record<string, any> } } & ZodDbTableName<string>,
  K extends keyof R["def"]["shape"],
>(
  this: T,
  refSchema: R,
  refKey: K,
): T & ZodDbFk<R["def"]["db"]["tableName"], K> {
  this.def.db = {
    ...this.def.db,
    foreignKeyTable: refSchema.def.db.tableName,
    foreignKeyColumn: refKey as string,
  };
  return this as T & ZodDbFk<R["def"]["db"]["tableName"], K>;
}

function dbPk<T extends ZodTypeLite>(this: T): T & ZodDbPrimaryKey {
  this.def.db = { ...this.def.db, primaryKey: true };
  return this as T & ZodDbPrimaryKey;
}

function dbPg<
  T extends ZodTypeLite,
  const C extends ColumnTypeSingualr<string> | ColumnType<string, any>,
>(this: T, columnType: C): T & ZodDbPgColumnType<C> {
  this.def.db = { pgColumnType: columnType };
  return this as T & ZodDbPgColumnType<C>;
}

function dbDuck<
  T extends ZodTypeLite,
  const C extends ColumnTypeSingualr<string> | ColumnType<string, any>,
>(this: T, columnType: C): T & ZodDbDuckDbColumnType<C> {
  this.def.db = { duckDbColumnType: columnType };
  return this as T & ZodDbDuckDbColumnType<C>;
}

function dbSqlite<
  T extends ZodTypeLite,
  const C extends ColumnTypeSingualr<string> | ColumnType<string, any>,
>(this: T, columnType: C): T & ZodDbSqliteColumnType<C> {
  this.def.db = { sqliteColumnType: columnType };
  return this as T & ZodDbSqliteColumnType<C>;
}

export type ZodNumberFormatVal<
  F extends "safeint" | "int32" | "uint32" | "float32" | "float64",
> = {
  _zod: { def: { format: F } };
};

export type ZodBigIntFormatVal<F extends "int64" | "uint64"> = {
  _zod: { def: { format: F } };
};

export type ZodMaxLengthVal<T extends number> = {
  maxLength: T;
};

export type NaiveDatetime = {
  def: { isNaiveDatetime: true };
};

function naiveDatetime<T extends z.ZodString>(this: T): T & NaiveDatetime {
  // YYYY-MM-DD HH:MM:SS[.SSS] no time zone, separated by space
  const res = this.regex(
    /^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}(\.\d{3})?$/,
    "Invalid datetime format, expected YYYY-MM-DD HH:MM:SS[.SSS]",
  );
  (res as unknown as NaiveDatetime).def.isNaiveDatetime = true;
  return res as T & NaiveDatetime;
}

declare module "zod" {
  interface ZodType {
    dbTable: typeof dbTable;
    dbNavigate: typeof dbNavigate;
    dbNavigateSelf: typeof dbNavigateSelf;
    dbFk: typeof dbFk;
    dbPk: typeof dbPk;
    dbPg: typeof dbPg;
    dbDuck: typeof dbDuck;
    dbSqlite: typeof dbSqlite;
  }

  interface _ZodString {
    // Retain max length at type-level to allow narrowing to varchar(N) in PG derivation
    max<T extends number>(
      maxLength: T,
      params?: string | z.core.$ZodCheckMaxLengthParams,
    ): this & ZodMaxLengthVal<T>;

    naiveDatetime: typeof naiveDatetime;
  }

  namespace z {
    // Patch Zod ZodNumberFormat's https://github.com/colinhacks/zod/issues/6045
    export function int(
      params?: string | z.core.$ZodNumberFormatParams,
    ): ZodNumberFormat & ZodNumberFormatVal<"safeint">;

    export function int32(
      params?: string | z.core.$ZodNumberFormatParams,
    ): ZodNumberFormat & ZodNumberFormatVal<"int32">;

    export function uint32(
      params?: string | z.core.$ZodNumberFormatParams,
    ): ZodNumberFormat & ZodNumberFormatVal<"uint32">;

    export function float32(
      params?: string | z.core.$ZodNumberFormatParams,
    ): ZodNumberFormat & ZodNumberFormatVal<"float32">;

    export function float64(
      params?: string | z.core.$ZodNumberFormatParams,
    ): ZodNumberFormat & ZodNumberFormatVal<"float64">;

    // Patch Zod ZodBigIntFormat's https://github.com/colinhacks/zod/issues/6045
    export function int64(
      params?: string | z.core.$ZodBigIntFormatParams,
    ): ZodBigIntFormat & ZodBigIntFormatVal<"int64">;

    export function uint64(
      params?: string | z.core.$ZodBigIntFormatParams,
    ): ZodBigIntFormat & ZodBigIntFormatVal<"uint64">;
  }
}

z.ZodType.prototype.dbTable = dbTable;
z.ZodType.prototype.dbNavigate = dbNavigate;
z.ZodObject.prototype.dbNavigateSelf = dbNavigateSelf;
z.ZodType.prototype.dbFk = dbFk;
z.ZodType.prototype.dbPk = dbPk;
z.ZodType.prototype.dbPg = dbPg;
z.ZodType.prototype.dbDuck = dbDuck;
z.ZodType.prototype.dbSqlite = dbSqlite;
z.ZodString.prototype.naiveDatetime = naiveDatetime;
