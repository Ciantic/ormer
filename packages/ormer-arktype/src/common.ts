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
