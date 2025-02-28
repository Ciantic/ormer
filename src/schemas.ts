import * as v from "npm:valibot";
import type { MapColumnsTo } from "./helpers.ts";
import type { Params } from "./columns.ts";

type ValibotSchema = v.BaseSchema<unknown, unknown, v.BaseIssue<unknown>>;

export const TYPES_TO_SCHEMAS = {
    // Primitive types
    int32() {
        return {
            schema: v.pipe(v.number(), v.integer()),
            fromJson: v.number(),
            toJson: v.number(),
        };
    },
    int64() {
        // Note: JS supports up to 53 bit
        return {
            schema: v.pipe(
                v.number(),
                v.integer(),
                v.maxValue(Number.MAX_SAFE_INTEGER), // TODO: THINK
                v.minValue(Number.MIN_SAFE_INTEGER)
            ),
            fromJson: v.number(),
            toJson: v.number(),
        };
    },
    bigint() {
        return {
            schema: v.bigint(),
            fromJson: v.union([
                v.pipe(
                    v.number(),
                    v.integer(),
                    v.transform((i) => BigInt(i))
                ),
                v.pipe(
                    v.string(),
                    v.digits(),
                    v.transform((i) => BigInt(i))
                ),
            ]),
            toJson: v.pipe(
                v.bigint(),
                v.transform((i) => {
                    if (i > Number.MAX_SAFE_INTEGER || i < Number.MIN_SAFE_INTEGER) {
                        return "" + i;
                    } else {
                        return Number(i);
                    }
                })
            ),
        };
    },
    float32() {
        return {
            schema: v.number(),
            fromJson: v.number(),
            toJson: v.number(),
        };
    },
    float64() {
        // TODO: Validate JS number limits, https://stackoverflow.com/questions/45929493/node-js-maximum-safe-floating-point-number
        return {
            schema: v.number(),
            fromJson: v.number(),
            toJson: v.number(),
        };
    },
    decimal(params) {
        return {
            schema: v.pipe(
                v.string(),
                v.minLength(3), // 0.0
                v.maxLength(params.precision + params.scale + 1),
                v.decimal()
            ),
            fromJson: v.string(),
            toJson: v.string(),
        };
    },
    uuid() {
        return {
            schema: v.pipe(v.string(), v.uuid()),
            fromJson: v.string(),
            toJson: v.string(),
        };
    },
    string() {
        return {
            schema: v.string(),
            fromJson: v.string(),
            toJson: v.string(),
        };
    },
    varchar(params) {
        return {
            schema: v.pipe(v.string(), v.maxLength(params.maxLength)),
            fromJson: v.string(),
            toJson: v.string(),
        };
    },
    boolean() {
        return {
            schema: v.boolean(),
            fromJson: v.boolean(),
            toJson: v.boolean(),
        };
    },
    timestamp() {
        return {
            schema: v.date(),
            fromJson: v.union([
                v.pipe(
                    // yyyy-mm-ddThh:mm
                    v.string(),
                    v.isoDateTime(),
                    v.transform((s) => new Date(s))
                ),
                v.pipe(
                    // yyyy-mm-ddThh:mm:ss.sssZ, yyyy-mm-ddThh:mm:ss.sss±hh:mm, yyyy-mm-ddThh:mm:ss.sss±hhmm
                    v.string(),
                    v.isoTimestamp(),
                    v.transform((s) => new Date(s))
                ),
                v.pipe(
                    // Unix time in seconds
                    v.number(),
                    v.transform((i) => {
                        // Seconds
                        if (i < 10000000000) {
                            return new Date(i * 1000);
                        }
                        // Milliseconds
                        return new Date(i);
                    })
                ),
            ]),
            toJson: v.pipe(
                v.date(),
                v.transform((d) => d.toISOString())
            ),
        };
    },
    timestamptz() {
        return {
            schema: v.instance(Temporal.ZonedDateTime),
            fromJson: v.union([
                v.pipe(
                    // yyyy-mm-ddThh:mm:ss.sssZ, yyyy-mm-ddThh:mm:ss.sss±hh:mm, yyyy-mm-ddThh:mm:ss.sss±hhmm
                    v.string(),
                    v.isoTimestamp(),
                    v.transform((s) => Temporal.ZonedDateTime.from(s))
                ),
            ]),
            toJson: v.pipe(
                v.instance(Temporal.ZonedDateTime),
                v.transform((d) => d.toString())
            ),
        };
    },
    datepart() {
        return {
            schema: v.instance(Temporal.PlainDate),
            fromJson: v.union([
                v.pipe(
                    // yyyy-mm-dd
                    v.string(),
                    v.isoDate(),
                    v.transform((s) => Temporal.PlainDate.from(s))
                ),
            ]),
            toJson: v.pipe(
                v.instance(Temporal.PlainDate),
                v.transform((d) => d.toString())
            ),
        };
    },
    timepart() {
        return {
            schema: v.instance(Temporal.PlainTime),
            fromJson: v.union([
                v.pipe(
                    // hh:mm:ss.sssZ, hh:mm:ss.sss±hh:mm, hh:mm:ss.sss±hhmm
                    v.string(),
                    v.isoTime(),
                    v.transform((s) => Temporal.PlainTime.from(s))
                ),
            ]),
            toJson: v.pipe(
                v.instance(Temporal.PlainTime),
                v.transform((d) => d.toString())
            ),
        };
    },
    jsonb<T extends ValibotSchema>(params: Params<{ schema: T }>) {
        return {
            schema: params.schema,
            fromJson: params.schema,
            toJson: params.schema,
        };
    },
    json<T extends ValibotSchema>(params: Params<{ schema: T }>) {
        return {
            schema: params.schema,
            fromJson: params.schema,
            toJson: params.schema,
        };
    },
    // Helper types
    rowversion() {
        return this.int64({});
    },
    concurrencyStamp() {
        return this.uuid({});
    },
    userstring(params) {
        return {
            schema: v.pipe(
                v.string(),
                v.trim(),
                v.minLength(params.minLength ?? 0),
                v.maxLength(params.maxLength)
            ),
            fromJson: v.string(),
            toJson: v.string(),
        };
    },
    email() {
        return {
            schema: v.pipe(v.string(), v.trim(), v.email(), v.maxLength(320)),
            fromJson: v.string(),
            toJson: v.string(),
        };
    },
    updatedAt() {
        return this.timestamp({});
    },
    createdAt() {
        return this.timestamp({});
    },
} satisfies MapColumnsTo<{
    toJson: ValibotSchema;
    fromJson: ValibotSchema;
    schema: ValibotSchema;
}>;
