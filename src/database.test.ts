// deno-lint-ignore-file no-explicit-any
import * as v from "npm:valibot";
import * as k from "npm:kysely";
import * as c from "./columns.ts";
import { createKyselyDb, createTables } from "./database.ts";
import { table } from "./table.ts";
import { assert, assertEquals } from "jsr:@std/assert";
import { TYPES_TO_SCHEMAS } from "./schemas.ts";
import { POSTGRES_COLUMN_TYPES } from "./drivers/postgres.ts";

type Expect<T extends true> = T;
type Equal<X, Y> = (<T>() => T extends X ? 1 : 2) extends <T>() => T extends Y ? 1 : 2
    ? true
    : false;

Deno.test("createDbFactory", () => {
    const PERSON_TABLE = table("person", {
        someNullable: c.string({ nullable: true }),
        someDefault: c.string({ default: "foo" }),
        someNotInsertable: c.string({ notInsertable: true }),
        someNotUpdateable: c.string({ notUpdatable: true }),
        someNullableNotUpdateable: c.string({ nullable: true, notUpdatable: true }),
        someNullableNotInsertable: c.string({ nullable: true, notInsertable: true }),
        someZoo: {
            type: "zoo",
            params: undefined,
        } as const,
    });

    // type Database = InferKyselyTables<[typeof PERSON_TABLE], typeof TYPES_TO_SCHEMAS>;

    const db = createKyselyDb({
        tables: [PERSON_TABLE],
        kysely: {
            dialect: {
                createDriver: () => ({} as any),
                createQueryCompiler: () => ({} as any),
                createAdapter: () => ({} as any),
                createIntrospector: () => ({} as any),
            },
        },
        types: {
            ...TYPES_TO_SCHEMAS,
            zoo: () => v.string(),
        },
    });

    // Pure type level test

    type ExtractKyselyTable<T> = T extends k.Kysely<infer U> ? U : never;

    true satisfies Expect<
        Equal<
            ExtractKyselyTable<typeof db>["person"]["someNullable"],
            k.ColumnType<string | null, string | null, string | null>
        >
    >;
    true satisfies Expect<
        Equal<
            ExtractKyselyTable<typeof db>["person"]["someDefault"],
            k.ColumnType<string, string | undefined, string>
        >
    >;
    true satisfies Expect<
        Equal<
            ExtractKyselyTable<typeof db>["person"]["someNotUpdateable"],
            k.ColumnType<string, string, never>
        >
    >;
    true satisfies Expect<
        Equal<
            ExtractKyselyTable<typeof db>["person"]["someNullableNotUpdateable"],
            k.ColumnType<string | null, string | null, never>
        >
    >;
    true satisfies Expect<
        Equal<
            ExtractKyselyTable<typeof db>["person"]["someNullableNotInsertable"],
            k.ColumnType<string | null, never, string | null>
        >
    >;
    true satisfies Expect<
        Equal<
            ExtractKyselyTable<typeof db>["person"]["someZoo"],
            k.ColumnType<string, string, string>
        >
    >;

    assert(db instanceof k.Kysely);
});

Deno.test("createTables", () => {
    const TEST_TABLE = table("test_table", {
        bigserial: c.pkAutoInc(),
        test_int32: c.int32(),
        test_nullable: c.int32({ nullable: true }),
        test_default: c.int32({ default: 42 }),
        test_varchar: c.varchar({ maxLength: 255 }),
        test_zoo: {
            type: "zoo",
            params: undefined,
        },
    });

    const db = createKyselyDb({
        tables: [TEST_TABLE],
        kysely: {
            dialect: {
                createDriver: () => new k.DummyDriver(),
                createAdapter: () => new k.PostgresAdapter(),
                createQueryCompiler: () => new k.PostgresQueryCompiler(),
                createIntrospector: (db) => new k.PostgresIntrospector(db),
            },
        },
        types: {
            ...TYPES_TO_SCHEMAS,
            zoo: () => v.string(),
        },
    });

    const queries = createTables(db, [TEST_TABLE], {
        ...POSTGRES_COLUMN_TYPES,
        zoo() {
            return k.sql`zootype`;
        },
    });

    assertEquals(
        queries.map((f) => f.sql),
        [
            `create table "test_table" ("bigserial" bigserial not null primary key, "test_int32" integer not null, "test_nullable" integer, "test_default" integer default 42 not null, "test_varchar" varchar(255) not null, "test_zoo" zootype not null)`,
        ]
    );
});
