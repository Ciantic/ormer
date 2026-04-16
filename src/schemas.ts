import type { MapColumnsTo } from "./helpers.ts";
import type { Params } from "./columns.ts";
import type { StandardSchemaV1 } from "@standard-schema/spec";
import * as s from "./simplevalidation.ts";

type UnknownSchema = StandardSchemaV1<unknown, unknown>;
type FinalType<T> = T extends infer U ? { [K in keyof U]: U[K] } : never;

export const SCHEMAS = {
    int32() {
        return schema({
            schema: s.int32,
            fromJson: s.number,
            toJson: s.number,
        });
    },
    int64() {
        return schema({
            schema: s.int64,
            fromJson: s.number,
            toJson: s.number,
        });
    },
    bigint() {
        return schema({
            schema: s.bigint,
            fromJson: s.bigintFromJson,
            toJson: s.bigintToJson,
        });
    },
    float32() {
        return schema({
            schema: s.float32,
            fromJson: s.number,
            toJson: s.number,
        });
    },
    float64() {
        return schema({
            schema: s.float64,
            fromJson: s.number,
            toJson: s.number,
        });
    },
    decimal(params: Params<{ precision: number; scale: number }>) {
        return schema({
            schema: s.decimal(params),
            fromJson: s.decimalFromJson,
            toJson: s.string,
        });
    },
    uuid() {
        return schema({
            schema: s.uuid,
            fromJson: s.string,
            toJson: s.string,
        });
    },
    string() {
        return schema({
            schema: s.string,
            fromJson: s.string,
            toJson: s.string,
        });
    },
    varchar(params) {
        return schema({
            schema: s.varchar(params),
            fromJson: s.string,
            toJson: s.string,
        });
    },
    boolean() {
        return schema({
            schema: s.boolean,
            fromJson: s.boolean,
            toJson: s.boolean,
        });
    },
    datetime() {
        return schema({
            schema: s.datetime,
            fromJson: s.datetimeFromJson,
            toJson: s.datetimeToJson,
        });
    },
    datepart() {
        return schema({
            schema: s.datepartstr,
            fromJson: s.string,
            toJson: s.string,
        });
    },
    timepart() {
        return schema({
            schema: s.timepartstr,
            fromJson: s.string,
            toJson: s.string,
        });
    },
    jsonb<T extends UnknownSchema>(params: Params<{ schema: T }>) {
        return schema({
            schema: params.schema,
            fromJson: params.schema,
            toJson: params.schema,
        });
    },
    json<T extends UnknownSchema>(params: Params<{ schema: T }>) {
        return schema({
            schema: params.schema,
            fromJson: params.schema,
            toJson: params.schema,
        });
    },
} satisfies MapColumnsTo<Schema<UnknownSchema, UnknownSchema, UnknownSchema>>;

export function schema<
    S extends StandardSchemaV1<unknown, unknown>,
    FromJson extends StandardSchemaV1<unknown, StandardSchemaV1.InferOutput<S>>,
    ToJson extends StandardSchemaV1<StandardSchemaV1.InferOutput<S>, unknown>
>(value: Schema<S, FromJson, ToJson>): FinalType<Schema<S, FromJson, ToJson>> {
    return value;
}

export interface Schema<
    S extends StandardSchemaV1<unknown, unknown>,
    FromJson extends StandardSchemaV1<unknown, StandardSchemaV1.InferOutput<S>>,
    ToJson extends StandardSchemaV1<StandardSchemaV1.InferOutput<S>, unknown>
> {
    readonly schema: S;
    readonly fromJson: FromJson;
    readonly toJson: ToJson;
}
