import { z, type ZodType } from "zod";
import type { ZodDbParams } from "./zod-ext.ts";
import type { ColumnType } from "ormer";
import type { ParamsDerived } from "./common.ts";

type ZodSchemas =
  | ["uuid", ParamsDerived<{ default?: "generate" }>]
  | ["guid", ParamsDerived<{ default?: "generate" }>]
  | ["url", ParamsDerived]
  | ["emoji", ParamsDerived]
  | ["nanoid", ParamsDerived<{ maxLength: 21 }>]
  | ["cuid2", ParamsDerived]
  | ["ulid", ParamsDerived<{ maxLength: 26 }>]
  | ["xid", ParamsDerived<{ maxLength: 20 }>]
  | ["ksuid", ParamsDerived<{ maxLength: 27 }>]
  | ["base64", ParamsDerived]
  | ["base64url", ParamsDerived]
  | ["e164", ParamsDerived]
  | ["jwt", ParamsDerived]
  | ["ipv4", ParamsDerived]
  | ["ipv6", ParamsDerived]
  | ["mac", ParamsDerived]
  | ["cidrv4", ParamsDerived]
  | ["cidrv6", ParamsDerived]
  | ["isoTime", ParamsDerived]
  | ["isoDate", ParamsDerived]
  | ["isoDatetime", ParamsDerived]
  | ["naiveDatetime", ParamsDerived]
  | ["email", ParamsDerived]
  | ["string", ParamsDerived<{ maxLength: number }> | ParamsDerived]
  | ["int64", ParamsDerived]
  | ["int128", ParamsDerived]
  | ["int32", ParamsDerived]
  | ["int8", ParamsDerived]
  | ["int16", ParamsDerived]
  | ["uint32", ParamsDerived]
  | ["uint8", ParamsDerived]
  | ["uint16", ParamsDerived]
  | ["uint64", ParamsDerived]
  | ["uint128", ParamsDerived]
  | ["bigint", ParamsDerived]
  | ["float32", ParamsDerived]
  | ["float64", ParamsDerived]
  | ["boolean", ParamsDerived]
  | ["date", ParamsDerived]
  | ["json", ParamsDerived<{ schema: ZodType }>]
  | ["object", ParamsDerived<{ schema: ZodType }>];

export function deriveColumn<
  T extends ZodType & { def?: { db?: Partial<ZodDbParams> } },
  F extends (t: ZodSchemas) => ColumnType<string, (typeof t)[1]>,
>(schema: T, chooser: F) {
  let node = schema;
  let nullable: boolean | undefined = undefined;
  let optional: boolean | undefined = undefined;
  let defaultValue: unknown = undefined;
  let primaryKey = false;
  let autoIncrement = false;
  let foreignKeyTable: string | undefined = undefined;
  let foreignKeyColumn: string | undefined = undefined;
  let arrayDimensions = "";

  // Unwrap modifiers (.nullable, .optional, .default) to get to the base type
  //
  // For optionality, the first encountered is the right value
  while (true) {
    const ndb = node.def?.db;
    if (ndb?.primaryKey === true) primaryKey = true;
    if (ndb?.autoIncrement === true) autoIncrement = true;
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
  let pgParamsBase: Partial<ParamsDerived> = {};
  if (nullable) pgParamsBase.nullable = true;
  if (optional) pgParamsBase.nullable = true;
  if (typeof defaultValue !== "undefined") pgParamsBase.default = defaultValue;
  if (primaryKey) {
    pgParamsBase.primaryKey = true;
  }
  if (autoIncrement) {
    pgParamsBase.autoIncrement = true;
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
      pgParamsBase as ParamsDerived<{ default?: "generate" }>,
    ]);
  }

  if (node instanceof z.ZodGUID) {
    return chooser([
      "guid",
      pgParamsBase as ParamsDerived<{ default?: "generate" }>,
    ]);
  }

  if (node instanceof z.ZodURL) {
    return chooser(["url", pgParamsBase]);
  }

  if (node instanceof z.ZodEmoji) {
    return chooser(["emoji", pgParamsBase]);
  }

  if (node instanceof z.ZodNanoID) {
    return chooser([
      "nanoid",
      {
        ...pgParamsBase,
        maxLength: 21,
      },
    ]);
  }

  if (node instanceof z.ZodCUID2) {
    return chooser(["cuid2", pgParamsBase]);
  }

  if (node instanceof z.ZodULID) {
    return chooser([
      "ulid",
      {
        ...pgParamsBase,
        maxLength: 26,
      },
    ]);
  }

  if (node instanceof z.ZodXID) {
    return chooser([
      "xid",
      {
        ...pgParamsBase,
        maxLength: 20,
      },
    ]);
  }

  if (node instanceof z.ZodKSUID) {
    return chooser([
      "ksuid",
      {
        ...pgParamsBase,
        maxLength: 27,
      },
    ]);
  }

  if (node instanceof z.ZodBase64) {
    return chooser(["base64", pgParamsBase]);
  }

  if (node instanceof z.ZodBase64URL) {
    return chooser(["base64url", pgParamsBase]);
  }

  if (node instanceof z.ZodE164) {
    return chooser(["e164", pgParamsBase]);
  }

  if (node instanceof z.ZodJWT) {
    return chooser(["jwt", pgParamsBase]);
  }

  if (node instanceof z.ZodIPv4) {
    return chooser(["ipv4", pgParamsBase]);
  }

  if (node instanceof z.ZodIPv6) {
    return chooser(["ipv6", pgParamsBase]);
  }

  if (node instanceof z.ZodMAC) {
    return chooser(["mac", pgParamsBase]);
  }

  if (node instanceof z.ZodCIDRv4) {
    return chooser(["cidrv4", pgParamsBase]);
  }

  if (node instanceof z.ZodCIDRv6) {
    return chooser(["cidrv6", pgParamsBase]);
  }

  if (node instanceof z.ZodISOTime) {
    return chooser(["isoTime", pgParamsBase]);
  }

  if (node instanceof z.ZodISODate) {
    return chooser(["isoDate", pgParamsBase]);
  }

  if (node instanceof z.ZodISODateTime) {
    return chooser(["isoDatetime", pgParamsBase]);
  }

  if ("isNaiveDatetime" in node.def && node.def.isNaiveDatetime) {
    return chooser(["naiveDatetime", pgParamsBase]);
  }

  if (node instanceof z.ZodString) {
    if (node.maxLength != null) {
      return chooser([
        "string",
        {
          ...pgParamsBase,
          maxLength: node.maxLength,
        },
      ]);
    } else {
      return chooser(["string", pgParamsBase]);
    }
  }

  if (node instanceof z.ZodEmail) {
    return chooser(["email", pgParamsBase]);
  }

  if (node instanceof z.ZodBigIntFormat) {
    // z.int64() / z.uint64()
    //
    // Distinguish by the format string on the definition.
    const format = node._zod.def.format;
    if (format === "int64") {
      return chooser(["int64", pgParamsBase]);
    } else if (format === "uint64") {
      return chooser(["uint64", pgParamsBase]);
    }

    // List is exhaustive, so this should not happen:
    throw new Error(`Unsupported ZodBigIntFormat format: ${format}`);
  }

  if (node instanceof z.ZodBigInt) {
    // This is custom extension to ZodBigint
    const format = (node as any).def.dbformat;
    if (format === "uint128") {
      return chooser(["uint128", pgParamsBase]);
    } else if (format === "int128") {
      return chooser(["int128", pgParamsBase]);
    } else if (format === "int64") {
      return chooser(["int64", pgParamsBase]);
    } else if (format === "uint64") {
      return chooser(["uint64", pgParamsBase]);
    }

    return chooser(["bigint", pgParamsBase]);
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
      return chooser(["float32", pgParamsBase]);
    } else if (format === "float64") {
      return chooser(["float64", pgParamsBase]);
    } else if (format === "safeint" || format === "int32") {
      return chooser(["int32", pgParamsBase]);
    } else if (format === "uint32") {
      return chooser(["uint32", pgParamsBase]);
    }

    // List is exhaustive, so this should not happen:
    throw new Error(`Unsupported ZodNumberFormat format: ${format}`);
  }

  if (node instanceof z.ZodNumber) {
    // z.number().int() produces ZodNumber with format: 'safeint' directly
    // (Zod's built-in, stored on the instance as node.format)
    // z.number().int8() / .uint8() / .int16() / .uint16() are custom extensions
    // stored on node.def.dbformat so they survive .refine() / .pipe()
    const dbformat = (node as any).def.dbformat as string | undefined;
    const safefmt = node.format as string | undefined;
    if (safefmt === "safeint") {
      return chooser(["int32", pgParamsBase]);
    } else if (dbformat === "int8") {
      return chooser(["int8", pgParamsBase]);
    } else if (dbformat === "uint8") {
      return chooser(["uint8", pgParamsBase]);
    } else if (dbformat === "int16") {
      return chooser(["int16", pgParamsBase]);
    } else if (dbformat === "uint16") {
      return chooser(["uint16", pgParamsBase]);
    } else if (dbformat === "int32") {
      return chooser(["int32", pgParamsBase]);
    } else if (dbformat === "uint32") {
      return chooser(["uint32", pgParamsBase]);
    } else if (dbformat === "float32") {
      return chooser(["float32", pgParamsBase]);
    }
    return chooser(["float64", pgParamsBase]);
  }

  if (node instanceof z.ZodBoolean) {
    return chooser(["boolean", pgParamsBase]);
  }

  if (node instanceof z.ZodDate) {
    return chooser(["date", pgParamsBase]);
  }

  if (node instanceof z.ZodObject) {
    return chooser([
      "object",
      {
        ...pgParamsBase,
        schema: node,
      },
    ]);
  }

  // z.json() -> z.ZodLazy, TODO: this is a bit sketchy perhaps?
  if (node instanceof z.ZodLazy) {
    return chooser([
      "json",
      {
        ...pgParamsBase,
        schema: node,
      },
    ]);
  }

  // Are these needed?
  //
  // if (node.def.type === "string") {
  //   return pg.text(pgParamsBase);
  // } else if (node.def.type === "number") {
  //   return pg.float8(pgParamsBase);
  // } else if (node.def.type === "boolean") {
  //   return pg.boolean(pgParamsBase);
  // } else if (node.def.type === "date") {
  //   return pg.timestamptz(pgParamsBase);
  // } else if (node.def.type === "bigint") {
  //   return pg.int8(pgParamsBase);
  // }

  throw new Error(`Unsupported Zod type: ${node?.constructor?.name}`);
}
