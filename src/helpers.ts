import type * as v from "npm:valibot";
import type * as c from "./columns.ts";
import type { SCHEMAS } from "./schemas.ts";
import type { ColumnTypeToDriver } from "./database.ts";

type ValibotSchema = v.BaseSchema<unknown, unknown, v.BaseIssue<unknown>>;

type StringLiteral<T> = T extends string ? (string extends T ? never : T) : never;

// Get types from columns.ts as string literals
type TypesDefined = {
    [K in keyof typeof c]: ReturnType<(typeof c)[K]> extends c.ColumnType<infer T, unknown>
        ? StringLiteral<T>
        : never;
};

export type MapColumnsTo<T> = {
    [K in keyof TypesDefined as TypesDefined[K] extends string ? TypesDefined[K] : never]: (
        ...params: Parameters<(typeof c)[K]> extends [infer U]
            ? [U & { tableName: string; columnName: string }]
            : [c.Params & { tableName: string; columnName: string }]
    ) => T;
};

export type TransformSchemas<
    // deno-lint-ignore no-explicit-any
    Schemas extends Record<string, (params?: any) => ValibotSchema> = typeof SCHEMAS
> = {
    [K in keyof TypesDefined as TypesDefined[K] extends string ? TypesDefined[K] : never]: (
        ...params: Parameters<(typeof c)[K]> extends [infer U] ? [U] : [c.Params]
    ) => {
        from: v.BaseSchema<unknown, v.InferOutput<ReturnType<Schemas[K]>>, v.BaseIssue<unknown>>;
        to: v.BaseSchema<v.InferOutput<ReturnType<Schemas[K]>>, unknown, v.BaseIssue<unknown>>;
    };
};

export type OrmdriverColumnTypes<
    // deno-lint-ignore no-explicit-any
    Schemas extends Record<string, (params?: any) => ValibotSchema> = typeof SCHEMAS
> = {
    [K in keyof TypesDefined as TypesDefined[K] extends string ? TypesDefined[K] : never]: (
        ...params: Parameters<(typeof c)[K]> extends [infer U]
            ? [U & { columnName: string; tableName: string }]
            : [c.Params & { columnName: string; tableName: string }]
    ) => ColumnTypeToDriver & {
        from: v.BaseSchema<unknown, v.InferOutput<ReturnType<Schemas[K]>>, v.BaseIssue<unknown>>;
        to: v.BaseSchema<v.InferOutput<ReturnType<Schemas[K]>>, unknown, v.BaseIssue<unknown>>;
    };
};
