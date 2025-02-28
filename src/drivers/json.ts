import * as v from "npm:valibot";
import type { Params } from "../columns.ts";
import type { TransformSchemas } from "../helpers.ts";

type ValibotSchema = v.BaseSchema<unknown, unknown, v.BaseIssue<unknown>>;

export const JSON_SCHEMAS = {
    // Primitive types
    int32() {
        return {
            from: v.number(),
            to: v.number(),
        };
    },
    int64() {
        // Note: JS supports up to 53 bit
        return {
            from: v.number(),
            to: v.number(),
        };
    },
    bigint() {
        return {
            from: v.union([
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
            to: v.pipe(
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
            from: v.number(),
            to: v.number(),
        };
    },
    float64() {
        // TODO: Validate JS number limits, https://stackoverflow.com/questions/45929493/node-js-maximum-safe-floating-point-number
        return {
            from: v.number(),
            to: v.number(),
        };
    },
    decimal() {
        return {
            from: v.union([
                v.string(),
                v.pipe(
                    v.number(),
                    v.transform((v) => "" + v)
                ),
            ]),
            to: v.string(),
        };
    },
    uuid() {
        return {
            from: v.string(),
            to: v.string(),
        };
    },
    string() {
        return {
            from: v.string(),
            to: v.string(),
        };
    },
    varchar() {
        return {
            from: v.string(),
            to: v.string(),
        };
    },
    boolean() {
        return {
            from: v.boolean(),
            to: v.boolean(),
        };
    },
    timestamp() {
        return {
            from: v.union([
                v.pipe(
                    // yyyy-mm-ddThh:mm
                    v.string(),
                    v.isoDateTime(),
                    v.transform((s) => new Date(s + "Z"))
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
                        // Milliseconds
                        if (i > 9999999999) {
                            return new Date(i);
                        }
                        // Seconds
                        return new Date(i * 1000);
                    })
                ),
            ]),
            to: v.pipe(
                v.date(),
                v.transform((d) => d.toISOString())
            ),
        };
    },
    timestamptz() {
        return {
            from: v.union([
                v.pipe(
                    // yyyy-mm-ddThh:mm:ss.sssZ, yyyy-mm-ddThh:mm:ss.sss±hh:mm, yyyy-mm-ddThh:mm:ss.sss±hhmm
                    v.string(),
                    v.rawTransform(({ dataset, addIssue, NEVER }) => {
                        try {
                            return Temporal.ZonedDateTime.from(dataset.value);
                        } catch (_e) {
                            addIssue({
                                message: "Format not valid for ZonedDateTime",
                                input: dataset.value,
                            });
                            return NEVER;
                        }
                    })
                ),
            ]),
            to: v.pipe(
                v.instance(Temporal.ZonedDateTime),
                v.transform((d) => d.toString())
            ),
        };
    },
    datepart() {
        return {
            from: v.union([
                v.pipe(
                    // yyyy-mm-dd
                    v.string(),
                    v.rawTransform(({ dataset, addIssue, NEVER }) => {
                        try {
                            return Temporal.PlainDate.from(dataset.value);
                        } catch (_e) {
                            addIssue({
                                message: "Format not valid for PlainDate",
                                input: dataset.value,
                                expected: "yyyy-mm-dd",
                            });
                            return NEVER;
                        }
                    })
                ),
            ]),
            to: v.pipe(
                v.instance(Temporal.PlainDate),
                v.transform((d) => d.toString())
            ),
        };
    },
    timepart() {
        return {
            from: v.union([
                v.pipe(
                    // hh:mm:ss.sssZ, hh:mm:ss.sss±hh:mm, hh:mm:ss.sss±hhmm
                    v.string(),
                    v.rawTransform(({ dataset, addIssue, NEVER }) => {
                        try {
                            return Temporal.PlainTime.from(dataset.value);
                        } catch (_e) {
                            addIssue({
                                message: "Format not valid for PlainTime",
                                input: dataset.value,
                                expected: "hh:mm[:ss.sss]",
                            });
                            return NEVER;
                        }
                    })
                ),
            ]),
            to: v.pipe(
                v.instance(Temporal.PlainTime),
                v.transform((d) => d.toString())
            ),
        };
    },
    jsonb<T extends ValibotSchema>(params: Params<{ schema: T }>) {
        return {
            from: params.schema,
            to: params.schema,
        };
    },
    json<T extends ValibotSchema>(params: Params<{ schema: T }>) {
        return {
            from: params.schema,
            to: params.schema,
        };
    },
    // Helper types
    rowversion() {
        return this.int64({});
    },
    concurrencyStamp() {
        return this.uuid({});
    },
    userstring() {
        return {
            from: v.string(),
            to: v.string(),
        };
    },
    email() {
        return {
            from: v.string(),
            to: v.string(),
        };
    },
    updatedAt() {
        return this.timestamp({});
    },
    createdAt() {
        return this.timestamp({});
    },
} satisfies TransformSchemas;
