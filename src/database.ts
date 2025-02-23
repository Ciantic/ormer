// deno-lint-ignore-file no-explicit-any
import type * as v from "npm:valibot";
import * as k from "npm:kysely";
import type { ColumnType } from "./columns.ts";
import type { Table } from "./table.ts";

type RecordOfColumnTypes = Record<string, ColumnType<string, any>>;
type ValibotSchema = v.BaseSchema<unknown, unknown, v.BaseIssue<unknown>>;

type ColumnOfTable<
    T extends Table<any, RecordOfColumnTypes>[],
    K extends string,
    C extends keyof Extract<T[number], Table<K, RecordOfColumnTypes>>["columns"]
> = Extract<T[number], Table<K, RecordOfColumnTypes>>["columns"][C];

type InferredValue<
    T extends Table<any, RecordOfColumnTypes>[],
    K extends string,
    C extends keyof Extract<T[number], Table<K, RecordOfColumnTypes>>["columns"],
    TypeTable extends Record<string, (params?: any) => ValibotSchema>
> = v.InferOutput<
    // Return schema from params of a column
    // Or value from TypeTable (usually TYPES_TO_SCHEMAS)
    ColumnOfTable<T, K, C>["params"]["schema"] extends ValibotSchema
        ? ColumnOfTable<T, K, C>["params"]["schema"]
        : ReturnType<TypeTable[ColumnOfTable<T, K, C>["type"]]>
    // FAIL HERE
>;

export function createDbFactory<T extends Table<any, RecordOfColumnTypes>[]>(
    ...tables: T
): {
    // tables: T,
    tables: {
        [K in T[number]["table"]]: Extract<T[number], Table<K, RecordOfColumnTypes>>;
    };

    createKyselyDb<TypeTable extends Record<string, (params?: any) => ValibotSchema>>({
        kysely,
        types,
    }: {
        kysely: k.KyselyConfig;
        types: TypeTable;
    }): k.Kysely<{
        [K in T[number]["table"]]: {
            [C in keyof Extract<T[number], Table<K, RecordOfColumnTypes>>["columns"]]: k.ColumnType<
                // Select
                InferredValue<T, K, C, TypeTable>,
                // Insert
                ColumnOfTable<T, K, C>["params"]["notInsertable"] extends true
                    ? never
                    : InferredValue<T, K, C, TypeTable>,
                // Update
                ColumnOfTable<T, K, C>["params"]["notUpdatable"] extends true
                    ? never
                    : InferredValue<T, K, C, TypeTable>
            >;
        };
    }>;
} {
    return {
        tables: tables.reduce((acc, table) => {
            acc[table.table] = table;
            return acc;
        }, {} as any),
        createKyselyDb({ kysely, types: _types }) {
            // TODO: Use types
            return new k.Kysely({
                ...kysely,
                plugins: [],
            });
        },
    };
}
