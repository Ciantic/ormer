import * as v from "npm:valibot";
import * as o from "../../mod.ts";
import { assertEquals, assertThrows } from "jsr:@std/assert";
import { sqliteCreateTables } from "../drivers/sqlite.ts";

Deno.test("optional throws", () => {
    const exampleTable = o.table("example", {
        some_optional_string: o.string({ nullable: true }),
    });
    assertThrows(
        () => sqliteCreateTables(exampleTable),
        Error,
        "Optional should be handled by nullable"
    );
});

Deno.test("sqliteCreateTables", () => {
    const exampleTable = o.table("example", {
        // Key types
        some_autoinc_primarykey: o.pkAutoInc(),
        some_rowversion: o.rowversion(),

        // String types
        some_string: o.string(),
        some_varchar: o.varchar({ maxLength: 255 }),

        // Date types
        some_date: o.timestamp(),

        // Numeric types
        some_integer: o.int64(),
        some_bigint: o.bigint(),
        some_number: o.float64(),

        // Nullability
        some_nullable_string: o.string({ nullable: true }),
        some_nullable_integer: o.int64({ nullable: true }),

        // JSON types
        some_json_col: o.json({
            schema: v.object({
                foo: v.string(),
                bar: v.number(),
            }),
        }),
        // some_json_array_col: o.array(v.string()),

        // Auto populated timestamps
        some_created_at: o.createdAt(),
        some_updated_at: o.updatedAt(),
    });

    const value = sqliteCreateTables(exampleTable);
    assertEquals(
        value,
        `CREATE TABLE example (
            "some_autoinc_primarykey" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
            "some_rowversion" INTEGER NOT NULL,
            "some_string" TEXT NOT NULL,
            "some_varchar" TEXT NOT NULL CHECK (length("some_varchar") <= 255),
            "some_date" TEXT NOT NULL,
            "some_integer" INTEGER NOT NULL,
            "some_bigint" TEXT NOT NULL,
            "some_number" REAL NOT NULL,
            "some_nullable_string" TEXT,
            "some_nullable_integer" INTEGER,
            "some_json_col" TEXT NOT NULL CHECK (json_valid("some_json_col")),
            "some_json_array_col" TEXT NOT NULL CHECK (json_valid("some_json_array_col") AND json_type("some_json_array_col") = 'array'),
            "some_created_at" TEXT NOT NULL,
            "some_updated_at" TEXT NOT NULL
        );`
            .replaceAll("        ", "")
            .trim()
    );
});
