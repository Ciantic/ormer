import * as z from "zod";
import * as h from "./columnhelpers.ts";
import * as c from "./columns.ts";
import { table } from "./table.ts";
import { database } from "./database.ts";
import { describe, it, expect, expectTypeOf } from "vitest";

describe("database", () => {
  it("it combines tables to an object", () => {
    const table1 = table("table1", {
      id: h.pkAutoInc(),
      foo: c.string(),
    });

    const table2 = table("table2", {
      id: h.pkAutoInc(),
      bar: c.string(),
    });

    const db = database({}, table1, table2);

    expectTypeOf(db).toEqualTypeOf<{
      table1: typeof table1;
      table2: typeof table2;
    }>();

    expect(db.table1).toBe(table1);
    expect(db.table2).toBe(table2);
  });
});
