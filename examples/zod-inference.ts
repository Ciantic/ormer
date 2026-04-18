import { z } from "zod";


type Ext<S> = { _ext: S };
type Ext2<S, T> = { _ext: S, _ext2: T };

// Type augmentation
declare module "zod" {
    interface ZodType {
        int64<T extends z.ZodInt>(this: T): T & Ext<"int64">;
        int32<T extends z.ZodInt32>(this: T): T & Ext<"int32">;
        float32<T extends z.ZodNumber>(this: T): T & Ext<"float32">;
        float64<T extends z.ZodNumber>(this: T): T & Ext<"float64">;
        pk<T extends z.ZodUUID>(this: T): T & Ext<"pk">;
        pk<T extends z.ZodString>(this: T): T & Ext<"pk">;
        pkAutoInc<T extends z.ZodInt>(this: T): T & Ext<"pkAutoInc">;
        rowversion<T extends z.ZodInt>(this: T): T & Ext<"rowversion">;
        concurrencyStamp<T extends z.ZodString>(this: T): T & Ext<"concurrencyStamp">;
        forwardRef<T extends z.ZodObject, S extends string>(this: T, fieldName: S): T & Ext2<"forwardRef", S>;
    }
}
z.ZodType.prototype.int64 = function(this: z.ZodType & Ext<any>) {
    this._ext = "int64";
    return this;
}
z.ZodType.prototype.int32 = function(this: z.ZodType & Ext<any>) {
    this._ext = "int32";
    return this;
}
z.ZodType.prototype.float32 = function(this: z.ZodType & Ext<any>) {
    this._ext = "float32";
    return this;
}
z.ZodType.prototype.float64 = function(this: z.ZodType & Ext<any>) {
    this._ext = "float64";
    return this;
}
z.ZodType.prototype.pk = function(this: z.ZodType & Ext<any>) {
    this._ext = "pk";
    return this;
}
z.ZodType.prototype.pkAutoInc = function(this: z.ZodType & Ext<any>) {
    this._ext = "pkAutoInc";
    return this;
}
z.ZodType.prototype.rowversion = function(this: z.ZodType & Ext<any>) {
    this._ext = "rowversion";
    return this;
}
z.ZodType.prototype.concurrencyStamp = function(this: z.ZodType & Ext<any>) {
    this._ext = "concurrencyStamp";
    return this;
}
z.ZodType.prototype.forwardRef = function<T extends z.ZodObject, S extends string>(this: z.ZodType & Ext<any>, fieldName: S) {
    (this as z.ZodType & Ext2<any, any>)._ext = ["forwardRef", fieldName];
    return this as z.ZodType & Ext2<"forwardRef", S>;
}

// Testing the inference

const InvoiceSchema = z.object({
    id: z.int().pkAutoInc(),
    title: z.string(),
    describetion: z.string(),
    due_date: z.date(),
    rowversion: z.int().rowversion(),
    concurrencyStamp: z.string().concurrencyStamp(),
    created_at: z.date(),
    updated_at: z.date(),    
});

const InvoiceRowSchema = z.object({
    id: z.int().pkAutoInc(),
    title: z.string().optional(),
    price: z.number().optional(),
    tax_percentage: z.number().optional(),
    quantity: z.number().optional(),
    invoiceId: z.int().pkAutoInc().optional(),
    invoice: InvoiceSchema.forwardRef("invoiceId").optional(),
    concurrencyStamp: z.string().concurrencyStamp(),    
});

const PersonSchema = z.object({
    id: z.int().pkAutoInc(),
    first_name: z.string(),
    last_name: z.string(),
    email: z.string(),
    supervisorId: z.int().pkAutoInc().optional(),
    get supervisor() {
        return PersonSchema.forwardRef("supervisorId").optional();
    },
    created_at: z.date(),
    updated_at: z.date(),    
});

type Invoice = z.input<typeof InvoiceSchema>;
type InvoiceRow = z.input<typeof InvoiceRowSchema>;
type Person = z.input<typeof PersonSchema>;