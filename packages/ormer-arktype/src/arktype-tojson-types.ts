import type { Type } from "arktype";

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
export type JsonLeaf = JsonShorthand | ToJsonObject;

/** Recursive value accepted by `analyzeJson`: objects, leaves, or arrays of them. */
export type JsonValue = ToJsonObject | JsonLeaf | JsonValue[];

/** `{ domain: "string" | … | nestedObject }` */
type DomainBranch = JsonMeta &
  JsonConstraints & {
    domain: JsonLeaf;
    /** Present on domain: "object" when it's a table/struct */
    required?: { key: string; value: JsonLeaf }[];
    optional?: { key: string; value: JsonLeaf }[];
  };

/** `{ unit: 42 | "hello" | null | "undefined" }` */
export type UnitBranch = JsonMeta & {
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
export type ToJsonObject =
  | DomainBranch
  | UnitBranch
  | SequenceBranch
  | BranchesBranch
  | ProtoBranch
  | UnknownBranch;

/** The full `.json` output: a single shape, or a union-array of shapes/leaves. */
type ToJsonResult = ToJsonObject | ToJsonObject[] | JsonLeaf[];

export function typeToJson(t: Type<any, any>): Readonly<ToJsonResult> {
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
