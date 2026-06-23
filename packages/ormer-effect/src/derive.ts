import type { ColumnType } from "ormer";
import { SchemaAST } from "effect";

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

// ---------------------------------------------------------------------------
// Runtime AST helpers
// ---------------------------------------------------------------------------

/** Accumulated column metadata collected during AST traversal. */
interface ColumnState {
  nullable: boolean;
  hasDefault: boolean;
  default: unknown;
  primaryKey: boolean;
  autoIncrement: boolean;
  foreignKeyTable: string | undefined;
  foreignKeyColumn: string | undefined;
  arrayDimensions: string;
}

// ---------------------------------------------------------------------------
// deriveColumn
// ---------------------------------------------------------------------------

/**
 * Extract the literal default value from a `Schema.withConstructorDefault`
 * entry.
 *
 * Effect stores constructor defaults in `ast.context.defaultValue` as an
 * array of `Link` objects. Each link has a `transformation.decode` Getter;
 * running it with a placeholder input yields an `Exit.Success` wrapping an
 * `Option.Some(<value>)` (or `Option.None` when no default applies).
 *
 * Returns `{ found: true, value }` when a concrete default value can be
 * resolved, or `{ found: false }` otherwise.
 */
function extractConstructorDefault(
  defaultValue: unknown[],
): { found: true; value: unknown } | { found: false } {
  for (const link of defaultValue) {
    if (!link || typeof link !== "object") continue;
    const transformation = (link as any).transformation;
    const decode = transformation?.decode;
    if (!decode || typeof decode.run !== "function") continue;
    try {
      // The decode Getter expects a value of the input type. We pass a
      // placeholder; the constructor default branch ignores the input and
      // returns the configured default.
      const exit = decode.run("");
      // Expecting Exit.Success(Option.Some(value))
      if (
        exit &&
        typeof exit === "object" &&
        (exit as any)._tag === "Success"
      ) {
        const option = (exit as any).value;
        if (
          option &&
          typeof option === "object" &&
          (option as any)._tag === "Some"
        ) {
          return { found: true, value: (option as any).value };
        }
        // Option.None → no default for this branch; try next link
      }
    } catch {
      // decode threw (e.g. needs a real input) — skip this link
    }
  }
  return { found: false };
}

/**
 * Recursively strip union wrappers (Null/Undefined sentinels) from an AST,
 * collecting nullable and optional flags.
 *
 * Also strips array wrappers, collecting dimension suffixes.
 *
 * Returns the innermost non-union, non-array AST and the accumulated
 * {@link ColumnState}.
 */
function peelModifiers(
  ast: SchemaAST.AST,
  state: ColumnState,
): ColumnState & { ast: SchemaAST.AST } {
  // --- Union wrappers: NullOr, UndefinedOr, NullishOr, optional ---
  if (SchemaAST.isUnion(ast)) {
    const hasNull = ast.types.some((t) => SchemaAST.isNull(t));
    const hasUndefined = ast.types.some((t) => SchemaAST.isUndefined(t));

    // Find the non-sentinel base type (not Null, not Undefined)
    for (const t of ast.types) {
      if (!SchemaAST.isNull(t) && !SchemaAST.isUndefined(t)) {
        if (hasNull) state.nullable = true;
        if (hasUndefined) state.nullable = true;
        return peelModifiers(t, state);
      }
    }
    // Union of _only_ Null and/or Undefined — should not happen in practice
    return { ast, ...state };
  }

  // --- Optional wrapper ---
  if (ast.context?.isOptional) {
    state.nullable = true;
  }

  // --- Array wrapper ---
  if (SchemaAST.isArrays(ast) && ast.rest.length > 0) {
    state.arrayDimensions += "[]";
    return peelModifiers(ast.rest[0]!, state);
  }

  // --- Transform (NumberFromString, etc.) — follow the encoding to get the input (from) type ---
  if (ast.encoding) {
    return peelModifiers(SchemaAST.toEncoded(ast), state);
  }

  return { ast, ...state };
}

/**
 * Collect DB annotations (primaryKey, autoIncrement, foreignKey) and brands
 * from an AST node's annotations and checks.
 */
function collectAnnotations(
  ast: SchemaAST.AST,
  state: ColumnState,
): { dbformats: string[]; checks: SchemaAST.Check<unknown>[] } {
  const dbformats: string[] = [];
  const checks: SchemaAST.Check<unknown>[] = [];

  const collect = (ann: Record<string, unknown> | undefined) => {
    if (!ann) return;
    if (ann.primaryKey === true) state.primaryKey = true;
    if (ann.autoIncrement === true) state.autoIncrement = true;
    if (
      typeof ann.foreignKeyTable === "string" &&
      typeof ann.foreignKeyColumn === "string"
    ) {
      state.foreignKeyTable = ann.foreignKeyTable;
      state.foreignKeyColumn = ann.foreignKeyColumn;
    }
    if (typeof ann.dbformat === "string") {
      dbformats.push(ann.dbformat);
    }
  };

  collect(ast.annotations as Record<string, unknown> | undefined);
  if (ast.checks) {
    for (const c of ast.checks) {
      collect(c.annotations as Record<string, unknown> | undefined);
    }
    checks.push(...ast.checks);
  }

  return { dbformats, checks };
}

/**
 * Walk an Effect Schema at runtime, collecting nullable/optional/default/etc.
 * flags, and dispatch a tagged tuple to `chooser`.
 *
 * `chooser` is a callback that receives a discriminated union of
 * `[tag, params]` and returns a database-specific `ColumnType`.
 *
 * @example
 * ```ts
 * const col = deriveColumn(userSchema.fields.age, (t) => {
 *   switch (t[0]) {
 *     case "number": return pg.float8(t[1]);
 *     case "int32":  return pg.int4(t[1]);
 *     // ...
 *   }
 * });
 * ```
 */
export function deriveColumn<
  F extends (t: EffectSchemas) => ColumnType<string, (typeof t)[1]>,
>(
  schema: { readonly ast: SchemaAST.AST },
  chooser: F,
): ColumnType<string, any> {
  const state: ColumnState = {
    nullable: false,
    hasDefault: false,
    default: undefined,
    primaryKey: false,
    autoIncrement: false,
    foreignKeyTable: undefined,
    foreignKeyColumn: undefined,
    arrayDimensions: "",
  };

  // ---- Step 1: Peel union/array/transform wrappers ----
  const peeled = peelModifiers(schema.ast, state);
  let ast = peeled.ast;

  // ---- Step 2: Extract constructor default ----
  if (
    Array.isArray(ast.context?.defaultValue) &&
    ast.context!.defaultValue.length > 0
  ) {
    const extracted = extractConstructorDefault(
      ast.context!.defaultValue as unknown[],
    );
    if (extracted.found) {
      state.default = extracted.value;
      state.hasDefault = true;
    } else {
      // Constructor default declared but not resolvable → optional
      state.nullable = true;
    }
  }

  // ---- Step 3: Collect annotations, dbformats, checks ----
  const { dbformats, checks } = collectAnnotations(ast, state);

  // ---- Step 4: Build params ----
  const params: Partial<ParamsDerived> = {};
  if (state.nullable) params.nullable = true;
  if (state.hasDefault) params.default = state.default;
  if (state.primaryKey) params.primaryKey = true;
  if (state.autoIncrement) params.autoIncrement = true;
  if (state.foreignKeyTable && state.foreignKeyColumn) {
    params.foreignKeyTable = state.foreignKeyTable;
    params.foreignKeyColumn = state.foreignKeyColumn;
  }
  if (state.arrayDimensions) params.array = state.arrayDimensions;

  // ---- Step 5: Dispatch based on AST tag, brands, and checks ----
  const tag = ast._tag;

  // --- String fields with dbformat/check refinements ---
  if (tag === "String") {
    if (dbformats.includes("uuid")) {
      return chooser([
        "uuid",
        params as ParamsDerived<{ default?: "generate" }>,
      ]);
    }
    if (checks.some((c) => (c.annotations?.meta as any)?._tag === "isUUID")) {
      return chooser([
        "uuid",
        params as ParamsDerived<{ default?: "generate" }>,
      ]);
    }
    if (dbformats.includes("url")) return chooser(["url", params]);
    if (dbformats.includes("email"))
      return chooser(["email", { ...params, maxLength: 320 }]);
    if (dbformats.includes("naiveDatetime"))
      return chooser(["naiveDatetime", params]);
    if (dbformats.includes("isoTime")) return chooser(["isoTime", params]);
    if (dbformats.includes("isoTimeSecond"))
      return chooser(["isoTimeSecond", params]);
    if (dbformats.includes("isoDate")) return chooser(["isoDate", params]);
    if (dbformats.includes("isoDateTime"))
      return chooser(["isoDateTime", params]);

    const maxLenCheck = checks.find(
      (c) => (c.annotations?.meta as any)?._tag === "isMaxLength",
    );
    if (maxLenCheck) {
      const maxLen = (maxLenCheck.annotations!.meta as any).maxLength as number;
      return chooser(["string", { ...params, maxLength: maxLen }]);
    }
    return chooser(["string", params]);
  }

  // --- Number fields ---
  if (tag === "Number") {
    if (dbformats.includes("int8")) return chooser(["int8", params]);
    if (dbformats.includes("int16")) return chooser(["int16", params]);
    if (dbformats.includes("int32")) return chooser(["int32", params]);
    if (dbformats.includes("uint8")) return chooser(["uint8", params]);
    if (dbformats.includes("uint16")) return chooser(["uint16", params]);
    if (dbformats.includes("uint32")) return chooser(["uint32", params]);
    if (dbformats.includes("float32")) return chooser(["float32", params]);
    if (dbformats.includes("float64")) return chooser(["float64", params]);
    if (checks.some((c) => (c.annotations?.meta as any)?._tag === "isInt32")) {
      return chooser(["int32", params]);
    }
    if (checks.some((c) => (c.annotations?.meta as any)?._tag === "isInt")) {
      return chooser(["int32", params]);
    }
    return chooser(["number", params]);
  }

  // --- BigInt ---
  if (tag === "BigInt") {
    if (dbformats.includes("int64")) return chooser(["int64", params]);
    if (dbformats.includes("uint64")) return chooser(["uint64", params]);
    if (dbformats.includes("int128")) return chooser(["int128", params]);
    if (dbformats.includes("uint128")) return chooser(["uint128", params]);
    return chooser(["bigint", params]);
  }

  // --- Boolean ---
  if (tag === "Boolean") return chooser(["boolean", params]);

  // --- Date ---
  if (
    tag === "Declaration" &&
    (ast.annotations as any)?.typeConstructor?._tag === "Date"
  ) {
    return chooser(["date", params]);
  }

  // --- Object / Struct ---
  if (tag === "Objects") {
    return chooser(["object", { ...params, schema: { ast } }]);
  }

  // --- Fallback ---
  return chooser(["string", params]);
}
