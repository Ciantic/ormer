import type { ColumnType } from "kysely";
import type { ColumnTypeSingualr } from "ormer";
import { z, ZodBigInt, type ZodBigIntFormat, type ZodNumberFormat } from "zod";

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
    ZodDbAutoIncrement &
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

export type ZodDbAutoIncrement = {
  def: { db: { autoIncrement: true } };
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

function dbAutoInc<T extends ZodTypeLite>(this: T): T & ZodDbAutoIncrement {
  this.def.db = { ...this.def.db, autoIncrement: true };
  return this as T & ZodDbAutoIncrement;
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

export type ZodNumberProtoFormatVal<
  F extends
    | "int32"
    | "uint32"
    | "float32"
    | "float64"
    | "int8"
    | "uint8"
    | "int16"
    | "uint16",
> = {
  format: F;
};

export type ZodBigIntProtoFormatVal<
  F extends "int64" | "uint64" | "int128" | "uint128",
> = {
  format: F;
};

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

export type ZodSafeInt = {
  format: "safeint";
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
    dbAutoInc: typeof dbAutoInc;
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

  interface ZodNumber {
    // z.number().int() sets format: 'safeint' directly on ZodNumber
    // (NOT ZodNumberFormat — that's only for z.int() standalone)
    int(params?: string | z.core.$ZodNumberFormatParams): this & ZodSafeInt;

    // Custom properties
    int32(): this & ZodNumberProtoFormatVal<"int32">;
    uint32(): this & ZodNumberProtoFormatVal<"uint32">;
    float32(): this & ZodNumberProtoFormatVal<"float32">;
    float64(): this & ZodNumberProtoFormatVal<"float64">;
    int8(): this & ZodNumberProtoFormatVal<"int8">;
    uint8(): this & ZodNumberProtoFormatVal<"uint8">;
    int16(): this & ZodNumberProtoFormatVal<"int16">;
    uint16(): this & ZodNumberProtoFormatVal<"uint16">;
  }

  interface _ZodBigInt {
    // Custom properties
    int64(): this & ZodBigIntProtoFormatVal<"int64">;
    uint64(): this & ZodBigIntProtoFormatVal<"uint64">;
    uint128(): this & ZodBigIntProtoFormatVal<"uint128">;
    int128(): this & ZodBigIntProtoFormatVal<"int128">;
  }

  namespace z {
    // Patch Zod ZodNumberFormat's https://github.com/colinhacks/zod/issues/6045
    // z.int() standalone constructor — returns ZodNumberFormat
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
    ): ZodBigInt & ZodBigIntFormatVal<"uint64">;
  }
}

z.ZodType.prototype.dbTable = dbTable;
z.ZodType.prototype.dbNavigate = dbNavigate;
z.ZodObject.prototype.dbNavigateSelf = dbNavigateSelf;
z.ZodType.prototype.dbFk = dbFk;
z.ZodType.prototype.dbPk = dbPk;
z.ZodType.prototype.dbAutoInc = dbAutoInc;
z.ZodType.prototype.dbPg = dbPg;
z.ZodType.prototype.dbDuck = dbDuck;
z.ZodType.prototype.dbSqlite = dbSqlite;

z.ZodNumber.prototype.int32 = function () {
  this.format = "int32";
  return this;
};
z.ZodNumber.prototype.uint32 = function () {
  this.format = "uint32";
  return this;
};
z.ZodNumber.prototype.float32 = function () {
  this.format = "float32";
  return this;
};
z.ZodNumber.prototype.float64 = function () {
  this.format = "float64";
  return this;
};
z.ZodNumber.prototype.int8 = function () {
  this.format = "int8";
  return this;
};
z.ZodNumber.prototype.uint8 = function () {
  this.format = "uint8";
  return this;
};
z.ZodNumber.prototype.int16 = function () {
  this.format = "int16";
  return this;
};
z.ZodNumber.prototype.uint16 = function () {
  this.format = "uint16";
  return this;
};

z.ZodBigInt.prototype.int64 = function () {
  this.format = "int64";
  return this;
};
z.ZodBigInt.prototype.uint64 = function () {
  this.format = "uint64";
  return this;
};
z.ZodBigInt.prototype.uint128 = function () {
  this.format = "uint128";
  return this;
};
z.ZodBigInt.prototype.int128 = function () {
  this.format = "int128";
  return this;
};
z.ZodString.prototype.naiveDatetime = naiveDatetime;
