import type { ColumnType } from "kysely";
import type { ColumnTypeSingualr } from "ormer";
import type { ZodType, ZodObject } from "zod";
import { z } from "zod";

// ---------------------------------------------------------------------------
// Db params — union of all possible shapes the `db` property can take
// ---------------------------------------------------------------------------
type FinalTypeDb<T> = T extends { db: infer U }
  ? { [K in keyof U]: U[K] }
  : never;

export type ZodDbParams = FinalTypeDb<
  ZodDbFk<any, string> &
    ZodDbNavigate<any, string> &
    ZodDbNavigateSelf<any, string> &
    ZodDbPrimaryKey &
    ZodDbTableName<string> &
    ZodDbPgColumnType<any>
>;

// ---------------------------------------------------------------------------
// Reusable db metadata types (each carries the full `db: { ... }` wrapper)
// ---------------------------------------------------------------------------

export type ZodDbTableName<T extends string> = {
  db: { tableName: T };
};

export type ZodDbPrimaryKey = {
  db: { primaryKey: true };
};

export type ZodDbNavigate<
  R extends ZodObject,
  K extends keyof R["def"]["shape"] = string,
> = {
  db: { navRel: { schema: R; key: K } };
};

export type ZodDbNavigateSelf<
  T extends ZodObject,
  K extends keyof T["def"]["shape"] = string,
> = {
  db: { navRel: { schema: T; key: K } };
};

export type ZodDbFk<R extends ZodObject, K extends keyof R["def"]["shape"]> = {
  db: { fkRel: { schema: R; key: K } };
};

export type ZodDbPgColumnType<
  C extends ColumnTypeSingualr<string> | ColumnType<string, any>,
> = {
  db: { pgColumnType: C };
};

function dbTable<T extends ZodType, const N extends string>(
  this: T,
  tableName: N,
): T & ZodDbTableName<N> {
  const existingDb = (this as any).db || {};
  return Object.assign(this, { db: { ...existingDb, tableName } }) as any;
}

function dbNavigate<
  T extends ZodType,
  R extends ZodObject,
  K extends keyof R["def"]["shape"],
>(this: T, refSchema: R, refKey: K): T & ZodDbNavigate<R, K> {
  const existingDb = (this as any).db || {};
  return Object.assign(this, {
    db: { ...existingDb, navRel: { schema: refSchema, key: refKey } },
  }) as any;
}

function dbNavigateSelf<T extends ZodObject, K extends keyof T["def"]["shape"]>(
  this: T,
  refKey: K,
): T & ZodDbNavigateSelf<T, K> {
  const existingDb = (this as any).db || {};
  return Object.assign(this, {
    db: { ...existingDb, navRel: { schema: this, key: refKey } },
  }) as any;
}

function dbFk<
  T extends ZodType,
  R extends ZodObject,
  K extends keyof R["def"]["shape"],
>(this: T, refSchema: R, refKey: K): T & ZodDbFk<R, K> {
  const existingDb = (this as any).db || {};
  return Object.assign(this, {
    db: { ...existingDb, fkRel: { schema: refSchema, key: refKey } },
  }) as any;
}

function dbPk<T extends ZodType>(this: T): T & ZodDbPrimaryKey {
  const existingDb = (this as any).db || {};
  return Object.assign(this, {
    db: { ...existingDb, primaryKey: true },
  }) as any;
}

function dbPg<
  T extends ZodType,
  const C extends ColumnTypeSingualr<string> | ColumnType<string, any>,
>(this: T, columnType: C): T & ZodDbPgColumnType<C> {
  // Notably, this also drops all the other db params, but that's intentional
  return Object.assign(this, {
    db: { pgColumnType: columnType },
  }) as any;
}

declare module "zod" {
  interface ZodType {
    dbTable: typeof dbTable;
    dbNavigate: typeof dbNavigate;
    dbNavigateSelf: typeof dbNavigateSelf;
    dbFk: typeof dbFk;
    dbPk: typeof dbPk;
    dbPg: typeof dbPg;
  }
}

z.ZodType.prototype.dbTable = dbTable;
z.ZodType.prototype.dbNavigate = dbNavigate;
z.ZodObject.prototype.dbNavigateSelf = dbNavigateSelf;
z.ZodType.prototype.dbFk = dbFk;
z.ZodType.prototype.dbPk = dbPk;
z.ZodType.prototype.dbPg = dbPg;
