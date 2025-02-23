// deno-lint-ignore-file no-explicit-any
import * as k from "npm:kysely";
import * as o from "./columns.ts";
import { createDbFactory } from "./database.ts";
import { table } from "./table.ts";
import { assert } from "jsr:@std/assert";
import { TYPES_TO_SCHEMAS } from "./schemas.ts";

Deno.test("createDbFactory", () => {
    const PERSON_TABLE = table("person", {
        id: o.pkAutoInc(),
        publicId: o.uuid({ unique: true, notUpdatable: true }),
        name: o.userstring({ maxLength: 300, default: "Alice" as const }),
    });
    const dbFactory = createDbFactory(PERSON_TABLE);

    const foo = dbFactory.createKyselyDb({
        kysely: {
            dialect: {
                createDriver: () => ({} as any),
                createQueryCompiler: () => ({} as any),
                createAdapter: () => ({} as any),
                createIntrospector: () => ({} as any),
            },
        },
        types: TYPES_TO_SCHEMAS,
    });

    assert(foo instanceof k.Kysely);
});
