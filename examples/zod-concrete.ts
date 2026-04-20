import { z } from "zod";

type DbType<S> = { dbtype: S };

type FinalType<T> = T extends infer U ? { [K in keyof U]: U[K] } : never;

export type Params<ExtraProps extends object = {}> = FinalType<
    Readonly<
        ExtraProps & {
            primaryKey?: boolean;
            autoIncrement?: boolean;
            unique?: boolean;
            updateKey?: boolean;
            notInsertable?: boolean;
            notUpdatable?: boolean;
            defaultSql?: unknown;
            foreignKeyTable?: string;
            foreignKeyColumn?: string;
        }
    >
>;

function dbtype<T extends object, U>(schema: T, dbtype: U): T & DbType<U> {
    return Object.assign(schema, { dbtype: dbtype });
}

function assignExt<T extends object, U, E>(schema: T, dbtype: U, extra: E): T & DbType<U> & E {
    return Object.assign(schema, { dbtype: dbtype, ...extra });
}

// --- Database type functions

export function int64(): z.ZodInt & DbType<"int64"> {
    return dbtype(z.int(), "int64");
}

export function int32(): z.ZodInt32 & DbType<"int32"> {
    return dbtype(z.int32(), "int32");
}

export function float32(): z.ZodNumber & DbType<"float32"> {
    return dbtype(z.number(), "float32");
}

export function float64(): z.ZodNumber & DbType<"float64"> {
    return dbtype(z.number(), "float64");
}

export function bigint(): z.ZodBigInt & DbType<"bigint"> {
    return dbtype(z.bigint(), "bigint");
}

export function decimal(precision: number, scale: number): z.ZodNumber & DbType<"decimal"> & { _precision: number; _scale: number } {
    return assignExt(z.number(), "decimal", { _precision: precision, _scale: scale });
}

export function uuid(): z.ZodUUID & DbType<"uuid"> {
    return dbtype(z.uuid(), "uuid");
}

export function string(): z.ZodString & DbType<"string"> {
    return dbtype(z.string(), "string");
}

export function varchar(maxLength: number): z.ZodString & DbType<"varchar"> & { _maxLength: number } {
    return assignExt(z.string().max(maxLength), "varchar", { _maxLength: maxLength });
}

export function boolean(): z.ZodBoolean & DbType<"boolean"> {
    return dbtype(z.boolean(), "boolean");
}

export function datetime(): z.ZodDate & DbType<"datetime"> {
    return dbtype(z.date(), "datetime");
}

export function datepart(): z.ZodISODate & DbType<"datepart"> {
    return dbtype(z.iso.date(), "datepart");
}

export function timepart(): z.ZodISOTime & DbType<"timepart"> {
    return dbtype(z.iso.time(), "timepart");
}

export function jsonb<T extends z.ZodType>(schema: T): T & DbType<"jsonb"> {
    return dbtype(schema, "jsonb");
}

export function json<T extends z.ZodType>(schema: T): T & DbType<"json"> {
    return dbtype(schema, "json");
}

export function timestamptz<T extends z.ZodDate>(schema: T): T & DbType<"timestamptz"> {
    return dbtype(schema, "timestamptz");
}

export function timestamp<T extends z.ZodDate>(schema: T): T & DbType<"timestamp"> {
    return dbtype(schema, "timestamp");
}

// Metadata functions

type Pk = <T extends DbType<"int32"> | DbType<"int64"> | DbType<"bigint"> | DbType<"uuid"> | DbType<"string"> | DbType<"varchar">>(this: T) => T & {
            pk: true;
        }

type PkAutoInc = <T extends DbType<"int32"> | DbType<"int64"> | DbType<"bigint">>(this: T) => T & {
            pk: true;
            autoInc: true;
        }

type CreatedAt = <T extends DbType<"datetime" | "timestamptz" | "timestamp">>(this: T) => T & { createdAt: true };

type UpdatedAt = <T extends DbType<"datetime" | "timestamptz" | "timestamp">>(this: T) => T & { updatedAt: true };

type ForeignKey = <T extends DbType<"int32"> | DbType<"int64"> | DbType<"bigint"> | DbType<"uuid">, R extends z.ZodObject<any>, C extends keyof R["shape"]>(this: T, table: R, column: C) => T & {
            foreignKey: true;
            table: R;
            column: C;
        }

type RowVersion = <T extends DbType<"int32"> | DbType<"int64"> | DbType<"bigint">>(this: T) => T & {
            rowversion: true;
        }

type ConcurrencyStamp = <T extends DbType<"string"> | DbType<"uuid">>(this: T) => T & {
            concurrencyStamp: true;
        }

type NavigateOne = <T extends z.ZodObject | z.ZodOptional<z.ZodObject>>(this: T) => T & {
            navigateOne: true;
        }

type NavigateMany = <T extends z.ZodArray<z.ZodObject<any>> | z.ZodOptional<z.ZodArray<z.ZodObject<any>>>>(this: T) => T & {
            navigateMany: true;
        }

declare module "zod" {
    interface ZodType {
        pk: Pk;
        pkAutoInc: PkAutoInc;
        createdAt: CreatedAt;
        updatedAt: UpdatedAt;
        foreignKey: ForeignKey;
        rowversion: RowVersion;
        concurrencyStamp: ConcurrencyStamp;
        navigateOne: NavigateOne;
        navigateMany: NavigateMany;
    }
}

z.ZodType.prototype.pk = function (this) {
    return Object.assign(this, { pk: true } as const);
} satisfies Pk;

z.ZodType.prototype.pkAutoInc = function (this) {
    return Object.assign(this, { pk: true, autoInc: true } as const);
} satisfies PkAutoInc;

z.ZodType.prototype.createdAt = function (this) {
    return Object.assign(this, { createdAt: true } as const);
} satisfies CreatedAt;

z.ZodType.prototype.updatedAt = function (this) {
    return Object.assign(this, { updatedAt: true } as const);
} satisfies UpdatedAt;

z.ZodType.prototype.foreignKey = function (table, column) {
    return Object.assign(this, { foreignKey: true, table, column } as const);
} satisfies ForeignKey;

z.ZodType.prototype.rowversion = function () {
    return Object.assign(this, { rowversion: true } as const);
} satisfies RowVersion;

z.ZodType.prototype.concurrencyStamp = function () {
    return Object.assign(this, { concurrencyStamp: true } as const);
} satisfies ConcurrencyStamp;

z.ZodType.prototype.navigateOne = function () {
    return Object.assign(this, { navigateOne: true } as const);
} satisfies NavigateOne;

z.ZodArray.prototype.navigateMany = function () {
    return Object.assign(this, { navigateMany: true } as const);
} satisfies NavigateMany;


type UnwrapZod<T> =
    T extends z.ZodOptional<infer U> ? UnwrapZod<U> :
    T extends z.ZodDefault<infer U> ? UnwrapZod<U> :
    T extends z.ZodNullable<infer U> ? UnwrapZod<U> :
    T extends z.ZodCatch<infer U> ? UnwrapZod<U> :
    T;

export type InferPrimaryKeySchema<T extends z.ZodObject<any>> = z.ZodObject<{
    [K in keyof T["shape"] as UnwrapZod<T["shape"][K]> extends { pk: true } ? K : never]: T["shape"][K] extends z.ZodTypeAny ? T["shape"][K] : never;
}>;

export type InferPatchSchema<T extends z.ZodObject<any>> = z.ZodObject<{
    [K in keyof T["shape"] as UnwrapZod<T["shape"][K]> extends DbType<any> ? K : never]: T["shape"][K] extends z.ZodTypeAny
        ? T["shape"][K] extends z.ZodOptional<any> ? T["shape"][K] : z.ZodOptional<T["shape"][K]>
        : never;
}>;

export type InferUpdateKeysSchema<T extends z.ZodObject<any>> = z.ZodObject<{
    [K in keyof T["shape"] as UnwrapZod<T["shape"][K]> extends { pk: true } | { concurrencyStamp: true } ? K : never]: T["shape"][K] extends z.ZodTypeAny ? T["shape"][K] : never;
}>;

