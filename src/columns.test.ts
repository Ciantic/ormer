import * as o from "./columns.ts";
import * as h from "./columnhelpers.ts";
import { describe, it, expect } from "vitest";

type Expect<T extends true> = T;
type Equal<X, Y> =
  (<T>() => T extends X ? 1 : 2) extends <T>() => T extends Y ? 1 : 2
    ? true
    : false;

describe("columns", () => {
  it("integer signature", () => {
    const TEST_INTEGER1 = o.int32({ primaryKey: true });
    const TEST_INTEGER2 = o.int32();

    type Test3 = Expect<
      Equal<typeof TEST_INTEGER1, o.ColumnType<"int32", { primaryKey: true }>>
    >;
    type Test4 = Expect<
      Equal<typeof TEST_INTEGER2, o.ColumnTypeSingualr<"int32">>
    >;
    true satisfies Test3;
    true satisfies Test4;

    expect(TEST_INTEGER1).toEqual({
      type: "int32",
      primaryKey: true,
    });
    expect(TEST_INTEGER2).toEqual({ type: "int32" });

    // Always test these manually when changing the code!
    //
    // This must give error, because foo is not there!
    // const mustErrorBecauseFoo = o.int32({ primaryKey: true, foo: 5 });

    // This must have autocompletion!
    // const fofofo = o.int32({
    //     /* CURSOR HERE */
    // });
  });

  it("pkAutoInc signature", () => {
    const TEST_INTEGER1 = h.pkAutoInc();
    const TEST_INTEGER2 = h.pkAutoInc({
      primaryKey: false,
    });

    type Test3 = Expect<
      Equal<
        typeof TEST_INTEGER1,
        o.ColumnType<
          "int64",
          {
            primaryKey: true;
            notInsertable: true;
            notUpdatable: true;
            autoIncrement: true;
          }
        >
      >
    >;
    true satisfies Test3;

    type Test4 = Expect<
      Equal<
        typeof TEST_INTEGER2,
        o.ColumnType<
          "int64",
          {
            primaryKey: false;
          }
        >
      >
    >;
    true satisfies Test4;

    expect(TEST_INTEGER1).toEqual({
      type: "int64",
    primaryKey: true,
    notInsertable: true,
    notUpdatable: true,
    autoIncrement: true,
    });
    expect(TEST_INTEGER2).toEqual({
      type: "int64",
      primaryKey: false,
    });
  });
});
