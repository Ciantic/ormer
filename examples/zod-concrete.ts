import { z, ZodType, type Infer } from "zod";

type DbType<S> = { dbtype: S };

// Restrict record T to only keys from record B
type R<T, B> = {
  [K in keyof T]: K extends keyof B ? T[K] : never;
};

type Params = {
  primaryKey?: boolean;
  autoIncrement?: boolean;
  unique?: boolean;
  updateKey?: boolean;
  notInsertable?: boolean;
  notUpdatable?: boolean;
  defaultSql?: unknown;
  foreignKeyTable?: string;
  foreignKeyColumn?: string;
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

function dbtype<O extends object, T extends string>(
  schema: O,
  dbtype: T,
): O & DbType<T> {
  return Object.assign(schema, { dbtype: dbtype });
}

function params<O extends object, P extends Params>(
  schema: O,
  extra: R<P, Params>,
): O & P {
  return Object.assign(schema, extra);
}

// --- Database type functions

export function int64() {
  return dbtype(z.int(), "int64");
}

export function int32() {
  return dbtype(z.int32(), "int32");
}

export function float32() {
  return dbtype(z.number(), "float32");
}

export function float64() {
  return dbtype(z.number(), "float64");
}

export function bigint() {
  return dbtype(z.bigint(), "bigint");
}

export function decimal(precision: number, scale: number) {
  return params(dbtype(z.number(), "decimal"), {
    precision: precision,
    scale: scale,
  } as const);
}

export function uuid() {
  return dbtype(z.uuid(), "uuid");
}

export function string() {
  return dbtype(z.string(), "string");
}

export function varchar(maxLength: number) {
  return params(dbtype(z.string().max(maxLength), "varchar"), {
    maxLength: maxLength,
  } as const);
}

export function boolean() {
  return dbtype(z.boolean(), "boolean");
}

export function datetime() {
  return dbtype(z.date(), "datetime");
}

export function datepart() {
  return dbtype(z.iso.date(), "datepart");
}

export function timepart() {
  return dbtype(z.iso.time(), "timepart");
}

export function jsonb<T extends z.ZodType>(schema: T) {
  return dbtype(schema, "jsonb");
}

export function json<T extends z.ZodType>(schema: T) {
  return dbtype(schema, "json");
}

export function timestamptz<T extends z.ZodDate>(schema: T) {
  return dbtype(schema, "timestamptz");
}

export function timestamp<T extends z.ZodDate>(schema: T) {
  return dbtype(schema, "timestamp");
}

export function rowversion() {
  return params(dbtype(z.int32(), "rowversion"), {
    updateKey: true,
    notUpdatable: true,
    notInsertable: true,
  } as const);
}

// export function xmin() {
//   return params(dbtype(z.int32(), "xmin"), {
//     updateKey: true,
//     notUpdatable: true,
//     notInsertable: true,
//   } as const);
// }

// Zod extension functions

function pk<
  T extends
    | DbType<"int32">
    | DbType<"int64">
    | DbType<"bigint">
    | DbType<"uuid">
    | DbType<"string">
    | DbType<"varchar">,
>(this: T) {
  return params(this, { primaryKey: true } as const satisfies Params);
}

function pkAutoInc<
  T extends DbType<"int32"> | DbType<"int64"> | DbType<"bigint">,
>(this: T) {
  return params(this, {
    primaryKey: true,
    autoIncrement: true,
    notUpdatable: true,
    notInsertable: true,
  } as const satisfies Params);
}

function createdAt<
  T extends DbType<"datetime" | "timestamptz" | "timestamp">,
  P extends { auto: boolean },
>(this: T, opts: R<P, { auto: boolean }>) {
  return params(this, {
    createdAt: true,
    createdAtAuto: opts.auto,
  } as const satisfies Params);
}

function updatedAt<
  T extends DbType<"datetime" | "timestamptz" | "timestamp">,
  P extends { auto: boolean },
>(this: T, opts: R<P, { auto: boolean }>) {
  return params(this, {
    updatedAt: true,
    updatedAtAuto: opts.auto,
  } as const satisfies Params);
}

function foreignKey<
  T extends
    | DbType<"int32">
    | DbType<"int64">
    | DbType<"bigint">
    | DbType<"uuid">,
  R extends z.ZodObject<any>,
  C extends keyof R["shape"],
>(this: T, table: R, column: C) {
  return params(this, {
    foreignKeyTable: table as any,
    foreignKeyColumn: column as any,
  } as const satisfies Params);
}

function concurrencyStamp<T extends DbType<"uuid">>(this: T) {
  return params(this, {
    concurrencyStamp: true,
    updateKey: true,
    notUpdatable: true,
  } as const satisfies Params);
}

function navigateOne<T extends z.ZodObject | z.ZodOptional<z.ZodObject>>(
  this: T,
) {
  return params(this, { navigateOne: true } as const satisfies Params);
}

function navigateMany<
  T extends
    | z.ZodArray<z.ZodObject<any>>
    | z.ZodOptional<z.ZodArray<z.ZodObject<any>>>,
>(this: T) {
  return params(this, { navigateMany: true } as const satisfies Params);
}

declare module "zod" {
  interface ZodType {
    pk: typeof pk;
    pkAutoInc: typeof pkAutoInc;
    createdAt: typeof createdAt;
    updatedAt: typeof updatedAt;
    foreignKey: typeof foreignKey;
    concurrencyStamp: typeof concurrencyStamp;
    navigateOne: typeof navigateOne;
    navigateMany: typeof navigateMany;
  }
}

z.ZodType.prototype.pk = pk;
z.ZodType.prototype.pkAutoInc = pkAutoInc;
z.ZodType.prototype.createdAt = createdAt;
z.ZodType.prototype.updatedAt = updatedAt;
z.ZodType.prototype.foreignKey = foreignKey;
z.ZodType.prototype.concurrencyStamp = concurrencyStamp;
z.ZodType.prototype.navigateOne = navigateOne;
z.ZodType.prototype.navigateMany = navigateMany;

type UnwrapZod<T> =
  T extends z.ZodOptional<infer U>
    ? UnwrapZod<U>
    : T extends z.ZodDefault<infer U>
      ? UnwrapZod<U>
      : T extends z.ZodNullable<infer U>
        ? UnwrapZod<U>
        : T extends z.ZodCatch<infer U>
          ? UnwrapZod<U>
          : T;

export type InferDbFields<T extends z.ZodObject<any>> = {
  [K in keyof T["shape"] as UnwrapZod<T["shape"][K]> extends DbType<any>
    ? K
    : never]: T["shape"][K] extends z.ZodTypeAny ? T["shape"][K] : never;
};

export type InferFieldsWithParams<
  T extends z.ZodObject<any>,
  P extends Params,
> = {
  [K in keyof T["shape"] as UnwrapZod<T["shape"][K]> extends DbType<any> & P
    ? K
    : never]: T["shape"][K] extends z.ZodTypeAny ? T["shape"][K] : never;
};

export type InferPrimaryKeySchema<T extends z.ZodObject<any>> = z.ZodObject<
  InferFieldsWithParams<T, { primaryKey: true }>,
  z.core.$strict
>;

export type InferPatchSchema<T extends z.ZodObject<any>> = z.ZodObject<
  {
    [K in keyof T["shape"] as UnwrapZod<T["shape"][K]> extends DbType<any>
      ? T["shape"][K] extends { notUpdatable: true } & { updateKey: true }
        ? K
        : T["shape"][K] extends { notUpdatable: true }
          ? never
          : K
      : never]: T["shape"][K] extends
      | (DbType<any> & { primaryKey: true })
      | (DbType<any> & { updateKey: true })
      ? T["shape"][K]
      : T["shape"][K] extends z.ZodTypeAny
        ? z.ZodOptional<T["shape"][K]>
        : never;
  },
  z.core.$strict
>;

export type InferInsertSchema<T extends z.ZodObject<any>> = z.ZodObject<
  {
    [K in keyof T["shape"] as UnwrapZod<T["shape"][K]> extends DbType<any>
      ? UnwrapZod<T["shape"][K]> extends DbType<any> & { notInsertable: true }
        ? never
        : K
      : never]: T["shape"][K] extends z.ZodTypeAny ? T["shape"][K] : never;
  },
  z.core.$strict
>;

// export type InferPatchSchema<T extends z.ZodObject<any>> = InferFieldsWithParams<T, { primaryKey: true }> &

// Helpers to get schemas

function hasDbType(schema: z.ZodTypeAny): boolean {
  let current: any = schema;
  while (current) {
    if ("dbtype" in current && current.dbtype !== undefined) {
      return true;
    }
    if (current._def?.innerType) {
      current = current._def.innerType;
    } else {
      break;
    }
  }
  return false;
}

function getParam<P extends keyof Params>(
  schema: z.ZodTypeAny,
  param: P,
): Params[P] | undefined {
  let current: any = schema;
  while (current) {
    if (param in current && current[param] !== undefined) {
      return current[param] as Params[P];
    }
    if (current._def?.innerType) {
      current = current._def.innerType;
    } else {
      break;
    }
  }
  return undefined;
}

/**
 * Returns a Zod schema containing only the fields that are database columns (i.e. have DbType).
 *
 * @param schema
 * @returns
 */
export function getDbSchema<T extends z.ZodObject<any>>(
  schema: T,
): z.ZodObject<InferDbFields<T>, z.core.$strict> {
  const newShape: Record<string, z.ZodTypeAny> = {};
  for (const key in schema.shape) {
    const field = schema.shape[key] as z.ZodTypeAny;
    if (hasDbType(field)) {
      newShape[key] = field;
    }
  }
  return z.strictObject(newShape) as z.ZodObject<
    InferDbFields<T>,
    z.core.$strict
  >;
}
/**
 * Returns a Zod schema containing only the primary key fields.
 *
 * @param schema
 * @returns
 */
export function getPrimaryKeySchema<T extends z.ZodObject<any>>(
  schema: T,
): z.ZodObject<InferFieldsWithParams<T, { primaryKey: true }>, z.core.$strict> {
  const newShape: Record<string, z.ZodTypeAny> = {};
  for (const key in schema.shape) {
    const field = schema.shape[key] as z.ZodTypeAny;
    if (getParam(field, "primaryKey")) {
      newShape[key] = field;
    }
  }
  return z.strictObject(newShape) as z.ZodObject<
    InferFieldsWithParams<T, { primaryKey: true }>,
    z.core.$strict
  >;
}

/**
 * Returns a Zod schema for patching: all db fields except notUpdatable ones,
 * with fields optional except PK and updateKey which remain required.
 * @param schema
 * @returns
 */
export function getPatchSchema<T extends z.ZodObject<any>>(
  schema: T,
): InferPatchSchema<T> {
  const newShape: Record<string, z.ZodTypeAny> = {};
  for (const key in schema.shape) {
    const field = schema.shape[key] as z.ZodTypeAny;
    if (!hasDbType(field)) continue;
    if (getParam(field, "notUpdatable") && !getParam(field, "updateKey"))
      continue;
    const isRequired =
      getParam(field, "primaryKey") || getParam(field, "updateKey");
    newShape[key] = isRequired ? field : z.optional(field);
  }
  return z.strictObject(newShape) as InferPatchSchema<T>;
}

/**
 * Returns a Zod schema for inserting: all db fields except notInsertable.
 * @param schema
 * @returns
 */
export function getInsertSchema<T extends z.ZodObject<any>>(
  schema: T,
): InferInsertSchema<T> {
  const newShape: Record<string, z.ZodTypeAny> = {};
  for (const key in schema.shape) {
    const field = schema.shape[key] as z.ZodTypeAny;
    if (!hasDbType(field)) continue;
    if (getParam(field, "notInsertable")) continue;
    newShape[key] = field;
  }
  return z.strictObject(newShape) as InferInsertSchema<T>;
}
