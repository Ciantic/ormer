import * as v from "npm:valibot";
import { assertEquals, assertThrows } from "jsr:@std/assert";
import type { Table, ColumnKind, ColumnType } from "./lib.ts";
import * as o from "./lib.ts";
import { sqliteCreateTables } from "./sqlite.ts";

Deno.test("optional throws", () => {
    const exampleTable = o.table("example", {
        some_optional_string: o.col(v.optional(v.string())),
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
        some_rowversion: o.rowVersion(),

        // String types
        some_string: o.string(),
        some_varchar: o.varchar(255),

        // Date types
        some_date: o.col(v.date()),

        // Numeric types
        some_integer: o.integer(),
        some_bigint: o.bigint(),
        some_number: o.float(),

        // Nullability
        some_nullable_string: o.nullable(o.string()),
        some_nullable_integer: o.nullable(o.integer()),

        // JSON types
        some_json_col: o.json({
            foo: v.string(),
            bar: v.number(),
        }),
        some_json_array_col: o.array(v.string()),

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
