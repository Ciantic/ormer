import * as v from "npm:valibot";
import { assertEquals } from "jsr:@std/assert";

import {
    ColumnType,
    Table,
    col,
    pk,
    pkAutoInc,
    createdAt,
    updatedAt,
    table,
    getPrimaryKeySchema,
    rowVersion,
    getUpdateKeySchema,
    getSelectSchema,
    getInsertSchema,
    getUpdateFieldsSchema,
    getPatchFieldsSchema,
} from "./lib.ts";

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
    v.SchemaWithPipe<[v.NumberSchema<undefined>, v.IntegerAction<number, undefined>]>,
    v.NeverSchema<undefined>,
    v.NeverSchema<undefined>
> = pkAutoInc();

export const TEST_PK: ColumnType<
    "primaryKey",
    v.StringSchema<undefined>,
    v.StringSchema<undefined>,
    v.StringSchema<undefined>
> = pk(col(v.string()));

export const TEST_ROWVERSION: ColumnType<
    "rowVersion",
    v.SchemaWithPipe<[v.NumberSchema<undefined>, v.IntegerAction<number, undefined>]>,
    v.NeverSchema<undefined>,
    v.NeverSchema<undefined>
> = rowVersion();

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
            v.SchemaWithPipe<[v.NumberSchema<undefined>, v.IntegerAction<number, undefined>]>,
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

Deno.test(function testGetPrimaryKeySchema() {
    const schema = getPrimaryKeySchema(
        table("some_table", {
            id: pkAutoInc(),
            rowversion: rowVersion(),
            someCol: col(v.string()),
        })
    );
    assertEquals(schema.type, "object");
    assertEquals(Object.keys(schema.entries).length, 1);
    assertEquals(schema.entries.id.type, "number");
});

Deno.test(function testGetUpdateKeySchema() {
    const schema = getUpdateKeySchema(
        table("some_table", {
            id: pkAutoInc(),
            rowversion: rowVersion(),
            someCol: col(v.string()),
        })
    );
    assertEquals(schema.type, "object");
    assertEquals(Object.keys(schema.entries).length, 2);
    assertEquals(schema.entries.id.type, "number");
    assertEquals(schema.entries.rowversion.type, "number");
});

Deno.test(function testGetSelectSchema() {
    const schema = getSelectSchema(
        table("some_table", {
            id: pkAutoInc(),
            rowversion: rowVersion(),
            someCol: col(v.string()),
        })
    );
    assertEquals(schema.type, "object");
    assertEquals(Object.keys(schema.entries).length, 3);
    assertEquals(schema.entries.id.type, "number");
    assertEquals(schema.entries.rowversion.type, "number");
    assertEquals(schema.entries.someCol.type, "string");
});

Deno.test(function testGetInsertSchema() {
    const schema = getInsertSchema(
        table("some_table", {
            id: pkAutoInc(),
            rowversion: rowVersion(),
            someCol: col(v.string()),
        })
    );
    assertEquals(schema.type, "object");
    assertEquals(Object.keys(schema.entries).length, 1);
    assertEquals(schema.entries.someCol.type, "string");
});

Deno.test(function testGetInsertSchemaWithPk() {
    const schema = getInsertSchema(
        table("some_table", {
            code: pk(col(v.string())),
            rowversion: rowVersion(),
            someCol: col(v.string()),
        })
    );
    assertEquals(schema.type, "object");
    assertEquals(Object.keys(schema.entries).length, 2);
    assertEquals(schema.entries.code.type, "string");
    assertEquals(schema.entries.someCol.type, "string");
});

Deno.test(function testGetUpdateFieldsSchema() {
    const schema = getUpdateFieldsSchema(
        table("some_table", {
            id: pkAutoInc(),
            rowversion: rowVersion(),
            someCol: col(v.string()),
        })
    );
    assertEquals(schema.type, "object");
    assertEquals(Object.keys(schema.entries).length, 1);
    assertEquals(schema.entries.someCol.type, "string");
});

Deno.test(function testGetPatchFieldsSchema() {
    const schema = getPatchFieldsSchema(
        table("some_table", {
            id: pkAutoInc(),
            rowversion: rowVersion(),
            someCol: col(v.string()),
        })
    );
    assertEquals(schema.type, "object");
    assertEquals(Object.keys(schema.entries).length, 1);
    assertEquals(schema.entries.someCol.type, "optional");
    assertEquals(schema.entries.someCol.wrapped.type, "string");
});
