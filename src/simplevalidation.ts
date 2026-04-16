// This is a bit of a reinventing a wheel, but I don't want this library to
// depend on valibot or zod, types we have here are simple.
import type { StandardSchemaV1 } from "@standard-schema/spec";

export function makeValidator<I, O>(fn: (value: I) => O): StandardSchemaV1<I, O> {
    return {
        "~standard": {
            version: 1,
            vendor: "ormer",
            types: {
                input: undefined as unknown as I,
                output: undefined as unknown as O,
            },
            validate(value) {
                try {
                    return { value: fn(value as I) };
                } catch (e) {
                    if (e instanceof Error) {
                        return { issues: [{ message: e.message }] };
                    } else {
                        return { issues: [{ message: "Unknown error" }] };
                    }
                }
            },
        },  
    }
}

export const number = makeValidator<number, number>((value) => {
    if (typeof value !== "number") {
        throw new Error("Expected number");
    }
    if (!Number.isFinite(value)) {
        throw new Error("Invalid value");
    }
    return value;
});

export const numberCoerced = makeValidator<number | string, number>((value) => {
    if (typeof value === "string") {
        const n = +value;
        if (!Number.isFinite(n)) {
            throw new Error("Invalid number string");
        }
        return n;
    }
    if (typeof value === "number") {
        if (!Number.isFinite(value)) {
            throw new Error("Invalid value");
        }
        return value;
    }
    throw new Error("Expected number or string");
});

export const int32 = makeValidator<number, number>((value) => {
    if (typeof value !== "number") {
        throw new Error("Expected number");
    }
    if (!Number.isInteger(value)) {
        throw new Error("Invalid integer");
    }
    if (value > 2147483647 || value < -2147483648) {
        throw new Error("Invalid value");
    }
    return value;
});

export const int64 = makeValidator<number, number>((value) => {
    if (typeof value !== "number") {
        throw new Error("Expected number");
    }
    if (!Number.isInteger(value)) {
        throw new Error("Invalid integer");
    }
    if (value > Number.MAX_SAFE_INTEGER || value < Number.MIN_SAFE_INTEGER) {
        throw new Error("Invalid value");
    }
    return value;
});

export const bigint = makeValidator<bigint, bigint>((value) => {
    if (typeof value !== "bigint") {
        throw new Error("Invalid type");
    }
    return value;
});

export const bigintFromJson = makeValidator<number | string, bigint>((value) => {
    if (typeof value === "number") {
        if (!Number.isInteger(value)) {
            throw new Error("Expected integer");
        }
        return BigInt(value);
    }
    if (typeof value === "string") {
        if (!/^\d+$/.test(value)) {
            throw new Error("Expected digits-only string");
        }
        return BigInt(value);
    }
    throw new Error("Expected number or string");
});

export const bigintToJson = makeValidator<bigint, number | string>((value) => {
    if (typeof value !== "bigint") {
        throw new Error("Expected bigint");
    }
    if (value > Number.MAX_SAFE_INTEGER || value < Number.MIN_SAFE_INTEGER) {
        return "" + value;
    }
    return Number(value);
});

export const bigintFromText = makeValidator<string, bigint>((value) => {
    if (typeof value !== "string") {
        throw new Error("Expected string");
    }
    return BigInt(value);
});

export const bigintToText = makeValidator<bigint, string>((value) => {
    if (typeof value !== "bigint") {
        throw new Error("Expected bigint");
    }
    return value.toString();
});

export const float32 = makeValidator<number, number>((value) => {
    if (typeof value !== "number") {
        throw new Error("Expected number");
    }
    if (!Number.isFinite(value)) {
        throw new Error("Invalid value");
    }
    if (value > 3.4028235e38 || value < -3.4028235e38) {
        throw new Error("Value out of float32 range");
    }
    return value;
});

export const float64 = makeValidator<number, number>((value) => {
    if (typeof value !== "number") {
        throw new Error("Expected number");
    }
    if (!Number.isFinite(value)) {
        throw new Error("Invalid value");
    }
    if (value > Number.MAX_VALUE || value < -Number.MAX_VALUE) {
        throw new Error("Value out of float64 range");
    }
    return value;
});

export function decimal(params: { precision: number; scale: number }): StandardSchemaV1<string, string> {
    return makeValidator<string, string>((value) => {
        if (typeof value !== "string") {
            if (typeof value === "number" && !Number.isFinite(value as number)) {
                throw new Error("Invalid type");
            }
            throw new Error("Expected string");
        }
        if (value.length < 3) {
            throw new Error("Invalid length");
        }
        if (value.length > params.precision + params.scale + 1) {
            throw new Error("Invalid length");
        }
        if (!/^-?\d+\.\d+$/.test(value)) {
            throw new Error("Invalid decimal");
        }
        return value;
    });
}

export const decimalFromJson = makeValidator<number | string, string>((value) => {
    if (typeof value === "string") {
        return value;
    }
    if (typeof value === "number") {
        return "" + value;
    }
    throw new Error("Expected number or string");
});

export const uuid = makeValidator<string, string>((value) => {
    if (typeof value !== "string") {
        throw new Error("Expected string");
    }
    if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value)) {
        throw new Error("Invalid UUID");
    }
    return value;
});

export const string = makeValidator<string, string>((value) => {
    if (typeof value !== "string") {
        throw new Error("Expected string");
    }
    return value;
});

export function varchar(params: { maxLength: number }): StandardSchemaV1<string, string> {
    return makeValidator<string, string>((value) => {
        if (typeof value !== "string") {
            throw new Error("Expected string");
        }
        if (value.length > params.maxLength) {
            throw new Error("Invalid length");
        }
        return value;
    });
}

export const boolean = makeValidator<boolean, boolean>((value) => {
    if (typeof value !== "boolean") {
        throw new Error("Expected boolean");
    }
    return value;
});

export const datetime = makeValidator<Date, Date>((value) => {
    if (!(value instanceof Date)) {
        throw new Error("Expected Date");
    }
    if (isNaN(value.getTime())) {
        throw new Error("Invalid Date");
    }
    return value;
});

const ISO_DATETIME_RE = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/;
const ISO_TIMESTAMP_RE = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d+)?(Z|[+-]\d{2}:?\d{2})$/;

export const datetimeFromJson = makeValidator<string | number, Date>((value) => {
    if (typeof value === "string") {
        if (ISO_DATETIME_RE.test(value)) {
            return new Date(value + "Z");
        }
        if (ISO_TIMESTAMP_RE.test(value)) {
            return new Date(value);
        }
        throw new Error("Invalid datetime string");
    }
    if (typeof value === "number") {
        // Milliseconds if > 9999999999, otherwise seconds
        return value > 9999999999 ? new Date(value) : new Date(value * 1000);
    }
    throw new Error("Expected string or number");
});

export const datetimeToJson = makeValidator<Date, string>((value) => {
    if (!(value instanceof Date)) {
        throw new Error("Expected Date");
    }
    return value.toISOString();
});

const ISO_DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

export const datepartCoerced = makeValidator<Date | string, string>((value) => {
    if (value instanceof Date) return value.toISOString().slice(0, 10);
    if (typeof value === "string") return value;
    throw new Error("Expected Date or string");
});

export const datepartstr = makeValidator<string, string>((value) => {
    if (typeof value !== "string") {
        throw new Error("Expected string");
    }
    if (!ISO_DATE_RE.test(value)) {
        throw new Error("Invalid ISO date");
    }
    return value;
});

const ISO_TIME_RE = /^\d{2}:\d{2}(:\d{2}(\.\d+)?)?$/;

export const timepartstr = makeValidator<string, string>((value) => {
    if (typeof value !== "string") {
        throw new Error("Expected string");
    }
    if (!ISO_TIME_RE.test(value)) {
        throw new Error("Invalid ISO time");
    }
    return value;
});

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export const email = makeValidator<string, string>((value) => {
    if (typeof value !== "string") {
        throw new Error("Expected string");
    }
    if (!EMAIL_RE.test(value)) {
        throw new Error("Invalid email");
    }
    return value;
});