import type { ColumnType } from "ormer";
import type { DbMetadata } from "./valibot-ext.ts";

/**
 * Runtime shape of a valibot schema.
 * Valibot schemas are plain objects at runtime. The TypeScript types don't
 * surface `.pipe`, `.wrapped`, `.item`, `.fallback` etc. on the generic base,
 * so we define an interface for the runtime working type.
 */
export interface AnyValibotSchema {
  type: string;
  kind: string;
  pipe?: ReadonlyArray<AnyValibotSchema>;
  wrapped?: AnyValibotSchema;
  item?: AnyValibotSchema;
  fallback?: unknown;
  default?: unknown;
  entries?: Record<string, AnyValibotSchema>;
  // Pipe item extras (metadata, brand, validation, etc.)
  metadata?: Record<string, unknown>;
  name?: string;
  requirement?: unknown;
}

/**
 * Parameters derived from the valibot schema at runtime.
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
 * Union of all possible schemas that deriveColumn dispatches to.
 * Each tuple is [schemaTag, params].
 */
export type ValibotSchemas =
  | ["uuid", ParamsDerived<{ default?: "generate" }>]
  | ["email", ParamsDerived<{ maxLength: 320 }>]
  | ["nanoid", ParamsDerived<{ maxLength: 21 }>]
  | ["ulid", ParamsDerived<{ maxLength: 26 }>]
  | ["ipv4", ParamsDerived]
  | ["ipv6", ParamsDerived]
  | ["mac", ParamsDerived]
  | ["isoTime", ParamsDerived]
  | ["isoTimeSecond", ParamsDerived]
  | ["isoDate", ParamsDerived]
  | ["isoDatetime", ParamsDerived]
  | ["naiveDatetime", ParamsDerived]
  | ["string", ParamsDerived<{ maxLength: number }> | ParamsDerived]
  | ["int64", ParamsDerived]
  | ["int32", ParamsDerived]
  | ["uint32", ParamsDerived]
  | ["uint64", ParamsDerived]
  | ["float32", ParamsDerived]
  | ["float64", ParamsDerived]
  | ["bigint", ParamsDerived]
  | ["number", ParamsDerived]
  | ["boolean", ParamsDerived]
  | ["date", ParamsDerived]
  | ["json", ParamsDerived<{ schema: unknown }>]
  | ["object", ParamsDerived<{ schema: unknown }>];

/**
 * Walk the pipe chain to collect all metadata items into a single DbMetadata.
 */
export function extractDbMetadata(
  schema: AnyValibotSchema,
): DbMetadata | undefined {
  let result: DbMetadata = {};
  let found = false;
  let node: AnyValibotSchema = schema;

  while (true) {
    if (node.pipe) {
      for (const item of node.pipe) {
        if (item.type === "metadata" && item.metadata?.db) {
          result = { ...result, ...(item.metadata.db as DbMetadata) };
          found = true;
        }
      }
    }

    switch (node.type) {
      case "nullable":
      case "optional":
      case "exact_optional":
      case "nullish":
      case "non_nullable":
      case "non_optional":
      case "non_nullish":
        node = node.wrapped!;
        continue;
      case "array":
        node = node.item!;
        continue;
    }
    break;
  }

  return found ? result : undefined;
}

/**
 * Core runtime derivation function.
 *
 * Unwraps valibot modifiers (nullable, optional, nullish, fallback, array,
 * nonNullable, nonOptional, nonNullish, exactOptional) and pipes, collects
 * metadata (db extensions via v.metadata), and dispatches to the chooser
 * with a tag + derived params.
 */
export function deriveColumn<
  F extends (t: ValibotSchemas) => ColumnType<string, (typeof t)[1]>,
>(schema: AnyValibotSchema, chooser: F) {
  let node: AnyValibotSchema = schema;
  let nullable: boolean | undefined = undefined;
  let optional: boolean | undefined = undefined;
  let defaultValue: unknown = undefined;
  let primaryKey = false;
  let foreignKeyTable: string | undefined = undefined;
  let foreignKeyColumn: string | undefined = undefined;
  let arrayDimensions = "";

  // ---- Step 1: Unwrap modifiers ----
  while (true) {
    if (node.pipe) {
      for (const item of node.pipe) {
        if (item.type === "metadata" && item.metadata?.db) {
          const db = item.metadata.db as DbMetadata;
          if (db.primaryKey === true) primaryKey = true;
          if (db.foreignKeyTable && db.foreignKeyColumn) {
            foreignKeyTable = db.foreignKeyTable;
            foreignKeyColumn = db.foreignKeyColumn;
          }
        }
      }
    }

    switch (node.type) {
      case "nullable":
        nullable = true;
        node = node.wrapped!;
        continue;
      case "optional":
        if (optional === undefined) optional = true;
        if (node.default !== undefined && defaultValue === undefined)
          defaultValue = node.default;
        node = node.wrapped!;
        continue;
      case "exact_optional":
        if (optional === undefined) optional = true;
        if (node.default !== undefined && defaultValue === undefined)
          defaultValue = node.default;
        node = node.wrapped!;
        continue;
      case "nullish":
        nullable = true;
        if (optional === undefined) optional = true;
        if (node.default !== undefined && defaultValue === undefined)
          defaultValue = node.default;
        node = node.wrapped!;
        continue;
      case "non_nullable":
        nullable = false;
        node = node.wrapped!;
        continue;
      case "non_optional":
        if (optional === undefined) optional = false;
        node = node.wrapped!;
        continue;
      case "non_nullish":
        nullable = false;
        if (optional === undefined) optional = false;
        node = node.wrapped!;
        continue;
    }

    if (node.fallback !== undefined) {
      if (defaultValue === undefined) defaultValue = node.fallback;
    }

    if (node.type === "array") {
      arrayDimensions += "[]";
      node = node.item!;
      continue;
    }

    break;
  }

  // ---- Step 2: Build base params ----
  let pgParamsBase: Partial<ParamsDerived> = {};
  if (nullable) pgParamsBase.nullable = true;
  // optional/fallback only counts as nullable when there's no default value
  if (optional && typeof defaultValue === "undefined")
    pgParamsBase.nullable = true;
  if (typeof defaultValue !== "undefined") pgParamsBase.default = defaultValue;
  if (primaryKey) {
    pgParamsBase.primaryKey = true;
  }
  if (foreignKeyTable && foreignKeyColumn) {
    pgParamsBase.foreignKeyTable = foreignKeyTable;
    pgParamsBase.foreignKeyColumn = foreignKeyColumn;
  }
  if (arrayDimensions) {
    pgParamsBase.array = arrayDimensions;
  }

  // ---- Step 3: Collect all pipe items (recurse into nested sub-schemas) ----
  // Valibot does NOT flatten nested v.pipe() — a sub-schema pipe item
  // carries its own .pipe with brands/checks/validators inside.
  function collectPipeItems(
    pipe: ReadonlyArray<AnyValibotSchema> | undefined,
  ): AnyValibotSchema[] {
    if (!pipe) return [];
    const result: AnyValibotSchema[] = [];
    for (const item of pipe) {
      result.push(item);
      if (item.pipe) {
        result.push(...collectPipeItems(item.pipe));
      }
    }
    return result;
  }

  const allPipeItems = collectPipeItems(node.pipe);

  // ---- Step 4: Dispatch based on type and pipe items ----

  const hasPipeItem = (type: string) =>
    allPipeItems.some((p) => p.type === type);

  const getBrandName = (): string | undefined => {
    const brand = allPipeItems.find(
      (p): p is AnyValibotSchema & { name: string } =>
        p.type === "brand" && typeof p.name === "string",
    );
    return brand?.name;
  };

  const getMaxLength = (): number | undefined => {
    const ml = allPipeItems.find(
      (p): p is AnyValibotSchema & { requirement: number } =>
        p.type === "max_length" && typeof p.requirement === "number",
    );
    return ml?.requirement;
  };

  // --- UUID ---
  if (hasPipeItem("uuid")) {
    return chooser([
      "uuid",
      pgParamsBase as ParamsDerived<{ default?: "generate" }>,
    ]);
  }

  // --- Email ---
  if (hasPipeItem("email")) {
    return chooser(["email", { ...pgParamsBase, maxLength: 320 }]);
  }

  // --- NanoID ---
  if (hasPipeItem("nanoid")) {
    return chooser(["nanoid", { ...pgParamsBase, maxLength: 21 }]);
  }

  // --- ULID ---
  if (hasPipeItem("ulid")) {
    return chooser(["ulid", { ...pgParamsBase, maxLength: 26 }]);
  }

  // --- IPv4 ---
  if (hasPipeItem("ipv4")) {
    return chooser(["ipv4", pgParamsBase]);
  }

  // --- IPv6 ---
  if (hasPipeItem("ipv6")) {
    return chooser(["ipv6", pgParamsBase]);
  }

  // --- MAC ---
  if (hasPipeItem("mac")) {
    return chooser(["mac", pgParamsBase]);
  }

  // --- ISO Time ---
  if (hasPipeItem("iso_time")) {
    return chooser(["isoTime", pgParamsBase]);
  }

  // --- ISO Time Second ---
  if (hasPipeItem("iso_time_second")) {
    return chooser(["isoTimeSecond", pgParamsBase]);
  }

  // --- ISO Date ---
  if (hasPipeItem("iso_date")) {
    return chooser(["isoDate", pgParamsBase]);
  }

  // --- ISO DateTime ---
  if (hasPipeItem("iso_date_time")) {
    return chooser(["isoDatetime", pgParamsBase]);
  }

  // --- Brand-based type detection ---
  const brand = getBrandName();
  if (brand) {
    switch (brand) {
      case "int64":
      case "int32":
        if (primaryKey) pgParamsBase.autoIncrement = true;
        return chooser([brand, pgParamsBase] as any);
      case "uint64":
      case "uint32":
      case "float32":
      case "float64":
        return chooser([brand, pgParamsBase] as any);
      case "naiveDatetime":
        return chooser(["naiveDatetime", pgParamsBase]);
    }
  }

  // --- Base types (no special pipe item) ---
  switch (node.type) {
    case "string": {
      const maxLen = getMaxLength();
      if (maxLen != null) {
        return chooser(["string", { ...pgParamsBase, maxLength: maxLen }]);
      }
      return chooser(["string", pgParamsBase]);
    }
    case "number":
      return chooser(["number", pgParamsBase]);
    case "bigint":
      return chooser(["bigint", pgParamsBase]);
    case "boolean":
      return chooser(["boolean", pgParamsBase]);
    case "date":
      return chooser(["date", pgParamsBase]);
    case "object":
      return chooser(["object", { ...pgParamsBase, schema: node }]);
  }

  // Fallback: string
  return chooser(["string", pgParamsBase]);
}
