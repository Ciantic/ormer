# Ormer

Made of two packages `packages/ormer` and `packages/ormer-zod`. There is also old `packages/ormer-experiments` which is not used for other than ideas.

## Goal if this ever will be finished

User can define their database schemas in Zod/Valibot etc, and then infer the schema. This can be seen as model schema first approach.

It is also possible to drop down to use `ormer` package directly to define the schema. This is like defining database schema separately.

For instance with Zod:

Use `packages/ormer-zod`, and define the schema as ZodObjects, then derive the pgtable with `ormer-zod/derivePgTable`. Example for Zod-first schema in `packages/ormer-zod/examples/invoice.ts`.
