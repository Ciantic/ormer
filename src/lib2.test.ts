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
    publicId: o.uuid({ unique: true, notUpdatable: true }),
    name: o.userstring({ maxLength: 300, default: "Alice" as const }),
    ssn: o.varchar({ maxLength: 10 }),
    notes: o.string(),
    email: o.email(),
    age: o.int32(),
    price: o.decimal({ precision: 10, scale: 2 }),
    createdAt: o.createdAt(),
    updatedAt: o.updatedAt(),
    billingAddress: o.jsonb({
        schema: v.object({
            street: v.string(),
            city: v.string(),
            postcode: v.string(),
        }),
    }),
    deliveryAddress: o.json({
        schema: v.object({
            street: v.string(),
            city: v.string(),
            postcode: v.string(),
        }),
        nullable: true,
    }),
    stamp: o.concurrencyStamp(),
    version: o.rowversion(),
    isActive: o.boolean(),
});

Deno.test("integer signature", () => {
    const TEST_INTEGER1 = o.int32({ primaryKey: true });
    const TEST_INTEGER2 = o.int32();

    // Pure type level test for inference
    type Test3 = Expect<Equal<typeof TEST_INTEGER1, o.ColumnType<"int32", { primaryKey: true }>>>;
    type Test4 = Expect<Equal<typeof TEST_INTEGER2, o.ColumnType<"int32", undefined>>>;
    true satisfies Test3;
    true satisfies Test4;

    // Runtime test
    assertEquals(TEST_INTEGER1, { type: "int32", params: { primaryKey: true } });
    assertEquals(TEST_INTEGER2, { type: "int32", params: undefined });

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
            o.ColumnType<"bigserial", { primaryKey: true; notInsertable: true; notUpdatable: true }>
        >
    >;
    true satisfies Test3;

    type Test4 = Expect<
        Equal<
            typeof TEST_INTEGER2,
            o.ColumnType<
                "bigserial",
                {
                    primaryKey: false;
                }
            >
        >
    >;
    true satisfies Test4;

    assertEquals(TEST_INTEGER1, {
        type: "bigserial",
        params: { primaryKey: true, notInsertable: true, notUpdatable: true },
    });
    assertEquals(TEST_INTEGER2, {
        type: "bigserial",
        params: { primaryKey: false },
    });
});

Deno.test("getPrimaryKeyColumns", () => {
    const columns = o.getPrimaryKeyColumns(PERSON_TABLE);

    // Pure type level test
    true satisfies Expect<Equal<keyof typeof columns, "id">>;

    // Runtime test
    assertEquals(Object.keys(columns).length, 1);
    assertEquals(columns.id.type, "bigserial");
});

Deno.test("getInsertColumns", () => {
    const columns = o.getInsertColumns(PERSON_TABLE);
    const expected_keys = [
        "publicId",
        "name",
        "email",
        "ssn",
        "notes",
        "age",
        "price",
        "billingAddress",
        "deliveryAddress",
        "isActive",
    ] as const;

    true satisfies Expect<Equal<keyof typeof columns, (typeof expected_keys)[number]>>;

    assertEquals(Object.keys(columns).length, expected_keys.length);
    assertEquals(new Set(Object.keys(columns)), new Set(expected_keys));
});

Deno.test("getUpdateKeyColumns", () => {
    const columns = o.getUpdateKeyColumns(PERSON_TABLE);

    // Pure type level test
    true satisfies Expect<Equal<keyof typeof columns, "version" | "stamp">>;

    assertEquals(Object.keys(columns).length, 2);
    assertEquals(columns.version.type, "rowVersion");
    assertEquals(columns.stamp.type, "uuid");
});

Deno.test("getPatchColumns", () => {
    const columns = o.getPatchColumns(PERSON_TABLE);
    const expected_keys = [
        "name",
        "email",
        "age",
        "notes",
        "ssn",
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
