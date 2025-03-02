import * as k from "npm:kysely";
import * as v from "npm:valibot";
import type { MapColumnsToGenerators, TransformSchemas } from "../helpers.ts";
import type { ColumnType, Params } from "../columns.ts";
import { Table } from "../table.ts";
import { OrmerDbDriver } from "../database.ts";

type ValibotSchema = v.BaseSchema<unknown, unknown, v.BaseIssue<unknown>>;

const POSTGRES_COLUMNS = {
    // Primitive types
    int32(params) {
        if (params.autoIncrement) {
            return {
                datatype: "serial",
            };
        }
        return {
            datatype: "integer",
        };
    },
    int64(params) {
        if (params.autoIncrement) {
            return {
                datatype: "bigserial",
            };
        }
        return {
            datatype: "bigint",
        };
    },
    bigint() {
        return {
            datatype: "numeric",
        };
    },
    float32() {
        return {
            datatype: "real",
        };
    },
    float64() {
        return {
            datatype: "double precision",
        };
    },
    decimal(params) {
        return {
            datatype: `decimal(${params.precision}, ${params.scale})`,
        };
    },
    uuid() {
        return {
            datatype: "uuid",
        };
    },
    string() {
        return {
            datatype: "text",
        };
    },
    varchar(params) {
        return {
            datatype: `varchar(${params.maxLength})`,
        };
    },
    boolean() {
        return {
            datatype: "boolean",
        };
    },
    timestamp() {
        return {
            datatype: "timestamp",
        };
    },
    timestamptz() {
        return {
            datatype: "timestamptz",
        };
    },
    datepart() {
        return {
            datatype: "date",
        };
    },
    timepart() {
        return {
            datatype: "time",
        };
    },
    jsonb() {
        return {
            datatype: "jsonb",
        };
    },
    json() {
        return {
            datatype: "json",
        };
    },
    // Helper types
    rowversion() {
        return {
            datatype: "bigint",
        };
    },
    concurrencyStamp() {
        return {
            datatype: "uuid",
            columnDefinition: (f) => f.defaultTo(k.sql`gen_random_uuid()`),
        };
    },
    userstring(params) {
        return {
            datatype: `varchar(${params.maxLength})`,
        };
    },
    email() {
        return {
            datatype: "varchar(320)",
        };
    },
    updatedAt(params) {
        return {
            datatype: "timestamptz",
            columnDefinition: (f) => f.defaultTo(k.sql`now()`),
            extraSql: (db) => {
                return [
                    k.sql`
                        CREATE FUNCTION upd_trig() RETURNS trigger
                            LANGUAGE plpgsql AS
                        $$BEGIN
                            NEW.${k.sql.ref(params.columnName)} := current_timestamp;
                            RETURN NEW;
                        END;$$;
                    `.compile(db),
                    k.sql`
                        CREATE TRIGGER ${k.sql.ref(params.columnName + "_update")}
                            BEFORE UPDATE ON ${k.sql.ref(params.tableName)}
                        FOR EACH ROW
                        EXECUTE FUNCTION upd_trig();
                    `.compile(db),
                ];
            },
        };
    },
    createdAt() {
        return {
            datatype: "timestamptz",
            columnDefinition: (f) => f.defaultTo(k.sql`now()`),
        };
    },
} satisfies MapColumnsToGenerators;

const POSTGRES_SERIALIZATION = {
    // Primitive types
    int32() {
        return {
            from: v.number(),
            to: v.number(),
        };
    },
    int64() {
        // Note: JS supports up to 53 bit
        return {
            from: v.number(),
            to: v.number(),
        };
    },
    bigint() {
        return {
            from: v.bigint(),
            to: v.bigint(),
        };
    },
    float32() {
        return {
            from: v.number(),
            to: v.number(),
        };
    },
    float64() {
        // TODO: Validate JS number limits, https://stackoverflow.com/questions/45929493/node-js-maximum-safe-floating-point-number
        return {
            from: v.number(),
            to: v.number(),
        };
    },
    decimal() {
        return {
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
            from: v.string(),
            to: v.string(),
        };
    },
    string() {
        return {
            from: v.string(),
            to: v.string(),
        };
    },
    varchar() {
        return {
            from: v.string(),
            to: v.string(),
        };
    },
    boolean() {
        return {
            from: v.boolean(),
            to: v.boolean(),
        };
    },
    timestamp() {
        return {
            from: v.date(),
            to: v.date(),
        };
    },
    timestamptz() {
        return {
            from: v.date(),
            to: v.date(),
        };
    },
    datepart() {
        return {
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
            from: v.string(),
            to: v.string(),
        };
    },
    jsonb<T extends ValibotSchema>(params: Params<{ schema: T }>) {
        return {
            from: params.schema,
            to: params.schema,
        };
    },
    json<T extends ValibotSchema>(params: Params<{ schema: T }>) {
        return {
            from: params.schema,
            to: params.schema,
        };
    },
    // Helper types
    rowversion() {
        return this.int64({});
    },
    concurrencyStamp() {
        return this.uuid({});
    },
    userstring() {
        return {
            from: v.string(),
            to: v.string(),
        };
    },
    email() {
        return {
            from: v.string(),
            to: v.string(),
        };
    },
    updatedAt() {
        return this.timestamptz({});
    },
    createdAt() {
        return this.timestamptz({});
    },
} satisfies TransformSchemas;

// function beforeCreateTableHook(
//     db: k.Kysely<any>,
//     tables: Table<string, Record<string, ColumnType<string, any>>>[]
// ) {
//     return [k.sql`CREATE EXTENSION IF NOT EXISTS "uuid-ossp"`];
// }

export const POSTGRES_DRIVER = {
    databaseType: "postgres" as const,
    columnTypeMap: POSTGRES_COLUMNS,
    transform: POSTGRES_SERIALIZATION,
} satisfies OrmerDbDriver<"postgres", typeof POSTGRES_COLUMNS, typeof POSTGRES_SERIALIZATION>;
