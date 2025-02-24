// deno-lint-ignore-file no-explicit-any
import type * as v from "npm:valibot";
import * as k from "npm:kysely";
import type { ColumnType } from "./columns.ts";
import type { Table } from "./table.ts";
import { TYPES_TO_SCHEMAS } from "./schemas.ts";

type FinalType<T> = T extends infer U ? { [K in keyof U]: U[K] } : never;
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
>;

export type InfeKyselyTables<
    T extends Table<any, RecordOfColumnTypes>[],
    TypeTable extends Record<string, (params?: any) => ValibotSchema>
> = FinalType<{
    [K in T[number]["table"]]: {
        [C in keyof Extract<T[number], Table<K, RecordOfColumnTypes>>["columns"]]: k.ColumnType<
            // Select
            | InferredValue<T, K, C, TypeTable>
            | (ColumnOfTable<T, K, C>["params"]["nullable"] extends true ? null : never),
            // Insert
            ColumnOfTable<T, K, C>["params"]["notInsertable"] extends true
                ? never
                :
                      | InferredValue<T, K, C, TypeTable>
                      | (ColumnOfTable<T, K, C>["params"]["nullable"] extends true ? null : never)
                      // If default is defined, the field is optional
                      | (undefined extends ColumnOfTable<T, K, C>["params"]["default"]
                            ? never
                            : undefined),
            // Update
            ColumnOfTable<T, K, C>["params"]["notUpdatable"] extends true
                ? never
                :
                      | InferredValue<T, K, C, TypeTable>
                      | (ColumnOfTable<T, K, C>["params"]["nullable"] extends true ? null : never)
        >;
    };
}>;

export function createDbFactory<T extends Table<any, RecordOfColumnTypes>[]>(
    ...tables: T
): {
    // tables: T,
    tables: {
        [K in T[number]["table"]]: Extract<T[number], Table<K, RecordOfColumnTypes>>;
    };

    createKyselyDb(kysely: k.KyselyConfig): k.Kysely<InfeKyselyTables<T, typeof TYPES_TO_SCHEMAS>>;
    createKyselyDb<TypeTable extends Record<string, (params?: any) => ValibotSchema>>(
        kysely: k.KyselyConfig,
        types: TypeTable
    ): k.Kysely<InfeKyselyTables<T, TypeTable>>;
} {
    return {
        tables: tables.reduce((acc, table) => {
            acc[table.table] = table;
            return acc;
        }, {} as any),

        createKyselyDb(kysely: k.KyselyConfig, types?: unknown) {
            const typedefs = types ?? TYPES_TO_SCHEMAS;

            // TODO: Use types
            return new k.Kysely({
                ...kysely,
                plugins: [],
            }) as any;
        },
    };
}
