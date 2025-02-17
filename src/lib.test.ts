import * as k from "npm:kysely";
import * as v from "npm:valibot";
import { assertEquals } from "jsr:@std/assert";

import * as o from "./lib.ts";

// ----------------------------------------------------------------------
// Some type assertions

// Test cols
o.float() as o.ColumnType<"", v.NumberSchema<undefined>, "yes", "yes">;

o.json({
    foo: v.number(),
    bar: v.string(),
}) as o.ColumnType<
    "",
    v.ObjectSchema<
        {
            readonly foo: v.NumberSchema<undefined>;
            readonly bar: v.StringSchema<undefined>;
        },
        undefined
    >,
    "yes",
    "yes"
>;

o.array(v.string()) as o.ColumnType<
    "",
    v.ArraySchema<v.StringSchema<undefined>, undefined>,
    "yes",
    "yes"
>;

// Test column wrappers
o.pkAutoInc() as o.ColumnType<
    "primaryKey",
    v.SchemaWithPipe<[v.NumberSchema<undefined>, v.IntegerAction<number, undefined>]>,
    "no",
    "no"
>;

o.pk(o.string()) as o.ColumnType<"primaryKey", v.StringSchema<undefined>, "yes", "yes">;

o.rowVersion() as o.ColumnType<
    "rowVersion",
    v.SchemaWithPipe<[v.NumberSchema<undefined>, v.IntegerAction<number, undefined>]>,
    "no",
    "no"
>;

o.createdAt() as o.ColumnType<"createdAt", v.DateSchema<undefined>, "no", "no">;

o.updatedAt() as o.ColumnType<"updatedAt", v.DateSchema<undefined>, "no", "no">;

o.foreignKeyUntyped(
    o.col(v.number(), {
        insertable: "no",
    }),
    "person",
    "id"
) as o.ColumnType<"foreignKey", v.NumberSchema<undefined>, "no", "yes">;

o.nullable(o.string()) as o.ColumnType<
    "",
    v.NullableSchema<v.StringSchema<undefined>, undefined>,
    "optional",
    "yes"
>;

// Test table inference
const TEST_TABLE = o.table("some_table", {
    id: o.pkAutoInc(),
    someCol: o.string(),
}) as o.Table<
    "some_table",
    {
        id: o.ColumnType<
            "primaryKey",
            v.SchemaWithPipe<[v.NumberSchema<undefined>, v.IntegerAction<number, undefined>]>,
            "no",
            "no"
        >;
        someCol: o.ColumnType<"", v.StringSchema<undefined>, "yes", "yes">;
    }
>;

o.foreignKey(TEST_TABLE, "id") as o.ColumnType<
    "foreignKey",
    v.SchemaWithPipe<[v.NumberSchema<undefined>, v.IntegerAction<number, undefined>]>,
    "yes",
    "yes"
>;

const SOME_TABLE = o.table("some_table", {
    id: o.pkAutoInc(),
    someCol: o.string(),
    someOtherCol: o.integer(),
    someNullableCol: o.nullable(o.string()),
    createdAt: o.createdAt(),
    updatedAt: o.updatedAt(),
});

// Test table inference
export const TEST_INFERENCE: {
    some_table: {
        id: k.ColumnType<number, never, never>;
        someCol: k.ColumnType<string, string, string>;
        someOtherCol: k.ColumnType<number, number, number>;
        someNullableCol: k.ColumnType<string | null, string | null | undefined, string | null>;
        createdAt: k.ColumnType<Date, never, never>;
        updatedAt: k.ColumnType<Date, never, never>;
    };
} = null as any as o.InferKyselyTable<typeof SOME_TABLE>;

// ----------------------------------------------------------------------
// Some tests

// import { add } from "./main.ts";

Deno.test(function testTableCreation() {
    const table = o.table("some_table", {
        id: o.pkAutoInc(),
        rowversion: o.rowVersion(),
        someCol: o.string(),
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
            someCol: o.string(),
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
            someCol: o.string(),
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
            someCol: o.string(),
            someNullableCol: o.nullable(o.string()),
        })
    );
    assertEquals(schema.type, "object");
    assertEquals(Object.keys(schema.entries).length, 4);
    assertEquals(schema.entries.id.type, "number");
    assertEquals(schema.entries.rowversion.type, "number");
    assertEquals(schema.entries.someCol.type, "string");
    assertEquals(schema.entries.someNullableCol.expects, "(string | null)");
});

Deno.test(function testGetInsertSchema() {
    const schema = o.getInsertSchema(
        o.table("some_table", {
            id: o.pkAutoInc(), // Omitted
            rowversion: o.rowVersion(), // Omitted
            someCol: o.string(), // Required
            someNullableCol: o.nullable(o.string()), // Optional
        })
    );
    assertEquals(schema.type, "object");
    assertEquals(Object.keys(schema.entries).length, 2);
    assertEquals(schema.entries.someCol.type, "string");

    // Converts nullable to optional, because nullable columns have implicit default values
    assertEquals(schema.entries.someNullableCol.type, "optional");
    assertEquals(schema.entries.someNullableCol.expects, "((string | null) | undefined)");
});

Deno.test(function testGetInsertSchemaWithPk() {
    const schema = o.getInsertSchema(
        o.table("some_table", {
            code: o.pk(o.string()),
            rowversion: o.rowVersion(),
            someCol: o.string(),
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
            someCol: o.string(),
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
            someCol: o.string(),
        })
    );
    assertEquals(schema.type, "object");
    assertEquals(Object.keys(schema.entries).length, 1);
    assertEquals(schema.entries.someCol.type, "optional");
    assertEquals(schema.entries.someCol.wrapped.type, "string");
});
