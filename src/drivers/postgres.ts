import * as k from "npm:kysely";
import * as v from "npm:valibot";
import type { OrmdriverColumnTypes } from "../helpers.ts";
import type { Params } from "../columns.ts";
import { OrmerDbDriver } from "../database.ts";

type ValibotSchema = v.BaseSchema<unknown, unknown, v.BaseIssue<unknown>>;

const POSTGRES_COLUMNS = {
    // Primitive types
    int32(params) {
        return {
            datatype: params.autoIncrement ? "serial" : "integer",
            from: v.number(),
            to: v.number(),
        };
    },
    int64(params) {
        return {
            datatype: params.autoIncrement ? "bigserial" : "bigint",
            from: v.number(),
            to: v.number(),
        };
    },
    bigint() {
        return {
            datatype: "numeric",
            from: v.bigint(),
            to: v.bigint(),
        };
    },
    float32() {
        return {
            datatype: "real",
            from: v.number(),
            to: v.number(),
        };
    },
    float64() {
        return {
            datatype: "double precision",
            from: v.number(),
            to: v.number(),
        };
    },
    decimal(params) {
        return {
            datatype: `decimal(${params.precision}, ${params.scale})`,
            from: v.union([
                v.string(),
                v.pipe(
                    v.number(),
                    v.transform((v) => "" + v)
                ),
            ]),
            to: v.string(),
        };
    },
    uuid() {
        return {
            datatype: "uuid",
            from: v.string(),
            to: v.string(),
        };
    },
    string() {
        return {
            datatype: "text",
            from: v.string(),
            to: v.string(),
        };
    },
    varchar(params) {
        return {
            datatype: `varchar(${params.maxLength})`,
            from: v.string(),
            to: v.string(),
        };
    },
    boolean() {
        return {
            datatype: "boolean",
            from: v.boolean(),
            to: v.boolean(),
        };
    },
    timestamp() {
        return {
            datatype: "timestamp",
            from: v.date(),
            to: v.date(),
        };
    },
    timestamptz() {
        return {
            datatype: "timestamptz",
            from: v.date(),
            to: v.date(),
        };
    },
    datepart() {
        return {
            datatype: "date",
            from: v.union([
                v.pipe(
                    v.date(),
                    v.transform((d) => d.toISOString().slice(0, 10))
                ),
                v.string(),
            ]),
            to: v.string(),
        };
    },
    timepart() {
        return {
            datatype: "time",
            from: v.string(),
            to: v.string(),
        };
    },
    jsonb<T extends ValibotSchema>(params: Params<{ schema: T }>) {
        return {
            from: params.schema,
            to: params.schema,
            datatype: "jsonb",
        };
    },
    json<T extends ValibotSchema>(params: Params<{ schema: T }>) {
        return {
            from: params.schema,
            to: params.schema,
            datatype: "json",
        };
    },
    // Helper types
    rowversion() {
        return {
            datatype: "bigint",
            from: v.number(),
            to: v.number(),
        };
    },
    concurrencyStamp() {
        return {
            datatype: "uuid",
            columnDefinition: (f) => f.defaultTo(k.sql`gen_random_uuid()`),
            from: v.string(),
            to: v.string(),
        };
    },
    userstring(params) {
        return {
            datatype: `varchar(${params.maxLength})`,
            from: v.string(),
            to: v.string(),
        };
    },
    email() {
        return {
            datatype: "varchar(320)",
            from: v.string(),
            to: v.string(),
        };
    },
    updatedAt() {
        return {
            datatype: "timestamptz",
            columnDefinition: (f) => f.defaultTo(k.sql`now()`),
            from: v.date(),
            to: v.date(),
        };
    },
    createdAt() {
        return {
            datatype: "timestamptz",
            columnDefinition: (f) => f.defaultTo(k.sql`now()`),
            from: v.date(),
            to: v.date(),
        };
    },
} satisfies OrmdriverColumnTypes;

export const POSTGRES_DRIVER = {
    databaseType: "postgres" as const,
    columnTypeMap: POSTGRES_COLUMNS,
    createTablesBeforeHook(db, tables) {
        const results = [] as k.CompiledQuery[];
        const updatedAtColumns = [] as [string, string][];
        for (const table of tables) {
            for (const [columnName, def] of Object.entries(table.columns)) {
                if (def.type === "updatedAt") {
                    updatedAtColumns.push([table.table, columnName]);
                }
            }
        }
        if (updatedAtColumns.length > 0) {
            // For all unique updatedAt column names, create function
            const uniqueColumnNames = new Set(updatedAtColumns.map(([, columnName]) => columnName));
            for (const columnName of uniqueColumnNames) {
                results.push(
                    k.sql`
                        CREATE FUNCTION ${columnName}_updater() RETURNS trigger
                            LANGUAGE plpgsql AS
                        $$BEGIN
                            NEW.${k.sql.ref(columnName)} := current_timestamp;
                            RETURN NEW;
                        END;$$;
                    `.compile(db)
                );
            }

            // Create the trigger for each table
            for (const [tableName, columnName] of updatedAtColumns) {
                results.push(
                    // Create the trigger
                    k.sql`
                        CREATE TRIGGER ${k.sql.ref(columnName + "_update")}
                            BEFORE UPDATE ON ${k.sql.ref(tableName)}
                        FOR EACH ROW
                        EXECUTE FUNCTION ${columnName}_updater();
                    `.compile(db)
                );
            }
        }
        return [];
    },
} satisfies OrmerDbDriver<"postgres", typeof POSTGRES_COLUMNS>;
