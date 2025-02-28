import * as v from "npm:valibot";
import * as o from "./columns.ts";
import * as g from "./getters.ts";
import { table } from "./table.ts";
import { assertEquals } from "jsr:@std/assert";
import { SCHEMAS } from "./schemas.ts";

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

const PERSON_TABLE = table("person", {
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

Deno.test("getPrimaryKeyColumns", () => {
    const columns = g.getPrimaryKeyColumns(PERSON_TABLE);

    // Pure type level test
    true satisfies Expect<Equal<keyof typeof columns, "id">>;

    // Runtime test
    assertEquals(Object.keys(columns).length, 1);
    assertEquals(columns.id.type, "int64");
});

Deno.test("getInsertColumns", () => {
    const columns = g.getInsertColumns(PERSON_TABLE);
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
    const columns = g.getUpdateKeyColumns(PERSON_TABLE);

    // Pure type level test
    true satisfies Expect<Equal<keyof typeof columns, "version" | "stamp">>;

    assertEquals(Object.keys(columns).length, 2);
    assertEquals(columns.version.type, "rowversion");
    assertEquals(columns.stamp.type, "concurrencyStamp");
});

Deno.test("getPatchColumns", () => {
    const columns = g.getPatchColumns(PERSON_TABLE);
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

    assertEquals(Object.keys(columns).length, 9);
    assertEquals(new Set(Object.keys(columns)), new Set(expected_keys));
});

Deno.test("getSchemasFromColumns", () => {
    const columns = g.getSchemasFromColumns(PERSON_TABLE.columns, SCHEMAS);

    // Pure type level test
    true satisfies Expect<Equal<keyof typeof columns, keyof typeof PERSON_TABLE.columns>>;

    columns.billingAddress;

    assertEquals(Object.keys(columns).length, Object.keys(PERSON_TABLE.columns).length);
});
