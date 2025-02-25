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

export type InferKyselyTables<
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

type TableProperties<T extends Table<any, RecordOfColumnTypes>[]> = {
    [K in T[number]["table"]]: Extract<T[number], Table<K, RecordOfColumnTypes>>;
};

export function createKyselyDb<T extends Table<any, RecordOfColumnTypes>[]>(opts: {
    tables: T;
    kysely: k.KyselyConfig;
}): k.Kysely<InferKyselyTables<T, typeof TYPES_TO_SCHEMAS>>;
export function createKyselyDb<
    T extends Table<any, RecordOfColumnTypes>[],
    TypeTable extends Record<string, (params?: any) => ValibotSchema>
>(opts: {
    tables: T;
    kysely: k.KyselyConfig;
    types: TypeTable;
}): k.Kysely<InferKyselyTables<T, TypeTable>>;
export function createKyselyDb(opts: { tables: unknown; kysely: k.KyselyConfig; types?: unknown }) {
    const typedefs = opts.types ?? TYPES_TO_SCHEMAS;

    // TODO: Use types
    return new k.Kysely({
        ...opts.kysely,
        plugins: [],
    }) as any;
}

/**
 * Create table queries
 *
 * @param tables
 * @param kysely
 * @returns
 */
export function createTables(
    kysely: k.Kysely<any>,
    tables: Table<any, Record<string, ColumnType<string, any>>>[],
    types: Record<string, (params: any) => string | k.Expression<any>> = {}
) {
    const queries: k.CompiledQuery[] = [];
    for (const table of tables) {
        let t = kysely.schema.createTable(table.table);
        for (const columnName of Object.keys(table.columns)) {
            const c = table.columns[columnName];
            const columnType = types[c.type]?.(c.params ?? {});

            if (!columnType) {
                throw new Error(`Unknown column type: ${c.type}`);
            }

            t = t.addColumn(columnName, columnType as k.ColumnDataType, (p) => {
                if (!c.params?.nullable) {
                    p = p.notNull();
                }
                if (c.params?.unique) {
                    p = p.unique();
                }
                if (c.params?.primaryKey) {
                    p = p.primaryKey();
                }
                if (c.params?.default) {
                    p = p.defaultTo(c.params.default);
                }
                if (c.params?.foreignKeyTable && c.params?.foreignKeyColumn) {
                    t.addForeignKeyConstraint(
                        `FOREIGN_KEY_${table.table}_${columnName}_TO_${c.params.foreignKeyTable}_${c.params.foreignKeyColumn}`,
                        [columnName] as any,
                        c.params.foreignKeyTable,
                        [c.params.foreignKeyColumn]
                    );
                }
                return p;
            });
        }
        // TODO: Check() constraints, indexes, etc.
        queries.push(t.compile());
    }
    return queries;
}
