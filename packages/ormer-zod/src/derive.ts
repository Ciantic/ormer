import { z, type ZodType } from "zod";
import type { ZodDbParams } from "./zod-ext.ts";
import type { ColumnType, Params } from "ormer";

type DeriveParams<T = {}> = {
  nullable?: boolean;
  //   optional?: boolean;
  default?: unknown;
  primaryKey?: boolean;
  autoIncrement?: boolean;
  foreignKeyTable?: string;
  foreignKeyColumn?: string;
  array?: string;
  //   maxLength?: number;
  //   schema?: ZodType;
} & T;

type ZodSchemas =
  | ["uuid", DeriveParams<{ default?: "generate" }>]
  | ["guid", DeriveParams<{ default?: "generate" }>]
  | ["url", DeriveParams]
  | ["emoji", DeriveParams]
  | ["nanoid", DeriveParams<{ maxLength: 21 }>]
  | ["cuid2", DeriveParams]
  | ["ulid", DeriveParams<{ maxLength: 26 }>]
  | ["xid", DeriveParams<{ maxLength: 20 }>]
  | ["ksuid", DeriveParams<{ maxLength: 27 }>]
  | ["base64", DeriveParams]
  | ["base64url", DeriveParams]
  | ["e164", DeriveParams]
  | ["jwt", DeriveParams]
  | ["ipv4", DeriveParams]
  | ["ipv6", DeriveParams]
  | ["mac", DeriveParams]
  | ["cidrv4", DeriveParams]
  | ["cidrv6", DeriveParams]
  | ["isoTime", DeriveParams]
  | ["isoDate", DeriveParams]
  | ["isoDatetime", DeriveParams]
  | ["naiveDatetime", DeriveParams]
  | ["email", DeriveParams]
  | ["string", DeriveParams<{ maxLength: number }> | DeriveParams]
  | ["int64", DeriveParams]
  | ["int32", DeriveParams]
  | ["uint32", DeriveParams]
  | ["uint64", DeriveParams]
  | ["bigint", DeriveParams]
  | ["float32", DeriveParams]
  | ["float64", DeriveParams]
  | ["boolean", DeriveParams]
  | ["date", DeriveParams]
  | ["json", DeriveParams<{ schema: ZodType }>]
  | ["object", DeriveParams<{ schema: ZodType }>];

export function deriveColumn<
  T extends ZodType & { def?: { db?: Partial<ZodDbParams> } },
  F extends (t: ZodSchemas) => ColumnType<string, (typeof t)[1]>,
>(schema: T, chooser: F) {
  let node = schema;
  let nullable: boolean | undefined = undefined;
  let optional: boolean | undefined = undefined;
  let defaultValue: unknown = undefined;
  let primaryKey = false;
  let foreignKeyTable: string | undefined = undefined;
  let foreignKeyColumn: string | undefined = undefined;
  let arrayDimensions = "";

  // Unwrap modifiers (.nullable, .optional, .default) to get to the base type
  //
  // For optionality, the first encountered is the right value
  while (true) {
    const ndb = node.def?.db;
    if (ndb?.primaryKey === true) primaryKey = true;
    if (ndb?.foreignKeyTable && ndb?.foreignKeyColumn) {
      foreignKeyTable = ndb.foreignKeyTable;
      foreignKeyColumn = ndb.foreignKeyColumn;
    }

    if (node instanceof z.ZodNullable) {
      nullable = true;
    } else if (node instanceof z.ZodOptional) {
      if (optional === undefined) optional = true;
    } else if (node instanceof z.ZodExactOptional) {
      if (optional === undefined) optional = true;
    } else if (node instanceof z.ZodDefault) {
      defaultValue = node.def.defaultValue;
    } else if (node instanceof z.ZodPrefault) {
      defaultValue = node.def.defaultValue;
    } else if (node instanceof z.ZodCatch) {
      defaultValue = node.def.catchValue;
    } else if (node instanceof z.ZodNonOptional) {
      if (optional === undefined) optional = false;
    } else if (node instanceof z.ZodReadonly) {
      // readonly is a pure wrapper — no modifier to set, just unwrap
    } else if (node instanceof z.ZodPipe) {
      // pipe chains transformations — unwrap to the input schema
      node = node.def.in as typeof node;
      continue;
    } else if (node instanceof z.ZodArray) {
      arrayDimensions += "[]";
      node = node.def.element as typeof node;
      continue;
    }
    if ("innerType" in node.def) {
      // z.ZodNullable, z.ZodOptional, z.ZodDefault, z.ZodPrefault, ZodExactOptional, ZodCatch, ZodNonOptional all have innerType
      node = node.def.innerType as typeof node;
    } else {
      break;
    }
  }

  // Create params for the pg.X(params) call
  let pgParamsBase: Partial<DeriveParams> = {};
  if (nullable) pgParamsBase.nullable = true;
  if (optional) pgParamsBase.nullable = true;
  if (typeof defaultValue !== "undefined") pgParamsBase.default = defaultValue;
  if (primaryKey) {
    pgParamsBase.primaryKey = true;
    if (node instanceof z.ZodNumberFormat || node instanceof z.ZodBigInt) {
      pgParamsBase.autoIncrement = true;
    }
  }
  if (foreignKeyTable && foreignKeyColumn) {
    pgParamsBase.foreignKeyTable = foreignKeyTable;
    pgParamsBase.foreignKeyColumn = foreignKeyColumn;
  }
  if (arrayDimensions) {
    pgParamsBase.array = arrayDimensions;
  }

  if (node instanceof z.ZodUUID) {
    return chooser([
      "uuid",
      pgParamsBase as DeriveParams<{ default?: "generate" }>,
    ]) as ColumnType<any, any>;
  }

  if (node instanceof z.ZodGUID) {
    return chooser([
      "guid",
      pgParamsBase as DeriveParams<{ default?: "generate" }>,
    ]) as ColumnType<any, any>;
  }

  if (node instanceof z.ZodURL) {
    return chooser(["url", pgParamsBase]) as ColumnType<any, any>;
  }

  if (node instanceof z.ZodEmoji) {
    return chooser(["emoji", pgParamsBase]) as ColumnType<any, any>;
  }

  if (node instanceof z.ZodNanoID) {
    return chooser([
      "nanoid",
      {
        ...pgParamsBase,
        maxLength: 21,
      },
    ]) as ColumnType<any, any>;
  }

  if (node instanceof z.ZodCUID2) {
    return chooser(["cuid2", pgParamsBase]) as ColumnType<any, any>;
  }

  if (node instanceof z.ZodULID) {
    return chooser([
      "ulid",
      {
        ...pgParamsBase,
        maxLength: 26,
      },
    ]) as ColumnType<any, any>;
  }

  if (node instanceof z.ZodXID) {
    return chooser([
      "xid",
      {
        ...pgParamsBase,
        maxLength: 20,
      },
    ]) as ColumnType<any, any>;
  }

  if (node instanceof z.ZodKSUID) {
    return chooser([
      "ksuid",
      {
        ...pgParamsBase,
        maxLength: 27,
      },
    ]) as ColumnType<any, any>;
  }

  if (node instanceof z.ZodBase64) {
    return chooser(["base64", pgParamsBase]) as ColumnType<any, any>;
  }

  if (node instanceof z.ZodBase64URL) {
    return chooser(["base64url", pgParamsBase]) as ColumnType<any, any>;
  }

  if (node instanceof z.ZodE164) {
    return chooser(["e164", pgParamsBase]) as ColumnType<any, any>;
  }

  if (node instanceof z.ZodJWT) {
    return chooser(["jwt", pgParamsBase]) as ColumnType<any, any>;
  }

  if (node instanceof z.ZodIPv4) {
    return chooser(["ipv4", pgParamsBase]) as ColumnType<any, any>;
  }

  if (node instanceof z.ZodIPv6) {
    return chooser(["ipv6", pgParamsBase]) as ColumnType<any, any>;
  }

  if (node instanceof z.ZodMAC) {
    return chooser(["mac", pgParamsBase]) as ColumnType<any, any>;
  }

  if (node instanceof z.ZodCIDRv4) {
    return chooser(["cidrv4", pgParamsBase]) as ColumnType<any, any>;
  }

  if (node instanceof z.ZodCIDRv6) {
    return chooser(["cidrv6", pgParamsBase]) as ColumnType<any, any>;
  }

  if (node instanceof z.ZodISOTime) {
    return chooser(["isoTime", pgParamsBase]) as ColumnType<any, any>;
  }

  if (node instanceof z.ZodISODate) {
    return chooser(["isoDate", pgParamsBase]) as ColumnType<any, any>;
  }

  if (node instanceof z.ZodISODateTime) {
    return chooser(["isoDatetime", pgParamsBase]) as ColumnType<any, any>;
  }

  if ("isNaiveDatetime" in node.def && node.def.isNaiveDatetime) {
    return chooser(["naiveDatetime", pgParamsBase]) as ColumnType<any, any>;
  }

  if (node instanceof z.ZodString) {
    if (node.maxLength != null) {
      return chooser([
        "string",
        {
          ...pgParamsBase,
          maxLength: node.maxLength,
        },
      ]) as ColumnType<any, any>;
    } else {
      return chooser(["string", pgParamsBase]) as ColumnType<any, any>;
    }
  }

  if (node instanceof z.ZodEmail) {
    return chooser(["email", pgParamsBase]) as ColumnType<any, any>;
  }

  if (node instanceof z.ZodBigIntFormat) {
    // z.int64() / z.uint64()
    //
    // Distinguish by the format string on the definition.
    const format = node._zod.def.format;
    if (format === "int64") {
      return chooser(["int64", pgParamsBase]) as ColumnType<any, any>;
    } else if (format === "uint64") {
      return chooser(["uint64", pgParamsBase]) as ColumnType<any, any>;
    }

    // List is exhaustive, so this should not happen:
    throw new Error(`Unsupported ZodBigIntFormat format: ${format}`);
  }

  if (node instanceof z.ZodBigInt) {
    return chooser(["bigint", pgParamsBase]) as ColumnType<any, any>;
  }

  if (node instanceof z.ZodNumberFormat) {
    // z.int() / z.float32() / z.float64() / z.int32() / z.uint32()
    //
    // Distinguish by the format string on the definition, only available at
    // runtime.
    //
    // This is not possible at the type-level: https://github.com/colinhacks/zod/issues/6045
    const format = node._zod.def.format;
    if (format === "float32") {
      return chooser(["float32", pgParamsBase]) as ColumnType<any, any>;
    } else if (format === "float64") {
      return chooser(["float64", pgParamsBase]) as ColumnType<any, any>;
    } else if (format === "safeint" || format === "int32") {
      return chooser(["int32", pgParamsBase]) as ColumnType<any, any>;
    } else if (format === "uint32") {
      return chooser(["uint32", pgParamsBase]) as ColumnType<any, any>;
    }

    // List is exhaustive, so this should not happen:
    throw new Error(`Unsupported ZodNumberFormat format: ${format}`);
  }

  if (node instanceof z.ZodNumber) {
    return chooser(["float64", pgParamsBase]) as ColumnType<any, any>;
  }

  if (node instanceof z.ZodBoolean) {
    return chooser(["boolean", pgParamsBase]) as ColumnType<any, any>;
  }

  if (node instanceof z.ZodDate) {
    return chooser(["date", pgParamsBase]) as ColumnType<any, any>;
  }

  if (node instanceof z.ZodObject) {
    return chooser([
      "object",
      {
        ...pgParamsBase,
        schema: node,
      },
    ]) as ColumnType<any, any>;
  }

  // z.json() -> z.ZodLazy, TODO: this is a bit sketchy perhaps?
  if (node instanceof z.ZodLazy) {
    return chooser([
      "json",
      {
        ...pgParamsBase,
        schema: node,
      },
    ]) as ColumnType<any, any>;
  }

  // Are these needed?
  //
  // if (node.def.type === "string") {
  //   return pg.text(pgParamsBase) as ColumnType<any, any>;
  // } else if (node.def.type === "number") {
  //   return pg.float8(pgParamsBase) as ColumnType<any, any>;
  // } else if (node.def.type === "boolean") {
  //   return pg.boolean(pgParamsBase) as ColumnType<any, any>;
  // } else if (node.def.type === "date") {
  //   return pg.timestamptz(pgParamsBase) as ColumnType<any, any>;
  // } else if (node.def.type === "bigint") {
  //   return pg.int8(pgParamsBase) as ColumnType<any, any>;
  // }

  throw new Error(`Unsupported Zod type: ${node?.constructor?.name}`);
}
