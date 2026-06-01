import type { ColumnType } from "kysely";
import type { ColumnTypeSingualr } from "ormer";
import { z, ZodBigIntFormat, ZodNumberFormat } from "zod";

// ---------------------------------------------------------------------------
// Db params — union of all possible shapes the `db` property can take
// ---------------------------------------------------------------------------
type FinalTypeDb<T> = T extends { def: { db: infer U } }
  ? { [K in keyof U]: U[K] }
  : never;

// ZodObject is kind of heavy for inference, this is the subset we only need.
// With regular old ZodObject I encountered tsc max stack issues.
type ZodObjectLite = { def: { shape: Record<string, any> } };

export type ZodDbParams = FinalTypeDb<
  ZodDbFk<any, string> &
    ZodDbNavigate<any, string> &
    ZodDbPrimaryKey &
    ZodDbTableName<string> &
    ZodDbPgColumnType<any>
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

export type ZodDbNavigate<
  R extends ZodObjectLite,
  K extends keyof R["def"]["shape"] = string,
> = {
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

function dbTable<T extends {}, const N extends string>(
  this: T,
  tableName: N,
): T & ZodDbTableName<N> {
  const existingDb = (this as any).def?.db || {};
  const db = { ...existingDb, tableName };
  (this as any).def.db = db;
  return this as any;
}

function dbNavigate<
  T extends {},
  R extends ZodObjectLite,
  K extends keyof R["def"]["shape"],
>(this: T, refSchema: R, refKey: K): T & ZodDbNavigate<R, K> {
  const existingDb = (this as any).def?.db || {};
  const db = { ...existingDb, navigation: { schema: refSchema, key: refKey } };
  (this as any).def.db = db;
  return this as any;
}

function dbNavigateSelf<
  T extends ZodObjectLite,
  K extends keyof T["def"]["shape"],
>(this: T, refKey: K): T & ZodDbNavigate<T, K> {
  const existingDb = (this as any).def?.db || {};
  const db = { ...existingDb, navigation: { schema: this, key: refKey } };
  (this as any).def.db = db;
  return this as any;
}

function dbFk<
  T extends {},
  R extends { def: { shape: Record<string, any> } } & ZodDbTableName<string>,
  K extends keyof R["def"]["shape"],
>(
  this: T,
  refSchema: R,
  refKey: K,
): T & ZodDbFk<R["def"]["db"]["tableName"], K> {
  const existingDb = (this as any).def?.db || {};
  const db = {
    ...existingDb,
    foreignKeyTable: refSchema.def.db.tableName,
    foreignKeyColumn: refKey,
  };
  (this as any).def.db = db;
  return this as any;
}

function dbPk<T extends {}>(this: T): T & ZodDbPrimaryKey {
  const existingDb = (this as any).def?.db || {};
  const db = { ...existingDb, primaryKey: true };
  (this as any).def.db = db;
  return this as any;
}

function dbPg<
  T extends {},
  const C extends ColumnTypeSingualr<string> | ColumnType<string, any>,
>(this: T, columnType: C): T & ZodDbPgColumnType<C> {
  // Notably, this also drops all the other db params, but that's intentional
  const db = { pgColumnType: columnType };
  (this as any).def.db = db;
  return this as any;
}

export type ZodNumberFormatVal<
  F extends "safeint" | "int32" | "uint32" | "float32" | "float64",
> = {
  _zod: { def: { format: F } };
};

export type ZodBigIntFormatVal<F extends "int64" | "uint64"> = {
  _zod: { def: { format: F } };
};

declare module "zod" {
  interface ZodType {
    dbTable: typeof dbTable;
    dbNavigate: typeof dbNavigate;
    dbNavigateSelf: typeof dbNavigateSelf;
    dbFk: typeof dbFk;
    dbPk: typeof dbPk;
    dbPg: typeof dbPg;
  }

  interface _ZodString {
    // Retain max length at type-level to allow narrowing to varchar(N) in PG derivation
    max<T extends number>(
      maxLength: T,
      params?: string | z.core.$ZodCheckMaxLengthParams,
    ): this & { maxLength: T };
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
