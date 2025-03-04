import * as v from "npm:valibot";
import type { MapColumnsTo } from "./helpers.ts";
import type { Params } from "./columns.ts";

type ValibotSchema = v.BaseSchema<unknown, unknown, v.BaseIssue<unknown>>;
type FinalType<T> = T extends infer U ? { [K in keyof U]: U[K] } : never;

export const SCHEMAS = {
    int32() {
        return schema({
            schema: v.pipe(
                v.number(),
                v.integer(),
                v.maxValue(2147483647),
                v.minValue(-2147483648)
            ),
            fromJson: v.number(),
            toJson: v.number(),
        });
    },
    int64() {
        return schema({
            schema: v.pipe(
                v.number(),
                v.integer(),
                v.maxValue(Number.MAX_SAFE_INTEGER),
                v.minValue(Number.MIN_SAFE_INTEGER)
            ),
            fromJson: v.number(),
            toJson: v.number(),
        });
    },
    bigint() {
        return schema({
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
            toJson: v.union([
                v.pipe(
                    v.bigint(),
                    v.transform((i) => {
                        if (i > Number.MAX_SAFE_INTEGER || i < Number.MIN_SAFE_INTEGER) {
                            return "" + i;
                        } else {
                            return Number(i);
                        }
                    })
                ),
            ]),
        });
    },
    float32() {
        return schema({
            schema: v.pipe(v.number(), v.maxValue(3.4028235e38), v.minValue(-3.4028235e38)),
            fromJson: v.number(),
            toJson: v.number(),
        });
    },
    float64() {
        return schema({
            schema: v.pipe(v.number(), v.maxValue(Number.MAX_VALUE), v.minValue(-Number.MAX_VALUE)),
            fromJson: v.number(),
            toJson: v.number(),
        });
    },
    decimal(params: Params<{ precision: number; scale: number }>) {
        return schema({
            schema: v.pipe(
                v.string(),
                v.minLength(3), // 0.0
                v.maxLength(params.precision + params.scale + 1),
                v.decimal()
            ),
            fromJson: v.union([
                v.string(),
                v.pipe(
                    v.number(),
                    v.transform((v) => "" + v)
                ),
            ]),
            toJson: v.string(),
        });
    },
    uuid() {
        return schema({
            schema: v.pipe(v.string(), v.uuid()),
            fromJson: v.string(),
            toJson: v.string(),
        });
    },
    string() {
        return schema({
            schema: v.string(),
            fromJson: v.string(),
            toJson: v.string(),
        });
    },
    varchar(params) {
        return schema({
            schema: v.pipe(v.string(), v.maxLength(params.maxLength)),
            fromJson: v.string(),
            toJson: v.string(),
        });
    },
    boolean() {
        return schema({
            schema: v.boolean(),
            fromJson: v.boolean(),
            toJson: v.boolean(),
        });
    },
    timestamp(params) {
        return schema({
            schema: v.date(),
            fromJson: v.union([
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
            toJson: v.pipe(
                v.date(),
                v.transform((d) => d.toISOString())
            ),
        });
    },
    timestamptz(params) {
        return schema({
            schema: v.date(),
            fromJson: v.union([
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
            toJson: v.pipe(
                v.date(),
                v.transform((d) => d.toISOString())
            ),
        });
    },
    datepart() {
        return schema({
            schema: v.pipe(v.string(), v.isoDate()),
            fromJson: v.string(),
            toJson: v.string(),
        });
    },
    timepart() {
        return schema({
            schema: v.pipe(v.string(), v.isoTime()),
            fromJson: v.string(),
            toJson: v.string(),
        });
    },
    jsonb<T extends ValibotSchema>(params: Params<{ schema: T }>) {
        return schema({
            schema: params.schema,
            fromJson: params.schema,
            toJson: params.schema,
        });
    },
    json<T extends ValibotSchema>(params: Params<{ schema: T }>) {
        return schema({
            schema: params.schema,
            fromJson: params.schema,
            toJson: params.schema,
        });
    },
} satisfies MapColumnsTo<Schema<ValibotSchema, ValibotSchema, ValibotSchema>>;

export function schema<
    S extends ValibotSchema,
    FromJson extends v.BaseSchema<unknown, v.InferOutput<S>, v.BaseIssue<unknown>>,
    ToJson extends v.BaseSchema<v.InferOutput<S>, unknown, v.BaseIssue<unknown>>
>(value: Schema<S, FromJson, ToJson>): FinalType<Schema<S, FromJson, ToJson>> {
    return value;
}

export interface Schema<
    S extends v.BaseSchema<unknown, unknown, v.BaseIssue<unknown>>,
    FromJson extends v.BaseSchema<unknown, v.InferOutput<S>, v.BaseIssue<unknown>>,
    ToJson extends v.BaseSchema<v.InferOutput<S>, unknown, v.BaseIssue<unknown>>
> {
    readonly schema: S;
    readonly fromJson: FromJson;
    readonly toJson: ToJson;
}
