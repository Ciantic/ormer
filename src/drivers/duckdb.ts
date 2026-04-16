import * as k from "kysely";
import * as s from "../simplevalidation.ts";
import type { OrmdriverColumnTypes } from "../helpers.ts";
import type { Params } from "../columns.ts";
import type { ColumnTypeToDriver, OrmerDbDriver } from "../database.ts";
import { TransformerKyselyPlugin } from "../utils/transformerkyselyplugin.ts";
import { getDatabaseSerializers } from "../getters.ts";
import { DuckDBTimestampTZValue } from "@duckdb/node-api";
import type { StandardSchemaV1 } from "@standard-schema/spec";

type UnknownSchema = StandardSchemaV1<unknown, unknown>;

function autoIncrement(params: Params & { columnName: string; tableName: string }) {
    return {
        columnDefinition: (c) => {
            if (params.autoIncrement) {
                c = c.defaultTo(
                    k.sql`nextval(${k.sql.lit(`${params.tableName}_${params.columnName}_seq`)})`
                );
            }

            return c;
        },
        prependSql(db) {
            const sql = [] as k.CompiledQuery[];
            if (params.autoIncrement) {
                sql.push(
                    k.sql`CREATE SEQUENCE ${k.sql.ref(
                        `${params.tableName}_${params.columnName}_seq`
                    )};`.compile(db)
                );
            }
            return sql;
        },
    } satisfies Partial<ColumnTypeToDriver>;
}

const DUCKDB_COLUMNS = {
    // Primitive types
    int32(params) {
        return {
            datatype: "int4",
            from: s.number,
            to: s.number,
            ...autoIncrement(params),
        };
    },
    int64(params) {
        return {
            datatype: "int8",
            from: s.numberCoerced,
            to: s.number,
            ...autoIncrement(params),
        };
    },
    bigint() {
        return {
            datatype: k.sql`hugeint`,
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
            datatype: "float8",
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
    datetime() {
        return {
            datatype: "timestamptz",
            from: s.datetime,
            to: s.datetimeToIsoString,
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
            to: s.jsonToString,
            datatype: "json",
        };
    },
    json<T extends UnknownSchema>(params: Params<{ schema: T }>) {
        return {
            from: params.schema,
            to: s.jsonToString,
            datatype: "json",
        };
    },
} satisfies OrmdriverColumnTypes;

export const ORMER_DUCKDB_DRIVER = {
    databaseType: "duckdb" as const,
    columnTypeMap: DUCKDB_COLUMNS,

    createTablesAfterHook(db, tables) {
        return [];
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
} satisfies OrmerDbDriver<"duckdb", typeof DUCKDB_COLUMNS>;
