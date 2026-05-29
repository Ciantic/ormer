import * as c from "./postgres/columns.ts";
import { table } from "./table.ts";
import { database } from "./database.ts";
import { describe, it, expect, expectTypeOf } from "vitest";

describe("database", () => {
  it("it combines tables to an object", () => {
    const table1 = table("table1", {
      id: c.int8({ autoIncrement: true }),
      foo: c.text(),
    });

    const table2 = table("table2", {
      id: c.int8({ autoIncrement: true }),
      bar: c.text(),
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
