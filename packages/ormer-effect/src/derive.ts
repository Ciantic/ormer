import type { ColumnType } from "ormer";
import { Schema, SchemaAST, Effect, Option } from "effect";
import type { Param } from "effect/unstable/ai/McpSchema";
import type { Union } from "effect/Schema";

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
 * Extract the decoding default value from a schema created with
 * Schema.withDecodingDefault / Schema.withDecodingDefaultKey.
 *
 * Walks the AST encoding chain and runs the decode getter with
 * `Option.some(undefined)` to trigger the default value closure.
 * Returns `undefined` if no decoding default is configured.
 */
export function extractDecodingDefaultValue<T extends Schema.Top>(schema: {
  ast: T["ast"];
}): unknown {
  const encoding = (schema.ast as any).encoding as any[] | undefined;
  if (!encoding || encoding.length === 0) return undefined;

  for (const link of encoding) {
    const transformation = link.transformation;
    if (!transformation) continue;
    // The decode getter from SchemaGetter.withDefault runs the closure
    // and falls back to the defaultValue when input is undefined.
    const decodeGetter = transformation.decode;
    if (!decodeGetter || typeof decodeGetter.run !== "function") continue;

    try {
      const effect = decodeGetter.run(Option.some(undefined), {});
      const resultOption = Effect.runSync(effect) as Option.Option<unknown>;
      if (Option.isSome(resultOption)) {
        return resultOption.value;
      }
    } catch {
      // Running the Effect may fail if the schema has complex requirements.
      // In that case, we simply can't extract the default value.
      return undefined;
    }
  }

  return undefined;
}

/**
 * Derive column from Effect schema AST.
 */
export function deriveColumn<T extends Schema.Top>(schema: {
  ast: T["ast"];
}): EffectSchemas {
  const annotations = Schema.resolveAnnotations(schema as T);
  const primaryKey = annotations?.primaryKey as boolean | undefined;
  const autoIncrement = annotations?.autoIncrement as boolean | undefined;
  const foreignKeyTable = annotations?.foreignKeyTable as string | undefined;
  const foreignKeyColumn = annotations?.foreignKeyColumn as string | undefined;
  const dbformat = annotations?.dbformat as string | undefined;
  const checks = schema.ast.checks ?? [];
  const tag = schema.ast._tag;
  let nullable = false;
  let optional = false;
  let arrayDimensions = "";
  let defaultValue: unknown = undefined;
  let hasDefault = false;

  if ("schema" in schema && !dbformat) {
    // This is super sketchy! I noticed that Schema.refine() wraps a type to a
    // schema, so that it doesn't preserve the annotations, this is a workaround
    // to get Schema.refine()'d types to work.
    return deriveColumn({ ast: (schema.schema as T).ast });
  }

  if (SchemaAST.isUnion(schema.ast)) {
    let choice: EffectSchemas | undefined = undefined;
    for (const t of schema.ast.types) {
      if (SchemaAST.isNull(t)) {
        nullable = true;
      } else if (SchemaAST.isUndefined(t)) {
        optional = true;
      } else {
        choice = deriveColumn({ ast: t });
      }
    }
    if (choice) {
      return [
        choice[0],
        {
          ...choice[1],
          ...(nullable || optional ? { nullable: true } : {}),
        },
      ] as EffectSchemas;
    }

    throw new Error(
      `deriveColumn: Union type has no non-null/undefined branches: ${JSON.stringify(
        schema.ast,
      )}`,
    );
  }

  if (schema.ast.context?.isOptional) {
    optional = true;
  }

  // Try to extract decoding default from the encoding chain
  defaultValue = extractDecodingDefaultValue(schema as any);
  if (defaultValue !== undefined) {
    hasDefault = true;
  }

  if (SchemaAST.isArrays(schema.ast) && schema.ast.rest.length > 0) {
    // TODO: Handle multi-dimensional arrays
    arrayDimensions = "[]";
  }

  const params: ParamsDerived = {};
  if (nullable || optional) params.nullable = true;
  if (hasDefault) params.default = defaultValue;
  if (primaryKey) params.primaryKey = true;
  if (autoIncrement) params.autoIncrement = true;
  if (foreignKeyTable) params.foreignKeyTable = foreignKeyTable;
  if (foreignKeyColumn) params.foreignKeyColumn = foreignKeyColumn;
  if (arrayDimensions) params.array = arrayDimensions;

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

    const maxLenCheck = checks.find(
      (c) => (c.annotations?.meta as any)?._tag === "isMaxLength",
    );
    if (maxLenCheck) {
      const maxLen = (maxLenCheck.annotations!.meta as any).maxLength as number;
      return ["string", { ...params, maxLength: maxLen }];
    }
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
    if (checks.some((c) => (c.annotations?.meta as any)?._tag === "isInt32")) {
      return ["int32", params];
    }
    if (checks.some((c) => (c.annotations?.meta as any)?._tag === "isInt")) {
      return ["int32", params];
    }
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
