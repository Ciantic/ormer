import type * as c from "./columns.ts";
import type { ColumnType, Params, DateTimeCol } from "./columns.ts";
import type { StandardSchemaV1 } from "@standard-schema/spec";

type UnknownSchema = StandardSchemaV1<unknown, unknown>;
// Restrict record T to only keys from record B
type R<T, B> = {
  [K in keyof T]: K extends keyof B ? T[K] : never;
};

/**
 * Primary key column with auto increment
 *
 * BIGSERIAL or PRIMARY KEY AUTOINCREMENT
 */
export function pkAutoInc(): ColumnType<
  "int64",
  {
    autoIncrement: true;
    primaryKey: true;
    notInsertable: true;
    notUpdatable: true;
  }
>;
export function pkAutoInc<T extends Params>(
  params: R<T, Params>,
): ColumnType<"int64", T>;
export function pkAutoInc(params?: unknown) {
  return {
    type: "int64",
    ...((params ?? {
      primaryKey: true,
      notInsertable: true,
      notUpdatable: true,
      autoIncrement: true,
    }) satisfies Params),
  };
}

/**
 * Used as an update key to avoid concurrency issues
 *
 * Implementation can be an integer which is incremented on each update
 */
export function rowversion(): ColumnType<
  "int64",
  {
    rowversion: true;
    notInsertable: true;
    notUpdatable: true;
    updateKey: true;
    default: 1;
  }
> {
  return {
    type: "int64",
    rowversion: true,
    notInsertable: true,
    notUpdatable: true,
    updateKey: true,
    default: 1,
  };
}

/**
 * Concurrency stamp, used like rowversion but is randomized UUID
 *
 * Typically used in .NET applications
 *
 * @returns
 */
export function concurrencyStamp(): ColumnType<
  "uuid",
  {
    default: "generate";
    onUpdateSet: true;
    notInsertable: true;
    notUpdatable: true;
    updateKey: true;
  }
> {
  return {
    type: "uuid",
    default: "generate",
    onUpdateSet: true,
    notInsertable: true,
    notUpdatable: true,
    updateKey: true,
  };
}

export type UserStringCol<T extends UnknownSchema> = Params<{
  schema: T;
  maxLength: number;
}>;

/**
 * User input string, typically used for names, addresses, etc.
 *
 * This is automatically trimmed and validated for length
 *
 * @param params
 */
export function userstring<S extends UnknownSchema, T extends UserStringCol<S>>(
  params: R<T, UserStringCol<S>>,
): ColumnType<"varchar", T> {
  return {
    type: "varchar",
    ...params,
  };
}

export function email(): ColumnType<
  "varchar",
  { schema: StandardSchemaV1<string, string> }
>;
export function email<T extends Params>(
  params: R<T, Params>,
): ColumnType<"varchar", T & { maxLength: 320 }>;
export function email(params?: unknown): unknown {
  return {
    type: "varchar",
    ...(params ?? {}),
    maxLength: 320,
    email: true,
  };
}

export function updatedAt(): ColumnType<
  "datetime",
  {
    notInsertable: true;
    notUpdatable: true;
    onUpdateSet: true;
    default: "now";
  }
> {
  return {
    type: "datetime",
    ...({
      notInsertable: true,
      notUpdatable: true,
      onUpdateSet: true,
      default: "now",
    } satisfies DateTimeCol),
  };
}

export function createdAt(): ColumnType<
  "datetime",
  {
    notInsertable: true;
    notUpdatable: true;
    default: "now";
  }
> {
  return {
    type: "datetime",
    ...({
      notInsertable: true,
      notUpdatable: true,
      default: "now",
    } satisfies DateTimeCol),
  };
}

type StringLiteral<T> = T extends string
  ? string extends T
    ? never
    : T
  : never;

// type AllColumnTypes = "bigint" | "boolean" ...
export type AllColumnTypes = {
  [K in keyof typeof c]: ReturnType<(typeof c)[K]> extends { type: infer T }
    ? StringLiteral<T>
    : never;
}[keyof typeof c];

// Map column types to a new value via a function
export type MapColumnsTo<T> = {
  [K in keyof typeof c as ReturnType<(typeof c)[K]> extends {
    type: infer U extends string;
  }
    ? string extends U
      ? never
      : U
    : never]: (
    ...params: Parameters<(typeof c)[K]> extends [infer P] ? [P] : [c.Params]
  ) => T;
};

// Map column types to a new value via a function
export type MapColumnsToValue<T> = {
  [K in keyof typeof c as ReturnType<(typeof c)[K]> extends {
    type: infer U extends string;
  }
    ? string extends U
      ? never
      : U
    : never]: T;
};

// export type RecordOfColumnTypes = {
//   [k in AllColumnTypes]: ReturnType<MapColumnsTo<unknown>[k]>;
// };
