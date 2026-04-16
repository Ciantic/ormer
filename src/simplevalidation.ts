// This is a bit of a reinventing a wheel, but I don't want this library to
// depend on valibot or zod, types we have here are simple.
import type { StandardSchemaV1 } from "@standard-schema/spec";

function validator<I, O>(fn: (value: I) => StandardSchemaV1.Result<O>): StandardSchemaV1<I, O> {
    return {
        "~standard": {
            version: 1,
            vendor: "ormer",
            types: {
                input: undefined as unknown as I,
                output: undefined as unknown as O,
            },
            validate(value) {
                return fn(value as I);
            },
        },  
    }
}

export const number = validator<number, number>((value) => {
    if (typeof value !== "number") {
        return { issues: [{ message: "Expected number" }] };
    }
    if (!Number.isFinite(value)) {
        return { issues: [{ message: "Invalid value" }] };
    }
    return { value };
});

export const numberCoerced = validator<number | string, number>((value) => {
    if (typeof value === "string") {
        const n = +value;
        if (!Number.isFinite(n)) {
            return { issues: [{ message: "Invalid number string" }] };
        }
        return { value: n };
    }
    if (typeof value === "number") {
        if (!Number.isFinite(value)) {
            return { issues: [{ message: "Invalid value" }] };
        }
        return { value };
    }
    return { issues: [{ message: "Expected number or string" }] };
});

export const int32 = validator<number, number>((value) => {
    if (typeof value !== "number") {
        return { issues: [{ message: "Expected number" }] };
    }
    if (!Number.isInteger(value)) {
        return { issues: [{ message: "Invalid integer" }] };
    }
    if (value > 2147483647 || value < -2147483648) {
        return { issues: [{ message: "Invalid value" }] };
    }
    return { value };
});

export const int64 = validator<number, number>((value) => {
    if (typeof value !== "number") {
        return { issues: [{ message: "Expected number" }] };
    }
    if (!Number.isInteger(value)) {
        return { issues: [{ message: "Invalid integer" }] };
    }
    if (value > Number.MAX_SAFE_INTEGER || value < Number.MIN_SAFE_INTEGER) {
        return { issues: [{ message: "Invalid value" }] };
    }
    return { value };
});

export const bigint = validator<bigint, bigint>((value) => {
    if (typeof value !== "bigint") {
        return { issues: [{ message: "Invalid type" }] };
    }
    return { value };
});

export const bigintFromJson = validator<number | string, bigint>((value) => {
    if (typeof value === "number") {
        if (!Number.isInteger(value)) {
            return { issues: [{ message: "Expected integer" }] };
        }
        return { value: BigInt(value) };
    }
    if (typeof value === "string") {
        if (!/^\d+$/.test(value)) {
            return { issues: [{ message: "Expected digits-only string" }] };
        }
        return { value: BigInt(value) };
    }
    return { issues: [{ message: "Expected number or string" }] };
});

export const bigintToJson = validator<bigint, number | string>((value) => {
    if (typeof value !== "bigint") {
        return { issues: [{ message: "Expected bigint" }] };
    }
    if (value > Number.MAX_SAFE_INTEGER || value < Number.MIN_SAFE_INTEGER) {
        return { value: "" + value };
    }
    return { value: Number(value) };
});

export const bigintFromText = validator<string, bigint>((value) => {
    if (typeof value !== "string") {
        return { issues: [{ message: "Expected string" }] };
    }
    return { value: BigInt(value) };
});

export const bigintToText = validator<bigint, string>((value) => {
    if (typeof value !== "bigint") {
        return { issues: [{ message: "Expected bigint" }] };
    }
    return { value: value.toString() };
});

export const float32 = validator<number, number>((value) => {
    if (typeof value !== "number") {
        return { issues: [{ message: "Expected number" }] };
    }
    if (!Number.isFinite(value)) {
        return { issues: [{ message: "Invalid value" }] };
    }
    if (value > 3.4028235e38 || value < -3.4028235e38) {
        return { issues: [{ message: "Value out of float32 range" }] };
    }
    return { value };
});

export const float64 = validator<number, number>((value) => {
    if (typeof value !== "number") {
        return { issues: [{ message: "Expected number" }] };
    }
    if (!Number.isFinite(value)) {
        return { issues: [{ message: "Invalid value" }] };
    }
    if (value > Number.MAX_VALUE || value < -Number.MAX_VALUE) {
        return { issues: [{ message: "Value out of float64 range" }] };
    }
    return { value };
});

export function decimal(params: { precision: number; scale: number }): StandardSchemaV1<string, string> {
    return validator<string, string>((value) => {
        if (typeof value !== "string") {
            if (typeof value === "number" && !Number.isFinite(value as number)) {
                return { issues: [{ message: "Invalid type" }] };
            }
            return { issues: [{ message: "Expected string" }] };
        }
        if (value.length < 3) {
            return { issues: [{ message: "Invalid length" }] };
        }
        if (value.length > params.precision + params.scale + 1) {
            return { issues: [{ message: "Invalid length" }] };
        }
        if (!/^-?\d+\.\d+$/.test(value)) {
            return { issues: [{ message: "Invalid decimal" }] };
        }
        return { value };
    });
}

export const decimalFromJson = validator<number | string, string>((value) => {
    if (typeof value === "string") {
        return { value };
    }
    if (typeof value === "number") {
        return { value: "" + value };
    }
    return { issues: [{ message: "Expected number or string" }] };
});

export const uuid = validator<string, string>((value) => {
    if (typeof value !== "string") {
        return { issues: [{ message: "Expected string" }] };
    }
    if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value)) {
        return { issues: [{ message: "Invalid UUID" }] };
    }
    return { value };
});

export const string = validator<string, string>((value) => {
    if (typeof value !== "string") {
        return { issues: [{ message: "Expected string" }] };
    }
    return { value };
});

export const jsonToString = validator<any, string>((value) => {
    try {
        return { value: JSON.stringify(value) };
    } catch (e) {
        return { issues: [{ message: "Value cannot be stringified" }] };
    }
});

export function varchar(params: { maxLength: number }): StandardSchemaV1<string, string> {
    return validator<string, string>((value) => {
        if (typeof value !== "string") {
            return { issues: [{ message: "Expected string" }] };
        }
        if (value.length > params.maxLength) {
            return { issues: [{ message: "Invalid length" }] };
        }
        return { value };
    });
}

export const boolean = validator<boolean, boolean>((value) => {
    if (typeof value !== "boolean") {
        return { issues: [{ message: "Expected boolean" }] };
    }
    return { value };
});

export const datetime = validator<Date, Date>((value) => {
    if (!(value instanceof Date)) {
        return { issues: [{ message: "Expected Date" }] };
    }
    if (isNaN(value.getTime())) {
        return { issues: [{ message: "Invalid Date" }] };
    }
    return { value };
});

const ISO_DATETIME_RE = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/;
const ISO_TIMESTAMP_RE = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d+)?(Z|[+-]\d{2}:?\d{2})$/;

export const datetimeFromIsoString = validator<string | number, Date>((value) => {
    if (typeof value === "string") {
        if (ISO_DATETIME_RE.test(value)) {
            return { value: new Date(value + "Z") };
        }
        if (ISO_TIMESTAMP_RE.test(value)) {
            return { value: new Date(value) };
        }
        return { issues: [{ message: "Invalid datetime string" }] };
    }
    if (typeof value === "number") {
        // Milliseconds if > 9999999999, otherwise seconds
        return { value: value > 9999999999 ? new Date(value) : new Date(value * 1000) };
    }
    return { issues: [{ message: "Expected string or number" }] };
});

export const datetimeToIsoString = validator<Date, string>((value) => {
    if (!(value instanceof Date)) {
        return { issues: [{ message: "Expected Date" }] };
    }
    return { value: value.toISOString() };
});

const ISO_DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

export const datepartCoerced = validator<Date | string, string>((value) => {
    if (value instanceof Date) return { value: value.toISOString().slice(0, 10) };
    if (typeof value === "string") return { value };
    return { issues: [{ message: "Expected Date or string" }] };
});

export const datepartstr = validator<string, string>((value) => {
    if (typeof value !== "string") {
        return { issues: [{ message: "Expected string" }] };
    }
    if (!ISO_DATE_RE.test(value)) {
        return { issues: [{ message: "Invalid ISO date" }] };
    }
    return { value };
});

const ISO_TIME_RE = /^\d{2}:\d{2}(:\d{2}(\.\d+)?)?$/;

export const timepartstr = validator<string, string>((value) => {
    if (typeof value !== "string") {
        return { issues: [{ message: "Expected string" }] };
    }
    if (!ISO_TIME_RE.test(value)) {
        return { issues: [{ message: "Invalid ISO time" }] };
    }
    return { value };
});

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export const email = validator<string, string>((value) => {
    if (typeof value !== "string") {
        return { issues: [{ message: "Expected string" }] };
    }
    if (!EMAIL_RE.test(value)) {
        return { issues: [{ message: "Invalid email" }] };
    }
    return { value };
});

export function combineRecordOfSchemas<T extends Record<string, StandardSchemaV1<unknown, unknown>>>(schemas: T): StandardSchemaV1<{ [K in keyof T]: StandardSchemaV1.InferInput<T[K]> }, { [K in keyof T]: StandardSchemaV1.InferOutput<T[K]> }> {
    return validator<{ [K in keyof T]: StandardSchemaV1.InferInput<T[K]> }, { [K in keyof T]: StandardSchemaV1.InferOutput<T[K]> }>((value) => {
        if (typeof value !== "object" || value === null) {
            return { issues: [{ message: "Expected object" }] };
        }
        const result: Partial<{ [K in keyof T]: StandardSchemaV1.InferOutput<T[K]> }> = {};
        for (const key in schemas) {
            const schema = schemas[key]!;
            const res = schema["~standard"].validate((value as any)[key]);
            if (res instanceof Promise) {
                return { issues: [{ message: "Async validation not supported" }] };
            }
            if (res.issues) {
                return { issues: [{ message: `Error in key "${key}": ${res.issues[0]?.message}` }] };
            }
            result[key] = res.value;
        }
        return { value: result as { [K in keyof T]: StandardSchemaV1.InferOutput<T[K]> } };
    });
}