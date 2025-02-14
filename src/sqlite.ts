import * as v from "npm:valibot";
import { assertEquals } from "jsr:@std/assert/equals";
import {
    Table,
    ColumnKind,
    ColumnType,
    col,
    createdAt,
    pkAutoInc,
    rowVersion,
    table,
    updatedAt,
    nullable,
} from "./lib.ts";

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

const COLUMN_TYPE_MAP = {
    string: "TEXT",
    integer: "INTEGER",
    number: "REAL",
    Date: "TEXT",
    bigint: "TEXT",
    Object: "TEXT", // JSON
    Array: "TEXT", // JSON ARRAY
};

function buildSqliteColumnTypeStr(column: ColumnType<ColumnKind>, name: string) {
    let schema = column.select;
    let type = schema.expects as keyof typeof COLUMN_TYPE_MAP;
    let isOptional = false;
    let isNullable = false;
    let constraints = "";
    if (schema.type === "optional") {
        const optschema = schema as v.OptionalSchema<v.AnySchema, undefined>;
        type = optschema.wrapped.expects as keyof typeof COLUMN_TYPE_MAP;
        isOptional = true;
    }

    if (schema.type === "nullable") {
        const nullschema = schema as v.NullableSchema<v.AnySchema, undefined>;
        type = nullschema.wrapped.expects as keyof typeof COLUMN_TYPE_MAP;
        isNullable = true;
    }

    if ("pipe" in schema) {
        const pipeschema = schema as unknown as v.SchemaWithPipe<any>;
        schema = pipeschema.pipe[0];

        // If pipe contains integer
        if (pipeschema.pipe.some((p: any) => p.type === "integer")) {
            type = "integer";
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

    const nullnessStr = isOptional || isNullable ? "" : "NOT NULL";
    const primaryKeyStr = column.kind === "primaryKey" ? "PRIMARY KEY" : "";
    const autoIncStr = column.autoIncrement ? "AUTOINCREMENT" : "";

    return [columnTypeStr, nullnessStr, primaryKeyStr, autoIncStr, constraints]
        .filter((f) => f)
        .join(" ");
}

Deno.test("sqliteCreateTables", () => {
    const exampleTable = table("example", {
        some_autoinc_primarykey: pkAutoInc(),
        some_string: col(v.string()),
        some_optstring: col(v.optional(v.string())),
        some_date: col(v.date()),
        some_bigint: col(v.bigint()),
        some_number: col(v.number()),
        some_nullable_number: nullable(col(v.number())),
        some_rowversion: rowVersion(),
        some_json_col: col(
            v.object({
                foo: v.string(),
                bar: v.number(),
            })
        ),
        some_json_array_col: col(v.array(v.string())),
        some_created_at: createdAt(),
        some_updated_at: updatedAt(),
    });

    assertEquals(
        sqliteCreateTables(exampleTable),
        `CREATE TABLE example (
            "some_autoinc_primarykey" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
            "some_string" TEXT NOT NULL,
            "some_optstring" TEXT,
            "some_date" TEXT NOT NULL,
            "some_bigint" TEXT NOT NULL,
            "some_number" REAL NOT NULL,
            "some_nullable_number" REAL,
            "some_rowversion" INTEGER NOT NULL,
            "some_json_col" TEXT NOT NULL CHECK (json_valid("some_json_col")),
            "some_json_array_col" TEXT NOT NULL CHECK (json_valid("some_json_array_col") AND json_type("some_json_array_col") = 'array'),
            "some_created_at" TEXT NOT NULL,
            "some_updated_at" TEXT NOT NULL
        );`
            .replaceAll("        ", "")
            .trim()
    );
});
