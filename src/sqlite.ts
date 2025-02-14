import * as v from "npm:valibot";
import { assertEquals, assertThrows } from "jsr:@std/assert";
import type { Table, ColumnKind, ColumnType } from "./lib.ts";
import * as o from "./lib.ts";

export function sqliteCreateTables<
    T extends readonly Table<any, Record<string, ColumnType<ColumnKind>>>[]
>(...tables: T) {
    return tables.map(buildSqliteCreateTable).join("\n\n");
}

function buildSqliteCreateTable<T extends Record<string, ColumnType<ColumnKind>>>(
    table: Table<any, T>
) {
    const columns = Object.entries(table.columns)
        .map(buildSqliteColumn)
        .map((s) => `    ${s}`)
        .join(",\n");
    return `CREATE TABLE ${table.table} (\n${columns}\n);`;
}

function buildSqliteColumn([name, column]: [string, ColumnType<ColumnKind>]) {
    return `"${name}" ${buildSqliteColumnTypeStr(column, name)}`;
}

// https://www.sqlite.org/stricttables.html
const COLUMN_TYPE_MAP = {
    string: "TEXT",
    number: "REAL",
    Date: "TEXT",
    bigint: "TEXT", // Sqlite supports up to 64-bit integers
    Object: "TEXT", // JSON
    Array: "TEXT", // JSON ARRAY
    boolean: "INTEGER",

    // Non JS types
    integer: "INTEGER",
    decimal: "TEXT",
};

function buildSqliteColumnTypeStrSchema(
    column: ColumnType<ColumnKind>,
    name: string,
    schema: v.BaseSchema<unknown, unknown, v.BaseIssue<unknown>>,
    extra: { isOptional?: boolean; isNullable?: boolean } = {}
) {
    const { isOptional, isNullable } = extra;
    let type = schema.expects as keyof typeof COLUMN_TYPE_MAP;
    let constraints = "";
    if (schema.type === "optional") {
        // Kysely doesn't support returning undefined columns, only nullable columns
        throw new Error("Optional should be handled by nullable");

        // const optschema = schema as v.OptionalSchema<v.AnySchema, undefined>;
        // type = optschema.wrapped.expects as keyof typeof COLUMN_TYPE_MAP;
        // return buildSqliteColumnTypeStrSchema(column, name, optschema.wrapped, {
        //     isOptional: true,
        // });
    }

    if (schema.type === "nullable") {
        const nullschema = schema as v.NullableSchema<v.AnySchema, undefined>;
        type = nullschema.wrapped.expects as keyof typeof COLUMN_TYPE_MAP;
        return buildSqliteColumnTypeStrSchema(column, name, nullschema.wrapped, {
            isNullable: true,
        });
    }

    if ("pipe" in schema) {
        const pipeschema = schema as unknown as v.SchemaWithPipe<[any, ...any]>;
        schema = pipeschema.pipe[0];

        // If pipe contains integer
        if (pipeschema.pipe.some((p) => p.type === "integer")) {
            type = "integer";
        }

        const minLengthValidation: v.MinLengthAction<any, any, any> | undefined =
            pipeschema.pipe.find((p) => p.type === "max_length");
        if (minLengthValidation) {
            constraints = `CHECK (length("${name}") <= ${minLengthValidation.requirement})`;
        }
    }

    const columnTypeStr = COLUMN_TYPE_MAP[type];
    if (!columnTypeStr) {
        throw new Error(`Error sqliteColumnType is not known: ${type}`);
    }

    if (type === "Object") {
        constraints = `CHECK (json_valid("${name}"))`;
    }

    if (type === "Array") {
        constraints = `CHECK (json_valid("${name}") AND json_type("${name}") = 'array')`;
    }

    const primaryKeyStr = column.kind === "primaryKey" ? "PRIMARY KEY" : "";
    const autoIncStr = column.autoIncrement ? "AUTOINCREMENT" : "";
    const nullnessStr = isOptional || isNullable ? "" : "NOT NULL";

    return [columnTypeStr, nullnessStr, primaryKeyStr, autoIncStr, constraints]
        .filter((f) => f)
        .join(" ");
}

function buildSqliteColumnTypeStr(column: ColumnType<ColumnKind>, name: string) {
    return buildSqliteColumnTypeStrSchema(column, name, column.select, {});
}

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
