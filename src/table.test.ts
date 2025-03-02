import { assertEquals } from "jsr:@std/assert/equals";
import { table } from "./table.ts";
import * as c from "./columns.ts";

type Expect<T extends true> = T;
type Equal<X, Y> = (<T>() => T extends X ? 1 : 2) extends <T>() => T extends Y ? 1 : 2
    ? true
    : false;

Deno.test("Test inference", () => {
    const invoiceTable = table("invoice", {
        id: c.pkAutoInc(),
        title: c.string(),
        description: c.string({
            nullable: true,
        }),
        due_date: c.timestamp({
            default: () => new Date(),
        }),
        foo: c.timestamptz(),
        rowversion: c.rowversion(),
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
            c.ColumnType<"timestamp", { default: () => Date }>
        >
    >;

    true satisfies Expect<
        Equal<(typeof invoiceTable.columns)["foo"], c.ColumnType<"timestamptz", undefined>>
    >;
    true satisfies Expect<
        Equal<
            (typeof invoiceTable.columns)["rowversion"],
            c.ColumnType<
                "rowversion",
                {
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
