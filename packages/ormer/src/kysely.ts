import type { AllColumnTypes, MapColumnsToValue } from "./columnhelpers.ts";
import type { StandardSchemaV1 } from "@standard-schema/spec";
import type { Database } from "./database.ts";
import type { ColumnType, Table } from "./index.ts";

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
  SelectTypeMap extends Record<string, unknown> = CommonTypes,
  InsertTypeMap extends Record<string, unknown> = CommonTypes,
  UpdateTypeMap extends Record<string, unknown> = CommonTypes,
> = {
  // prettier-ignore
  [K in keyof D]: {
    [C in keyof D[K]["columns"]]: ColumnTypeKysely<
      // Select
      | ColType<D[K]["columns"][C], SelectTypeMap>
      | (D[K]["columns"][C] extends { nullable: true } ? null : never),
      // Insert
      D[K]["columns"][C] extends { notInsertable: true }
        ? never
        :
          | ColType<D[K]["columns"][C], InsertTypeMap>
          | (D[K]["columns"][C] extends { nullable: true } ? null | undefined : never)
          | (D[K]["columns"][C] extends { default: infer _ } ? undefined : never),
      // Update
      D[K]["columns"][C] extends { notUpdatable: true }
        ? never
        :
            | ColType<D[K]["columns"][C], UpdateTypeMap>
            | (D[K]["columns"][C] extends { nullable: true } ? null : never)
    >;
  };
};

// Wrap schema with select-specific modifiers (nullable)
type WithSelectModifiers<
  Col,
  Schema extends StandardSchemaV1<any, any>,
> = Col extends { nullable: true }
  ? Schema extends StandardSchemaV1<infer I, infer O>
    ? StandardSchemaV1<I | null, O | null>
    : Schema
  : Schema;

// Extract the select schema for a column
type GetSelectColumnSchema<
  Col,
  TypeSchemas extends Record<string, StandardSchemaV1<any, any>>,
> = Col extends { schema: infer S extends StandardSchemaV1<any, any> }
  ? WithSelectModifiers<Col, S>
  : Col extends { type: infer T extends keyof TypeSchemas }
    ? WithSelectModifiers<Col, TypeSchemas[T]>
    : never;

type GetSelectSchemaInput<
  Table extends Record<string, { type: string }>,
  SelectTypeSchemas extends Record<string, StandardSchemaV1<any, any>>,
> = {
  [K in keyof Table]: GetSelectColumnSchema<
    Table[K],
    SelectTypeSchemas
  > extends StandardSchemaV1<infer I, any>
    ? I
    : never;
};

type GetSelectSchemaOutput<
  Table extends Record<string, { type: string }>,
  SelectTypeSchemas extends Record<string, StandardSchemaV1<any, any>>,
> = {
  [K in keyof Table]: GetSelectColumnSchema<
    Table[K],
    SelectTypeSchemas
  > extends StandardSchemaV1<any, infer O>
    ? O
    : never;
};

export function getSelectSchema<
  Table extends Record<string, { type: string }>,
  SelectTypeSchemas extends Partial<
    MapColumnsToValue<StandardSchemaV1<any, any>>
  >,
>(
  table: Table,
  selectTypeSchemas: SelectTypeSchemas,
): StandardSchemaV1<
  GetSelectSchemaInput<Table, SelectTypeSchemas>,
  GetSelectSchemaOutput<Table, SelectTypeSchemas>
> {
  return {} as any;
}

// Wrap schema with insert-specific modifiers (nullable, default)
type WithInsertModifiers<Col, Schema extends StandardSchemaV1<any, any>> =
  Schema extends StandardSchemaV1<infer I, infer O>
    ? Col extends { notInsertable: true }
      ? never // Column is omitted entirely
      : StandardSchemaV1<
          | I
          | (Col extends { nullable: true } ? null | undefined : never)
          | (Col extends { default: infer _ } ? undefined : never),
          | O
          | (Col extends { nullable: true } ? null : never)
          | (Col extends { default: infer _ } ? undefined : never)
        >
    : never;

// Extract the insert schema for a column
type GetInsertColumnSchema<
  Col,
  TypeSchemas extends Record<string, StandardSchemaV1<any, any>>,
> = Col extends { schema: infer S extends StandardSchemaV1<any, any> }
  ? WithInsertModifiers<Col, S>
  : Col extends { type: infer T extends keyof TypeSchemas }
    ? WithInsertModifiers<Col, TypeSchemas[T]>
    : never;

type GetInsertSchemaInput<
  Table extends Record<string, { type: string }>,
  InsertTypeSchemas extends Record<string, StandardSchemaV1<any, any>>,
> = {
  [K in keyof Table as GetInsertColumnSchema<
    Table[K],
    InsertTypeSchemas
  > extends never
    ? never
    : K]: GetInsertColumnSchema<
    Table[K],
    InsertTypeSchemas
  > extends StandardSchemaV1<infer I, any>
    ? I
    : never;
};

type GetInsertSchemaOutput<
  Table extends Record<string, { type: string }>,
  InsertTypeSchemas extends Record<string, StandardSchemaV1<any, any>>,
> = {
  [K in keyof Table as GetInsertColumnSchema<
    Table[K],
    InsertTypeSchemas
  > extends never
    ? never
    : K]: GetInsertColumnSchema<
    Table[K],
    InsertTypeSchemas
  > extends StandardSchemaV1<any, infer O>
    ? O
    : never;
};

export function getInsertSchema<
  Table extends Record<string, { type: string }>,
  InsertTypeSchemas extends Partial<
    MapColumnsToValue<StandardSchemaV1<any, any>>
  >,
>(
  table: Table,
  insertTypeSchemas: InsertTypeSchemas,
): StandardSchemaV1<
  GetInsertSchemaInput<Table, InsertTypeSchemas>,
  GetInsertSchemaOutput<Table, InsertTypeSchemas>
> {
  return {} as any;
}
