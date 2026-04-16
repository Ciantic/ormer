import * as k from "kysely";
import * as s from "../simplevalidation.ts";
import type { OrmdriverColumnTypes } from "../helpers.ts";
import type { Params } from "../columns.ts";
import type { OrmerDbDriver } from "../database.ts";
import { TransformerKyselyPlugin } from "../utils/transformerkyselyplugin.ts";
import { getDatabaseSerializers } from "../getters.ts";
import type { StandardSchemaV1 } from "@standard-schema/spec";

type UnknownSchema = StandardSchemaV1<unknown, unknown>;

const SQLITE_COLUMNS = {
    // Primitive types
    int32(params) {
        return {
            datatype: "integer",
            from: s.number,
            to: s.number,
            columnDefinition: (f) => {
                if (params?.autoIncrement) {
                    f = f.autoIncrement();
                }
                return f;
            },
        };
    },
    int64(params) {
        return {
            datatype: "integer",
            from: s.number,
            to: s.number,
            columnDefinition: (f) => {
                if (params?.autoIncrement) {
                    f = f.autoIncrement();
                }
                return f;
            },
        };
    },
    bigint() {
        return {
            datatype: "text",
            from: s.bigintFromText,
            to: s.bigintToText,
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
            datatype: "real",
            from: s.number,
            to: s.number,
        };
    },
    decimal() {
        return {
            datatype: "text",
            from: s.string,
            to: s.string,
        };
    },
    uuid(params) {
        return {
            datatype: "text",
            from: s.string,
            to: s.string,
            appendSql: (db) => {
                if (params.onUpdateSet) {
                    const columnName = params.columnName;
                    const tableName = params.tableName;
                    return [
                        k.sql`CREATE TRIGGER ${k.sql.ref(`${tableName}_generate_${columnName}`)}
                    BEFORE UPDATE ON ${k.sql.ref(tableName)}
                    BEGIN
                        UPDATE ${k.sql.ref(tableName)}
                        SET ${k.sql.ref(columnName)} = ${k.sql.raw($SQLITE_UUID_GEN)}
                        WHERE rowid = NEW.rowid;
                    END;`.compile(db),
                    ];
                }

                return [];
            },
        };
    },
    string() {
        return {
            datatype: "text",
            from: s.string,
            to: s.string,
        };
    },
    varchar() {
        return {
            datatype: "text",
            from: s.string,
            to: s.string,
        };
    },
    boolean() {
        return {
            datatype: "integer",
            from: s.boolean,
            to: s.boolean,
        };
    },
    datetime(params) {
        return {
            datatype: "text",
            from: s.datetime,
            to: s.datetimeToIsoString,
            columnDefinition: (f) => {
                if (params.default === "now") {
                    f = f.defaultTo(k.sql.raw("CURRENT_TIMESTAMP"));
                }
                return f;
            },
            appendSql: (db) => {
                const queries = [];
                if (params.onUpdateSet)
                    queries.push(
                        k.sql`
                    CREATE TRIGGER ${k.sql.ref(`${params.tableName}_generate_${params.columnName}`)}
                    BEFORE UPDATE ON ${k.sql.ref(params.tableName)}
                    BEGIN
                        UPDATE ${k.sql.ref(params.tableName)}
                        SET ${k.sql.ref(params.columnName)} = datetime('subsec')
                        WHERE rowid = NEW.rowid;
                    END;`.compile(db)
                    );
                return queries;
            },
        };
    },
    datepart() {
        return {
            datatype: "text",
            from: s.datepartCoerced,
            to: s.string,
        };
    },
    timepart() {
        return {
            datatype: "text",
            from: s.string,
            to: s.string,
        };
    },
    jsonb<T extends UnknownSchema>(params: Params<{ schema: T }>) {
        return {
            from: params.schema,
            to: params.schema,
            datatype: "text",
        };
    },
    json<T extends UnknownSchema>(params: Params<{ schema: T }>) {
        return {
            from: params.schema,
            to: params.schema,
            datatype: "text",
        };
    },
} satisfies OrmdriverColumnTypes;

export const $SQLITE_UUID_GEN = `
    (LOWER(
    printf('%s-%s-4%s-%s%s-%s',
        hex(randomblob(4)),
        hex(randomblob(2)),
        substr(hex(randomblob(2)), 2, 3),
        substr('89ab', abs(random()) % 4 + 1, 1),
        substr(hex(randomblob(2)), 2, 3),
        hex(randomblob(6))
    )
))`;

export const ORMER_SQLITE_DRIVER = {
    databaseType: "sqlite" as const,
    columnTypeMap: SQLITE_COLUMNS,

    createTablesColumnHook(builder, column) {
        if (column.params.default === "now") {
            builder = builder.defaultTo(k.sql.raw("CURRENT_TIMESTAMP"));
        } else if (column.params.default === "generate") {
            builder = builder.defaultTo(k.sql.raw($SQLITE_UUID_GEN));
        } else if (column.params.default !== undefined) {
            builder = builder.defaultTo(column.params.default);
        }
        return builder;
    },

    getKyselyPlugins(tables) {
        const serializers = getDatabaseSerializers(tables, this.columnTypeMap);
        const columnNameBasedSerializer = new TransformerKyselyPlugin(serializers);
        return [columnNameBasedSerializer];
    },
} satisfies OrmerDbDriver<"sqlite", typeof SQLITE_COLUMNS>;
