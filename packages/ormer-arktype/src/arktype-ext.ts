import { scope, TraversalError, type, Type, type Scope } from "arktype";

// Note about type names:
//
// Arktype has convention that $ is the scope type parameter. E.g. Scope<$> or
// Type<A, $>.

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
});

type InferScopeType<S> = S extends Scope<infer $> ? $ : never;
type $Db = InferScopeType<typeof _db>;
type RemoveUnionItem<T, U> = T extends U ? never : T;
type StringLiteral<T extends string> = string extends T ? never : T;
type PrimaryKey = {
  readonly db: { readonly primaryKey: true };
};

type TableName<Name extends string> = {
  readonly db: { readonly tableName: Name };
};

type ForeignKey<Table extends string, Column extends string> = {
  readonly db: {
    readonly foreignKeyTable: Table;
    readonly foreignKeyColumn: Column;
  };
};
export type FormatId =
  | "float32"
  | "float64"
  | "int8"
  | "int16"
  | "int32"
  | "uint8"
  | "uint16"
  | "uint32"
  | "int64"
  | "uint64"
  | "uint128";
export type Format<F extends FormatId> = {
  readonly db: { readonly format: F };
};

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
});

/**
 * Primary key type
 */
function primaryKey<$ extends $Db, const def, r = type.instantiate<def, $>>(
  def: type.validate<def, $>,
): r extends Type<infer A, $> ? Type<A | PrimaryKey, $> : never {
  const obj = (_db.type as any)(def);
  Object.assign(obj, { db: { ...(obj.db ?? {}), primaryKey: true } });
  return obj;
}

/**
 * Typed foreign key reference to a specific table and column.
 */
function foreignKeyRef<
  T extends Type<any, any> & TableName<string>,
  C extends T extends Type<infer A, infer _> ? keyof A : never,
>(
  t: T,
  col: C,
): Type<
  T extends Type<infer A, infer $>
    ?
        | RemoveUnionItem<A[C], PrimaryKey>
        | ForeignKey<T extends TableName<infer N> ? N : never, C>
    : never,
  T extends Type<infer _, infer $> ? $ : never
> {
  const obj = (_db.type as any)(t as any).get(col);
  Object.assign(obj, {
    db: {
      ...(obj.db ?? {}),
      foreignKeyTable: (t as any).db.tableName,
      foreignKeyColumn: col,
    },
  });
  return obj;
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
  const obj = (_db.type as any)(def);
  Object.assign(obj, {
    db: {
      ...(obj.db ?? {}),
      foreignKeyTable: tableName,
      foreignKeyColumn: columnName,
    },
  });
  return obj;
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
  // Note above type: TableName is addeed to the return type with intersection
  const obj = (_db.type as any)(def);
  Object.assign(obj, { db: { ...(obj.db ?? {}), tableName: name } });
  return obj;
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

/**
 * Format type
 *
 * Purpose is to retain format information at type-level and in runtime with
 * configure.
 */
function format<
  const F extends FormatId,
  $ extends Scope<{}>,
  const def,
  r = type.instantiate<def, $>,
>(
  format: F,
  def: type.validate<def, $>,
): r extends Type<infer A, $> ? Type<A | Format<F>, $> : never {
  const obj = (type as any)(def);
  Object.assign(obj, { db: { ...(obj.db ?? {}), format } });
  obj.configure({ format });
  return obj;
}
