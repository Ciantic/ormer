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
    uuid(params) {
        return {
            datatype: "text",
            from: v.string(),
            to: v.string(),
            extraSql: (db) => {
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
    datetime(params) {
        return {
            datatype: "text",
            from: v.date(),
            to: v.date(),
            columnDefinition: (f) => {
                if (params.default === "now") {
                    f = f.defaultTo(k.sql.raw("CURRENT_TIMESTAMP"));
                }
                return f;
            },
            extraSql: (db) => {
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

    getKyselyPlugins() {
        const transformer = new Transformer();
        const plugin = {
            transformQuery: (args) => {
                return transformer.transformNode(args.node);
            },
            transformResult: (args) => {
                // console.log("TRANSFORM BACK", args);
                return Promise.resolve(args.result);
            },
        } satisfies k.KyselyPlugin;
        return [plugin];
    },
} satisfies OrmerDbDriver<"sqlite", typeof SQLITE_COLUMNS>;

// https://github.com/kysely-org/kysely/issues/133#issuecomment-1209458503

class Transformer extends k.OperationNodeTransformer {
    protected override transformPrimitiveValueList(
        node: k.PrimitiveValueListNode
    ): k.PrimitiveValueListNode {
        console.log(node);
        return node;
    }

    protected override transformValue(node: k.ValueNode): k.ValueNode {
        console.log(node);
        return node;
    }

    protected override transformColumnUpdate(node: k.ColumnUpdateNode): k.ColumnUpdateNode {
        // Note: Used in UPDATE and ON CONFLICT UPDATE
        console.log(node);
        return node;
    }

    protected override transformInsertQuery(node: k.InsertQueryNode): k.InsertQueryNode {
        console.log(node);
        return node;
    }

    protected override transformUpdateQuery(node: k.UpdateQueryNode): k.UpdateQueryNode {
        console.log(node);
        return node;
    }

    // override transformNode<T extends k.OperationNode | undefined>(node: T): T {
    //     console.log(node);
    //     return node;
    // }

    // protected override transformSetOperation(node: k.SetOperationNode): k.SetOperationNode {
    //     console.log(node);
    //     return node;
    // }
}
