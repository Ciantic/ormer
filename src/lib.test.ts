import * as v from "npm:valibot";
import { assertEquals } from "jsr:@std/assert";

import * as o from "./lib.ts";

// ----------------------------------------------------------------------
// Some type assertions

// Test cols
export const TEST_COL: o.ColumnType<"", v.NumberSchema<undefined>> = o.col(v.number());

export const TEST_JSON_COL: o.ColumnType<
    "",
    v.ObjectSchema<
        {
            readonly foo: v.NumberSchema<undefined>;
            readonly bar: v.StringSchema<undefined>;
        },
        undefined
    >
> = o.json({
    foo: v.number(),
    bar: v.string(),
});

export const TEST_ARRAY_COL: o.ColumnType<
    "",
    v.ArraySchema<v.StringSchema<undefined>, undefined>
> = o.array(v.string());

// Test column wrappers
export const TEST_AUTOINC: o.ColumnType<
    "primaryKey",
    v.SchemaWithPipe<[v.NumberSchema<undefined>, v.IntegerAction<number, undefined>]>,
    v.NeverSchema<undefined>,
    v.NeverSchema<undefined>
> = o.pkAutoInc();

export const TEST_PK: o.ColumnType<
    "primaryKey",
    v.StringSchema<undefined>,
    v.StringSchema<undefined>,
    v.StringSchema<undefined>
> = o.pk(o.string());

export const TEST_ROWVERSION: o.ColumnType<
    "rowVersion",
    v.SchemaWithPipe<[v.NumberSchema<undefined>, v.IntegerAction<number, undefined>]>,
    v.NeverSchema<undefined>,
    v.NeverSchema<undefined>
> = o.rowVersion();

export const TEST_CREATED_AT: o.ColumnType<
    "createdAt",
    v.DateSchema<undefined>,
    v.NeverSchema<undefined>,
    v.NeverSchema<undefined>
> = o.createdAt();

export const TEST_UPDATED_AT: o.ColumnType<
    "updatedAt",
    v.DateSchema<undefined>,
    v.NeverSchema<undefined>,
    v.NeverSchema<undefined>
> = o.updatedAt();

// Test table inference
export const TEST_TABLE: o.Table<
    "some_table",
    {
        id: o.ColumnType<
            "primaryKey",
            v.SchemaWithPipe<[v.NumberSchema<undefined>, v.IntegerAction<number, undefined>]>,
            v.NeverSchema<undefined>,
            v.NeverSchema<undefined>
        >;
        someCol: o.ColumnType<"", v.StringSchema<undefined>>;
    }
> = o.table("some_table", {
    id: o.pkAutoInc(),
    someCol: o.col(v.string()),
});

// ----------------------------------------------------------------------
// Some tests

// import { add } from "./main.ts";

Deno.test(function testTableCreation() {
    const table = o.table("some_table", {
        id: o.pkAutoInc(),
        rowversion: o.rowVersion(),
        someCol: o.col(v.string()),
    });
    assertEquals(table.table, "some_table");
    assertEquals(Object.keys(table.columns).length, 3);
    assertEquals(table.columns.id.columnName, "id");
    assertEquals(table.columns.rowversion.columnName, "rowversion");
    assertEquals(table.columns.someCol.columnName, "someCol");
});

Deno.test(function testGetPrimaryKeySchema() {
    const schema = o.getPrimaryKeySchema(
        o.table("some_table", {
            id: o.pkAutoInc(),
            rowversion: o.rowVersion(),
            someCol: o.col(v.string()),
        })
    );
    assertEquals(schema.type, "object");
    assertEquals(Object.keys(schema.entries).length, 1);
    assertEquals(schema.entries.id.type, "number");
});

Deno.test(function testGetUpdateKeySchema() {
    const schema = o.getUpdateKeySchema(
        o.table("some_table", {
            id: o.pkAutoInc(),
            rowversion: o.rowVersion(),
            someCol: o.col(v.string()),
        })
    );
    assertEquals(schema.type, "object");
    assertEquals(Object.keys(schema.entries).length, 2);
    assertEquals(schema.entries.id.type, "number");
    assertEquals(schema.entries.rowversion.type, "number");
});

Deno.test(function testGetSelectSchema() {
    const schema = o.getSelectSchema(
        o.table("some_table", {
            id: o.pkAutoInc(),
            rowversion: o.rowVersion(),
            someCol: o.col(v.string()),
        })
    );
    assertEquals(schema.type, "object");
    assertEquals(Object.keys(schema.entries).length, 3);
    assertEquals(schema.entries.id.type, "number");
    assertEquals(schema.entries.rowversion.type, "number");
    assertEquals(schema.entries.someCol.type, "string");
});

Deno.test(function testGetInsertSchema() {
    const schema = o.getInsertSchema(
        o.table("some_table", {
            id: o.pkAutoInc(),
            rowversion: o.rowVersion(),
            someCol: o.col(v.string()),
        })
    );
    assertEquals(schema.type, "object");
    assertEquals(Object.keys(schema.entries).length, 1);
    assertEquals(schema.entries.someCol.type, "string");
});

Deno.test(function testGetInsertSchemaWithPk() {
    const schema = o.getInsertSchema(
        o.table("some_table", {
            code: o.pk(o.col(v.string())),
            rowversion: o.rowVersion(),
            someCol: o.col(v.string()),
        })
    );
    assertEquals(schema.type, "object");
    assertEquals(Object.keys(schema.entries).length, 2);
    assertEquals(schema.entries.code.type, "string");
    assertEquals(schema.entries.someCol.type, "string");
});

Deno.test(function testGetUpdateFieldsSchema() {
    const schema = o.getUpdateFieldsSchema(
        o.table("some_table", {
            id: o.pkAutoInc(),
            rowversion: o.rowVersion(),
            someCol: o.col(v.string()),
        })
    );
    assertEquals(schema.type, "object");
    assertEquals(Object.keys(schema.entries).length, 1);
    assertEquals(schema.entries.someCol.type, "string");
});

Deno.test(function testGetPatchFieldsSchema() {
    const schema = o.getPatchFieldsSchema(
        o.table("some_table", {
            id: o.pkAutoInc(),
            rowversion: o.rowVersion(),
            someCol: o.col(v.string()),
        })
    );
    assertEquals(schema.type, "object");
    assertEquals(Object.keys(schema.entries).length, 1);
    assertEquals(schema.entries.someCol.type, "optional");
    assertEquals(schema.entries.someCol.wrapped.type, "string");
});
