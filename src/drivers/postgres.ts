import type { MapColumnsTo } from "../helpers.ts";
import type { ColumnDataType } from "npm:kysely";

export const POSTGRES_COLUMN_TYPES = {
    // Primitive types
    int32(params) {
        if (params.autoIncrement) {
            return "serial";
        }
        return "integer";
    },
    int64(params) {
        if (params.autoIncrement) {
            return "bigserial";
        }
        return "bigint";
    },
    bigint() {
        return "numeric";
    },
    float32() {
        return "real";
    },
    float64() {
        return "double precision";
    },
    decimal(params) {
        return `decimal(${params.precision}, ${params.scale})`;
    },
    uuid() {
        return "uuid";
    },
    string() {
        return "text";
    },
    varchar(params) {
        return `varchar(${params.maxLength})`;
    },
    boolean() {
        return "boolean";
    },
    timestamp() {
        return "timestamp";
    },
    timestamptz() {
        return "timestamptz";
    },
    datepart() {
        return "date";
    },
    timepart() {
        return "time";
    },
    jsonb() {
        return "jsonb";
    },
    json() {
        return "json";
    },
    // Helper types
    rowversion() {
        return "bigint";
    },
    concurrencyStamp() {
        return "uuid";
    },
    userstring(params) {
        return `varchar(${params.maxLength})`;
    },
    email() {
        return "varchar(320)";
    },
    updatedAt() {
        return "timestamp";
    },
    createdAt() {
        return "timestamp";
    },
} satisfies MapColumnsTo<ColumnDataType>;
