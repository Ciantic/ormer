import type { ZodType, ZodObject } from "zod";
import { z } from "zod";

function dbTable<T extends ZodType>(
  this: T,
  tableName: string,
): T & { dbTable: string } {
  return Object.assign(this, { dbTable: tableName }) as any;
}

function dbNavigate<T extends ZodType, R extends ZodObject>(
  this: T,
  refSchema: R,
  refKey: keyof R["def"]["shape"],
): T & { dbRef: { schema: R; key: string } } {
  return Object.assign(this, {
    dbRef: { schema: refSchema, key: refKey },
  }) as any;
}

function dbNavigateSelf<T extends ZodObject>(
  this: T,
  refKey: keyof T["def"]["shape"],
): T & { dbRef: { schema: T; key: string } } {
  return Object.assign(this, {
    dbRef: { schema: this, key: refKey },
  }) as any;
}

function dbFk<T extends ZodType, R extends ZodObject>(
  this: T,
  refSchema: R,
  refKey: keyof R["def"]["shape"],
): T & { dbFk: { schema: R; key: string } } {
  return Object.assign(this, {
    dbFk: { schema: refSchema, key: refKey },
  }) as any;
}

function dbPk<T extends ZodType>(this: T): T {
  return Object.assign(this, {
    dbPk: true,
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
