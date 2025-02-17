// deno-lint-ignore-file no-explicit-any
import * as v from "npm:valibot";
import * as k from "npm:kysely";

// This simplifies the type when hovering over a type
type FinalType<T> = T extends infer U ? { [K in keyof U]: U[K] } : never;

type StringLiteral<T> = T extends string ? (string extends T ? never : T) : never;

type ValibotSchema = v.BaseSchema<unknown, unknown, v.BaseIssue<unknown>>;

type MaybeValue = "yes" | "no" | "optional";

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
    Kind extends ColumnKind,
    Schema extends ValibotSchema,
    Insertable extends MaybeValue,
    Updateable extends MaybeValue
> = {
    readonly kind: Kind;
    readonly schema: Schema;
    readonly insertable: Insertable;
    readonly updateable: Updateable;
    readonly columnName?: string;
    readonly defaultValue?: v.InferOutput<Schema>;
    readonly autoIncrement?: true;

    // I wanted to use `& Kind extends "foreignKey" ? { foreignKeyTable: string;
    // foreignKeyColumn: string } : {}` But it made the hover types of tables
    // too complex to look at in the editor
    readonly foreignKeyTable?: Kind extends "foreignKey" ? string : never;
    readonly foreignKeyColumn?: Kind extends "foreignKey" ? string : never;
};

export function col<
    Schema extends ValibotSchema,
    Kind extends ColumnKind = "",
    Insertable extends MaybeValue = "yes",
    Updateable extends MaybeValue = "yes"
>(
    schema: Schema,
    opts?: {
        kind?: Kind;
        insertable?: Insertable;
        updateable?: Updateable;
        defaultValue?: v.InferOutput<Schema>;
        foreignKeyTable?: Kind extends "foreignKey" ? string : never;
        foreignKeyColumn?: Kind extends "foreignKey" ? string : never;
        autoIncrement?: true;
    }
): ColumnType<Kind, Schema, Insertable, Updateable> {
    const opts_ = opts || {};

    return {
        schema,
        kind: opts_.kind ?? ("" as Kind),
        insertable: opts_.insertable ?? ("yes" as Insertable),
        updateable: opts_.updateable ?? ("yes" as Updateable),
        defaultValue: opts_.defaultValue,
        foreignKeyTable: opts_.foreignKeyTable,
        foreignKeyColumn: opts_.foreignKeyColumn,
        autoIncrement: opts_.autoIncrement,
    };
}
type RecordOfColumnTypes = Record<string, ColumnType<any, any, any, any>>;

export interface Table<TableName extends string, Columns extends RecordOfColumnTypes> {
    table: StringLiteral<TableName>;
    columns: Columns;
}

type InferKyselyColumns<T extends Record<string, ColumnType<any, any, any, any>>> = {
    [K in keyof T]: k.ColumnType<
        v.InferOutput<T[K]["schema"]>,
        T[K]["insertable"] extends "yes"
            ? v.InferOutput<T[K]["schema"]>
            : T[K]["insertable"] extends "optional"
            ? v.InferOutput<T[K]["schema"]> | undefined
            : never,
        T[K]["updateable"] extends "yes"
            ? v.InferOutput<T[K]["schema"]>
            : T[K]["updateable"] extends "optional"
            ? v.InferOutput<T[K]["schema"]> | undefined
            : never
    >;
};

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
        [K in keyof Columns as Columns[K] extends ColumnType<"primaryKey", any, any, any>
            ? K
            : never]: Columns[K]["schema"];
    }>,
    undefined
> {
    return v.object(
        Object.keys(table.columns).reduce((acc, key) => {
            const c = table.columns[key];
            const s = c.schema;

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
            | ColumnType<"primaryKey", any, any, any>
            | ColumnType<"rowVersion", any, any, any>
            ? K
            : never]: Columns[K]["schema"];
    }>,
    undefined
> {
    return v.object(
        Object.keys(table.columns).reduce((acc, key) => {
            const c = table.columns[key];
            const s = c.schema;

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
                [K in keyof Columns]: Columns[K]["schema"];
            }
        >
    >,
    undefined
> {
    return v.object(
        Object.keys(table.columns).reduce((acc, key) => {
            const v = table.columns[key].schema;
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
    FinalType<{
        [K in keyof Columns as Columns[K] extends ColumnType<any, any, "no", any>
            ? never
            : K]: Columns[K]["schema"] extends v.NullableSchema<any, any>
            ? v.OptionalSchema<Columns[K]["schema"], undefined>
            : Columns[K]["schema"];
    }>,
    undefined
> {
    return v.object(
        Object.keys(table.columns).reduce((acc, key) => {
            if (table.columns[key].insertable === "no") {
                return acc;
            }
            // Wrap optional insertables in optional, these are most likely
            // columns with default values or nullable
            if (
                table.columns[key].insertable === "optional" &&
                table.columns[key].schema.type !== "optional"
            ) {
                acc[key] = v.optional(table.columns[key].schema);
            } else {
                acc[key] = table.columns[key].schema;
            }
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
    FinalType<{
        [K in keyof Columns as Columns[K] extends ColumnType<any, any, any, "no">
            ? never
            : K]: Columns[K]["schema"];
    }>,
    undefined
> {
    return v.object(
        Object.keys(table.columns).reduce((acc, key) => {
            if (table.columns[key].updateable === "no") {
                return acc;
            }

            acc[key] = table.columns[key].schema;
            return acc;
        }, {} as Record<string, ValibotSchema>)
    ) as any;
}

export function getPatchFieldsSchema<TableName extends string, Columns extends RecordOfColumnTypes>(
    table: Table<TableName, Columns>
): v.ObjectSchema<
    FinalType<{
        [K in keyof Columns as Columns[K] extends ColumnType<any, any, any, "no">
            ? never
            : K]: v.OptionalSchema<Columns[K]["schema"], undefined>;
    }>,
    undefined
> {
    return v.object(
        Object.keys(table.columns).reduce((acc, key) => {
            if (table.columns[key].updateable === "no") {
                return acc;
            }

            let schema = table.columns[key].schema;
            if (schema.type !== "optional") {
                schema = v.optional(schema);
            }
            acc[key] = schema;
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

// Field types ----------------------------------------------------------------

export function pk<
    Schema extends ValibotSchema,
    Insertable extends MaybeValue,
    Updateable extends MaybeValue
>(column: ColumnType<"", Schema, Insertable, Updateable>) {
    return col(column.schema, {
        ...column,
        kind: "primaryKey",
    });
}

export function nullable<
    Kind extends ColumnKind,
    Schema extends ValibotSchema,
    Insertable extends MaybeValue,
    Updateable extends MaybeValue
>(column: ColumnType<Kind, Schema, Insertable, Updateable>) {
    return col(v.nullable(column.schema), {
        ...column,
        insertable: "optional",
        defaultValue: null,
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
    const schema: Columns[K]["schema"] = table.columns[column].schema;
    return col(schema, {
        kind: "foreignKey",
        foreignKeyTable: table.table as string,
        foreignKeyColumn: column as string,
    });
}

export function foreignKeyUntyped<
    Schema extends ValibotSchema,
    Insertable extends MaybeValue,
    Updateable extends MaybeValue
>(
    column: ColumnType<"primaryKey" | "", Schema, Insertable, Updateable>,
    foreignKeyTable: string,
    foreignKeyColumn: string
) {
    return col(column.schema, {
        ...column,
        kind: "foreignKey",
        foreignKeyTable,
        foreignKeyColumn,
    });
}

export function pkAutoInc() {
    return col(v.pipe(v.number(), v.integer()), {
        kind: "primaryKey",
        insertable: "no",
        updateable: "no",
        autoIncrement: true,
    });
}

export function rowVersion() {
    return col(v.pipe(v.number(), v.integer()), {
        kind: "rowVersion",
        insertable: "no",
        updateable: "no",
        defaultValue: 0,
    });
}

export function createdAt() {
    return col(v.date(), {
        kind: "createdAt",
        insertable: "no",
        updateable: "no",
    });
}

export function updatedAt() {
    return col(v.date(), {
        kind: "updatedAt",
        insertable: "no",
        updateable: "no",
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

export function email() {
    return col(v.pipe(v.string(), v.email(), v.maxLength(320)));
}

export function json<const TEntries extends v.ObjectEntries>(entries: TEntries) {
    return col(v.object(entries));
}

export function array<const TItem extends v.BaseSchema<unknown, unknown, v.BaseIssue<unknown>>>(
    item: TItem
) {
    return col(v.array(item));
}
