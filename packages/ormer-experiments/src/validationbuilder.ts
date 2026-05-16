export type ValidationBuilder<T extends string, Params> = {
  type: T;
} & Params;

export function string(): ValidationBuilder<"string", {}> {
  return {
    type: "string",
  };
}

export function stringOfMaxLength<const T extends number>(
  maxLength: T,
): ValidationBuilder<"string", { readonly maxLength: T }> {
  return {
    type: "string",
    maxLength,
  };
}

export function stringOfLength<const T extends number>(
  length: T,
): ValidationBuilder<"string", { readonly length: T }> {
  return {
    type: "string",
    length,
  };
}

export function number(): ValidationBuilder<"number", {}> {
  return {
    type: "number",
  };
}

export function bigint(): ValidationBuilder<"bigint", {}> {
  return {
    type: "bigint",
  };
}

export function boolean(): ValidationBuilder<"boolean", {}> {
  return {
    type: "boolean",
  };
}

export function dateObject(): ValidationBuilder<"dateObject", {}> {
  return {
    type: "dateObject",
  };
}

export function object(): ValidationBuilder<"object", {}> {
  return {
    type: "object",
  };
}

export function array<T extends string>(
  of: ValidationBuilder<T, {}>,
): ValidationBuilder<"array", { readonly of: T }> {
  return {
    type: "array",
    of: of.type,
  };
}

export function objectWithFields<
  const T extends Record<string, ValidationBuilder<string, {}>>,
>(
  fields: T,
): ValidationBuilder<
  "objectWithFields",
  {
    readonly fields: {
      [K in keyof T]: T[K] extends ValidationBuilder<infer U, {}> ? U : never;
    };
  }
> {
  const entries = Object.entries(fields).map(([key, builder]) => [
    key,
    (builder as ValidationBuilder<string, {}>).type,
  ]);
  return {
    type: "objectWithFields",
    fields: Object.fromEntries(entries) as any,
  };
}

export function union<const T extends readonly ValidationBuilder<string, {}>[]>(
  ...of: T
): ValidationBuilder<
  "union",
  {
    readonly of: {
      [K in keyof T]: T[K] extends ValidationBuilder<infer U, {}> ? U : never;
    }[number];
  }
> {
  return {
    type: "union",
    of: of.map((b) => b.type) as any,
  };
}
