import type { PgUnifiedTypeMapping } from "./index.ts";
import type { StandardSchemaV1 } from "./standardschema.ts";

type ColumnTypeKysely<
  SelectType,
  InsertType = SelectType,
  UpdateType = SelectType,
> = {
  readonly __insert__: InsertType;
  readonly __select__: SelectType;
  readonly __update__: UpdateType;
};

// Structural constraint for a unified type mapping (like PgUnifiedTypeMapping)
type UnifiedMapping = Record<
  string,
  { __select__: any; __insert__: any; __update__: any }
>;

// Filter keys of a record to only those whose value has a `type` property
type KeysWithColumnType<T> = {
  [K in keyof T]: T[K] extends { type: string } ? K : never;
}[keyof T];

// Recurse array dimensions from the `array` string literal,
// e.g. "[]" or "[][3]", applying them to the base type T.
type ApplyArrays<Col, T> = Col extends { array: infer TypeStr extends string }
  ? TypeStr extends `${infer Prefix}[${infer _}]${infer Suffix}`
    ? ApplyArrays<{ array: `${Prefix}${Suffix}` }, T[]>
    : T
  : T;

// Look up the column's entry in the unified type map
// prettier-ignore
type ColIO<Col, UnifiedMap extends UnifiedMapping> = 
    Col extends { schema: infer S extends StandardSchemaV1 } ? {
      __insert__: StandardSchemaV1.InferOutput<S>;
      __select__: StandardSchemaV1.InferInput<S>;
      __update__: StandardSchemaV1.InferOutput<S>;
    }
  : Col extends { type: infer T extends string; } ? UnifiedMap[T]
  : never;

// Infer the SELECT type for a column
export type InferKyselySelectCol<Col, UnifiedMap extends UnifiedMapping> =
  ColIO<Col, UnifiedMap> extends { __select__: infer O }
    ? ApplyArrays<Col, O> | (Col extends { nullable: true } ? null : never)
    : never;

// Infer the INSERT type for a column
export type InferKyselyInsertCol<
  Col,
  UnifiedMap extends UnifiedMapping,
> = Col extends {
  notInsertable: true;
}
  ? never
  : ColIO<Col, UnifiedMap> extends { __insert__: infer I }
    ?
        | ApplyArrays<Col, I>
        | (Col extends { nullable: true } ? null | undefined : never)
        | (Col extends { default: infer _ } ? undefined : never)
        | (Col extends { autoIncrement: true } ? undefined : never)
    : never;

// Infer the UPDATE type for a column
export type InferKyselyUpdateCol<
  Col,
  UnifiedMap extends UnifiedMapping,
> = Col extends {
  notUpdatable: true;
}
  ? never
  : ColIO<Col, UnifiedMap> extends { __update__: infer I }
    ?
        | ApplyArrays<Col, I>
        | (Col extends { nullable: true } ? null | undefined : never)
    : never;

/**
 * Infer Kysely-compatible table types from ormer tables using a unified
 * type mapping (e.g. PgUnifiedTypeMapping) that maps column type names
 * to their input/output types.
 */
export type InferKyselyTypes<
  D extends Record<string, { columns: Record<string, any> }>,
  UnifiedMap extends UnifiedMapping,
> = {
  [K in keyof D]: {
    [C in KeysWithColumnType<D[K]["columns"]>]: ColumnTypeKysely<
      InferKyselySelectCol<D[K]["columns"][C], UnifiedMap>,
      InferKyselyInsertCol<D[K]["columns"][C], UnifiedMap>,
      InferKyselyUpdateCol<D[K]["columns"][C], UnifiedMap>
    >;
  };
};
