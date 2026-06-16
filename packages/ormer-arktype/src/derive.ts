import type { Type } from "arktype";
import type { ColumnType } from "ormer";
import { type KnwownDbType } from "./arktype-ext.ts";

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
  maxLength?: number;
  //   schema?: ZodType;
} & T;

type Choice = [KnwownDbType, ParamsDerived];

/** The canonical domain strings that arktype emits in `.json` */
type Domain = "string" | "number" | "bigint" | "object";

/**
 * Recursive type representing the shape of arktype's `Type.json`.
 *
 * Top-level is either a single branch shape or an array (union of branches).
 * Each branch is discriminated by which primary key is present:
 * `domain`, `unit`, `sequence`, `branches`, `proto` (Date), or `{}` (unknown).
 */

/** Shared by most branches */
type JsonMeta = { meta?: Record<string, unknown> };

/** Numeric/value constraints (only on domain branches) */
type JsonConstraints = {
  divisor?: number | { rule: number; meta?: Record<string, unknown> };
  min?:
    | number
    | { exclusive?: boolean; rule: number; meta?: Record<string, unknown> };
  max?:
    | number
    | { exclusive?: boolean; rule: number; meta?: Record<string, unknown> };
  minLength?: number;
  maxLength?: number | { rule: number; meta?: Record<string, unknown> };
  pattern?: { flags?: string; rule: string; meta?: unknown }[];
  predicate?: { predicate: string; meta?: unknown }[];
};

/** Shorthand strings that arktype uses for well-known domains/prototypes. */
type JsonShorthand = Domain | "Date" | "Array" | (string & {});

/** A leaf value inside arrays, sequences, and unions. */
type JsonLeaf = JsonShorthand | ToJsonObject;

/** Recursive value accepted by `analyzeJson`: objects, leaves, or arrays of them. */
type JsonValue = ToJsonObject | JsonLeaf | JsonValue[];

/** `{ domain: "string" | … | nestedObject }` */
type DomainBranch = JsonMeta &
  JsonConstraints & {
    domain: JsonLeaf;
    /** Present on domain: "object" when it's a table/struct */
    required?: { key: string; value: JsonLeaf }[];
    optional?: { key: string; value: JsonLeaf }[];
  };

/** `{ unit: 42 | "hello" | null | "undefined" }` */
type UnitBranch = JsonMeta & {
  unit: unknown;
};

/** `{ sequence: …, proto: "Array" | { proto: "Array", meta: … } }` */
type SequenceBranch = JsonMeta & {
  /** Simple array: element type; union array: [type, type]; tuple: { prefix: […] } */
  sequence: JsonLeaf | JsonLeaf[] | { prefix: JsonLeaf[] };
  proto: JsonShorthand | ProtoBranch;
  /** Present on tuples: exact length */
  exactLength?: number;
};

/** `{ branches: […] }` – configured unions, UUIDs, booleans, etc. */
type BranchesBranch = JsonMeta & {
  branches: ToJsonObject[];
};

/** `{ proto: "Date" | "Uint8Array" | … }` – standalone instance / class */
type ProtoBranch = JsonMeta & {
  proto: JsonShorthand | ProtoBranch;
};

/** `{}` – unknown */
type UnknownBranch = Record<string, never>;

/** A single `.json` shape discriminated by which primary key is present */
type ToJsonObject =
  | DomainBranch
  | UnitBranch
  | SequenceBranch
  | BranchesBranch
  | ProtoBranch
  | UnknownBranch;

/** The full `.json` output: a single shape, or a union-array of shapes/leaves. */
type ToJsonResult = ToJsonObject | ToJsonObject[] | JsonLeaf[];

function typeToJson(t: Type<any, any>): Readonly<ToJsonResult> {
  // Quick manual probes for arktype's `.toJSON()` shape (run from this package's directory):
  //
  // deno eval 'import { type } from "arktype"; console.log(JSON.stringify(type("string | null").toJSON(), null, 2));'
  //
  // deno eval 'import { type } from "arktype"; console.log(JSON.stringify(type("boolean | null | undefined").toJSON(), null, 2));'
  //
  // deno eval 'import { db } from "./src/arktype-ext.ts"; console.log(JSON.stringify(db.type("int64[]").toJSON(), null, 2));'
  //
  // deno eval 'import { db } from "./src/arktype-ext.ts"; console.log(JSON.stringify(db.type("int64 | null").configure({ a: 1 }).toJSON(), null, 2));'

  return t.json as ToJsonResult;
}

export function deriveColumn<T extends Type<any, any>>(
  schema: T | [T, ...any[]],
  chooser: (t: Choice) => ColumnType<string, any>,
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
  let params: ParamsDerived = {};
  console.log("Base type JSON:", JSON.stringify(baseTypeJson, null, 2));

  const choice = analyzeJson(baseTypeJson, params);
  // let choice: KnwownDbType | undefined = undefined;

  // Apply defaultValue extracted from the array-branch syntax
  if (defaultValue !== undefined) {
    params.default = defaultValue;
  }

  // autoIncrement: only for numeric primary keys
  if (params.primaryKey && (choice === "number" || choice === "bigint")) {
    params.autoIncrement = true;
  }
  /*

  if ("domain" in baseTypeJson && typeof baseTypeJson.domain === "string") {
    // const domain = baseTypeJson.domain;
    choice = baseTypeJson.domain;
  }

  // Union of types: e.g. string | null, string | null | undefined, true | false, ...
  if (Array.isArray(baseTypeJson)) {
    if (
      baseTypeJson.length === 2 &&
      "unit" in baseTypeJson[0] &&
      "unit" in baseTypeJson[1] &&
      typeof baseTypeJson[0].unit === "boolean" &&
      typeof baseTypeJson[1].unit === "boolean"
    ) {
      choice = "boolean";
    }
  }

  if ("proto" in baseTypeJson && baseTypeJson.proto === "Date") {
    choice = "Date";
  }

  if (!choice) {
    throw new Error(
      `Could not determine DB type for schema: ${JSON.stringify(schema)}`,
    );
  }
  */
  return chooser([choice, params]);
}

/**
 * Walk arktype's `.json` representation and determine:
 * - The canonical DB type (choice)
 * - Side-effect: populate `params` with nullable, array, maxLength, primaryKey,
 *   foreignKeyTable, foreignKeyColumn
 */
function analyzeJson(
  json: Readonly<JsonValue>,
  params: ParamsDerived,
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
  params: ParamsDerived,
): void {
  if (!meta) return;
  if (meta.primaryKey === true) params.primaryKey = true;
  if (typeof meta.foreignKeyTable === "string")
    params.foreignKeyTable = meta.foreignKeyTable;
  if (typeof meta.foreignKeyColumn === "string")
    params.foreignKeyColumn = meta.foreignKeyColumn;
  if (typeof meta.varchar === "number") params.maxLength = meta.varchar;
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
