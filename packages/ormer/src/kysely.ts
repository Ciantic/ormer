import type { MapColumnsTo, AllColumnTypes } from "./columnhelpers.ts";

type CommonTypes = {
  int32: number;
  int64: bigint;
  bigint: bigint;
  float32: number;
  float64: number;
  decimal: number;
  uuid: string;
  string: string;
  varchar: string;
  foreignKey: never;
  boolean: boolean;
  datetime: Date;
  datepart: string;
  timepart: string;
  jsonb: object;
  json: object;
};

type ColumnTypeKysely<
  SelectType,
  InsertType = SelectType,
  UpdateType = SelectType,
> = {
  readonly __insert__: InsertType;
  readonly __select__: SelectType;
  readonly __update__: UpdateType;
};

type ColJsType<T extends string> = T extends keyof CommonTypes
  ? CommonTypes[T]
  : never;

// Infer kysely types from database
export type InferKyselyTypes<
  D extends Record<string, { columns: Record<string, { type: string }> }>,
> = {
  [K in keyof D]: {
    [C in keyof D[K]["columns"]]: ColumnTypeKysely<
      // Select
      | ColJsType<D[K]["columns"][C]["type"]>
      | (D[K]["columns"][C] extends { nullable: true } ? null : never),
      // Insert
      D[K]["columns"][C] extends { notInsertable: true }
        ? never
        :
            | ColJsType<D[K]["columns"][C]["type"]>
            | (D[K]["columns"][C] extends { nullable: true } ? null : never)
            | (D[K]["columns"][C] extends { default: infer _ }
                ? undefined
                : D[K]["columns"][C] extends { nullable: true }
                  ? undefined
                  : never),
      // Update
      D[K]["columns"][C] extends { notUpdatable: true }
        ? never
        :
            | ColJsType<D[K]["columns"][C]["type"]>
            | (D[K]["columns"][C] extends { nullable: true } ? null : never)
    >;
  };
};
