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
    | "autoIncrement"
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
    readonly __kysely__: k.ColumnType<
        v.InferOutput<Select>,
        v.InferOutput<Insert>,
        v.InferOutput<Update>
    >;
    readonly defaultValue?: v.InferOutput<Select>;

    // I wanted to use `& Kind extends "foreignKey" ? { foreignKeyTable: string;
    // foreignKeyColumn: string } : {}` But it made the hover types of tables
    // too complex to look at in the editor
    readonly foreignKeyTable?: Kind extends "foreignKey" ? string : never;
    readonly foreignKeyColumn?: Kind extends "foreignKey" ? string : never;
};

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

// export function navigation<T>(fn: () => T) {
//     return {
//         select: v.never(),
//         insert: v.never(),
//         update: v.never(),
//         // deno-lint-ignore no-explicit-any
//         __kysely__: null as any,
//         kind: "navigation",
//         navigationFn: fn,
//     };
// }

/**
 * Column with a same schema for selecting, inserting and updating
 *
 * @param schema
 * @returns
 */
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

export function col3<
    Select extends ValibotSchema,
    Insert extends ValibotSchema,
    Update extends ValibotSchema,
    Kind extends ColumnKind = ""
>(
    select: Select,
    insert: Insert,
    update: Update,
    kind: Kind = "" as Kind,
    props: Partial<ColumnType<Kind, Select, Insert, Update>>
): ColumnType<Kind, Select, Insert, Update> {
    return {
        select,
        insert,
        update,
        // deno-lint-ignore no-explicit-any
        __kysely__: null as any,
        kind,
        ...props,
    };
}

export function pkAutoInc(): ColumnType<
    "primaryKey",
    v.NumberSchema<undefined>,
    v.NeverSchema<undefined>,
    v.NeverSchema<undefined>
> {
    return {
        ...col3(v.number(), v.never(), v.never(), "", {}),
        kind: "primaryKey",
    };
}

export function pk<
    Select extends ValibotSchema,
    Insert extends ValibotSchema,
    Update extends ValibotSchema
>(
    column: ColumnType<"", Select, Insert, Update>
): ColumnType<"primaryKey", Select, Insert, Update> {
    return {
        ...column,
        kind: "primaryKey",
    };
}

export function rowVersion(): ColumnType<
    "rowVersion",
    v.NumberSchema<undefined>,
    v.NeverSchema<undefined>,
    v.NeverSchema<undefined>
> {
    /*
    TODO for SQLITE:
    CREATE TRIGGER update_row_version_on_update
    AFTER UPDATE ON your_table
    BEGIN
    UPDATE your_table SET row_version = row_version + 1 WHERE id = NEW.id;
    END;
    */

    return {
        ...col3(v.number(), v.never(), v.never(), "rowVersion", {}),
        defaultValue: 0,
    };
}

export function createdAt(): ColumnType<
    "createdAt",
    v.DateSchema<undefined>,
    v.NeverSchema<undefined>,
    v.NeverSchema<undefined>
> {
    return {
        ...col3(v.date(), v.never(), v.never(), "", {}),
        kind: "createdAt",
    };
}
export function updatedAt(): ColumnType<
    "updatedAt",
    v.DateSchema<undefined>,
    v.NeverSchema<undefined>,
    v.NeverSchema<undefined>
> {
    return {
        ...col3(v.date(), v.never(), v.never(), "", {}),
        kind: "updatedAt",
    };
}

export function foreignKey<
    TableName extends string,
    Columns extends RecordOfColumnTypes,
    K extends keyof Columns
>(
    table: Table<TableName, Columns>,
    column: K
): ColumnType<"foreignKey", Columns[K]["select"], Columns[K]["select"], Columns[K]["select"]> {
    // Foreign key points to a primary key of another table, primary keys are
    // not insertable or updateable, but foreignkey must be insertable and
    // updateable
    return {
        select: table.columns[column].select,
        insert: table.columns[column].select, // intended
        update: table.columns[column].select, // intended
        __kysely__: table.columns[column].__kysely__,
        kind: "foreignKey",
        foreignKeyTable: table.table,
        // deno-lint-ignore no-explicit-any
        foreignKeyColumn: column as any,
    };
}
export function foreignKeyUntyped<Select extends ValibotSchema>(
    column: ColumnType<"", Select>,
    foreignKeyTable: string,
    foreignKeyColumn: string
): ColumnType<"foreignKey", Select, Select, Select> {
    return {
        ...column,
        kind: "foreignKey",
        foreignKeyTable,
        foreignKeyColumn,
    };
}

export function table<TableName extends string, Columns extends RecordOfColumnTypes>(
    table: StringLiteral<TableName>,
    columns: Columns
): Table<TableName, Columns> {
    return {
        table,
        columns,
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

