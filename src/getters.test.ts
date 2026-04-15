import * as v from "valibot";
import * as o from "./columns.ts";
import * as h from "./columnhelpers.ts";
import * as g from "./getters.ts";
import { table } from "./table.ts";
import { SCHEMAS } from "./schemas.ts";
import { describe, it, expect } from "vitest";

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
    id: h.pkAutoInc(),
    publicId: o.uuid({ unique: true, notUpdatable: true }),
    name: h.userstring({ maxLength: 300, schema: v.string() }),
    ssn: o.varchar({ maxLength: 10 }),
    notes: o.string(),
    email: h.email(),
    age: o.int32(),
    price: o.decimal({ precision: 10, scale: 2 }),
    createdAt: h.createdAt(),
    updatedAt: h.updatedAt(),
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
    stamp: h.concurrencyStamp(),
    version: h.rowversion(),
    isActive: o.boolean(),
});
describe("getters", () => {
it("getPrimaryKeyColumns", () => {
    const columns = g.getPrimaryKeyColumns(PERSON_TABLE);

    // Pure type level test
    true satisfies Expect<Equal<keyof typeof columns, "id">>;

    // Runtime test
    expect(Object.keys(columns).length).toBe(1);
    expect(columns.id.type).toBe("int64");
});

it("getInsertColumns", () => {
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

    expect(Object.keys(columns).length).toBe(expected_keys.length);
    expect(new Set(Object.keys(columns))).toEqual(new Set(expected_keys));
});

it("getUpdateKeyColumns", () => {
    const columns = g.getUpdateKeyColumns(PERSON_TABLE);

    // Pure type level test
    true satisfies Expect<Equal<keyof typeof columns, "version" | "stamp">>;

    expect(Object.keys(columns).length).toBe(2);
    expect(columns.version.type).toBe("int64");
    expect(columns.stamp.type).toBe("uuid");
});

it("getPatchColumns", () => {
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

    expect(Object.keys(columns).length).toBe(9);
    expect(new Set(Object.keys(columns))).toEqual(new Set(expected_keys));
});

it("getSchemasFromColumns", () => {
    const columns = g.getSchemasFromColumns(PERSON_TABLE.columns, SCHEMAS);

    // Pure type level test
    true satisfies Expect<Equal<keyof typeof columns, keyof typeof PERSON_TABLE.columns>>;

    columns.billingAddress;

    expect(Object.keys(columns).length).toBe(Object.keys(PERSON_TABLE.columns).length);
});
});
