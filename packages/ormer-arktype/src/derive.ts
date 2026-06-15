import type { Type } from "arktype";
import type { ColumnType } from "ormer";
import type { ParamsDerived } from "./common.ts";
import { type KnwownDbType } from "./arktype-ext.ts";

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

/** `{ domain: "string" | … | nestedObject }` */
type DomainBranch = JsonMeta &
  JsonConstraints & {
    domain: Domain | ToJsonObject;
    /** Present on domain: "object" when it's a table/struct */
    required?: { key: string; value: JsonLeaf }[];
    optional?: { key: string; value: JsonLeaf }[];
  };

/** `{ unit: 42 | "hello" | null | "undefined" }` */
type UnitBranch = JsonMeta & {
  unit: unknown;
};

/** A leaf value that can appear inside a `sequence` array */
type JsonLeaf = Domain | ToJsonObject;

/** `{ sequence: …, proto: "Array" }` */
type SequenceBranch = JsonMeta & {
  /** Simple array: element type; union array: [type, type]; tuple: { prefix: […] } */
  sequence: JsonLeaf | JsonLeaf[] | { prefix: JsonLeaf[] };
  proto: string;
  /** Present on tuples: exact length */
  exactLength?: number;
};

/** `{ branches: […] }` – UUID-style multi-branch */
type BranchesBranch = JsonMeta & {
  branches: ToJsonObject[];
};

/** `{ proto: "Date" | "Uint8Array" | … }` – standalone instance / class */
type ProtoBranch = {
  proto: string;
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

/** The full `.json` output: a single shape, or a union-array of shapes */
type ToJsonResult = ToJsonObject | ToJsonObject[];

function typeToJson(t: Type<any, any>): Readonly<ToJsonResult> {
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
  json: Readonly<ToJsonResult>,
  params: ParamsDerived,
): KnwownDbType {
  // Union array — e.g. string | null, string | null | undefined, boolean
  if (Array.isArray(json)) {
    let primary: ToJsonObject | undefined;
    let hasNull = false;

    for (const branch of json) {
      // Shorthand string domain: ["string", { unit: null }]
      if (typeof branch === "string") {
        primary = { domain: branch as Domain };
      } else if (typeof branch === "object" && branch !== null) {
        if ("unit" in branch) {
          if (branch.unit === null || branch.unit === "undefined") {
            hasNull = true;
          }
        } else {
          // Sequence, domain, proto, or branches object — this is the real type
          primary = branch;
        }
      }
    }

    // Boolean: [{"unit":false},{"unit":true}]
    if (!primary && json.length === 2) {
      const allUnitBools = json.every(
        (b) =>
          typeof b === "object" &&
          b !== null &&
          "unit" in b &&
          typeof b.unit === "boolean",
      );
      if (allUnitBools) return "boolean";
    }

    if (hasNull) params.nullable = true;

    if (primary) return analyzeJson(primary, params);

    throw new Error(`Cannot analyze union JSON: ${JSON.stringify(json)}`);
  }

  // Single object branch
  return analyzeJsonObject(json, params);
}

function analyzeJsonObject(
  json: Readonly<ToJsonResult>,
  params: ParamsDerived,
): KnwownDbType {
  // Extract metadata configured via .configure({ … })
  const meta = ("meta" in json ? json.meta : undefined) as
    | Record<string, unknown>
    | undefined;
  if (meta) {
    if (meta.primaryKey === true) params.primaryKey = true;
    if (typeof meta.foreignKeyTable === "string")
      params.foreignKeyTable = meta.foreignKeyTable;
    if (typeof meta.foreignKeyColumn === "string")
      params.foreignKeyColumn = meta.foreignKeyColumn;
    if (typeof meta.varchar === "number")
      params.maxLength = meta.varchar as number;
  }

  // Sequence = array type, e.g. string[], int64[][]
  if ("sequence" in json && json.sequence !== undefined) {
    params.array = (params.array ?? "") + "[]";

    const seq = json.sequence as JsonLeaf;
    if (typeof seq === "string") {
      // Shorthand: "string" → { domain: "string" }
      return analyzeJson({ domain: seq as Domain }, params);
    }
    // Nested object: { sequence: "bigint", proto: "Array" }
    return analyzeJson(seq as ToJsonResult, params);
  }

  // Proto: "Date" or nested Array proto
  if ("proto" in json) {
    const proto = json.proto;
    if (proto === "Date") return "Date";

    // proto may be an object when meta is attached:
    // { proto: "Array", meta: { dbformat: "int64" } }
    if (typeof proto === "string" && proto === "Array") {
      // Array without sequence — shouldn't happen at this point, but handle
      // gracefully by falling through to any domain check
    }
    if (typeof proto === "object" && proto !== null && "proto" in proto) {
      // Nested proto object — extract its meta
      const protoObj = proto as Record<string, unknown>;
      const innerMeta = protoObj.meta as Record<string, unknown> | undefined;
      if (innerMeta) {
        if (innerMeta.primaryKey === true) params.primaryKey = true;
        if (typeof innerMeta.foreignKeyTable === "string")
          params.foreignKeyTable = innerMeta.foreignKeyTable;
        if (typeof innerMeta.foreignKeyColumn === "string")
          params.foreignKeyColumn = innerMeta.foreignKeyColumn;
      }
    }
  }

  // Domain: "string" | "number" | "bigint" | "object"
  if ("domain" in json) {
    if (typeof json.domain === "string") {
      const domain = json.domain as string;
      if (
        domain === "string" ||
        domain === "number" ||
        domain === "bigint" ||
        domain === "object"
      ) {
        return domain;
      }
    } else if (typeof json.domain === "object" && json.domain !== null) {
      // Nested domain object — configured types insert meta inside domain
      // e.g. { domain: { domain: "number", meta: { dbformat: "int32" } }, ... }
      return analyzeJson(json.domain as ToJsonResult, params);
    }
  }

  // Branches — uuid, boolean, etc.
  if ("branches" in json && Array.isArray(json.branches)) {
    // Boolean: all branches are unit booleans
    if (
      json.branches.every(
        (b) =>
          typeof b === "object" &&
          b !== null &&
          "unit" in b &&
          typeof b.unit === "boolean",
      )
    ) {
      return "boolean";
    }

    // UUID / other multi-branch: find the domain branch (not unit)
    for (const branch of json.branches) {
      if (typeof branch === "object" && branch !== null && "domain" in branch) {
        return analyzeJson(branch as ToJsonResult, params);
      }
    }

    // Fallback: try the first branch
    const first = json.branches[0];
    if (typeof first === "object" && first !== null) {
      return analyzeJson(first as ToJsonResult, params);
    }
  }

  throw new Error(`Cannot analyze JSON object: ${JSON.stringify(json)}`);
}
