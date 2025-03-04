import * as v from "npm:valibot";
import * as k from "npm:kysely";
import * as c from "./columns.ts";
import * as h from "./columnhelpers.ts";
import { createDbBuilder } from "./database.ts";
import { table } from "./table.ts";
import { assert, assertEquals } from "jsr:@std/assert";
import { schema } from "./schemas.ts";

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

    const db = createDbBuilder()
        .withTables([PERSON_TABLE])
        .withSchemas({
            zoo: () =>
                schema({
                    schema: v.string(),
                    fromJson: v.string(),
                    toJson: v.string(),
                }),
        })
        .withPostgres()
        .withKyselyConfig()
        .build()
        .getKysely();

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
        bigserial: h.pkAutoInc(),
        test_int32: c.int32(),
        test_nullable: c.int32({ nullable: true }),
        test_default: c.int32({ default: 42 }),
        test_varchar: c.varchar({ maxLength: 255 }),
        test_zoo: {
            type: "zoo" as const,
            params: undefined,
        },
    });

    const db = createDbBuilder()
        .withTables([TEST_TABLE])
        .withSchemas({
            zoo: () =>
                schema({
                    schema: v.string(),
                    fromJson: v.string(),
                    toJson: v.string(),
                }),
        })
        .withPostgres({
            zoo() {
                return {
                    datatype: k.sql`zootype`,
                    from: v.string(),
                    to: v.string(),
                };
            },
        })
        .withKyselyConfig()
        .build();

    const sql = db.createTables().tables.test_table.compile().sql;

    assertEquals(
        sql,
        `create table "test_table" ("bigserial" bigserial not null primary key, "test_int32" integer not null, "test_nullable" integer, "test_default" integer default 42 not null, "test_varchar" varchar(255) not null, "test_zoo" zootype not null)`
    );
});
