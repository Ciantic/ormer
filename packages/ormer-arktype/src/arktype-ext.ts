import { scope, TraversalError, type, Type, type Scope } from "arktype";

const _db = scope({
  float32: type("number#float32").configure({ format: "float32" }),
  float64: type("number#float64").configure({ format: "float64" }),
  int8: type("number.integer#int8").configure({ format: "int8" }),
  int16: type("number.integer#int16").configure({ format: "int16" }),
  int32: type("number.integer#int32").configure({ format: "int32" }),
  uint8: type("number.integer#uint8").configure({ format: "uint8" }),
  uint16: type("number.integer#uint16").configure({ format: "uint16" }),
  uint32: type("number.integer#uint32").configure({ format: "uint32" }),
  int64: type("bigint#int64").configure({ format: "int64" }),
  uint64: type("bigint#uint64").configure({ format: "uint64" }),
  uint128: type("bigint#uint128").configure({ format: "uint128" }),
});

type InferScopeType<S> = S extends Scope<infer $> ? $ : never;
type $Db = InferScopeType<typeof _db>;
type RemoveUnionItem<T, U> = T extends U ? never : T;
type StringLiteral<T extends string> = string extends T ? never : T;

// function foo<$ extends DbInner, const def, r = type.instantiate<def, $>>(
//   def: type.validate<def, $>,
// ): r extends infer _ ? _ : never {
//   return null as any;
// }

// foo("number.integer");
// foo("int64");
// // @ts-expect-error
// foo("number.integerfsadf");

export const db = Object.assign(_db, {
  primaryKey: primaryKey as typeof primaryKey,
  foreignKey: foreignKey as typeof foreignKey,
  foreignKeyRef: foreignKeyRef as typeof foreignKeyRef,
  table: table as typeof table,
});

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

const InvoiceTable = db.table("invoices", {
  id: db.primaryKey("int32"),
  title: "string",
});

// type InvoiceId = typeof InvoiceTable.out;

const invoiceId = foreignKeyRef(InvoiceTable, "id");

// const InvoiceRow = type({
//   id: db.primaryKey(db.type("int32")),
//   invoiceId: foreignKeyRef(InvoiceTable, "id"),
// });

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

/*

const FooKey = primaryKey(db.type("int32"));
const ZooBrand = db.type("int32").brand("zoo");

const User = db.type({
  someidishere: primaryKey(db.type("int32")),
  someothertest: db.type("number#zoo"),
  something: db.type("int32"),
  othervalue: "int64",
  name: "string",
  "address?": "string",
  lastLoggedIn: "Date | null | undefined",
  email: "string.email",
});

const UserTable = table("users", User);

const OtherTable = UserTable.omit("address");

console.log("User table name:", UserTable.db.tableName); // "users"
console.log("Other table name:", (OtherTable as any)?.db?.tableName); // "users"

type InputType = typeof User.infer;
type UserTableInput = typeof UserTable.infer;

User.from({
  someidishere: 5,
  someothertest: 42,
  something: 123,
  othervalue: 123456789n,
  name: "Alice",
  email: "alice@example.com",
  lastLoggedIn: new Date("2024-01-15T10:30:00Z"),
  address: "123 Main St",
});

const Test = type({
  id: "number > 10",
  name: "string",
});

try {
  const foo = Test.from({ id: 5, name: "Test" });
} catch (er) {
  if (er instanceof TraversalError) {
    // console.log("Traversal error:", er);
  }
}

function runtimeInspect(t: Type<any, any>) {
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

runtimeInspect(User);
*/
