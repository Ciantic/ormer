import type { AllColumnTypes, MapColumnsToValue } from "./columnhelpers.ts";
import type { StandardSchemaV1 } from "@standard-schema/spec";
import type { Database } from "./database.ts";
import type { ColumnType, Table } from "./index.ts";

type FinalType<T> = T extends infer U ? { [K in keyof U]: U[K] } : never;

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
  FinalType<GetSelectSchemaInput<Table, SelectTypeSchemas>>,
  FinalType<GetSelectSchemaOutput<Table, SelectTypeSchemas>>
> {
  return {} as any;
}

// Keys that should be omitted from insert schema (notInsertable)
type InsertOmittedKeys<Table> = {
  [K in keyof Table]: Table[K] extends { notInsertable: true } ? K : never;
}[keyof Table];

// Keys that remain in the insert schema
type InsertKeptKeys<Table> = Exclude<keyof Table, InsertOmittedKeys<Table>>;

// Keys that should be required in insert schema (not nullable, no default, kept)
type InsertRequiredKeys<Table> = {
  [K in InsertKeptKeys<Table>]: Table[K] extends { nullable: true }
    ? never
    : Table[K] extends { default: infer _ }
      ? never
      : K;
}[InsertKeptKeys<Table>];

// Required part of insert schema
type GetInsertSchemaRequiredInput<
  Table extends Record<string, { type: string }>,
  InsertTypeSchemas extends Record<string, StandardSchemaV1<any, any>>,
> = {
  [K in InsertRequiredKeys<Table>]: GetBaseSchema<
    Table[K],
    InsertTypeSchemas
  > extends StandardSchemaV1<infer I, any>
    ? I
    : never;
};

type GetInsertSchemaRequiredOutput<
  Table extends Record<string, { type: string }>,
  InsertTypeSchemas extends Record<string, StandardSchemaV1<any, any>>,
> = {
  [K in InsertRequiredKeys<Table>]: GetBaseSchema<
    Table[K],
    InsertTypeSchemas
  > extends StandardSchemaV1<any, infer O>
    ? O
    : never;
};

// Optional part of insert schema (all kept keys that are nullable or have default)
type GetInsertSchemaOptionalInput<
  Table extends Record<string, { type: string }>,
  InsertTypeSchemas extends Record<string, StandardSchemaV1<any, any>>,
> = {
  [K in Exclude<
    InsertKeptKeys<Table>,
    InsertRequiredKeys<Table>
  >]?: GetBaseSchema<Table[K], InsertTypeSchemas> extends StandardSchemaV1<
    infer I,
    any
  >
    ? ApplyNullable<I, Table[K]> | undefined
    : never;
};

type GetInsertSchemaOptionalOutput<
  Table extends Record<string, { type: string }>,
  InsertTypeSchemas extends Record<string, StandardSchemaV1<any, any>>,
> = {
  [K in Exclude<
    InsertKeptKeys<Table>,
    InsertRequiredKeys<Table>
  >]?: GetBaseSchema<Table[K], InsertTypeSchemas> extends StandardSchemaV1<
    any,
    infer O
  >
    ? ApplyNullable<O, Table[K]> | undefined
    : never;
};

// Combine required and optional parts
type GetInsertSchemaInput<
  Table extends Record<string, { type: string }>,
  InsertTypeSchemas extends Record<string, StandardSchemaV1<any, any>>,
> = GetInsertSchemaRequiredInput<Table, InsertTypeSchemas> &
  GetInsertSchemaOptionalInput<Table, InsertTypeSchemas>;

type GetInsertSchemaOutput<
  Table extends Record<string, { type: string }>,
  InsertTypeSchemas extends Record<string, StandardSchemaV1<any, any>>,
> = GetInsertSchemaRequiredOutput<Table, InsertTypeSchemas> &
  GetInsertSchemaOptionalOutput<Table, InsertTypeSchemas>;

/**
 * Return schema where non-insertable fields are omitted, nullable and default
 * fields are optional, and all other fields are required. Nullable optional
 * fields also accept null in input and null in output.
 */
export function getInsertSchema<
  Table extends Record<string, { type: string }>,
  InsertTypeSchemas extends Partial<
    MapColumnsToValue<StandardSchemaV1<any, any>>
  >,
>(
  table: Table,
  insertTypeSchemas: InsertTypeSchemas,
): StandardSchemaV1<
  FinalType<GetInsertSchemaInput<Table, InsertTypeSchemas>>,
  FinalType<GetInsertSchemaOutput<Table, InsertTypeSchemas>>
> {
  return {} as any;
}

// Helper to get the base schema for a column (from column schema or type map)
type GetBaseSchema<
  Col,
  TypeSchemas extends Record<string, StandardSchemaV1<any, any>>,
> = Col extends { schema: infer S extends StandardSchemaV1<any, any> }
  ? S
  : Col extends { type: infer T extends keyof TypeSchemas }
    ? TypeSchemas[T]
    : never;

// Helper to apply nullable modifier
type ApplyNullable<T, Col> = Col extends { nullable: true } ? T | null : T;

// Keys that should be required in patch schema (primaryKey or updateKey)
type PatchRequiredKeys<Table> = {
  [K in keyof Table]: Table[K] extends
    | { primaryKey: true }
    | { updateKey: true }
    ? K
    : never;
}[keyof Table];

// Keys that should be omitted from patch schema (notUpdatable and not primaryKey/updateKey)
type PatchOmittedKeys<Table> = {
  [K in keyof Table]: Table[K] extends { notUpdatable: true }
    ? Table[K] extends { primaryKey: true } | { updateKey: true }
      ? never
      : K
    : never;
}[keyof Table];

// Keys that remain in the patch schema
type PatchKeptKeys<Table> = Exclude<keyof Table, PatchOmittedKeys<Table>>;

// Required part of patch schema
type GetPatchSchemaRequiredInput<
  Table extends Record<string, { type: string }>,
  PatchTypeSchemas extends Record<string, StandardSchemaV1<any, any>>,
> = {
  [K in PatchRequiredKeys<Table> & PatchKeptKeys<Table>]: GetBaseSchema<
    Table[K],
    PatchTypeSchemas
  > extends StandardSchemaV1<infer I, any>
    ? ApplyNullable<I, Table[K]>
    : never;
};

type GetPatchSchemaRequiredOutput<
  Table extends Record<string, { type: string }>,
  PatchTypeSchemas extends Record<string, StandardSchemaV1<any, any>>,
> = {
  [K in PatchRequiredKeys<Table> & PatchKeptKeys<Table>]: GetBaseSchema<
    Table[K],
    PatchTypeSchemas
  > extends StandardSchemaV1<any, infer O>
    ? ApplyNullable<O, Table[K]>
    : never;
};

// Optional part of patch schema (all non-required kept keys)
type GetPatchSchemaOptionalInput<
  Table extends Record<string, { type: string }>,
  PatchTypeSchemas extends Record<string, StandardSchemaV1<any, any>>,
> = {
  [K in Exclude<
    PatchKeptKeys<Table>,
    PatchRequiredKeys<Table>
  >]?: GetBaseSchema<Table[K], PatchTypeSchemas> extends StandardSchemaV1<
    infer I,
    any
  >
    ? ApplyNullable<I, Table[K]> | undefined
    : never;
};

type GetPatchSchemaOptionalOutput<
  Table extends Record<string, { type: string }>,
  PatchTypeSchemas extends Record<string, StandardSchemaV1<any, any>>,
> = {
  [K in Exclude<
    PatchKeptKeys<Table>,
    PatchRequiredKeys<Table>
  >]?: GetBaseSchema<Table[K], PatchTypeSchemas> extends StandardSchemaV1<
    any,
    infer O
  >
    ? ApplyNullable<O, Table[K]> | undefined
    : never;
};

// Combine required and optional parts
type GetPatchSchemaInput<
  Table extends Record<string, { type: string }>,
  PatchTypeSchemas extends Record<string, StandardSchemaV1<any, any>>,
> = GetPatchSchemaRequiredInput<Table, PatchTypeSchemas> &
  GetPatchSchemaOptionalInput<Table, PatchTypeSchemas>;

type GetPatchSchemaOutput<
  Table extends Record<string, { type: string }>,
  PatchTypeSchemas extends Record<string, StandardSchemaV1<any, any>>,
> = GetPatchSchemaRequiredOutput<Table, PatchTypeSchemas> &
  GetPatchSchemaOptionalOutput<Table, PatchTypeSchemas>;

/**
 * Return schema where updateable fields are optional, but primary keys and
 * update keys are required. Nullable fields are still nullable, and default
 * values are still optional in both input and output.
 */
export function getPatchSchema<
  Table extends Record<string, { type: string }>,
  PatchTypeSchemas extends Partial<
    MapColumnsToValue<StandardSchemaV1<any, any>>
  >,
>(
  table: Table,
  patchTypeSchemas: PatchTypeSchemas,
): StandardSchemaV1<
  FinalType<GetPatchSchemaInput<Table, PatchTypeSchemas>>,
  FinalType<GetPatchSchemaOutput<Table, PatchTypeSchemas>>
> {
  return {} as any;
}
