import * as k from "npm:kysely";
import * as v from "npm:valibot";
import type { OrmdriverColumnTypes } from "../helpers.ts";
import type { Params } from "../columns.ts";
import type { OrmerDbDriver } from "../database.ts";

type ValibotSchema = v.BaseSchema<unknown, unknown, v.BaseIssue<unknown>>;

const SQLITE_COLUMNS = {
    // Primitive types
    int32(params) {
        return {
            datatype: "integer",
            from: v.number(),
            to: v.number(),
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
            from: v.number(),
            to: v.number(),
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
            from: v.pipe(
                v.string(),
                v.transform((s) => BigInt(s))
            ),
            to: v.pipe(
                v.bigint(),
                v.transform((s) => s.toString())
            ),
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
            datatype: "real",
            from: v.number(),
            to: v.number(),
        };
    },
    decimal() {
        return {
            datatype: "text",
            from: v.string(),
            to: v.string(),
        };
    },
    uuid() {
        return {
            datatype: "text",
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
    varchar() {
        return {
            datatype: "text",
            from: v.string(),
            to: v.string(),
        };
    },
    boolean() {
        return {
            datatype: "integer",
            from: v.boolean(),
            to: v.boolean(),
        };
    },
    timestamp() {
        return {
            datatype: "text",
            from: v.date(),
            to: v.date(),
        };
    },
    timestamptz() {
        return {
            datatype: "text",
            from: v.date(),
            to: v.date(),
        };
    },
    datepart() {
        return {
            datatype: "text",
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
            datatype: "text",
            from: v.string(),
            to: v.string(),
        };
    },
    jsonb<T extends ValibotSchema>(params: Params<{ schema: T }>) {
        return {
            from: params.schema,
            to: params.schema,
            datatype: "text",
        };
    },
    json<T extends ValibotSchema>(params: Params<{ schema: T }>) {
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

    createTablesColumnHook: (builder, column) => {
        if (column.params.default === "now") {
            builder = builder.defaultTo(k.sql.raw("CURRENT_TIMESTAMP"));
        } else if (column.params.default === "generate") {
            builder = builder.defaultTo(k.sql.raw($SQLITE_UUID_GEN));
        } else if (column.params.default !== undefined) {
            builder = builder.defaultTo(column.params.default);
        }
        return builder;
    },

    createTablesAfterHook(db, tables) {
        const queries = [];
        for (const table of tables) {
            for (const [columnName, column] of Object.entries(table.columns)) {
                if (column.params.default === "generate") {
                    // TODO: Does not work for 'WITHOUT ROWID' tables
                    queries.push(
                        k.sql`CREATE TRIGGER ${k.sql.ref(`${table.table}_generate_${columnName}`)}
                        BEFORE UPDATE ON ${k.sql.ref(table.table)}
                        BEGIN
                            UPDATE ${k.sql.ref(table.table)}
                            SET ${k.sql.ref(columnName)} = ${k.sql.raw($SQLITE_UUID_GEN)}
                            WHERE rowid = NEW.rowid;
                        END;`.compile(db)
                    );
                } else if (column.params.default === "now") {
                    queries.push(
                        k.sql`CREATE TRIGGER ${k.sql.ref(`${table.table}_generate_${columnName}`)}
                        BEFORE UPDATE ON ${k.sql.ref(table.table)}
                        BEGIN
                            UPDATE ${k.sql.ref(table.table)}
                            SET ${k.sql.ref(columnName)} = datetime('subsec')
                            WHERE rowid = NEW.rowid;
                        END;`.compile(db)
                    );
                }
            }
        }

        return queries;
    },
} satisfies OrmerDbDriver<"sqlite", typeof SQLITE_COLUMNS>;
