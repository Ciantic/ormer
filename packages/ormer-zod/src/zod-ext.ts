import type { ZodType, ZodObject } from "zod";
import { z } from "zod";

function dbTable<T extends ZodType, const N extends string>(
  this: T,
  tableName: N,
): T & { dbTableName: N } {
  return Object.assign(this, { dbTableName: tableName }) as any;
}

function dbNavigate<T extends ZodType, R extends ZodObject>(
  this: T,
  refSchema: R,
  refKey: keyof R["def"]["shape"],
): T & { dbNavRel: { schema: R; key: string } } {
  return Object.assign(this, {
    dbNavRel: { schema: refSchema, key: refKey },
  }) as any;
}

function dbNavigateSelf<T extends ZodObject>(
  this: T,
  refKey: keyof T["def"]["shape"],
): T & { dbNavRel: { schema: T; key: string } } {
  return Object.assign(this, {
    dbNavRel: { schema: this, key: refKey },
  }) as any;
}

function dbFk<T extends ZodType, R extends ZodObject>(
  this: T,
  refSchema: R,
  refKey: keyof R["def"]["shape"],
): T & { dbFkRel: { schema: R; key: string } } {
  return Object.assign(this, {
    dbFkRel: { schema: refSchema, key: refKey },
  }) as any;
}

function dbPk<T extends ZodType>(this: T): T & { idDbPk: true } {
  return Object.assign(this, {
    idDbPk: true,
  }) as any;
}

declare module "zod" {
  interface ZodType {
    dbTable: typeof dbTable;
    dbNavigate: typeof dbNavigate;
    dbNavigateSelf: typeof dbNavigateSelf;
    dbFk: typeof dbFk;
    dbPk: typeof dbPk;
  }
}

z.ZodType.prototype.dbTable = dbTable;
z.ZodType.prototype.dbNavigate = dbNavigate;
z.ZodObject.prototype.dbNavigateSelf = dbNavigateSelf;
z.ZodType.prototype.dbFk = dbFk;
z.ZodType.prototype.dbPk = dbPk;
