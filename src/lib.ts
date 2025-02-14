import * as v from "npm:valibot";
import * as k from "npm:kysely";

// This simplifies the type when hovering over a type
type FinalType<T> = T extends infer U ? { [K in keyof U]: U[K] } : never;

type StringLiteral<T> = T extends string ? (string extends T ? never : T) : never;

type ValibotSchema = v.BaseSchema<unknown, unknown, v.BaseIssue<unknown>>;

// Omit properties of type T from object O,
//
// OmitProperties<string, { a: string, b: number }> => { b: number }
type OmitProperties<T, O> = { [K in keyof O as O[K] extends T ? never : K]: O[K] };

export type ColumnKind =
    | ""
    | "primaryKey"
    | "rowVersion"
    | "createdAt"
    | "updatedAt"
    | "foreignKey";

export type ColumnType<
    Kind extends ColumnKind = "",
    Select extends ValibotSchema = ValibotSchema,
    Insert extends ValibotSchema = Select,
    Update extends ValibotSchema = Insert
> = {
    readonly kind: Kind;
    readonly insert: Insert;
    readonly select: Select;
    readonly update: Update;
    readonly columnName?: string;
    readonly defaultValue?: v.InferOutput<Select>;
    readonly autoIncrement?: true;

    // I wanted to use `& Kind extends "foreignKey" ? { foreignKeyTable: string;
    // foreignKeyColumn: string } : {}` But it made the hover types of tables
    // too complex to look at in the editor
    readonly foreignKeyTable?: Kind extends "foreignKey" ? string : never;
    readonly foreignKeyColumn?: Kind extends "foreignKey" ? string : never;
    readonly __kysely__: k.ColumnType<
        v.InferOutput<Select>,
        v.InferOutput<Insert>,
        v.InferOutput<Update>
    >;
};

export function colopt<
    Kind extends ColumnKind = "",
    Select extends ValibotSchema = ValibotSchema,
    Insert extends ValibotSchema = Select,
    Update extends ValibotSchema = Insert
>(
    kind: Kind = "" as Kind,
    opts: {
        select: Select;
        insert: Insert;
        update: Update;
        defaultValue?: v.InferOutput<Select>;
        foreignKeyTable?: Kind extends "foreignKey" ? string : never;
        foreignKeyColumn?: Kind extends "foreignKey" ? string : never;
        autoIncrement?: true;
    }
): ColumnType<Kind, Select, Insert, Update> {
    return {
        kind,
        select: opts.select,
        insert: opts.insert,
        update: opts.update,
        defaultValue: opts.defaultValue,
        foreignKeyTable: opts.foreignKeyTable,
        foreignKeyColumn: opts.foreignKeyColumn,
        autoIncrement: opts.autoIncrement,
        // deno-lint-ignore no-explicit-any
        __kysely__: null as any,
    };
}

export function col<Schema extends ValibotSchema>(schema: Schema): ColumnType<"", Schema> {
    return {
        select: schema,
        insert: schema,
        update: schema,
        // deno-lint-ignore no-explicit-any
        __kysely__: null as any,
        kind: "",
    };
}

type RecordOfColumnTypes = Record<string, ColumnType<any>>;

export interface Table<TableName extends string, Columns extends RecordOfColumnTypes> {
    table: StringLiteral<TableName>;
    columns: Columns;
}

type InferKyselyColumns<T extends Record<string, ColumnType>> = {
    [K in keyof T]: T[K]["__kysely__"];
};

// deno-lint-ignore no-explicit-any
export type InferKyselyTable<T extends Table<any, RecordOfColumnTypes>> = {
    [K in T["table"]]: FinalType<InferKyselyColumns<T["columns"]>>;
};

export function table<TableName extends string, Columns extends RecordOfColumnTypes>(
    table: StringLiteral<TableName>,
    columns: Columns
): Table<TableName, Columns> {
    // Assign column names
    const new_columns = Object.entries(columns).reduce((acc, [key, column]) => {
        acc[key] = {
            ...column,
            columnName: key,
        };
        return acc;
    }, {} as any);

    return {
        table,
        columns: new_columns,
    };
}

export function getPrimaryKeySchema<TableName extends string, Columns extends RecordOfColumnTypes>(
    table: Table<TableName, Columns>
): v.ObjectSchema<
    FinalType<{
        [K in keyof Columns as Columns[K] extends ColumnType<"primaryKey">
            ? K
            : never]: Columns[K]["select"];
    }>,
    undefined
> {
    return v.object(
        Object.keys(table.columns).reduce((acc, key) => {
            const c = table.columns[key];
            const s = c.select;

            // Only primary keys
            if (c.kind !== "primaryKey") {
                return acc;
            }

            acc[key] = s;
            return acc;
        }, {} as Record<string, ValibotSchema>)
    ) as any;
}

export function getUpdateKeySchema<TableName extends string, Columns extends RecordOfColumnTypes>(
    table: Table<TableName, Columns>
): v.ObjectSchema<
    FinalType<{
        [K in keyof Columns as Columns[K] extends
            | ColumnType<"primaryKey">
            | ColumnType<"rowVersion">
            ? K
            : never]: Columns[K]["select"];
    }>,
    undefined
> {
    return v.object(
        Object.keys(table.columns).reduce((acc, key) => {
            const c = table.columns[key];
            const s = c.select;

            // Only primary keys and row versions can be used as update keys
            if (c.kind !== "primaryKey" && c.kind !== "rowVersion") {
                return acc;
            }

            acc[key] = s;
            return acc;
        }, {} as Record<string, ValibotSchema>)
    ) as any;
}

export function getSelectSchema<TableName extends string, Columns extends RecordOfColumnTypes>(
    table: Table<TableName, Columns>
): v.ObjectSchema<
    FinalType<
        OmitProperties<
            | v.NeverSchema<undefined>
            | v.UndefinedSchema<undefined>
            | v.OptionalSchema<v.NeverSchema<undefined>, undefined>,
            {
                [K in keyof Columns]: Columns[K]["select"];
            }
        >
    >,
    undefined
> {
    return v.object(
        Object.keys(table.columns).reduce((acc, key) => {
            const v = table.columns[key].select;
            // Remove never and empty validators
            if (
                v.expects === "never" ||
                v.expects === "undefined" ||
                v.expects === "(never | undefined)"
            ) {
                return acc;
            }
            acc[key] = v;
            return acc;
        }, {} as Record<string, ValibotSchema>)
    ) as any;
}

export function getInsertSchema<TableName extends string, Columns extends RecordOfColumnTypes>(
    table: Table<TableName, Columns>
): v.ObjectSchema<
    FinalType<
        OmitProperties<
            | v.NeverSchema<undefined>
            | v.UndefinedSchema<undefined>
            | v.OptionalSchema<v.NeverSchema<undefined>, undefined>,
            {
                [K in keyof Columns]: Columns[K]["insert"];
            }
        >
    >,
    undefined
> {
    return v.object(
        Object.keys(table.columns).reduce((acc, key) => {
            const v = table.columns[key].insert;
            // Remove never and empty validators
            if (
                v.expects === "never" ||
                v.expects === "undefined" ||
                v.expects === "(never | undefined)"
            ) {
                return acc;
            }
            acc[key] = v;
            return acc;
        }, {} as Record<string, ValibotSchema>)
    ) as any;
}

export function getUpdateFieldsSchema<
    TableName extends string,
    Columns extends RecordOfColumnTypes
>(
    table: Table<TableName, Columns>
): v.ObjectSchema<
    FinalType<
        OmitProperties<
            | v.NeverSchema<undefined>
            | v.UndefinedSchema<undefined>
            | v.OptionalSchema<v.NeverSchema<undefined>, undefined>,
            {
                [K in keyof Columns]: Columns[K]["update"];
            }
        >
    >,
    undefined
> {
    return v.object(
        Object.keys(table.columns).reduce((acc, key) => {
            const v = table.columns[key].update;
            // Remove never and empty validators
            if (
                v.expects === "never" ||
                v.expects === "undefined" ||
                v.expects === "(never | undefined)"
            ) {
                return acc;
            }
            acc[key] = v;
            return acc;
        }, {} as Record<string, ValibotSchema>)
    ) as any;
}

export function getPatchFieldsSchema<TableName extends string, Columns extends RecordOfColumnTypes>(
    table: Table<TableName, Columns>
): v.ObjectSchema<
    FinalType<
        OmitProperties<
            | v.NeverSchema<undefined>
            | v.UndefinedSchema<undefined>
            | v.OptionalSchema<v.NeverSchema<undefined>, undefined>,
            {
                [K in keyof Columns]: Columns[K]["update"] extends v.OptionalSchema<
                    ValibotSchema,
                    unknown
                >
                    ? Columns[K]["update"]
                    : v.OptionalSchema<Columns[K]["update"], undefined>;
            }
        >
    >,
    undefined
> {
    return v.object(
        Object.keys(table.columns).reduce((acc, key) => {
            let s = table.columns[key].update;
            if (s.type !== "optional") {
                s = v.optional(s);
            }
            // Remove never and empty validators
            if (
                s.expects === "never" ||
                s.expects === "undefined" ||
                s.expects === "(never | undefined)"
            ) {
                return acc;
            }
            acc[key] = s;
            return acc;
        }, {} as Record<string, ValibotSchema>)
    ) as any;
}

export function createDbFactory<T extends readonly Table<any, RecordOfColumnTypes>[]>(
    ...tables: T
): {
    // tables: T,
    tables: {
        [K in T[number]["table"]]: Extract<T[number], Table<K, RecordOfColumnTypes>>;
    };
    createKyselyDb(args: k.KyselyConfig): k.Kysely<{
        [K in T[number]["table"]]: FinalType<
            InferKyselyColumns<Extract<T[number], Table<K, RecordOfColumnTypes>>["columns"]>
        >;
    }>;
} {
    return {
        tables: tables.reduce((acc, table) => {
            acc[table.table] = table;
            return acc;
        }, {} as any),
        createKyselyDb(args: k.KyselyConfig) {
            return new k.Kysely(args);
        },
    };
}

export function pk<
    Select extends ValibotSchema,
    Insert extends ValibotSchema,
    Update extends ValibotSchema
>(column: ColumnType<"", Select, Insert, Update>) {
    return colopt("primaryKey", {
        ...column,
    });
}

export function nullable<
    Kind extends ColumnKind,
    Select extends ValibotSchema,
    Insert extends ValibotSchema,
    Update extends ValibotSchema
>(column: ColumnType<Kind, Select, Insert, Update>) {
    return colopt(column.kind, {
        ...column,
        select: v.nullable(column.select),
        insert: v.optional(v.nullable(column.insert)),
        update: v.optional(v.nullable(column.update)),
    });
}

export function foreignKey<
    TableName extends string,
    Columns extends RecordOfColumnTypes,
    K extends keyof Columns
>(table: Table<TableName, Columns>, column: K) {
    // Foreign key points to a primary key of another table, primary keys are
    // not insertable or updateable, but foreignkey must be insertable and
    // updateable
    return colopt("foreignKey", {
        select: table.columns[column].select,
        insert: table.columns[column].select, // intended
        update: table.columns[column].select, // intended
        foreignKeyTable: table.table,
        foreignKeyColumn: column as string,
    });
}

export function foreignKeyUntyped<
    Select extends ValibotSchema = ValibotSchema,
    Insert extends ValibotSchema = Select,
    Update extends ValibotSchema = Insert
>(
    column: ColumnType<"", Select, Insert, Update>,
    foreignKeyTable: string,
    foreignKeyColumn: string
) {
    return colopt("foreignKey", {
        select: column.select,
        insert: column.select,
        update: column.select,
        foreignKeyTable,
        foreignKeyColumn,
    });
}

export function pkAutoInc() {
    return colopt("primaryKey", {
        select: v.pipe(v.number(), v.integer()),
        insert: v.never(),
        update: v.never(),
        autoIncrement: true,
    });
}

export function rowVersion() {
    return colopt("rowVersion", {
        select: v.pipe(v.number(), v.integer()),
        insert: v.never(),
        update: v.never(),
        defaultValue: 0,
    });
}

export function createdAt() {
    return colopt("createdAt", {
        select: v.date(),
        insert: v.never(),
        update: v.never(),
    });
}

export function updatedAt() {
    return colopt("updatedAt", {
        select: v.date(),
        insert: v.never(),
        update: v.never(),
    });
}

export function uuid() {
    // TODO: UUID implies indexing
    return col(v.pipe(v.string(), v.uuid()));
}

export function datetime() {
    return col(v.date());
}

export function string() {
    return col(v.pipe(v.string(), v.trim()));
}

export function varchar(length: number) {
    return col(v.pipe(v.string(), v.trim(), v.maxLength(length)));
}

export function float() {
    return col(v.number());
}

export function integer() {
    return col(v.pipe(v.number(), v.integer()));
}

export function decimal() {
    return col(v.pipe(v.string(), v.decimal()));
}

export function bigint() {
    return col(v.bigint());
}

export function json<const TEntries extends v.ObjectEntries>(entries: TEntries) {
    return col(v.object(entries));
}

export function array<const TItem extends v.BaseSchema<unknown, unknown, v.BaseIssue<unknown>>>(
    item: TItem
) {
    return col(v.array(item));
}
