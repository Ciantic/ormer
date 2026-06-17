import { scope, type, Type, type Scope } from "arktype";

export const KNOWN_DB_FORMATS = [
  "float32",
  "float64",
  "int8",
  "int16",
  "int32",
  "uint8",
  "uint16",
  "uint32",
  "int64",
  "uint64",
  "uint128",
  "uuid",
  "uuid.v1",
  "uuid.v2",
  "uuid.v3",
  "uuid.v4",
  "uuid.v5",
  "uuid.v6",
  "uuid.v7",
  "uuid.v8",
  "datepart",
  "timepart",
  "naivedatetime",
] as const;

export const KNWON_DB_TYPES = [
  "string",
  "number",
  "bigint",
  "boolean",
  "Date",
  "object",
] as const;

// Note about type names:
//
// Arktype has convention that $ is the scope type parameter. E.g. Scope<$> or
// Type<A, $>.
export type DbFormatId = (typeof KNOWN_DB_FORMATS)[number];

export type KnwownDbType = (typeof KNWON_DB_TYPES)[number];

const _db = scope({
  float32: format("float32", "number"),
  float64: format("float64", "number"),
  int8: format("int8", "number.integer"),
  int16: format("int16", "number.integer"),
  int32: format("int32", "number.integer"),
  uint8: format("uint8", "number.integer"),
  uint16: format("uint16", "number.integer"),
  uint32: format("uint32", "number.integer"),
  int64: format("int64", "bigint"),
  uint64: format("uint64", "bigint"),
  uint128: format("uint128", "bigint"),
  uuid: format("uuid", "string.uuid"),
  ["uuid.v1"]: format("uuid.v1", "string.uuid.v1"),
  ["uuid.v2"]: format("uuid.v2", "string.uuid.v2"),
  ["uuid.v3"]: format("uuid.v3", "string.uuid.v3"),
  ["uuid.v4"]: format("uuid.v4", "string.uuid.v4"),
  ["uuid.v5"]: format("uuid.v5", "string.uuid.v5"),
  ["uuid.v6"]: format("uuid.v6", "string.uuid.v6"),
  ["uuid.v7"]: format("uuid.v7", "string.uuid.v7"),
  ["uuid.v8"]: format("uuid.v8", "string.uuid.v8"),
  datepart: format("datepart", "string.date"),
  timepart: format(
    "timepart",
    "/^([01]\\d|2[0-3]):[0-5]\\d:[0-5]\\d(\\.\\d+)?$/" as type.cast<string>,
  ),
  naivedatetime: format(
    "naivedatetime",
    "/^\\d{4}-\\d{2}-\\d{2} \\d{2}:\\d{2}:\\d{2}(\\.\\d+)?$/" as type.cast<string>,
  ),
} satisfies Record<DbFormatId, any>);

type InferScopeType<S> = S extends Scope<infer $> ? $ : never;
type $Db = InferScopeType<typeof _db>;
type RemoveUnionItem<T, U> = T extends U ? never : T;
type StringLiteral<T extends string> = string extends T ? never : T;
export type PrimaryKey = {
  readonly [" primaryKey"]: true;
};

export type TableName<Name extends string> = {
  readonly [" tableName"]: Name;
};

export type ForeignKey<Table extends string, Column extends string> = {
  readonly [" foreignKey"]: {
    table: Table;
    column: Column;
  };
};

export type VarChar<N extends number> = { readonly [" varchar"]: N };

export type DbFormat<F extends DbFormatId> = {
  readonly [" dbformat"]: F;
};

export type CustomMeta = {
  dbformat?: DbFormatId;
  foreignKeyTable?: string;
  foreignKeyColumn?: string;
  primaryKey?: true;
  tableName?: string;
  varchar?: number;
};

declare global {
  interface ArkEnv {
    meta(): CustomMeta;
  }
}

export const db = Object.assign(_db, {
  /**
   * Assign type with a primary key
   *
   * @example
   * ```ts
   * const User = db.table("users", {
   *   id: db.primaryKey("int64"),
   *   name: "string",
   * });
   * ```
   */
  primaryKey: primaryKey,

  /**
   * Foreign key without type information. This is less safe than `foreignKeyRef` but can be useful in some cases where you don't have access to the full table type.
   *
   * @example
   * ```ts
   * const Post = db.table("posts", {
   *   id: db.primaryKey("int64"),
   *   authorId: db.foreignKey("int64", "users", "id"),
   * });
   * ```
   */

  foreignKey: foreignKey,
  /**
   * Foreign key reference to a specific table and column. This is the safest option as it ensures the referenced table and column exist and are of compatible types.
   *
   * @example
   * ```ts
   * const User = db.table("users", {
   *   id: db.primaryKey("int64"),
   * });
   *
   * const Post = db.table("posts", {
   *   id: db.primaryKey("int64"),
   *   authorId: db.foreignKeyRef(User, "id"),
   * });
   * ```
   */

  foreignKeyRef: foreignKeyRef,
  /**
   * Define a table with a name and a schema. The table name is stored in the type for use in foreign key references and other metadata.
   *
   * @example
   * ```ts
   * const User = db.table("users", {
   *   id: db.primaryKey("int64"),
   *   name: "string",
   * });
   * ```
   */
  table: table,

  /**
   * Varchar
   */
  varchar: varchar,
});

/**
 * Primary key type
 */
function primaryKey<$ extends $Db, const def, r = type.instantiate<def, $>>(
  def: type.validate<def, $>,
): r extends Type<infer A, $> ? Type<A | PrimaryKey, $> : never {
  return _db.type(def as any).configure({
    primaryKey: true,
  }) as any;
}

/**
 * Typed foreign key reference to a specific table and column.
 */
function foreignKeyRef<
  T extends Type<any, any> & TableName<string>,
  C extends T extends Type<infer A, infer _> ? keyof A : never,
>(
  t: T,
  col: C & string,
): Type<
  T extends Type<infer A, infer $>
    ?
        | RemoveUnionItem<A[C], PrimaryKey>
        | ForeignKey<T extends TableName<infer N> ? N : never, C>
    : never,
  T extends Type<infer _, infer $> ? $ : never
> {
  return (
    (_db.type(t as unknown as C) as Type<object, {}>).get(col) as
      | Type<any, any>
      | undefined
  )?.configure({
    primaryKey: undefined as any,
    foreignKeyTable: (t as any).meta.tableName,
    foreignKeyColumn: col,
  }) as any;
}

/**
 * Untyped foreign key reference to a specific table and column. This is less
 * safe than `foreignKeyRef` but can be useful in some cases where you don't
 * have access to the full table type.
 */
function foreignKey<
  const Table extends string,
  const Column extends string,
  $ extends $Db,
  const def,
  r = type.instantiate<def, $>,
>(
  def: type.validate<def, $>,
  tableName: StringLiteral<Table>,
  columnName: StringLiteral<Column>,
): r extends Type<infer A, $> ? Type<A | ForeignKey<Table, Column>, $> : never {
  return _db.type(def as any).configure({
    foreignKeyColumn: columnName,
    foreignKeyTable: tableName,
  }) as any;
}

/**
 * Primary key type
 */
function table<
  const N extends string,
  $ extends $Db,
  const def,
  r = type.instantiate<def, $>,
>(
  name: StringLiteral<N>,
  def: type.validate<def, $>,
): r extends infer _ ? _ & TableName<N> : never {
  return _db.type(def as any).configure({
    tableName: name,
  }) as any;
}

/**
 * Format type
 *
 * Purpose is to retain format information at type-level and in runtime with
 * configure.
 */
function format<
  const F extends DbFormatId,
  $ extends Scope<{}>,
  const def,
  r = type.instantiate<def, $>,
>(
  dbformat: F,
  def: type.validate<def, $>,
): r extends Type<infer A, $> ? Type<A | DbFormat<F>, $> : never {
  return type(def as any).configure({ dbformat }) as any;
}

/**
 * Varchar type
 */
function varchar<const N extends number>(
  chars: N,
): Type<string | VarChar<N>, Scope<{}>> {
  return type(("string <= " + chars) as any).configure({
    varchar: chars,
  }) as any;
}

export function runtimeInspect(t: Type<any, any>) {
  const structure = (t as any).structure;
  const fields = [...structure?.required, ...(structure?.optional ?? [])];
  for (const required of fields) {
    const colName = required.key;
    const valNode = required.value;

    // Try format meta (for our custom DB types)
    const format = valNode?.meta?.format;

    // For built-in types, build a description from the node structure
    let expr = valNode.expression;
    let kind = valNode.kind;
    let meta = valNode.meta;
    let db = valNode.db ?? {};

    console.log(
      `${colName}: ${expr} ## ${kind} ## ${JSON.stringify(db)} ## ${JSON.stringify(meta)}`,
    );
  }
}
