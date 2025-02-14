import type * as v from "npm:valibot";
import type { Table, ColumnKind, ColumnType } from "./lib.ts";

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
