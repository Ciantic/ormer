import type { Table } from "./table.ts";

type UnknownSchema = unknown;

type FinalType<T> = T extends infer U ? { [K in keyof U]: U[K] } : never;

// Restrict record T to only keys from record B
type R<T, B> = {
  [K in keyof T]: K extends keyof B ? T[K] : never;
};

// Combine two types, with properties from U taking precedence over T
type Combine<T, U> = Omit<T, keyof U> & U;

// TODO: This and type was ReadOnly, is there benefit for that? I removed it for now.
export type Params<ExtraProps extends object = {}> = FinalType<
  Combine<
    {
      primaryKey?: boolean;
      unique?: boolean;
      updateKey?: boolean;
      notInsertable?: boolean;
      notUpdatable?: boolean;
      nullable?: boolean;
      default?: any;
      foreignKeyTable?: string;
      foreignKeyColumn?: string;
      autoIncrement?: boolean;
      schema?: UnknownSchema;
      // Array dimensions as a SQL suffix string, e.g. "[][]" or "[3][3]"
      array?: string;

      // Should not use these
      // columnName?: string; // Automatically assigned by table()
      // tableName?: string; // Automatically assigned by table()
    },
    ExtraProps
  >
>;

export type ColumnTypeSingualr<Type extends string> = { type: Type };

export type ColumnType<Type extends string, Params> = {
  type: Type;
} & Params;

export type ForeignKeyCol = {
  nullable?: boolean;
  onDeleteCascade?: boolean;
  onDeleteSetNull?: boolean;
  onUpdateCascade?: boolean;
  onUpdateSetNull?: boolean;
};
export function foreignKey<
  C extends keyof T["columns"],
  // deno-lint-ignore no-explicit-any
  T extends Table<any, any>,
  // deno-lint-ignore ban-types
  P extends ForeignKeyCol = {},
>(
  table: T,
  column: C,
  params?: R<P, ForeignKeyCol>,
  // wrapped: ColumnType<T["columns"][C]["type"], unknown>
): ColumnType<
  T["columns"][C]["type"],
  FinalType<
    P & {
      foreignKeyTable: T["table"];
      foreignKeyColumn: C;
    }
  >
> {
  return {
    get type() {
      return table.columns[column].type;
    },
    ...params,
    ...({
      foreignKeyTable: table.table,
      foreignKeyColumn: column,
    } satisfies {
      foreignKeyTable: T["table"];
      foreignKeyColumn: C;
    }),
  } as any;
}
