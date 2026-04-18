import { z } from "zod";


type DbType<S> = { _dbtype: S };
type Fk<R extends z.ZodObject<any>, C extends keyof R["shape"]> = { _dbtype: "foreignKey", _table: R, _column: C };


// Type augmentation
declare module "zod" {
    interface ZodType {
        int64<T extends z.ZodInt>(this: T): T & DbType<"int64">;
        int32<T extends z.ZodInt32>(this: T): T & DbType<"int32">;
        float32<T extends z.ZodNumber>(this: T): T & DbType<"float32">;
        float64<T extends z.ZodNumber>(this: T): T & DbType<"float64">;
        pk<T extends z.ZodUUID>(this: T): T & DbType<"pk">;
        pk<T extends z.ZodString>(this: T): T & DbType<"pk">;
        pkAutoInc<T extends z.ZodInt>(this: T): T & DbType<"pkAutoInc">;
        foreignKey<T extends z.ZodUUID, R extends z.ZodObject<any>, C extends keyof R["shape"]>(this: T, table: R, column: C): T & Fk<R, C>;
        foreignKey<T extends z.ZodString, R extends z.ZodObject<any>, C extends keyof R["shape"]>(this: T, table: R, column: C): T & Fk<R, C>;
        foreignKey<T extends z.ZodInt, R extends z.ZodObject<any>, C extends keyof R["shape"]>(this: T, table: R, column: C): T & Fk<R, C>;
        rowversion<T extends z.ZodInt>(this: T): T & DbType<"rowversion">;
        concurrencyStamp<T extends z.ZodString>(this: T): T & DbType<"concurrencyStamp">;
        timestamptz<T extends z.ZodDate>(this: T): T & DbType<"timestamptz">;
        timestamp<T extends z.ZodDate>(this: T): T & DbType<"timestamp">;
        dateOnly<T extends z.ZodISODate>(this: T): T & DbType<"dateOnly">;
        timeOnly<T extends z.ZodISOTime>(this: T): T & DbType<"timeOnly">;

        /**
         * Reference field (isn't part of database schema)
         * @param this 
         */
        ref<T extends z.ZodObject>(this: T): T & DbType<"ref">;
    }
}
z.ZodType.prototype.int64 = function(this: z.ZodType & DbType<any>) {
    this._dbtype = "int64";
    return this;
}
z.ZodType.prototype.int32 = function(this: z.ZodType & DbType<any>) {
    this._dbtype = "int32";
    return this;
}
z.ZodType.prototype.float32 = function(this: z.ZodType & DbType<any>) {
    this._dbtype = "float32";
    return this;
}
z.ZodType.prototype.float64 = function(this: z.ZodType & DbType<any>) {
    this._dbtype = "float64";
    return this;
}
z.ZodType.prototype.pk = function(this: z.ZodType & DbType<any>) {
    this._dbtype = "pk";
    return this;
}
z.ZodType.prototype.pkAutoInc = function(this: z.ZodType & DbType<any>) {
    this._dbtype = "pkAutoInc";
    return this;
}
z.ZodType.prototype.rowversion = function(this: z.ZodType & DbType<any>) {
    this._dbtype = "rowversion";
    return this;
}
z.ZodType.prototype.concurrencyStamp = function(this: z.ZodType & DbType<any>) {
    this._dbtype = "concurrencyStamp";
    return this;
}
z.ZodType.prototype.foreignKey = function<T extends z.ZodType, R extends z.ZodObject<any>, C extends keyof R["shape"]>(this: T & Fk<R, C>, table: R, column: C) {
    this._dbtype = "foreignKey";
    this._table = table;
    this._column = column;
    return this as any;
}
z.ZodType.prototype.ref = function<T extends z.ZodObject>(this: T & DbType<any>) {
    this._dbtype = "ref";
    return this;
}

// Testing the inference

const InvoiceSchema = z.object({
    id: z.int().pkAutoInc(),
    title: z.string(),
    description: z.string(),
    dueDate: z.date(),
    rowversion: z.int().rowversion(),
    concurrencyStamp: z.string().concurrencyStamp(),
    createdAt: z.date(),
    updatedAt: z.date(),    
});

const InvoiceRowSchema = z.object({
    id: z.int().pkAutoInc(),
    title: z.string().optional(),
    price: z.number().optional(),
    taxPercentage: z.number().optional(),
    quantity: z.number().optional(),
    invoiceId: z.int().foreignKey(InvoiceSchema, "id").optional(),
    invoice: InvoiceSchema.ref().optional(),
    concurrencyStamp: z.string().concurrencyStamp(),    
});

const PersonSchema = z.object({
    id: z.int().pkAutoInc(),
    firstName: z.string(),
    lastName: z.string(),
    email: z.string(),
    get supervisorId() {
        return z.int().foreignKey(PersonSchema, "id").optional();
    },
    get supervisor() {
        return PersonSchema.ref().optional();
    },
    createdAt: z.date(),
    updatedAt: z.date(),    
});

type Invoice = z.input<typeof InvoiceSchema>;
type InvoiceRow = z.input<typeof InvoiceRowSchema>;
type Person = z.input<typeof PersonSchema>;
