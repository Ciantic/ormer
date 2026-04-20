import { z } from "zod";

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
    updatedAt?: boolean;
    rowVersion?: boolean;
    concurrencyStamp?: boolean;
    navigateOne?: boolean;
    navigateMany?: boolean;
}

function dbtype<O extends object, T extends string>(schema: O, dbtype: T): O & DbType<T> {
    return Object.assign(schema, { dbtype: dbtype });
}

function params<O extends object, P extends Params>(schema: O, extra: R<P, Params>): O & P {
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
    return params(dbtype(z.number(), "decimal"), { precision: precision, scale: scale } as const);
}

export function uuid() {
    return dbtype(z.uuid(), "uuid");
}

export function string() {
    return dbtype(z.string(), "string");
}

export function varchar(maxLength: number) {
    return params(dbtype(z.string().max(maxLength), "varchar"), { maxLength: maxLength } as const);
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

// Zod extension functions

function pk<T extends DbType<"int32"> | DbType<"int64"> | DbType<"bigint"> | DbType<"uuid"> | DbType<"string"> | DbType<"varchar">>(this: T) {
    return params(this, { primaryKey: true } as const);
}

function pkAutoInc<T extends DbType<"int32"> | DbType<"int64"> | DbType<"bigint">>(this: T) {
    return params(this, { primaryKey: true, autoIncrement: true, notUpdatable: true } as const);
}

function createdAt<T extends DbType<"datetime" | "timestamptz" | "timestamp">>(this: T) {
    return params(this, { createdAt: true } as const);
}

function updatedAt<T extends DbType<"datetime" | "timestamptz" | "timestamp">>(this: T) {
    return params(this, { updatedAt: true } as const);
}

function foreignKey<T extends DbType<"int32"> | DbType<"int64"> | DbType<"bigint"> | DbType<"uuid">, R extends z.ZodObject<any>, C extends keyof R["shape"]>(this: T, table: R, column: C) {
    return params(this, { foreignKeyTable: table as any, foreignKeyColumn: column as any } as const);
}

function rowVersion<T extends DbType<"int32"> | DbType<"int64"> | DbType<"bigint">>(this: T) {
    return params(this, { rowVersion: true } as const);
}

function concurrencyStamp<T extends DbType<"string"> | DbType<"uuid">>(this: T) {
    return params(this, { concurrencyStamp: true } as const);
}

function navigateOne<T extends z.ZodObject | z.ZodOptional<z.ZodObject>>(this: T) {
    return params(this, { navigateOne: true } as const);
}

function navigateMany<T extends z.ZodArray<z.ZodObject<any>> | z.ZodOptional<z.ZodArray<z.ZodObject<any>>>>(this: T) {
    return params(this, { navigateMany: true } as const);
}

declare module "zod" {
    interface ZodType {
        pk: typeof pk;
        pkAutoInc: typeof pkAutoInc;
        createdAt: typeof createdAt;
        updatedAt: typeof updatedAt;
        foreignKey: typeof foreignKey;
        rowversion: typeof rowVersion;
        concurrencyStamp: typeof concurrencyStamp;
        navigateOne: typeof navigateOne;
        navigateMany: typeof navigateMany;
    }
}

z.ZodType.prototype.pk = pk;
z.ZodType.prototype.pkAutoInc = pkAutoInc
z.ZodType.prototype.createdAt = createdAt;
z.ZodType.prototype.updatedAt = updatedAt;
z.ZodType.prototype.foreignKey = foreignKey;
z.ZodType.prototype.rowVersion = rowVersion;
z.ZodType.prototype.concurrencyStamp = concurrencyStamp;
z.ZodType.prototype.navigateOne = navigateOne;
z.ZodArray.prototype.navigateMany = navigateMany;


type UnwrapZod<T> =
    T extends z.ZodOptional<infer U> ? UnwrapZod<U> :
    T extends z.ZodDefault<infer U> ? UnwrapZod<U> :
    T extends z.ZodNullable<infer U> ? UnwrapZod<U> :
    T extends z.ZodCatch<infer U> ? UnwrapZod<U> :
    T;

export type InferPrimaryKeySchema<T extends z.ZodObject<any>> = z.ZodObject<{
    [K in keyof T["shape"] as UnwrapZod<T["shape"][K]> extends { primaryKey: true } ? K : never]: T["shape"][K] extends z.ZodTypeAny ? T["shape"][K] : never;
}>;

export type InferPatchSchema<T extends z.ZodObject<any>> = z.ZodObject<{
    [K in keyof T["shape"] as UnwrapZod<T["shape"][K]> extends DbType<any> ? K : never]: T["shape"][K] extends z.ZodTypeAny
        ? T["shape"][K] extends z.ZodOptional<any> ? T["shape"][K] : z.ZodOptional<T["shape"][K]>
        : never;
}>;

export type InferUpdateKeysSchema<T extends z.ZodObject<any>> = z.ZodObject<{
    [K in keyof T["shape"] as UnwrapZod<T["shape"][K]> extends { pk: true } | { concurrencyStamp: true } ? K : never]: T["shape"][K] extends z.ZodTypeAny ? T["shape"][K] : never;
}>;

