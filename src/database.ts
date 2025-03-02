// deno-lint-ignore-file no-explicit-any
import type * as v from "npm:valibot";
import * as k from "npm:kysely";
import type { ColumnType, Params } from "./columns.ts";
import type { Table } from "./table.ts";
import { SCHEMAS } from "./schemas.ts";
import { POSTGRES_DRIVER } from "./drivers/postgres.ts";

type StringLiteral<T> = T extends string ? (string extends T ? never : T) : never;
type FinalType<T> = T extends infer U ? { [K in keyof U]: U[K] } : never;
type RecordOfColumnTypes = Record<string, ColumnType<string, any>>;
type ValibotSchema = v.BaseSchema<unknown, unknown, v.BaseIssue<unknown>>;
type RecordOfSchemas = Record<string, (params?: any) => ValibotSchema>;
type RecordOfColumnGenerators = Record<string, (params?: any) => ColumnSqlGenerator>;
type RecordOfTransformSchemas = Record<
    string,
    (params?: any) => {
        from: ValibotSchema;
        to: ValibotSchema;
    }
>;
export type ColumnSqlGenerator = {
    datatype: k.ColumnDataType | k.Expression<any>;
    columnDefinition?: (column: k.ColumnDefinitionBuilder) => k.ColumnDefinitionBuilder;
    tableDefinition?: (
        table: k.CreateTableBuilder<never, never>
    ) => k.CreateTableBuilder<never, never>;
    extraSql?: (db: k.Kysely<any>) => k.CompiledQuery[];
};

export type OrmerDbDriver<
    T extends string,
    Schemas extends RecordOfColumnGenerators,
    TransformSchemas extends RecordOfTransformSchemas
> = {
    databaseType: StringLiteral<T>;
    columnTypeMap: Schemas;
    transform: TransformSchemas;
    createTablesBeforeHook?: (db: k.Kysely<any>) => k.CompiledQuery[];
    createTablesAfterHook?: (db: k.Kysely<any>) => k.CompiledQuery[];
};

type ColumnOfTable<
    T extends Table<any, RecordOfColumnTypes>[],
    K extends string,
    C extends keyof Extract<T[number], Table<K, RecordOfColumnTypes>>["columns"]
> = Extract<T[number], Table<K, RecordOfColumnTypes>>["columns"][C];

type InferredValue<
    T extends Table<any, RecordOfColumnTypes>[],
    K extends string,
    C extends keyof Extract<T[number], Table<K, RecordOfColumnTypes>>["columns"],
    TypeTable extends RecordOfSchemas
> = v.InferOutput<
    // Return schema from params of a column
    // Or value from TypeTable (usually TYPES_TO_SCHEMAS)
    ColumnOfTable<T, K, C>["params"]["schema"] extends ValibotSchema
        ? ColumnOfTable<T, K, C>["params"]["schema"]
        : ReturnType<TypeTable[ColumnOfTable<T, K, C>["type"]]>
>;

export type InferKyselyTables<
    T extends Table<any, RecordOfColumnTypes>[],
    TypeTable extends RecordOfSchemas
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

// export function createKyselyDb<T extends Table<any, RecordOfColumnTypes>[]>(opts: {
//     tables: T;
//     kysely: k.KyselyConfig;
// }): k.Kysely<InferKyselyTables<T, typeof TYPES_TO_SCHEMAS>>;
// export function createKyselyDb<
//     T extends Table<any, RecordOfColumnTypes>[],
//     TypeTable extends Record<string, (params?: any) => ValibotSchema>
// >(opts: {
//     tables: T;
//     kysely: k.KyselyConfig;
//     types: TypeTable;
// }): k.Kysely<InferKyselyTables<T, TypeTable>>;
// export function createKyselyDb(opts: { tables: unknown; kysely: k.KyselyConfig; types?: unknown }) {
//     const typedefs = opts.types ?? TYPES_TO_SCHEMAS;

//     // TODO: Use types
//     return new k.Kysely({
//         ...opts.kysely,
//         plugins: [],
//     }) as any;
// }

/**
 * Create table queries
 *
 * @param tables
 * @param kysely
 * @returns
 */
function createTables<T extends Table<string, Record<string, ColumnType<string, any>>>[]>(
    databaseType: string,
    kysely: k.Kysely<any>,
    tables: T,
    types: RecordOfColumnGenerators = {}
) {
    const ret: {
        tables: Record<T[number]["table"], k.CreateTableBuilder<any, any>>;
        extraSql: k.CompiledQuery[];
        execute: () => Promise<void>;
    } = {
        tables: {} as any,
        extraSql: [],
        execute: async () => {
            for (const table of Object.values(ret.tables)) {
                await (table as any).execute();
            }
        },
    };
    for (const table of tables) {
        let t = kysely.schema.createTable(table.table);
        for (const columnName of Object.keys(table.columns)) {
            const c = table.columns[columnName];
            const { datatype, columnDefinition, tableDefinition, extraSql } = types[c.type]?.(
                c.params ?? {}
            );

            if (!datatype) {
                throw new Error(`Unknown column type: ${c.type}`);
            }

            if (tableDefinition) {
                t = tableDefinition(t);
            }

            t = t.addColumn(columnName, datatype as k.ColumnDataType, (p) => {
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
                if (columnDefinition) {
                    p = columnDefinition(p);
                }
                if (extraSql) {
                    ret.extraSql.push(...extraSql(kysely));
                }
                return p;
            });

            (ret.tables as any)[table.table] = t;
        }
        // TODO: Check() constraints, indexes, etc.
    }
    return ret;
}

interface DbBuilder {
    withTables<T extends Table<any, RecordOfColumnTypes>[]>(tables: T): DbBuilderTables<T>;
}

interface DbBuilderTables<Tables extends Table<any, RecordOfColumnTypes>[]> {
    withSchemas(): DbBuilderWithSchemas<Tables, typeof SCHEMAS>;

    withSchemas<Schemas extends RecordOfSchemas>(
        schemas: Schemas
    ): DbBuilderWithSchemas<Tables, typeof SCHEMAS & Schemas>;
}

interface DbBuilderWithSchemas<
    Tables extends Table<any, RecordOfColumnTypes>[],
    Schemas extends RecordOfSchemas
> {
    // tables: T;
    // schemas: Schemas;

    withPostgres(): DbBuilderWithDriver<
        "postgres",
        Tables,
        Schemas,
        typeof POSTGRES_DRIVER.columnTypeMap,
        typeof POSTGRES_DRIVER.transform,
        typeof POSTGRES_DRIVER
    >;

    withPostgres<
        ColumnTypes extends RecordOfColumnGenerators,
        Transform extends RecordOfTransformSchemas
    >(opts: {
        columnTypes: ColumnTypes;
        transforms: Transform;
    }): DbBuilderWithDriver<
        "postgres",
        Tables,
        Schemas,
        typeof POSTGRES_DRIVER.columnTypeMap & ColumnTypes,
        typeof POSTGRES_DRIVER.transform & Transform,
        typeof POSTGRES_DRIVER & {
            columnTypeMap: typeof POSTGRES_DRIVER.columnTypeMap & ColumnTypes;
            transform: typeof POSTGRES_DRIVER.transform & Transform;
        }
    >;
}

interface DbBuilderWithDriver<
    DbType extends string,
    Tables extends Table<any, RecordOfColumnTypes>[],
    Schemas extends RecordOfSchemas,
    ColumnTypes extends RecordOfColumnGenerators,
    TransformSchemas extends RecordOfTransformSchemas,
    OrmDriver extends OrmerDbDriver<DbType, ColumnTypes, TransformSchemas>
> {
    withKyselyConfig(config?: k.KyselyConfig): {
        build(): Db<DbType, Tables, Schemas, ColumnTypes, TransformSchemas, OrmDriver>;
    };
}

// interface DbBuilderWithSchemasAndColumnTypes<
//     DbType extends string,
//     Tables extends Table<any, RecordOfColumnTypes>[],
//     Schemas extends RecordOfSchemas,
//     ColumnTypes extends RecordOfColumnGenerators
// > {
//     // databaseType: StringLiteral<D>;
//     // tables: T;
//     // schemas: Schemas;
//     // columnTypes: ColumnTypes;
// }

interface Db<
    DbType extends string,
    Tables extends Table<any, RecordOfColumnTypes>[],
    Schemas extends RecordOfSchemas,
    ColumnTypes extends RecordOfColumnGenerators,
    TransformSchemas extends RecordOfTransformSchemas,
    OrmDriver extends OrmerDbDriver<DbType, ColumnTypes, TransformSchemas>
> {
    databaseType: StringLiteral<DbType>;
    tables: Tables;
    schemas: Schemas;
    driver: OrmDriver;
    kyselyConfig: k.KyselyConfig;

    getKysely(): k.Kysely<InferKyselyTables<Tables, Schemas>>;
    createTables(): ReturnType<typeof createTables<Tables>>;
}

class DbImpl<
    DbType extends string,
    Tables extends Table<any, RecordOfColumnTypes>[],
    Schemas extends RecordOfSchemas,
    ColumnTypes extends RecordOfColumnGenerators,
    TransformSchemas extends RecordOfTransformSchemas,
    OrmDriver extends OrmerDbDriver<DbType, ColumnTypes, TransformSchemas>
> implements Db<DbType, Tables, Schemas, ColumnTypes, TransformSchemas, OrmDriver>
{
    kyselyConfig: k.KyselyConfig;
    kyselyInstance: k.Kysely<InferKyselyTables<Tables, Schemas>>;

    constructor(
        public databaseType: StringLiteral<DbType>,
        public tables: Tables,
        public schemas: Schemas,
        public driver: OrmDriver,
        kyselyConfig?: k.KyselyConfig
    ) {
        this.kyselyConfig = kyselyConfig ?? {
            dialect: {
                createAdapter: () => new k.PostgresAdapter(),
                createDriver: () => new k.DummyDriver(),
                createIntrospector: (db) => new k.PostgresIntrospector(db),
                createQueryCompiler: () => new k.PostgresQueryCompiler(),
            },
        };

        this.kyselyInstance = new k.Kysely({
            ...this.kyselyConfig,
            plugins: [],
        });
    }

    getKysely() {
        return this.kyselyInstance;
    }
    createTables() {
        return createTables(
            this.databaseType,
            this.getKysely(),
            this.tables,
            this.driver.columnTypeMap
        );
    }
}

export function createDbBuilder(): DbBuilder {
    return {
        withTables<T extends Table<any, RecordOfColumnTypes>[]>(tables: T) {
            return {
                withSchemas(schemas?: Record<string, (params?: any) => ValibotSchema>) {
                    return {
                        withPostgres(opts?: {
                            columnTypes?: RecordOfColumnGenerators;
                            transforms?: RecordOfTransformSchemas;
                        }) {
                            return {
                                withKyselyConfig(maybeKyselyConfig?: k.KyselyConfig) {
                                    return {
                                        build() {
                                            return new DbImpl(
                                                "postgres",
                                                tables,
                                                {
                                                    ...SCHEMAS,
                                                    ...schemas,
                                                },
                                                {
                                                    ...POSTGRES_DRIVER,
                                                    columnTypeMap: {
                                                        ...POSTGRES_DRIVER.columnTypeMap,
                                                        ...opts?.columnTypes,
                                                    },
                                                    transform: {
                                                        ...POSTGRES_DRIVER.transform,
                                                        ...opts?.transforms,
                                                    },
                                                },
                                                maybeKyselyConfig
                                            );
                                        },
                                    };
                                },
                            };
                        },
                    };
                },
            };
        },
    };
}
