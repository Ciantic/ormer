<!-- This README.md is generated from packages/ormer-docs/docs.ts. Please edit that file instead of this one. -->

# Ormer

This is Work In Progress!

Made of two packages `packages/ormer` and `packages/ormer-zod`. There is also old `packages/ormer-experiments` which is not used for other than ideas.

## Ormer package

This is pure dependency free package that allows to define database schemas.

Supported are SQLite, Postgres (pg, pglite) and DuckDB.
## Ormer-Zod package

The table below is generated from the test cases in `packages/ormer-zod/src/zod-examples.ts`.

I have patched the Zod namespace to add first `dbPk()` and `dbFk()`, etc modifiers, and make `ZodNumberFormat` and `ZodBigIntFormat` retain the format at type-level, see this [feature request](https://github.com/colinhacks/zod/issues/6045).

To use these extension one must import the `zod-ext.ts` file. (To be determined how this work in practice)
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
<td><code>z.string()</code></td>
<td><code>TEXT</code></td>
<td><code></code></td>
<td><code></code></td>
</tr>
<tr>
<td><code>z.string().max(255)</code></td>
<td><code>VARCHAR(255)</code></td>
<td><code></code></td>
<td><code></code></td>
</tr>
<tr>
<td><code>z.number()</code></td>
<td><code>FLOAT8</code></td>
<td><code></code></td>
<td><code></code></td>
</tr>
<tr>
<td><code>z.number().int()</code></td>
<td><code>FLOAT8</code></td>
<td><code></code></td>
<td><code></code></td>
</tr>
<tr>
<td><code>z.float32()</code></td>
<td><code>FLOAT4</code></td>
<td><code></code></td>
<td><code></code></td>
</tr>
<tr>
<td><code>z.float64()</code></td>
<td><code>FLOAT8</code></td>
<td><code></code></td>
<td><code></code></td>
</tr>
<tr>
<td><code>z.int()</code></td>
<td><code>INT4</code></td>
<td><code></code></td>
<td><code></code></td>
</tr>
<tr>
<td><code>z.int().dbPk()</code></td>
<td><code>SERIAL4 PRIMARY KEY</code></td>
<td><code></code></td>
<td><code></code></td>
</tr>
<tr>
<td><code>z.int32()</code></td>
<td><code>INT4</code></td>
<td><code></code></td>
<td><code></code></td>
</tr>
<tr>
<td><code>z.uint32()</code></td>
<td><em>Not Available</em></td>
<td><code></code></td>
<td><code></code></td>
</tr>
<tr>
<td><code>z.bigint()</code></td>
<td><code>INT8</code></td>
<td><code></code></td>
<td><code></code></td>
</tr>
<tr>
<td><code>z.int64()</code></td>
<td><code>INT8</code></td>
<td><code></code></td>
<td><code></code></td>
</tr>
<tr>
<td><code>z.int64().dbPk()</code></td>
<td><code>SERIAL8 PRIMARY KEY</code></td>
<td><code></code></td>
<td><code></code></td>
</tr>
<tr>
<td><code>z.uint64()</code></td>
<td><em>Not Available</em></td>
<td><code></code></td>
<td><code></code></td>
</tr>
<tr>
<td><code>z.boolean()</code></td>
<td><code>BOOLEAN</code></td>
<td><code></code></td>
<td><code></code></td>
</tr>
<tr>
<td><code>z.date()</code></td>
<td><code>TIMESTAMPTZ</code></td>
<td><code></code></td>
<td><code></code></td>
</tr>
<tr>
<td><code>z.uuid()</code></td>
<td><code>UUID</code></td>
<td><code></code></td>
<td><code></code></td>
</tr>
<tr>
<td><code>z.guid()</code></td>
<td><code>UUID</code></td>
<td><code></code></td>
<td><code></code></td>
</tr>
<tr>
<td><code>z.url()</code></td>
<td><code>TEXT</code></td>
<td><code></code></td>
<td><code></code></td>
</tr>
<tr>
<td><code>z.email()</code></td>
<td><code>TEXT</code></td>
<td><code></code></td>
<td><code></code></td>
</tr>
<tr>
<td><code>z.emoji()</code></td>
<td><code>TEXT</code></td>
<td><code></code></td>
<td><code></code></td>
</tr>
<tr>
<td><code>z.nanoid()</code></td>
<td><code>VARCHAR(21)</code></td>
<td><code></code></td>
<td><code></code></td>
</tr>
<tr>
<td><code>z.cuid2()</code></td>
<td><code>TEXT</code></td>
<td><code></code></td>
<td><code></code></td>
</tr>
<tr>
<td><code>z.ulid()</code></td>
<td><code>VARCHAR(26)</code></td>
<td><code></code></td>
<td><code></code></td>
</tr>
<tr>
<td><code>z.xid()</code></td>
<td><code>VARCHAR(20)</code></td>
<td><code></code></td>
<td><code></code></td>
</tr>
<tr>
<td><code>z.ksuid()</code></td>
<td><code>VARCHAR(27)</code></td>
<td><code></code></td>
<td><code></code></td>
</tr>
<tr>
<td><code>z.base64()</code></td>
<td><code>TEXT</code></td>
<td><code></code></td>
<td><code></code></td>
</tr>
<tr>
<td><code>z.base64url()</code></td>
<td><code>TEXT</code></td>
<td><code></code></td>
<td><code></code></td>
</tr>
<tr>
<td><code>z.e164()</code></td>
<td><code>TEXT</code></td>
<td><code></code></td>
<td><code></code></td>
</tr>
<tr>
<td><code>z.jwt()</code></td>
<td><code>TEXT</code></td>
<td><code></code></td>
<td><code></code></td>
</tr>
<tr>
<td><code>z.ipv4()</code></td>
<td><code>INET</code></td>
<td><code></code></td>
<td><code></code></td>
</tr>
<tr>
<td><code>z.ipv6()</code></td>
<td><code>INET</code></td>
<td><code></code></td>
<td><code></code></td>
</tr>
<tr>
<td><code>z.mac()</code></td>
<td><code>MACADDR</code></td>
<td><code></code></td>
<td><code></code></td>
</tr>
<tr>
<td><code>z.cidrv4()</code></td>
<td><code>CIDR</code></td>
<td><code></code></td>
<td><code></code></td>
</tr>
<tr>
<td><code>z.cidrv6()</code></td>
<td><code>CIDR</code></td>
<td><code></code></td>
<td><code></code></td>
</tr>
<tr>
<td><code>z.string().nullable()</code></td>
<td><code>TEXT NULL</code></td>
<td><code></code></td>
<td><code></code></td>
</tr>
<tr>
<td><code>z.string().optional()</code></td>
<td><code>TEXT NULL</code></td>
<td><code></code></td>
<td><code></code></td>
</tr>
<tr>
<td><code>z.string().default("hello")</code></td>
<td><code>TEXT</code></td>
<td><code></code></td>
<td><code></code></td>
</tr>
<tr>
<td><code>z.string().prefault("hello")</code></td>
<td><code>TEXT</code></td>
<td><code></code></td>
<td><code></code></td>
</tr>
<tr>
<td><code>z.string().dbPk()</code></td>
<td><code>TEXT PRIMARY KEY</code></td>
<td><code></code></td>
<td><code></code></td>
</tr>
<tr>
<td><code>z.int64().dbFk(UserSchema, "id")</code></td>
<td><code>INT8 FOREIGN KEY REFERENCES users(id)</code></td>
<td><code></code></td>
<td><code></code></td>
</tr>
<tr>
<td><code>z.int().array()</code></td>
<td><code>INT4[]</code></td>
<td><code></code></td>
<td><code></code></td>
</tr>
<tr>
<td><code>z.string().array()</code></td>
<td><code>TEXT[]</code></td>
<td><code></code></td>
<td><code></code></td>
</tr>
<tr>
<td><code>z.int().array().array()</code></td>
<td><code>INT4[][]</code></td>
<td><code></code></td>
<td><code></code></td>
</tr>
<tr>
<td><code>z.string().array().nullable()</code></td>
<td><code>TEXT[] NULL</code></td>
<td><code></code></td>
<td><code></code></td>
</tr>
  </tbody>
</table>