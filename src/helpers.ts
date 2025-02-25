import type * as c from "./columns.ts";

type StringLiteral<T> = T extends string ? (string extends T ? never : T) : never;
type TypesDefined = {
    [K in keyof typeof c]: ReturnType<(typeof c)[K]> extends c.ColumnType<infer T, unknown>
        ? StringLiteral<T>
        : never;
};

export type MapColumnsTo<T> = {
    [K in keyof TypesDefined as TypesDefined[K] extends string ? TypesDefined[K] : never]: (
        ...params: Parameters<(typeof c)[K]> extends [infer U] ? [U] : [c.Params]
    ) => T;
};
