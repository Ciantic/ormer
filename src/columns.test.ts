import * as o from "./columns.ts";
import * as h from "./columnhelpers.ts";
import { assertEquals } from "jsr:@std/assert";

type Expect<T extends true> = T;
type Equal<X, Y> = (<T>() => T extends X ? 1 : 2) extends <T>() => T extends Y ? 1 : 2
    ? true
    : false;

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
    // const mustErrorBecauseFoo = o.int32({ primaryKey: true, foo: 5 });

    // This must have autocompletion!
    // const fofofo = o.int32({
    //     /* CURSOR HERE */
    // });
});

Deno.test("pkAutoInc signature", () => {
    // INFERENCE TEST!

    const TEST_INTEGER1 = h.pkAutoInc();
    const TEST_INTEGER2 = h.pkAutoInc({
        primaryKey: false,
    });

    type Test3 = Expect<
        Equal<
            typeof TEST_INTEGER1,
            o.ColumnType<
                "int64",
                { primaryKey: true; notInsertable: true; notUpdatable: true; autoIncrement: true }
            >
        >
    >;
    true satisfies Test3;

    type Test4 = Expect<
        Equal<
            typeof TEST_INTEGER2,
            o.ColumnType<
                "int64",
                {
                    primaryKey: false;
                }
            >
        >
    >;
    true satisfies Test4;

    assertEquals(TEST_INTEGER1, {
        type: "int64",
        params: { primaryKey: true, notInsertable: true, notUpdatable: true, autoIncrement: true },
    });
    assertEquals(TEST_INTEGER2, {
        type: "int64",
        params: { primaryKey: false },
    });
});
