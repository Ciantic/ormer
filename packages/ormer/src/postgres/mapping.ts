// Copied from https://github.com/Ciantic/pg-unified-mapping/

/**
 * Type that represents the input and output types for a given PostgreSQL type mapping.
 *
 * Input = Type used for INSERT and UPDATE operations
 * Output = Type used for SELECT operations results
 */
export type InputOutput<I, O = I> = {
  readonly __insert__: I;
  readonly __update__: I;
  readonly __select__: O;
};
export type PgUnifiedTypeMapping = {
  // Numeric types
  int2: InputOutput<string | number | bigint, number>;
  int4: InputOutput<string | number | bigint, number>;
  int8: InputOutput<string | number | bigint, bigint>;
  serial2: InputOutput<string | number | bigint, number>;
  serial4: InputOutput<string | number | bigint, number>;
  serial8: InputOutput<string | number | bigint, bigint>;
  float4: InputOutput<string | number | bigint, number>;
  float8: InputOutput<string | number | bigint, number>;
  decimal: InputOutput<string | number | bigint, string>;
  money: InputOutput<string, string>;

  // Character types
  text: InputOutput<string>;
  varchar: InputOutput<string>;
  char: InputOutput<string>;

  // Binary types
  bytea: InputOutput<Uint8Array>;

  // Date/Time types
  timestamp: InputOutput<string>;
  timestamptz: InputOutput<Date>;
  date: InputOutput<string>;
  time: InputOutput<string>;
  timetz: InputOutput<string>;
  interval: InputOutput<string>;

  // Boolean type
  boolean: InputOutput<boolean>;

  // UUID type
  uuid: InputOutput<string>;

  // JSON types
  jsonb: InputOutput<Record<string, any>>;
  json: InputOutput<Record<string, any>>;

  // Network address types
  inet: InputOutput<string>;
  cidr: InputOutput<string>;
  macaddr: InputOutput<string>;
  macaddr8: InputOutput<string>;

  // Bit string types
  bit: InputOutput<string>;
  varbit: InputOutput<string>;

  // Text search types
  tsvector: InputOutput<string>;
  tsquery: InputOutput<string>;

  // XML type
  xml: InputOutput<string>;

  // Geometric types
  point: InputOutput<string>;
  line: InputOutput<string>;
  lseg: InputOutput<string>;
  box: InputOutput<string>;
  path: InputOutput<string>;
  polygon: InputOutput<string>;
  circle: InputOutput<string>;

  // Object identifier / system types
  xmin: InputOutput<number>;
  pg_lsn: InputOutput<string>;
  pg_snapshot: InputOutput<string>;
};

/**
 * Takes in a `pg` module, returns options for PG client
 *
 * Example:
 * ```
 * import pg from "pg";
 *
 * const client = await new pg.Client({ host: "localhost", types: createPgMapperTypes(pg), });
 */
export function createPgMapperTypes(pg: {
  types: {
    getTypeParser: (
      oid: number,
      format?: "binary" | "text",
    ) => (val: string) => any;
    arrayParser:
      | any
      | {
          create: (
            source: any,
            transform?: any,
          ) => {
            parse: () => any[];
          };
        };
  };
}) {
  const stringParser = (val: string) => val;
  const arrayStringParser = (val: string) =>
    pg.types.arrayParser.create(val).parse();

  return {
    getTypeParser: (oid: number, format?: "binary" | "text") => {
      // https://github.com/postgres/postgres/blob/master/src/include/catalog/pg_type.dat

      // int8/serial8: return bigint instead of number | bigint
      if (oid === 20) return (val: string) => BigInt(val);
      // int8[]: parse as bigint array
      if (oid === 1016)
        return (val: string) =>
          pg.types.arrayParser
            .create(val)
            .parse()
            .map((v: string) => BigInt(v));

      // bytea: return Uint8Array instead of Buffer
      if (oid === 17) {
        const byteaParser = pg.types.getTypeParser(oid, format);
        return (val: string) => new Uint8Array(byteaParser(val));
      }
      // bytea: array
      if (oid === 1001) {
        const byteaArrayParser = pg.types.getTypeParser(oid, format);
        return (val: string) =>
          byteaArrayParser(val).map((v: any) => new Uint8Array(v));
      }

      // line: return as string
      if (oid === 628) return stringParser;
      // line[]: parse as string array
      if (oid === 629) return arrayStringParser;

      // point: return string instead of {x, y}
      if (oid === 600) return stringParser;
      // point[]: parse as string array
      if (oid === 1017) return arrayStringParser;

      // circle: return string instead of {x, y, radius}
      if (oid === 718) return stringParser;
      // circle[]: parse as string array
      if (oid === 719) return arrayStringParser;

      // date: return string instead of Date
      if (oid === 1082) return stringParser;
      // date[]: parse as string array
      if (oid === 1182) return arrayStringParser;

      // timestamp: return string instead of Date
      if (oid === 1114) return stringParser;
      // timestamp[]: parse as string array
      if (oid === 1115) return arrayStringParser;

      // interval: return string instead of {years, months, days}
      if (oid === 1186) return stringParser;
      // interval[]: parse as string array
      if (oid === 1187) return arrayStringParser;

      // numeric/decimal: return string
      if (oid === 1700) return stringParser;
      // numeric[]: parse as string array
      if (oid === 1231) return arrayStringParser;

      // lseg: return string instead of {x1, y1, x2, y2}
      if (oid === 601) return stringParser;
      // lseg[]: parse as string array
      if (oid === 1018) return arrayStringParser;

      // path: return string
      if (oid === 602) return stringParser;
      // path[]: parse as string array
      if (oid === 1019) return arrayStringParser;

      // macaddr8: return string
      if (oid === 774) return stringParser;
      // macaddr8[]: parse as string array
      if (oid === 775) return arrayStringParser;

      // tsvector: return string
      if (oid === 3614) return stringParser;
      // tsvector[]: parse as string array
      if (oid === 3643) return arrayStringParser;

      // tsquery: return string
      if (oid === 3615) return stringParser;
      // tsquery[]: parse as string array
      if (oid === 3645) return arrayStringParser;

      // polygon
      if (oid === 604) return stringParser;
      // polygon[]: parse as string array
      if (oid === 1027) return arrayStringParser;

      // pg_lsn[]: parse as string array
      if (oid === 3221) return arrayStringParser;

      // pg_snapshot[]: parse as string array
      if (oid === 5039) return arrayStringParser;

      // bit[]: parse as string array
      if (oid === 1561) return arrayStringParser;

      // varbit[]: parse as string array
      if (oid === 1563) return arrayStringParser;

      // xml2[]: parse as string array
      if (oid === 143) return arrayStringParser;

      // For other types, use default parsers
      return pg.types.getTypeParser(oid, format);
    },
  };
}

/**
 * PGLite mapping
 *
 * Example:
 *
 * ```
 * import { PGlite } from "@electric-sql/pglite";
 *
 * new PGlite({
 *   parsers: createPgliteParsers(),
 * })
 * ```
 */
export function createPgliteParsers() {
  return {
    // int8/serial8: return bigint instead of string
    20: (val: string) => BigInt(val),
    // timestamp: return string instead of Date
    1114: (val: string) => val,
    // date: return string instead of Date
    1082: (val: string) => val,
  };
}
