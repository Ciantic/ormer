import * as v from "npm:valibot";
import * as o from "./lib2.ts";
import { assertEquals } from "jsr:@std/assert";

type Expect<T extends true> = T;
type Equal<X, Y> = (<T>() => T extends X ? 1 : 2) extends <T>() => T extends Y ? 1 : 2
    ? true
    : false;

// deno-lint-ignore no-unused-vars
function humbug(): o.ColumnType<"humbug", undefined> {
    return {
        type: "humbug",
        params: undefined,
    };
}

const PERSON_TABLE = o.table("person", {
    // humbug: humbug(),
    id: o.pkAutoInc(),
    name: o.userstring({ maxLength: 300, default: "Alice" as const }),
    email: o.email(),
    age: o.integer(),
    price: o.decimal({ precision: 10, scale: 2 }),
    createdAt: o.createdAt(),
    updatedAt: o.updatedAt(),
    billingAddress: o.jsonb(
        v.object({
            street: v.string(),
            city: v.string(),
            postcode: v.string(),
        })
    ),
    deliveryAddress: o.json(
        v.object({
            street: v.string(),
            city: v.string(),
            postcode: v.string(),
        }),
        {
            nullable: true,
        }
    ),
    stamp: o.concurrencyStamp(),
    version: o.rowVersion(),
    isActive: o.boolean(),
});

Deno.test("integer signature", () => {
    const TEST_INTEGER1 = o.integer({ primaryKey: true });
    const TEST_INTEGER2 = o.integer();

    // Pure type level test for inference
    type Test3 = Expect<Equal<typeof TEST_INTEGER1, o.ColumnType<"integer", { primaryKey: true }>>>;
    type Test4 = Expect<Equal<typeof TEST_INTEGER2, o.ColumnType<"integer", undefined>>>;
    true satisfies Test3;
    true satisfies Test4;

    // Runtime test
    assertEquals(TEST_INTEGER1, { type: "integer", params: { primaryKey: true } });
    assertEquals(TEST_INTEGER2, { type: "integer", params: undefined });

    // Always test these manually when changing the code!
    //
    // This must give error, because foo is not there!
    // const mustErrorBecauseFoo = o.integer({ primaryKey: true, foo: 5 });

    // This must have autocompletion!
    // const fofofo = o.integer({
    //     /* CURSOR HERE */
    // });
});

Deno.test("pkAutoInc signature", () => {
    // INFERENCE TEST!

    const TEST_INTEGER1 = o.pkAutoInc();
    const TEST_INTEGER2 = o.pkAutoInc({
        primaryKey: false,
    });

    type Test3 = Expect<
        Equal<
            typeof TEST_INTEGER1,
            o.ColumnType<"pkAutoInc", { primaryKey: true; notInsertable: true; notUpdatable: true }>
        >
    >;
    true satisfies Test3;

    type Test4 = Expect<
        Equal<
            typeof TEST_INTEGER2,
            o.ColumnType<
                "pkAutoInc",
                {
                    primaryKey: false;
                }
            >
        >
    >;
    true satisfies Test4;

    assertEquals(TEST_INTEGER1, {
        type: "pkAutoInc",
        params: { primaryKey: true, notInsertable: true, notUpdatable: true },
    });
    assertEquals(TEST_INTEGER2, {
        type: "pkAutoInc",
        params: { primaryKey: false },
    });
});

Deno.test("getPrimaryKeyColumns", () => {
    const columns = o.getPrimaryKeyColumns(PERSON_TABLE);

    // Pure type level test
    true satisfies Expect<Equal<keyof typeof columns, "id">>;

    // Runtime test
    assertEquals(Object.keys(columns).length, 1);
    assertEquals(columns.id.type, "pkAutoInc");
});

Deno.test("getUpdateKeyColumns", () => {
    const columns = o.getUpdateKeyColumns(PERSON_TABLE);

    // Pure type level test
    true satisfies Expect<Equal<keyof typeof columns, "id" | "version" | "stamp">>;

    assertEquals(Object.keys(columns).length, 3);
    assertEquals(columns.id.type, "pkAutoInc");
    assertEquals(columns.version.type, "rowVersion");
    assertEquals(columns.stamp.type, "concurrencyStamp");
});

Deno.test("getPatchColumns", () => {
    const columns = o.getPatchColumns(PERSON_TABLE);
    const expected_keys = [
        "name",
        "email",
        "age",
        "price",
        "billingAddress",
        "deliveryAddress",
        "isActive",
    ] as const;

    // Pure type level test
    true satisfies Expect<Equal<keyof typeof columns, (typeof expected_keys)[number]>>;

    assertEquals(Object.keys(columns).length, 7);
    assertEquals(new Set(Object.keys(columns)), new Set(expected_keys));
});

Deno.test("getSchemasFromColumns", () => {
    const columns = o.getSchemasFromColumns(PERSON_TABLE.columns);

    // Pure type level test
    true satisfies Expect<Equal<keyof typeof columns, keyof typeof PERSON_TABLE.columns>>;

    assertEquals(Object.keys(columns).length, Object.keys(PERSON_TABLE.columns).length);
});
