import type { AllColumnTypes } from "./columnhelpers.ts";
import type { StandardSchemaV1 } from "@standard-schema/spec";

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
  boolean: boolean;
  datetime: Date;
  datepart: string;
  timepart: string;
  jsonb: object;
  json: object;
};

// Compile-time check: CommonTypes must cover every column type defined in
// columns.ts, with no extraneous keys
type _CommonTypesExhaustive = [AllColumnTypes] extends [keyof CommonTypes]
  ? [keyof CommonTypes] extends [AllColumnTypes]
    ? true
    : never
  : never;
const _assertCommonTypesExhaustive: _CommonTypesExhaustive = true;

type ColumnTypeKysely<
  SelectType,
  InsertType = SelectType,
  UpdateType = SelectType,
> = {
  readonly __insert__: InsertType;
  readonly __select__: SelectType;
  readonly __update__: UpdateType;
};

type ColType<Col, TypeMap extends Record<string, unknown>> = Col extends {
  schema: StandardSchemaV1;
  type: keyof TypeMap;
}
  ? // Ensure that schema output is assignable to the expected type for the column type, otherwise fallback to the default type
    StandardSchemaV1.InferOutput<Col["schema"]> extends TypeMap[Col["type"]]
    ? StandardSchemaV1.InferOutput<Col["schema"]>
    : TypeMap[Col["type"]]
  : Col extends { type: keyof TypeMap }
    ? TypeMap[Col["type"]]
    : never;

// Infer kysely types from database
export type InferKyselyTypes<
  D extends Record<string, { columns: Record<string, { type: string }> }>,
  TypeMap extends Record<string, unknown> = CommonTypes,
> = {
  // prettier-ignore
  [K in keyof D]: {
    [C in keyof D[K]["columns"]]: ColumnTypeKysely<
      // Select
      | ColType<D[K]["columns"][C], TypeMap>
      | (D[K]["columns"][C] extends { nullable: true } ? null : never),
      // Insert
      D[K]["columns"][C] extends { notInsertable: true }
        ? never
        :
          | ColType<D[K]["columns"][C], TypeMap>
          | (D[K]["columns"][C] extends { nullable: true } ? null | undefined : never)
          | (D[K]["columns"][C] extends { default: infer _ } ? undefined : never),
      // Update
      D[K]["columns"][C] extends { notUpdatable: true }
        ? never
        :
            | ColType<D[K]["columns"][C], TypeMap>
            | (D[K]["columns"][C] extends { nullable: true } ? null : never)
    >;
  };
};
