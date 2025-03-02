import * as v from "npm:valibot";
import type { MapColumnsTo } from "./helpers.ts";
import type { Params } from "./columns.ts";

type ValibotSchema = v.BaseSchema<unknown, unknown, v.BaseIssue<unknown>>;

export const SCHEMAS = {
    // Primitive types
    int32() {
        return v.pipe(v.number(), v.integer(), v.maxValue(2147483647), v.minValue(-2147483648));
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
        return v.pipe(v.number(), v.maxValue(3.4028235e38), v.minValue(-3.4028235e38));
    },
    float64() {
        // TODO: Validate JS number limits, https://stackoverflow.com/questions/45929493/node-js-maximum-safe-floating-point-number
        return v.pipe(v.number(), v.maxValue(Number.MAX_VALUE), v.minValue(-Number.MAX_VALUE));
    },
    decimal(params) {
        return v.pipe(
            v.string(),
            v.minLength(3), // 0.0
            v.maxLength(params.precision + params.scale + 1),
            v.decimal()
        );
    },
    uuid() {
        return v.pipe(v.string(), v.uuid());
    },
    string() {
        return v.string();
    },
    varchar(params) {
        return v.pipe(v.string(), v.maxLength(params.maxLength));
    },
    boolean() {
        return v.pipe(v.boolean());
    },
    timestamp() {
        return v.date();
    },
    timestamptz() {
        return v.date();
        // This does not map to Temporal.ZonedDateTime because postgres does not
        // store the timezone identifier
    },
    datepart() {
        return v.pipe(v.string(), v.isoDate());
        // return v.instance(Temporal.PlainDate);
    },
    timepart() {
        return v.pipe(v.string(), v.isoTime());
        // return v.instance(Temporal.PlainTime);
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
    userstring(params) {
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
} satisfies MapColumnsTo<ValibotSchema>;
