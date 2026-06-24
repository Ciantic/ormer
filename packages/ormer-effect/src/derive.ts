import { Schema, SchemaAST, Effect, Option } from "effect";

// ---------------------------------------------------------------------------
// Runtime helper types
// ---------------------------------------------------------------------------

/**
 * Parameters derived from the Effect schema at runtime.
 */
export type ParamsDerived<T = {}> = {
  nullable?: boolean;
  default?: unknown;
  primaryKey?: boolean;
  autoIncrement?: boolean;
  foreignKeyTable?: string;
  foreignKeyColumn?: string;
  array?: string;
} & T;

/**
 * Union of all possible schema tags dispatched by deriveColumn.
 * The first element is a string tag; the second carries derived params.
 * Database-specific chooser functions map these tuples to ColumnType.
 */
export type EffectSchemas =
  | ["uuid", ParamsDerived<{ default?: "generate" }>]
  | ["isoTime", ParamsDerived]
  | ["isoTimeSecond", ParamsDerived]
  | ["isoDate", ParamsDerived]
  | ["isoDateTime", ParamsDerived]
  | ["naiveDatetime", ParamsDerived]
  | ["email", ParamsDerived<{ maxLength: 320 }>]
  | ["url", ParamsDerived]
  | ["ipv4", ParamsDerived]
  | ["ipv6", ParamsDerived]
  | ["mac", ParamsDerived]
  | ["string", ParamsDerived<{ maxLength: number }> | ParamsDerived]
  | ["int8", ParamsDerived]
  | ["int16", ParamsDerived]
  | ["int32", ParamsDerived]
  | ["uint8", ParamsDerived]
  | ["uint16", ParamsDerived]
  | ["uint32", ParamsDerived]
  | ["int64", ParamsDerived]
  | ["uint64", ParamsDerived]
  | ["int128", ParamsDerived]
  | ["uint128", ParamsDerived]
  | ["float32", ParamsDerived]
  | ["float64", ParamsDerived]
  | ["number", ParamsDerived]
  | ["bigint", ParamsDerived]
  | ["boolean", ParamsDerived]
  | ["date", ParamsDerived]
  | ["object", ParamsDerived<{ schema: { ast: SchemaAST.AST } }>];

/**
 * Recursively resolve annotations from the schema AST and its checks.
 *
 * Default implementation uses only last check:
 * https://github.com/Effect-TS/effect-smol/blob/46b3836f2505c9de34c342994b9197204eefe082/packages/effect/src/internal/schema/annotations.ts#L6
 */
function resolveAnnotationsRecursively(
  ast: SchemaAST.AST,
): Record<string, unknown> {
  let annotations = ast.annotations ?? {};
  // Check annotations
  for (const check of ast.checks ?? []) {
    annotations = { ...annotations, ...(check.annotations ?? {}) };
  }

  return annotations;
}

/**
 * Derive column from Effect schema AST.
 */
export function deriveColumn<T extends Schema.Top>(
  schema: {
    ast: T["ast"];
  },
  acc: ParamsDerived = {},
): EffectSchemas {
  const annotations = resolveAnnotationsRecursively(schema.ast);
  const primaryKey = annotations?.primaryKey as boolean | undefined;
  const autoIncrement = annotations?.autoIncrement as boolean | undefined;
  const foreignKeyTable = annotations?.foreignKeyTable as string | undefined;
  const foreignKeyColumn = annotations?.foreignKeyColumn as string | undefined;
  const dbformat = annotations?.dbformat as string | undefined;
  const checks = schema.ast.checks ?? [];
  const tag = schema.ast._tag;
  const defaultValue = annotations?.defaultValue as unknown | undefined;
  const hasDefault = defaultValue !== undefined;
  const maxLength = annotations?.maxLength as number | undefined;

  if (SchemaAST.isUnion(schema.ast)) {
    let nullable = false;
    let optional = false;
    let member: SchemaAST.AST | undefined = undefined;
    for (const t of schema.ast.types) {
      if (SchemaAST.isNull(t)) {
        nullable = true;
      } else if (SchemaAST.isUndefined(t)) {
        optional = true;
      } else {
        // choice = deriveColumn({ ast: t });
        member = t;
      }
    }
    if (member) {
      return deriveColumn(
        { ast: member },
        {
          ...acc,
          ...(nullable || optional ? { nullable: true } : {}),
        },
      );
    }

    throw new Error(
      `deriveColumn: Union type has no non-null/undefined branches: ${JSON.stringify(
        schema.ast,
      )}`,
    );
  }

  if (schema.ast.context?.isOptional) {
    // Schema.optionalKey(...) triggers this, but how to handle?
    throw new Error("How to handle?");
  }

  const params: ParamsDerived = { ...acc };
  if (hasDefault) params.default = defaultValue;
  if (primaryKey) params.primaryKey = true;
  if (autoIncrement) params.autoIncrement = true;
  if (foreignKeyTable) params.foreignKeyTable = foreignKeyTable;
  if (foreignKeyColumn) params.foreignKeyColumn = foreignKeyColumn;

  if (SchemaAST.isArrays(schema.ast) && schema.ast.rest.length > 0) {
    const inner = schema.ast.rest[0];
    if (
      typeof inner === "undefined" ||
      schema.ast.rest.length > 1 ||
      schema.ast.elements.length > 0
    ) {
      throw new Error(`Databases support only flat arrays, not tuples`);
    }

    return deriveColumn(
      { ast: inner },
      {
        ...params,
        array: acc.array ? `${acc.array}[]` : "[]",
      },
    );
  }

  // --- String fields with dbformat/check refinements ---
  if (tag === "String") {
    if (dbformat === "uuid")
      return ["uuid", params as ParamsDerived<{ default?: "generate" }>];
    if (dbformat === "url") return ["url", params];
    if (dbformat === "email") return ["email", { ...params, maxLength: 320 }];
    if (dbformat === "naiveDatetime") return ["naiveDatetime", params];
    if (dbformat === "isoTime") return ["isoTime", params];
    if (dbformat === "isoTimeSecond") return ["isoTimeSecond", params];
    if (dbformat === "isoDate") return ["isoDate", params];
    if (dbformat === "isoDateTime") return ["isoDateTime", params];
    if (dbformat === "ipv4") return ["ipv4", params];
    if (dbformat === "ipv6") return ["ipv6", params];
    if (dbformat === "mac") return ["mac", params];

    if (maxLength) {
      return ["string", { ...params, maxLength: maxLength }];
    }

    // We can't use the following, because checks aren't preserved at type-level:
    //
    // const maxLenCheck = checks.find(
    //   (c) => (c.annotations?.meta as any)?._tag === "isMaxLength",
    // );
    // if (maxLenCheck) {
    //   const maxLen = (maxLenCheck.annotations!.meta as any).maxLength as number;
    //   return ["string", { ...params, maxLength: maxLen }];
    // }

    return ["string", params];
  }

  // --- Number fields ---
  if (tag === "Number") {
    if (dbformat === "int8") return ["int8", params];
    if (dbformat === "int16") return ["int16", params];
    if (dbformat === "int32") return ["int32", params];
    if (dbformat === "uint8") return ["uint8", params];
    if (dbformat === "uint16") return ["uint16", params];
    if (dbformat === "uint32") return ["uint32", params];
    if (dbformat === "float32") return ["float32", params];
    if (dbformat === "float64") return ["float64", params];
    return ["number", params];
  }

  // --- BigInt ---
  if (tag === "BigInt") {
    if (dbformat === "int64") return ["int64", params];
    if (dbformat === "uint64") return ["uint64", params];
    if (dbformat === "int128") return ["int128", params];
    if (dbformat === "uint128") return ["uint128", params];
    return ["bigint", params];
  }

  // --- Boolean ---
  if (tag === "Boolean") return ["boolean", params];

  // --- Date ---
  if (
    tag === "Declaration" &&
    (schema.ast.annotations?.typeConstructor as { _tag?: string })?._tag ===
      "Date"
  ) {
    return ["date", params];
  }

  // --- Object / Struct ---
  if (tag === "Objects") {
    return ["object", { ...params, schema: schema }];
  }

  throw new Error(
    `deriveColumn: Unsupported schema tag "${tag}" with dbformat "${dbformat}"`,
  );

  // // --- Fallback ---
  // return chooser(["string", params]);
}
