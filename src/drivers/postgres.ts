import * as k from "kysely";
import * as s from "../simplevalidation.ts";
import type { OrmdriverColumnTypes } from "../helpers.ts";
import type { Params } from "../columns.ts";
import type { OrmerDbDriver } from "../database.ts";
import type { Table } from "../table.ts";
import { TransformerKyselyPlugin } from "../utils/transformerkyselyplugin.ts";
import { getDatabaseSerializers } from "../getters.ts";
import type { StandardSchemaV1 } from "@standard-schema/spec";

type UnknownSchema = StandardSchemaV1<unknown, unknown>;

const POSTGRES_COLUMNS = {
    // Primitive types
    int32(params) {
        return {
            datatype: params.autoIncrement ? "serial" : "integer",
            from: s.number,
            to: s.number,
        };
    },
    int64(params) {
        return {
            datatype: params.autoIncrement ? "bigserial" : "bigint",
            from: s.number,
            to: s.number,
        };
    },
    bigint() {
        return {
            datatype: "numeric",
            from: s.bigint,
            to: s.bigint,
        };
    },
    float32() {
        return {
            datatype: "real",
            from: s.number,
            to: s.number,
        };
    },
    float64() {
        return {
            datatype: "double precision",
            from: s.number,
            to: s.number,
        };
    },
    decimal(params) {
        return {
            datatype: `decimal(${params.precision}, ${params.scale})`,
            from: s.decimalFromJson,
            to: s.string,
        };
    },
    uuid() {
        return {
            datatype: "uuid",
            from: s.string,
            to: s.string,
        };
    },
    string() {
        return {
            datatype: "text",
            from: s.string,
            to: s.string,
        };
    },
    varchar(params) {
        return {
            datatype: `varchar(${params.maxLength})`,
            from: s.string,
            to: s.string,
        };
    },
    boolean() {
        return {
            datatype: "boolean",
            from: s.boolean,
            to: s.boolean,
        };
    },
    datetime(params) {
        return {
            datatype: params.postgres?.type ?? "timestamptz",
            from: s.datetime,
            to: s.datetime,
        };
    },
    datepart() {
        return {
            datatype: "date",
            from: s.datepartCoerced,
            to: s.string,
        };
    },
    timepart() {
        return {
            datatype: "time",
            from: s.string,
            to: s.string,
        };
    },
    jsonb<T extends UnknownSchema>(params: Params<{ schema: T }>) {
        return {
            from: params.schema,
            to: params.schema,
            datatype: "jsonb",
        };
    },
    json<T extends UnknownSchema>(params: Params<{ schema: T }>) {
        return {
            from: params.schema,
            to: params.schema,
            datatype: "json",
        };
    },
} satisfies OrmdriverColumnTypes;

export const ORMER_POSTGRES_DRIVER = {
    databaseType: "postgres" as const,
    columnTypeMap: POSTGRES_COLUMNS,

    createTablesAfterHook(db, tables) {
        return updatedAtTriggers(db, tables);
    },

    createTablesColumnHook(builder, column) {
        if (column.params.default === "now") {
            builder = builder.defaultTo(k.sql`current_timestamp`);
        } else if (column.params.default === "generate") {
            builder = builder.defaultTo(k.sql`gen_random_uuid()`);
        } else if (column.params.default !== undefined) {
            builder = builder.defaultTo(column.params.default);
        }
        return builder;
    },

    getKyselyPlugins(tables) {
        return [new TransformerKyselyPlugin(getDatabaseSerializers(tables, this.columnTypeMap))];
    },
} satisfies OrmerDbDriver<"postgres", typeof POSTGRES_COLUMNS>;

/**
 * Generate triggers for auto-updated timestamp columns
 *
 * @param db
 * @param tables
 */
function updatedAtTriggers(db: k.Kysely<unknown>, tables: Table[]) {
    const results = [] as k.CompiledQuery[];
    const updatedAtColumns = [] as [string, string][];
    for (const table of tables) {
        for (const [columnName, def] of Object.entries(table.columns)) {
            if (def.type === "datetime" && def.params.onUpdateSet) {
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
                    CREATE FUNCTION onupdate_set_timestamp_${k.sql.raw(
                        columnName
                    )}() RETURNS trigger
                        LANGUAGE plpgsql AS
                    $$BEGIN
                        -- Set only if the value has not changed
                        IF NEW.${k.sql.ref(columnName)} = OLD.${k.sql.ref(columnName)} THEN
                            NEW.${k.sql.ref(columnName)} := current_timestamp;
                        END IF;
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
                    CREATE TRIGGER ${k.sql.ref(tableName + "_" + columnName + "_update")}
                        BEFORE UPDATE ON ${k.sql.table(tableName)}
                    FOR EACH ROW
                    EXECUTE FUNCTION onupdate_set_timestamp_${k.sql.raw(columnName)}();
                `.compile(db)
            );
        }
    }
    return results;
}
