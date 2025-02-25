// import { PGlite } from "npm:@electric-sql/pglite";
import type { MapColumnsTo } from "../helpers.ts";

// const db = new PGlite();

// db.exec(`
//     CREATE TABLE users (
//         id SERIAL PRIMARY KEY,
//         name VARCHAR(100) NOT NULL,
//         email VARCHAR(100) UNIQUE NOT NULL,
//         created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
//     )
// `);

// db.exec(`INSERT INTO users (name, email) VALUES ('John Doe', 'john.doe@example.com')`);

// console.log(await db.query(`SELECT * FROM users`));

export const SCHEMAS_TO_POSTGRES = {
    // Primitive types
    int32(params) {
        if (params.autoIncrement) {
            return "SERIAL";
        }
        return "INTEGER";
    },
    int64(params) {
        if (params.autoIncrement) {
            return "BIGSERIAL";
        }
        return "BIGINT";
    },
    bigint() {
        return "NUMERIC";
    },
    float32() {
        return "REAL";
    },
    float64() {
        return "DOUBLE PRECISION";
    },
    decimal(params) {
        return `DECIMAL(${params.precision}, ${params.scale})`;
    },
    uuid() {
        return "UUID";
    },
    string() {
        return "TEXT";
    },
    varchar(params) {
        return `VARCHAR(${params.maxLength})`;
    },
    boolean() {
        return "BOOLEAN";
    },
    timestamp() {
        return "TIMESTAMP";
    },
    timestamptz() {
        return "TIMESTAMPTZ";
    },
    datepart() {
        return "DATE";
    },
    timepart() {
        return "TIME";
    },
    jsonb() {
        return "JSONB";
    },
    json() {
        return "JSON";
    },
    // Helper types
    rowversion() {
        return "BIGINT";
    },
    concurrencyStamp() {
        return "UUID";
    },
    userstring(params) {
        return `VARCHAR(${params.maxLength})`;
    },
    email() {
        return "VARCHAR(320)";
    },
    updatedAt() {
        return "TIMESTAMP";
    },
    createdAt() {
        return "TIMESTAMP";
    },
} satisfies MapColumnsTo<string>;
