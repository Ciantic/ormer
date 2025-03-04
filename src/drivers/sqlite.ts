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
    // Helper types
    rowversion() {
        return {
            datatype: "integer",
            from: v.number(),
            to: v.number(),
        };
    },
    concurrencyStamp() {
        return {
            datatype: "text",
            columnDefinition: (f) => f.defaultTo(k.sql`lower(hex(randomblob(16)))`),
            from: v.string(),
            to: v.string(),
        };
    },
    userstring(params) {
        return {
            datatype: "text",
            from: v.string(),
            to: v.string(),
        };
    },
    email() {
        return {
            datatype: "text",
            from: v.string(),
            to: v.string(),
        };
    },
    updatedAt() {
        return {
            datatype: "text",
            columnDefinition: (f) => f.defaultTo(k.sql`strftime('%Y-%m-%dT%H:%M:%fZ', 'now')`),
            from: v.date(),
            to: v.date(),
        };
    },
    createdAt() {
        return {
            datatype: "text",
            columnDefinition: (f) => f.defaultTo(k.sql`strftime('%Y-%m-%dT%H:%M:%fZ', 'now')`),
            from: v.date(),
            to: v.date(),
        };
    },
} satisfies OrmdriverColumnTypes;

export const SQLITE_DRIVER = {
    databaseType: "sqlite" as const,
    columnTypeMap: SQLITE_COLUMNS,
} satisfies OrmerDbDriver<"sqlite", typeof SQLITE_COLUMNS>;
