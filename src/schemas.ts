// deno-lint-ignore-file no-explicit-any
import * as v from "npm:valibot";
import { DecimalCol, Params, UserStringCol, VarCharCol } from "./columns.ts";

type ValibotSchema = v.BaseSchema<unknown, unknown, v.BaseIssue<unknown>>;

export const TYPES_TO_SCHEMAS = {
    // Primitive types
    int32() {
        return v.pipe(v.number(), v.integer());
    },
    int64() {
        // Note: JS supports up to 53 bit
        return v.pipe(
            v.number(),
            v.integer(),
            v.maxValue(Number.MAX_SAFE_INTEGER), // TODO: THINK
            v.minValue(Number.MIN_SAFE_INTEGER)
        );
    },
    bigint() {
        return v.bigint();
    },
    float32() {
        return v.pipe(v.number());
    },
    float64() {
        // TODO: Validate JS number limits, https://stackoverflow.com/questions/45929493/node-js-maximum-safe-floating-point-number
        return v.pipe(v.number());
    },
    decimal(params: DecimalCol) {
        return v.pipe(
            v.string(),
            v.minLength(3), // 0.0
            v.maxLength(params.precision + params.scale + 1),
            v.decimal()
        );
    },
    serial() {
        return v.pipe(v.number(), v.integer());
    },
    bigserial() {
        return v.pipe(v.number(), v.integer());
    },
    uuid() {
        return v.pipe(v.string(), v.uuid());
    },
    string() {
        return v.string();
    },
    varchar(params: VarCharCol) {
        return v.pipe(v.string(), v.maxLength(params.maxLength));
    },
    boolean() {
        return v.pipe(v.boolean());
    },
    timestamp() {
        return v.date();
    },
    timestamptz() {
        // TODO: Use temporal
        return v.string();
    },
    datepart() {
        return v.string();
    },
    timepart() {
        return v.string();
    },
    jsonb<T extends ValibotSchema>(params: Params<{ schema: T }>) {
        return params.schema;
    },
    json<T extends ValibotSchema>(params: Params<{ schema: T }>) {
        return params.schema;
    },
    // Helper types
    rowversion() {
        return v.pipe(v.number(), v.integer());
    },
    concurrencyStamp() {
        return v.pipe(v.string(), v.uuid());
    },
    userstring(params: UserStringCol) {
        return v.pipe(
            v.string(),
            v.trim(),
            v.minLength(params.minLength ?? 0),
            v.maxLength(params.maxLength)
        );
    },
    email() {
        return v.pipe(v.string(), v.trim(), v.email(), v.maxLength(320));
    },
    updatedAt() {
        return v.pipe(v.date());
    },
    createdAt() {
        return v.pipe(v.date());
    },
};

TYPES_TO_SCHEMAS satisfies Record<Types, (params?: any) => ValibotSchema>;

type Types = keyof typeof TYPES_TO_SCHEMAS;
