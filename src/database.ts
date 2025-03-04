// deno-lint-ignore-file no-explicit-any
import type * as v from "npm:valibot";
import * as k from "npm:kysely";
import type { ColumnType } from "./columns.ts";
import type { Table } from "./table.ts";
import { Schema, SCHEMAS } from "./schemas.ts";
import { POSTGRES_DRIVER } from "./drivers/postgres.ts";

type StringLiteral<T> = T extends string ? (string extends T ? never : T) : never;
type FinalType<T> = T extends infer U ? { [K in keyof U]: U[K] } : never;
type RecordOfColumnTypes = Record<string, ColumnType<string, any>>;
type ValibotSchema = v.BaseSchema<unknown, unknown, v.BaseIssue<unknown>>;
type RecordOfSchemas = Record<
    string,
    (params?: any) => Schema<ValibotSchema, ValibotSchema, ValibotSchema>
>;
type RecordOfColumnTypeToDriver = Record<string, (params?: any) => ColumnTypeToDriver>;
type ArrayOfTables = Table<any, RecordOfColumnTypes>[];

export type ColumnTypeToDriver = {
    // Driver's datatype
    datatype: k.ColumnDataType | k.Expression<any>;

    // Deserialize from driver result
    from: ValibotSchema;

    // Serialize to driver
    to: ValibotSchema;

    columnDefinition?: (column: k.ColumnDefinitionBuilder) => k.ColumnDefinitionBuilder;
    tableDefinition?: (
        table: k.CreateTableBuilder<never, never>
    ) => k.CreateTableBuilder<never, never>;
    extraSql?: (db: k.Kysely<any>) => k.CompiledQuery[];
};

export type OrmerDbDriver<T extends string, ColumnTypeMap extends RecordOfColumnTypeToDriver> = {
    databaseType: StringLiteral<T>;
    columnTypeMap: ColumnTypeMap;
    // createTablesBeforeHook?: (db: k.Kysely<any>, tables: ArrayOfTables) => k.CompiledQuery[];
    createTablesAfterHook?: (db: k.Kysely<any>, tables: ArrayOfTables) => k.CompiledQuery[];
};

type ColumnOfTable<
    T extends ArrayOfTables,
    K extends string,
    C extends keyof Extract<T[number], Table<K, RecordOfColumnTypes>>["columns"]
> = Extract<T[number], Table<K, RecordOfColumnTypes>>["columns"][C];

type InferredValue<
    T extends ArrayOfTables,
    K extends string,
    C extends keyof Extract<T[number], Table<K, RecordOfColumnTypes>>["columns"],
    TypeTable extends RecordOfSchemas
> = v.InferOutput<
    // Return schema from params of a column
    // Or value from TypeTable (usually TYPES_TO_SCHEMAS)
    ColumnOfTable<T, K, C>["params"]["schema"] extends ValibotSchema
        ? ColumnOfTable<T, K, C>["params"]["schema"]
        : ReturnType<TypeTable[ColumnOfTable<T, K, C>["type"]]>["schema"]
>;

export type InferKyselyTables<
    T extends ArrayOfTables,
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

/**
 * Create table queries
 *
 * @param tables
 * @param kysely
 * @returns
 */
function createTables<T extends Table<string, Record<string, ColumnType<string, any>>>[]>(
    kysely: k.Kysely<any>,
    tables: T,
    driver: OrmerDbDriver<any, any>
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
                await (table as k.CreateTableBuilder<any, any>).execute();
            }

            for (const query of ret.extraSql) {
                await kysely.executeQuery(query);
            }
        },
    };
    for (const table of tables) {
        let t = kysely.schema.createTable(table.table);
        for (const columnName of Object.keys(table.columns)) {
            const columnType = table.columns[columnName];
            const columnTypeToDriver = driver.columnTypeMap[columnType.type]?.(
                columnType.params ?? {}
            );
            if (typeof columnTypeToDriver === "undefined") {
                throw new Error(`Driver is missing column type: ${columnType.type}`);
            }

            const { datatype, columnDefinition, tableDefinition, extraSql } = columnTypeToDriver;

            if (!datatype) {
                throw new Error(`Unknown column type: ${columnType.type}`);
            }

            if (tableDefinition) {
                t = tableDefinition(t);
            }

            t = t.addColumn(columnName, datatype as k.ColumnDataType, (p) => {
                if (!columnType.params?.nullable) {
                    p = p.notNull();
                }
                if (columnType.params?.unique) {
                    p = p.unique();
                }
                if (columnType.params?.primaryKey) {
                    p = p.primaryKey();
                }
                if (columnType.params?.default) {
                    p = p.defaultTo(columnType.params.default);
                }
                if (columnType.params?.foreignKeyTable && columnType.params?.foreignKeyColumn) {
                    t.addForeignKeyConstraint(
                        `FOREIGN_KEY_${table.table}_${columnName}_TO_${columnType.params.foreignKeyTable}_${columnType.params.foreignKeyColumn}`,
                        [columnName] as any,
                        columnType.params.foreignKeyTable,
                        [columnType.params.foreignKeyColumn]
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

    if (driver.createTablesAfterHook) {
        ret.extraSql.push(...driver.createTablesAfterHook(kysely, tables));
    }

    return ret;
}

interface DbBuilder {
    withTables<T extends ArrayOfTables>(tables: T): DbBuilderTables<T>;
}

interface DbBuilderTables<Tables extends ArrayOfTables> {
    withSchemas(): DbBuilderWithSchemas<Tables, typeof SCHEMAS>;

    withSchemas<Schemas extends RecordOfSchemas>(
        schemas: Schemas
    ): DbBuilderWithSchemas<Tables, typeof SCHEMAS & Schemas>;
}

interface DbBuilderWithSchemas<Tables extends ArrayOfTables, Schemas extends RecordOfSchemas> {
    // tables: T;
    // schemas: Schemas;

    withPostgres(): DbBuilderWithDriver<
        "postgres",
        Tables,
        Schemas,
        typeof POSTGRES_DRIVER.columnTypeMap,
        typeof POSTGRES_DRIVER
    >;

    withPostgres<ColumnTypes extends RecordOfColumnTypeToDriver>(
        columnTypes: ColumnTypes
    ): DbBuilderWithDriver<
        "postgres",
        Tables,
        Schemas,
        typeof POSTGRES_DRIVER.columnTypeMap & ColumnTypes,
        typeof POSTGRES_DRIVER & {
            columnTypeMap: typeof POSTGRES_DRIVER.columnTypeMap & ColumnTypes;
        }
    >;
}

interface DbBuilderWithDriver<
    DbType extends string,
    Tables extends ArrayOfTables,
    Schemas extends RecordOfSchemas,
    ColumnTypes extends RecordOfColumnTypeToDriver,
    OrmDriver extends OrmerDbDriver<DbType, ColumnTypes>
> {
    withKyselyConfig(config?: k.KyselyConfig): {
        build(): Db<DbType, Tables, Schemas, ColumnTypes, OrmDriver>;
    };
}

interface Db<
    DbType extends string,
    Tables extends ArrayOfTables,
    Schemas extends RecordOfSchemas,
    ColumnTypes extends RecordOfColumnTypeToDriver,
    OrmDriver extends OrmerDbDriver<DbType, ColumnTypes>
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
    Tables extends ArrayOfTables,
    Schemas extends RecordOfSchemas,
    ColumnTypes extends RecordOfColumnTypeToDriver,
    OrmDriver extends OrmerDbDriver<DbType, ColumnTypes>
> implements Db<DbType, Tables, Schemas, ColumnTypes, OrmDriver>
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
        return createTables(this.getKysely(), this.tables, this.driver);
    }
}

export function createDbBuilder(): DbBuilder {
    return {
        withTables<T extends ArrayOfTables>(tables: T) {
            return {
                withSchemas(schemas?: Record<string, (params?: any) => ValibotSchema>) {
                    return {
                        withPostgres(columnTypes?: RecordOfColumnTypeToDriver) {
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
                                                        ...columnTypes,
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
