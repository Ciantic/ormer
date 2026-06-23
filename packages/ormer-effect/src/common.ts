import type { Schema } from "effect";

export type GetBrand<T> = T extends Schema.brand<any, infer B> ? B : never;
