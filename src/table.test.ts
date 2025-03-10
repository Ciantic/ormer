import { assertEquals } from "jsr:@std/assert/equals";
import { table } from "./table.ts";
import * as c from "./columns.ts";
import * as h from "./columnhelpers.ts";

type Expect<T extends true> = T;
type Equal<X, Y> = (<T>() => T extends X ? 1 : 2) extends <T>() => T extends Y ? 1 : 2
    ? true
    : false;

Deno.test("Test inference", () => {
    const invoiceTable = table("invoice", {
        id: h.pkAutoInc(),
        title: c.string(),
        description: c.string({
            nullable: true,
        }),
        due_date: c.datetime({
            default: "now",
        }),
        foo: c.datetime(),
        rowversion: h.rowversion(),
    });

    true satisfies Expect<
        Equal<
            (typeof invoiceTable.columns)["id"],
            c.ColumnType<
                "int64",
                {
                    autoIncrement: true;
                    primaryKey: true;
                    notInsertable: true;
                    notUpdatable: true;
                }
            >
        >
    >;

    true satisfies Expect<
        Equal<(typeof invoiceTable.columns)["title"], c.ColumnType<"string", undefined>>
    >;

    true satisfies Expect<
        Equal<
            (typeof invoiceTable.columns)["description"],
            c.ColumnType<"string", { nullable: true }>
        >
    >;
    true satisfies Expect<
        Equal<
            (typeof invoiceTable.columns)["due_date"],
            c.ColumnType<"datetime", { default: "now" }>
        >
    >;

    true satisfies Expect<
        Equal<(typeof invoiceTable.columns)["foo"], c.ColumnType<"datetime", undefined>>
    >;
    true satisfies Expect<
        Equal<
            (typeof invoiceTable.columns)["rowversion"],
            c.ColumnType<
                "int64",
                {
                    rowversion: true;
                    notInsertable: true;
                    notUpdatable: true;
                    updateKey: true;
                    default: 1;
                }
            >
        >
    >;

    assertEquals(true, true);
});
