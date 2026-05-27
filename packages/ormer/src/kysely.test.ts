import { table } from "./table.ts";
import { database } from "./database.ts";
import * as pg from "./postgres/columns.ts";
import type { PgUnifiedTypeMapping } from "./postgres/mapping.ts";
import type { InferKyselyTypes } from "./kysely.ts";
import type { ColumnType } from "kysely";
import { describe, it, expectTypeOf } from "vitest";

const allTypesTable = table("all_types", {
  // integer types
  id: pg.serial8({ primaryKey: true, notInsertable: true, notUpdatable: true }),
  int2_col: pg.int2(),
  int2_nullable: pg.int2({ nullable: true }),
  int4_col: pg.int4(),
  int8_col: pg.int8(),
  serial2_col: pg.serial2(),
  serial4_col: pg.serial4(),
  serial8_col: pg.serial8(),
  // float types
  float4_col: pg.float4(),
  float8_col: pg.float8(),
  decimal_col: pg.decimal({ precision: 10, scale: 2 }),
  money_col: pg.money(),
  // string types
  text_col: pg.text(),
  varchar_col: pg.varchar({ maxLength: 255 }),
  char_col: pg.char({ length: 10 }),
  // binary
  bytea_col: pg.bytea(),
  // boolean
  bool_col: pg.boolean(),
  // uuid
  uuid_col: pg.uuid(),
  uuid_with_default: pg.uuid({ default: "generate" }),
  // date/time types
  timestamp_col: pg.timestamp(),
  timestamp_now: pg.timestamp({ default: "now" }),
  timestamptz_col: pg.timestamptz(),
  timestamptz_now: pg.timestamptz({ default: "now" }),
  date_col: pg.date(),
  time_col: pg.time(),
  timetz_col: pg.timetz(),
  interval_col: pg.interval(),
  // json types
  jsonb_col: pg.jsonb({ schema: null as any }),
  json_col: pg.json({ schema: null as any }),
  // network types
  inet_col: pg.inet(),
  cidr_col: pg.cidr(),
  macaddr_col: pg.macaddr(),
  macaddr8_col: pg.macaddr8(),
  // bit string types
  bit_col: pg.bit({ length: 8 }),
  varbit_col: pg.varbit({ maxLength: 255 }),
  // text search types
  tsvector_col: pg.tsvector(),
  tsquery_col: pg.tsquery(),
  // xml
  xml_col: pg.xml(),
  // geometric types
  point_col: pg.point(),
  line_col: pg.line(),
  lseg_col: pg.lseg(),
  box_col: pg.box(),
  path_col: pg.path(),
  polygon_col: pg.polygon(),
  circle_col: pg.circle(),
  // system types
  xmin_col: pg.xmin(),
  pg_lsn_col: pg.pg_lsn(),
  pg_snapshot_col: pg.pg_snapshot(),
  // unique
  unique_col: pg.text({ unique: true }),
});

describe("kysely2", () => {
  it("infers kysely types from all_types table using PgUnifiedTypeMapping", () => {
    const db = database({}, allTypesTable);

    type KyselyTypes = InferKyselyTypes<typeof db, PgUnifiedTypeMapping>;

    expectTypeOf<KyselyTypes>().toEqualTypeOf<{
      all_types: {
        id: ColumnType<bigint, never, never>;
        int2_col: ColumnType<
          number,
          string | number | bigint,
          string | number | bigint
        >;
        int2_nullable: ColumnType<
          number | null,
          string | number | bigint | null | undefined,
          string | number | bigint | null
        >;
        int4_col: ColumnType<
          number,
          string | number | bigint,
          string | number | bigint
        >;
        int8_col: ColumnType<
          bigint,
          string | number | bigint,
          string | number | bigint
        >;
        serial2_col: ColumnType<
          number,
          string | number | bigint,
          string | number | bigint
        >;
        serial4_col: ColumnType<
          number,
          string | number | bigint,
          string | number | bigint
        >;
        serial8_col: ColumnType<
          bigint,
          string | number | bigint,
          string | number | bigint
        >;
        float4_col: ColumnType<
          number,
          string | number | bigint,
          string | number | bigint
        >;
        float8_col: ColumnType<
          number,
          string | number | bigint,
          string | number | bigint
        >;
        decimal_col: ColumnType<
          string,
          string | number | bigint,
          string | number | bigint
        >;
        money_col: ColumnType<string, string, string>;
        text_col: ColumnType<string, string, string>;
        varchar_col: ColumnType<string, string, string>;
        char_col: ColumnType<string, string, string>;
        bytea_col: ColumnType<Uint8Array, Uint8Array, Uint8Array>;
        bool_col: ColumnType<boolean, boolean, boolean>;
        uuid_col: ColumnType<string, string, string>;
        uuid_with_default: ColumnType<string, string | undefined, string>;
        timestamp_col: ColumnType<string, string, string>;
        timestamp_now: ColumnType<string, string | undefined, string>;
        timestamptz_col: ColumnType<Date, Date, Date>;
        timestamptz_now: ColumnType<Date, Date | undefined, Date>;
        date_col: ColumnType<string, string, string>;
        time_col: ColumnType<string, string, string>;
        timetz_col: ColumnType<string, string, string>;
        interval_col: ColumnType<string, string, string>;
        jsonb_col: ColumnType<
          Record<string, any>,
          Record<string, any>,
          Record<string, any>
        >;
        json_col: ColumnType<
          Record<string, any>,
          Record<string, any>,
          Record<string, any>
        >;
        inet_col: ColumnType<string, string, string>;
        cidr_col: ColumnType<string, string, string>;
        macaddr_col: ColumnType<string, string, string>;
        macaddr8_col: ColumnType<string, string, string>;
        bit_col: ColumnType<string, string, string>;
        varbit_col: ColumnType<string, string, string>;
        tsvector_col: ColumnType<string, string, string>;
        tsquery_col: ColumnType<string, string, string>;
        xml_col: ColumnType<string, string, string>;
        point_col: ColumnType<string, string, string>;
        line_col: ColumnType<string, string, string>;
        lseg_col: ColumnType<string, string, string>;
        box_col: ColumnType<string, string, string>;
        path_col: ColumnType<string, string, string>;
        polygon_col: ColumnType<string, string, string>;
        circle_col: ColumnType<string, string, string>;
        xmin_col: ColumnType<number, number, number>;
        pg_lsn_col: ColumnType<string, string, string>;
        pg_snapshot_col: ColumnType<string, string, string>;
        unique_col: ColumnType<string, string, string>;
      };
    }>();
  });
});
