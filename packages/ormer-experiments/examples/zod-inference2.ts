import { z, ZodType } from "zod";

type Params = {
  primaryKey?: boolean;
  autoIncrement?: boolean;
  unique?: boolean;
  updateKey?: boolean;
  notInsertable?: boolean;
  notUpdatable?: boolean;
  defaultSql?: unknown;
  relationship?: [z.ZodObject<any>, string];
  foreignKeyTable?: z.ZodObject<any>;
  foreignKeyColumn?: string;
  cascadeDelete?: boolean | undefined;
  cascadeUpdate?: boolean | undefined;
  precision?: number;
  scale?: number;
  maxLength?: number;
  createdAt?: boolean;
  createdAtAuto?: boolean;
  updatedAt?: boolean;
  updatedAtAuto?: boolean;
  sqlDefault?: unknown;
  concurrencyStamp?: boolean;
  navigateOne?: boolean;
  navigateMany?: boolean;
};

export type PostgresType =
  | "serial"
  | "integer"
  | "bigserial"
  | "bigint"
  | "numeric"
  | "real"
  | "double precision"
  | "uuid"
  | "text"
  | `decimal(${number}, ${number})`
  | `varchar(${number})`
  | "boolean"
  | "timestamp"
  | "timestamptz"
  | "date"
  | "xmin"
  | "time"
  | "jsonb"
  | "json";

export type CustomType<T extends string> = T & { _customType: true };

export function customType<T extends string>(v: T): CustomType<T> {
  return v as any;
}

function pg<
  Z extends z.ZodTypeAny,
  T extends PostgresType | CustomType<string>,
>(this: Z, dbtype: T): Z & { dbtype: T };

function pg<
  Z extends z.ZodTypeAny,
  T extends PostgresType | CustomType<string>,
  P extends Params,
>(this: Z, dbtype: T, params?: P): Z & { dbtype: T } & P;

function pg(this: any, dbtype: any, params?: any) {
  return Object.assign(this, { dbtype: dbtype, ...params }) as any;
}

declare module "zod" {
  interface ZodType {
    pg: typeof pg;
  }
}

z.ZodType.prototype.pg = pg;
