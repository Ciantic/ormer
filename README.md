<!-- This README.md is generated from packages/ormer-docs/docs.ts. Please edit that file instead of this one. -->

# Ormer

This is Work In Progress!

Made of two packages `packages/ormer` and `packages/ormer-zod`. There is also old `packages/ormer-experiments` which is not used for other than ideas.

## Ormer package

This is pure dependency free package that allows to define database schemas.

Supported are SQLite, Postgres (pg, pglite) and DuckDB.

To make schemas useful with databases, the input and output types should match with the schema. For example Zod schema input should match with Postgres SELECT (output) value. Likewise Zod schema output value should be usable in Postgres UPDATE and INSERT (input) value:

Database SELECT -> Zod input -> Zod output -> Database INSERT or UPDATE.
## Ormer-Zod package

The table below is generated from the test cases in `packages/ormer-zod/examples/fields.ts`.

I have patched the Zod namespace to add first `dbPk()` and `dbFk()`, etc modifiers, and make `ZodNumberFormat` and `ZodBigIntFormat` retain the format at type-level, see this [feature request](https://github.com/colinhacks/zod/issues/6045).

To use these extension one must import the `zod-ext.ts` file. (To be determined how this work in practice)

Notes:

- Optional Zod schemas, e.g. `z.string().optional()`, are not supported for now. Suppose I mapped it to be nullable column, then INSERT and UPDATE would work correctly, because PG/PGLite and DuckDB converts the undefined to null on INSERT and UPDATE. Problem is when you SELECT a field with null values. They are not then assignable to Zod schema, because null doesn't validate against optional schema.
- `z.uint64()` and `z.uint32()` have no good mapping in the Postgres.
- `z.bigint()` is mapped to be INT8 in postgres, this might be incorrect for arbitrary sized bigints. If you need that use custom mapping.
- `z.int()` is mapped to be INT4 in postgres, and thus not all of the IEEE 754 safe integers are valid values.
- `z.iso.datetime()` can't be used, it does not allow timestamp format without a T divider. Postgres returns TIMESTAMP values as YYYY-MM-DD HH:MM:SS without the T.
- SQLite support is too buggy, because it only has primitive datatypes, and it would need a custom serialization layer for bigint/boolean/date/array/object types, which I haven't found a good way to do yet. One idea involves using column names as a hint for custom serialization. This half-baked idea is in ormer-experiments as Kysely transformer.
<table>
  <thead>
    <tr>
      <th>Zod Schema</th>
      <th>Postgres</th>
      <th>DuckDB</th>
      <th>SQLite</th>
    </tr>
  </thead>
  <tbody>
    <tr>
<td colspan="4"><strong>String values</strong></td>
</tr>
<tr>
<td><code>z.string()</code></td>
<td><code>TEXT</code></td>
<td><code>TEXT</code></td>
<td><code></code></td>
</tr>
<tr>
<td><code>z.string().max(255)</code></td>
<td><code>VARCHAR(255)</code></td>
<td><code>VARCHAR(255)</code></td>
<td><code></code></td>
</tr>
<tr>
<td colspan="4"><strong>Number types</strong></td>
</tr>
<tr>
<td><code>z.number()</code></td>
<td><code>FLOAT8</code></td>
<td><code>FLOAT8</code></td>
<td><code></code></td>
</tr>
<tr>
<td><code>z.number().int()</code></td>
<td><code>FLOAT8</code></td>
<td><code>FLOAT8</code></td>
<td><code></code></td>
</tr>
<tr>
<td><code>z.float32()</code></td>
<td><code>FLOAT4</code></td>
<td><code>FLOAT4</code></td>
<td><code></code></td>
</tr>
<tr>
<td><code>z.float64()</code></td>
<td><code>FLOAT8</code></td>
<td><code>FLOAT8</code></td>
<td><code></code></td>
</tr>
<tr>
<td><code>z.int()</code></td>
<td><code>INT4</code></td>
<td><code>INT4</code></td>
<td><code></code></td>
</tr>
<tr>
<td><code>z.int().dbPk()</code></td>
<td><code>SERIAL4 PRIMARY KEY</code></td>
<td><code>INT4 PRIMARY KEY</code></td>
<td><code></code></td>
</tr>
<tr>
<td><code>z.int32()</code></td>
<td><code>INT4</code></td>
<td><code>INT4</code></td>
<td><code></code></td>
</tr>
<tr>
<td><code>z.uint32()</code></td>
<td><em>Not Available</em></td>
<td><code>UINTEGER</code></td>
<td><code></code></td>
</tr>
<tr>
<td colspan="4"><strong>Bigint</strong></td>
</tr>
<tr>
<td><code>z.bigint()</code></td>
<td><code>INT8</code></td>
<td><code>INT8</code></td>
<td><code></code></td>
</tr>
<tr>
<td><code>z.int64()</code></td>
<td><code>INT8</code></td>
<td><code>INT8</code></td>
<td><code></code></td>
</tr>
<tr>
<td><code>z.int64().dbPk()</code></td>
<td><code>SERIAL8 PRIMARY KEY</code></td>
<td><code>INT8 PRIMARY KEY</code></td>
<td><code></code></td>
</tr>
<tr>
<td><code>z.uint64()</code></td>
<td><em>Not Available</em></td>
<td><code>UBIGINT</code></td>
<td><code></code></td>
</tr>
<tr>
<td colspan="4"><strong>Boolean</strong></td>
</tr>
<tr>
<td><code>z.boolean()</code></td>
<td><code>BOOLEAN</code></td>
<td><code>BOOLEAN</code></td>
<td><code></code></td>
</tr>
<tr>
<td colspan="4"><strong>JSON</strong></td>
</tr>
<tr>
<td><code>z.object({ v: z.string() })</code></td>
<td><code>JSONB</code></td>
<td><code>JSON</code></td>
<td><code></code></td>
</tr>
<tr>
<td><code>z.json()</code></td>
<td><code>JSONB</code></td>
<td><code>JSON</code></td>
<td><code></code></td>
</tr>
<tr>
<td colspan="4"><strong>Date/time types</strong></td>
</tr>
<tr>
<td><code>z.date()</code></td>
<td><code>TIMESTAMPTZ</code></td>
<td><code>TIMESTAMPTZ</code></td>
<td><code></code></td>
</tr>
<tr>
<td><code>z.iso.time()</code></td>
<td><code>TIME</code></td>
<td><code>TIME</code></td>
<td><code></code></td>
</tr>
<tr>
<td><code>z.iso.date()</code></td>
<td><code>DATE</code></td>
<td><code>DATE</code></td>
<td><code></code></td>
</tr>
<tr>
<td><code>z.iso.datetime()</code></td>
<td><em>Not Available</em></td>
<td><em>Not Available</em></td>
<td><code></code></td>
</tr>
<tr>
<td><code>z.string().naiveDatetime()</code></td>
<td><code>TIMESTAMP</code></td>
<td><code>TIMESTAMP</code></td>
<td><code></code></td>
</tr>
<tr>
<td colspan="4"><strong>GUID / UUID</strong></td>
</tr>
<tr>
<td><code>z.uuid()</code></td>
<td><code>UUID</code></td>
<td><code>UUID</code></td>
<td><code></code></td>
</tr>
<tr>
<td><code>z.guid()</code></td>
<td><code>UUID</code></td>
<td><code>UUID</code></td>
<td><code></code></td>
</tr>
<tr>
<td colspan="4"><strong>Various string formats</strong></td>
</tr>
<tr>
<td><code>z.url()</code></td>
<td><code>TEXT</code></td>
<td><code>TEXT</code></td>
<td><code></code></td>
</tr>
<tr>
<td><code>z.email()</code></td>
<td><code>TEXT</code></td>
<td><code>TEXT</code></td>
<td><code></code></td>
</tr>
<tr>
<td><code>z.emoji()</code></td>
<td><code>TEXT</code></td>
<td><code>TEXT</code></td>
<td><code></code></td>
</tr>
<tr>
<td><code>z.nanoid()</code></td>
<td><code>VARCHAR(21)</code></td>
<td><code>VARCHAR(21)</code></td>
<td><code></code></td>
</tr>
<tr>
<td><code>z.cuid2()</code></td>
<td><code>TEXT</code></td>
<td><code>TEXT</code></td>
<td><code></code></td>
</tr>
<tr>
<td><code>z.ulid()</code></td>
<td><code>VARCHAR(26)</code></td>
<td><code>VARCHAR(26)</code></td>
<td><code></code></td>
</tr>
<tr>
<td><code>z.xid()</code></td>
<td><code>VARCHAR(20)</code></td>
<td><code>VARCHAR(20)</code></td>
<td><code></code></td>
</tr>
<tr>
<td><code>z.ksuid()</code></td>
<td><code>VARCHAR(27)</code></td>
<td><code>VARCHAR(27)</code></td>
<td><code></code></td>
</tr>
<tr>
<td><code>z.base64()</code></td>
<td><code>TEXT</code></td>
<td><code>TEXT</code></td>
<td><code></code></td>
</tr>
<tr>
<td><code>z.base64url()</code></td>
<td><code>TEXT</code></td>
<td><code>TEXT</code></td>
<td><code></code></td>
</tr>
<tr>
<td><code>z.e164()</code></td>
<td><code>TEXT</code></td>
<td><code>TEXT</code></td>
<td><code></code></td>
</tr>
<tr>
<td><code>z.jwt()</code></td>
<td><code>TEXT</code></td>
<td><code>TEXT</code></td>
<td><code></code></td>
</tr>
<tr>
<td colspan="4"><strong>Network types</strong></td>
</tr>
<tr>
<td><code>z.ipv4()</code></td>
<td><code>INET</code></td>
<td><code>TEXT</code></td>
<td><code></code></td>
</tr>
<tr>
<td><code>z.ipv6()</code></td>
<td><code>INET</code></td>
<td><code>TEXT</code></td>
<td><code></code></td>
</tr>
<tr>
<td><code>z.mac()</code></td>
<td><code>MACADDR</code></td>
<td><code>TEXT</code></td>
<td><code></code></td>
</tr>
<tr>
<td><code>z.cidrv4()</code></td>
<td><code>CIDR</code></td>
<td><code>TEXT</code></td>
<td><code></code></td>
</tr>
<tr>
<td><code>z.cidrv6()</code></td>
<td><code>CIDR</code></td>
<td><code>TEXT</code></td>
<td><code></code></td>
</tr>
<tr>
<td colspan="4"><strong>Array types</strong></td>
</tr>
<tr>
<td><code>z.int().array()</code></td>
<td><code>INT4[]</code></td>
<td><code>INT4[]</code></td>
<td><code></code></td>
</tr>
<tr>
<td><code>z.string().array()</code></td>
<td><code>TEXT[]</code></td>
<td><code>TEXT[]</code></td>
<td><code></code></td>
</tr>
<tr>
<td><code>z.int().array().array()</code></td>
<td><code>INT4[][]</code></td>
<td><code>INT4[][]</code></td>
<td><code></code></td>
</tr>
<tr>
<td><code>z.string().array().nullable()</code></td>
<td><code>TEXT[] NULL</code></td>
<td><code>TEXT[] NULL</code></td>
<td><code></code></td>
</tr>
<tr>
<td colspan="4"><strong>Container types</strong></td>
</tr>
<tr>
<td><code>z.string().nullable()</code></td>
<td><code>TEXT NULL</code></td>
<td><code>TEXT NULL</code></td>
<td><code></code></td>
</tr>
<tr>
<td><code>z.string().nullish()</code></td>
<td><code>TEXT NULL</code></td>
<td><code>TEXT NULL</code></td>
<td><code></code></td>
</tr>
<tr>
<td><code>z.string().default("hello")</code></td>
<td><code>TEXT DEFAULT hello</code></td>
<td><code>TEXT DEFAULT hello</code></td>
<td><code></code></td>
</tr>
<tr>
<td><code>z.string().prefault("hello")</code></td>
<td><code>TEXT DEFAULT hello</code></td>
<td><code>TEXT DEFAULT hello</code></td>
<td><code></code></td>
</tr>
<tr>
<td><code>z.string().dbPk()</code></td>
<td><code>TEXT PRIMARY KEY</code></td>
<td><code>TEXT PRIMARY KEY</code></td>
<td><code></code></td>
</tr>
<tr>
<td><code>z.int64().dbFk(UserSchema, "id")</code></td>
<td><code>INT8 FOREIGN KEY REFERENCES users(id)</code></td>
<td><code>INT8 FOREIGN KEY REFERENCES users(id)</code></td>
<td><code></code></td>
</tr>
  </tbody>
</table>