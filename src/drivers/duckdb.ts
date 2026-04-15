import * as k from "kysely";
import * as v from "valibot";
import type { OrmdriverColumnTypes } from "../helpers.ts";
import type { Params } from "../columns.ts";
import type { ColumnTypeToDriver, OrmerDbDriver } from "../database.ts";
import type { Table } from "../table.ts";
import { TransformerKyselyPlugin } from "../utils/transformerkyselyplugin.ts";
import { getDatabaseSerializers } from "../getters.ts";
import { DuckDBTimestampTZValue } from "@duckdb/node-api";

type ValibotSchema = v.BaseSchema<unknown, unknown, v.BaseIssue<unknown>>;

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
            from: v.number(),
            to: v.number(),
            ...autoIncrement(params),
        };
    },
    int64(params) {
        return {
            datatype: "int8",
            from: v.union([
                v.pipe(
                    v.string(),
                    v.transform((v) => +v)
                ),
                v.number(),
            ]),
            to: v.number(),
            ...autoIncrement(params),
        };
    },
    bigint() {
        return {
            datatype: k.sql`hugeint`,
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
            datatype: "float8",
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
    datetime() {
        return {
            datatype: "timestamptz",
            from: v.date(),
            to: v.pipe(
                v.date(),
                v.transform((v) => new DuckDBTimestampTZValue(BigInt(v.getTime()) * 1000n))
            ),
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
            // to: v.pipe(
            //     v.string(),
            //     v.transform((v) => new DuckDBDateValue(...))
            // ),
        };
    },
    timepart() {
        return {
            datatype: "time",
            from: v.string(),
            to: v.string(),
            // to: v.pipe(
            //     v.string(),
            //     v.transform((v) => new DuckDBTimeValue(...))
            // ),
        };
    },
    jsonb<T extends ValibotSchema>(params: Params<{ schema: T }>) {
        return {
            from: params.schema,
            to: v.pipe(
                params.schema,
                v.transform((v) => JSON.stringify(v))
            ),
            datatype: "json",
        };
    },
    json<T extends ValibotSchema>(params: Params<{ schema: T }>) {
        return {
            from: params.schema,
            to: v.pipe(
                params.schema,
                v.transform((v) => JSON.stringify(v))
            ),
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
