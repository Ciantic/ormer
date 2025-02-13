import * as v from "npm:valibot";
import { assertEquals } from "jsr:@std/assert";

import { ColumnType, Table, col, pk, pkAutoInc, createdAt, updatedAt, table } from "./lib.ts";

// ----------------------------------------------------------------------
// Some type assertions

// Test cols
export const TEST_COL: ColumnType<"", v.NumberSchema<undefined>> = col(v.number());
export const TEST_JSON_COL: ColumnType<
    "",
    v.ObjectSchema<
        {
            readonly foo: v.NumberSchema<undefined>;
            readonly bar: v.StringSchema<undefined>;
        },
        undefined
    >
> = col(
    v.object({
        foo: v.number(),
        bar: v.string(),
    })
);

// Test column wrappers
// export const TEST_IS_GENERATED: ColumnType<v.NumberSchema<undefined>> = generated(col(v.number()));
export const TEST_IS_GENERATED2: ColumnType<
    "primaryKey",
    v.NumberSchema<undefined>,
    v.NeverSchema<undefined>,
    v.NeverSchema<undefined>
> = pkAutoInc();
export const TEST_PK: ColumnType<
    "primaryKey",
    v.StringSchema<undefined>,
    v.StringSchema<undefined>,
    v.StringSchema<undefined>
> = pk(col(v.string()));

export const TEST_CREATED_AT: ColumnType<
    "createdAt",
    v.DateSchema<undefined>,
    v.NeverSchema<undefined>,
    v.NeverSchema<undefined>
> = createdAt();
export const TEST_UPDATED_AT: ColumnType<
    "updatedAt",
    v.DateSchema<undefined>,
    v.NeverSchema<undefined>,
    v.NeverSchema<undefined>
> = updatedAt();

// Test table inference
export const TEST_TABLE: Table<
    "some_table",
    {
        id: ColumnType<
            "primaryKey",
            v.NumberSchema<undefined>,
            v.NeverSchema<undefined>,
            v.NeverSchema<undefined>
        >;
        someCol: ColumnType<"", v.StringSchema<undefined>>;
    }
> = table("some_table", {
    id: pkAutoInc(),
    someCol: col(v.string()),
});


// ----------------------------------------------------------------------
// Some tests

// import { add } from "./main.ts";

Deno.test(function addTest() {
  assertEquals("1", "1");
});

