import type { Type } from "arktype";
import type { ColumnType } from "ormer";
import { type DbFormatId, type KnwownDbType } from "./arktype-ext.ts";
import {
  typeToJson,
  type JsonLeaf,
  type JsonValue,
  type ToJsonObject,
  type UnitBranch,
} from "./arktype-tojson-types.ts";

// Runtime version of the above type, used in the deriveColumn() implementation
export type ParamsDerived<T = {}> = {
  nullable?: boolean;
  //   optional?: boolean;
  default?: unknown;
  primaryKey?: boolean;
  autoIncrement?: boolean;
  foreignKeyTable?: string;
  foreignKeyColumn?: string;
  array?: string;
  //   schema?: ZodType;
} & T;

/** Internal type used during JSON analysis — accumulates dbformat and
 * maxLength before they are lifted into the Choice triplet. */
type InternalDeriveParams = ParamsDerived & {
  dbformat?: DbFormatId;
  maxLength?: number;
};

/** Discriminated union of [domain, dbformat, params] triplets.
 * The second element is "" when no specific dbformat applies. */
type Choice =
  // number
  | ["number", "", ParamsDerived]
  | ["number", "float32", ParamsDerived]
  | ["number", "float64", ParamsDerived]
  | ["number", "int8", ParamsDerived]
  | ["number", "int16", ParamsDerived]
  | ["number", "int32", ParamsDerived]
  | ["number", "uint8", ParamsDerived]
  | ["number", "uint16", ParamsDerived]
  | ["number", "uint32", ParamsDerived]
  // bigint
  | ["bigint", "", ParamsDerived]
  | ["bigint", "int64", ParamsDerived]
  | ["bigint", "uint64", ParamsDerived]
  | ["bigint", "uint128", ParamsDerived]
  // string
  | ["string", "", ParamsDerived]
  | ["string", "", ParamsDerived<{ maxLength: number }>]
  | ["string", "uuid", ParamsDerived<{ default?: "generate" }>]
  | ["string", "uuid.v1", ParamsDerived]
  | ["string", "uuid.v2", ParamsDerived]
  | ["string", "uuid.v3", ParamsDerived]
  | ["string", "uuid.v4", ParamsDerived]
  | ["string", "uuid.v5", ParamsDerived]
  | ["string", "uuid.v6", ParamsDerived]
  | ["string", "uuid.v7", ParamsDerived]
  | ["string", "uuid.v8", ParamsDerived]
  | ["string", "datepart", ParamsDerived]
  | ["string", "timepart", ParamsDerived]
  | ["string", "naivedatetime", ParamsDerived<{ default?: "now" }>]
  // other
  | ["boolean", "", ParamsDerived]
  | ["Date", "", ParamsDerived<{ default?: "now" }>]
  | ["object", "", ParamsDerived];

export function deriveColumn<T extends Type<any, any>>(
  schema: T | [T, ...any[]],
  chooser: (t: Readonly<Choice>) => ColumnType<string, any>,
): ColumnType<string, any> {
  let defaultValue: unknown = undefined;
  let baseType: T | undefined = undefined;

  if (Array.isArray(schema)) {
    const [type, ...branches] = schema;
    baseType = type;
    if (branches[0] === "=") {
      defaultValue = branches[1];
    } else {
      throw new Error(`Unsupported branches operator: ${branches}`);
    }
  } else {
    baseType = schema;
  }

  const baseTypeJson = typeToJson(baseType);
  let params: InternalDeriveParams = {};

  const choice = analyzeJson(baseTypeJson, params);

  // Apply defaultValue extracted from the array-branch syntax
  if (defaultValue !== undefined) {
    params.default = defaultValue;
  }

  // autoIncrement: only for numeric primary keys
  if (params.primaryKey && (choice === "number" || choice === "bigint")) {
    params.autoIncrement = true;
  }

  // Lift dbformat out of params into the triplet; maxLength stays on params
  // (it's part of ParamsDerived<{ maxLength: number }> for the varchar variant).
  const { dbformat, ...cleanParams } = params;
  return chooser([choice, dbformat ?? "", cleanParams] as Choice);
}

/**
 * Walk arktype's `.json` representation and determine:
 * - The canonical DB type (choice)
 * - Side-effect: populate `params` with nullable, array, maxLength, primaryKey,
 *   foreignKeyTable, foreignKeyColumn
 */
function analyzeJson(
  json: Readonly<JsonValue>,
  params: InternalDeriveParams,
): KnwownDbType {
  // Union array — e.g. string | null, string | null | undefined, boolean
  if (Array.isArray(json)) {
    const branches = json.map(normalizeBranch);

    const unitBranches = branches.filter((b): b is UnitBranch => "unit" in b);
    const valueBranches = branches.filter((b) => !("unit" in b));

    const hasNull = unitBranches.some(
      (b) => b.unit === null || b.unit === "undefined",
    );
    if (hasNull) params.nullable = true;

    // Boolean: no value branches, and all non-null/undefined units are booleans.
    const nonNullUnits = unitBranches.filter(
      (b) => b.unit !== null && b.unit !== "undefined",
    );
    if (
      valueBranches.length === 0 &&
      nonNullUnits.every((b) => typeof b.unit === "boolean")
    ) {
      return "boolean";
    }

    if (valueBranches.length === 1) {
      return analyzeJson(valueBranches[0]!, params);
    }

    throw new Error(`Cannot analyze union JSON: ${JSON.stringify(json)}`);
  }

  // Single object branch
  return analyzeJsonObject(json as Readonly<ToJsonObject>, params);
}

/** Convert a union branch into a normalized object shape. */
function normalizeBranch(leaf: JsonLeaf): ToJsonObject {
  if (typeof leaf === "string") {
    return { domain: leaf };
  }
  return leaf;
}

/** Apply metadata from `.configure({ … })` exactly once per outer type. */
function applyMeta(
  meta: Record<string, unknown> | undefined,
  params: InternalDeriveParams,
): void {
  if (!meta) return;
  if (meta.primaryKey === true) params.primaryKey = true;
  if (typeof meta.foreignKeyTable === "string")
    params.foreignKeyTable = meta.foreignKeyTable;
  if (typeof meta.foreignKeyColumn === "string")
    params.foreignKeyColumn = meta.foreignKeyColumn;
  if (typeof meta.varchar === "number") params.maxLength = meta.varchar;
  if (typeof meta.dbformat === "string")
    params.dbformat = meta.dbformat as DbFormatId;
}

function analyzeJsonObject(
  json: Readonly<ToJsonObject>,
  params: ParamsDerived,
): KnwownDbType {
  applyMeta(json.meta, params);

  // Sequence = array type, e.g. string[], int64[][]
  if ("sequence" in json) {
    params.array = (params.array ?? "") + "[]";
    const seq = json.sequence;
    return analyzeJson(
      typeof seq === "string" ? { domain: seq } : (seq as JsonValue),
      params,
    );
  }

  // Proto: "Date" is the only prototype we map directly. Nested Array proto is
  // handled via `sequence`, so we ignore it here.
  if ("proto" in json && json.proto === "Date") {
    return "Date";
  }

  // Domain: "string" | "number" | "bigint" | "object", or a nested configured
  // domain object such as `{ domain: "string", meta: { dbformat: "uuid" } }`.
  if ("domain" in json) {
    const domain = json.domain;
    if (typeof domain === "string") {
      if (
        domain === "string" ||
        domain === "number" ||
        domain === "bigint" ||
        domain === "object"
      ) {
        return domain as KnwownDbType;
      }
      throw new Error(`Unsupported domain: ${domain}`);
    }
    return analyzeJson(domain, params);
  }

  // Branches — configured unions, UUIDs, booleans, etc.
  if ("branches" in json && Array.isArray(json.branches)) {
    const branches = json.branches;

    if (
      branches.every(
        (b) =>
          typeof b === "object" &&
          b !== null &&
          "unit" in b &&
          typeof b.unit === "boolean",
      )
    ) {
      return "boolean";
    }

    const firstValue = branches.find(
      (b): b is ToJsonObject =>
        typeof b === "object" && b !== null && !("unit" in b),
    );
    if (firstValue) {
      return analyzeJson(firstValue, params);
    }
  }

  throw new Error(`Cannot analyze JSON object: ${JSON.stringify(json)}`);
}
