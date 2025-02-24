// deno-lint-ignore-file no-explicit-any
import * as k from "npm:kysely";
import * as o from "./columns.ts";
import { createDbFactory, InfeKyselyTables } from "./database.ts";
import { table } from "./table.ts";
import { assert } from "jsr:@std/assert";
import { TYPES_TO_SCHEMAS } from "./schemas.ts";

type Expect<T extends true> = T;
type Equal<X, Y> = (<T>() => T extends X ? 1 : 2) extends <T>() => T extends Y ? 1 : 2
    ? true
    : false;

Deno.test("createDbFactory", () => {
    const PERSON_TABLE = table("person", {
        someNullable: o.string({ nullable: true }),
        someDefault: o.string({ default: "foo" }),
        someNotInsertable: o.string({ notInsertable: true }),
        someNotUpdateable: o.string({ notUpdatable: true }),
        someNullableNotUpdateable: o.string({ nullable: true, notUpdatable: true }),
        someNullableNotInsertable: o.string({ nullable: true, notInsertable: true }),
    });

    type Database = InfeKyselyTables<[typeof PERSON_TABLE], typeof TYPES_TO_SCHEMAS>;

    // Pure type level test
    true satisfies Expect<
        Equal<
            Database["person"]["someNullable"],
            k.ColumnType<string | null, string | null, string | null>
        >
    >;
    true satisfies Expect<
        Equal<Database["person"]["someDefault"], k.ColumnType<string, string | undefined, string>>
    >;
    true satisfies Expect<
        Equal<Database["person"]["someNotInsertable"], k.ColumnType<string, never, string>>
    >;
    true satisfies Expect<
        Equal<Database["person"]["someNotUpdateable"], k.ColumnType<string, string, never>>
    >;
    true satisfies Expect<
        Equal<
            Database["person"]["someNullableNotUpdateable"],
            k.ColumnType<string | null, string | null, never>
        >
    >;
    true satisfies Expect<
        Equal<
            Database["person"]["someNullableNotInsertable"],
            k.ColumnType<string | null, never, string | null>
        >
    >;

    const dbFactory = createDbFactory(PERSON_TABLE);

    const foo = dbFactory.createKyselyDb({
        dialect: {
            createDriver: () => ({} as any),
            createQueryCompiler: () => ({} as any),
            createAdapter: () => ({} as any),
            createIntrospector: () => ({} as any),
        },
    });

    assert(foo instanceof k.Kysely);
});
