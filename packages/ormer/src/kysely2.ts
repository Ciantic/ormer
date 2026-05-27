type FinalType<T> = T extends infer U ? { [K in keyof U]: U[K] } : never;

type ColumnTypeKysely<
  SelectType,
  InsertType = SelectType,
  UpdateType = SelectType,
> = {
  readonly __insert__: InsertType;
  readonly __select__: SelectType;
  readonly __update__: UpdateType;
};

export type InferKyselyTypes<
  D extends Record<string, { columns: Record<string, { type: string }> }>,
  SelectTypeMap extends Record<string, unknown>,
  InsertTypeMap extends Record<string, unknown>,
  UpdateTypeMap extends Record<string, unknown>,
> = {};
