<!-- This README.md is generated from packages/ormer-docs/docs.ts. Please edit that file instead of this one. -->

# Ormer

This is Work In Progress!

Made of these packages: `packages/ormer`, `packages/ormer-zod`, `packages/ormer-valibot`, `packages/ormer-arktype` and `packages/ormer-effect`. There is also old `packages/ormer-experiments` which is not used for other than ideas.

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
- SQLite only ha primitive datatypes, and it would need a custom serialization layer for bigint/boolean/date/array/object types, which I haven't found a good way to do yet. One idea involves using column names as a hint for custom serialization. This half-baked idea is in ormer-experiments as Kysely transformer.
<details>
<summary>Field type mapping table</summary>
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
<td><code>TEXT</code></td>
</tr>
<tr>
<td><code>z.string().max(255)</code></td>
<td><code>VARCHAR(255)</code></td>
<td><code>VARCHAR(255)</code></td>
<td><code>TEXT</code></td>
</tr>
<tr>
<td colspan="4"><strong>Number types</strong></td>
</tr>
<tr>
<td><code>z.number()</code></td>
<td><code>FLOAT8</code></td>
<td><code>FLOAT8</code></td>
<td><code>REAL</code></td>
</tr>
<tr>
<td><code>z.number().int()</code></td>
<td><code>INT4</code></td>
<td><code>INT4</code></td>
<td><code>INTEGER</code></td>
</tr>
<tr>
<td><code>z.float32()</code></td>
<td><code>FLOAT4</code></td>
<td><code>FLOAT4</code></td>
<td><code>REAL</code></td>
</tr>
<tr>
<td><code>z.float64()</code></td>
<td><code>FLOAT8</code></td>
<td><code>FLOAT8</code></td>
<td><code>REAL</code></td>
</tr>
<tr>
<td><code>z.int()</code></td>
<td><code>INT4</code></td>
<td><code>INT4</code></td>
<td><code>INTEGER</code></td>
</tr>
<tr>
<td><code>z.int().dbPk().dbAutoInc()</code></td>
<td><code>SERIAL4 PRIMARY KEY</code></td>
<td><code>INT4 PRIMARY KEY</code></td>
<td><code>INTEGER PRIMARY KEY AUTOINCREMENT</code></td>
</tr>
<tr>
<td><code>z.number().int32()</code></td>
<td><code>INT4</code></td>
<td><code>INT4</code></td>
<td><code>INTEGER</code></td>
</tr>
<tr>
<td><code>z.number().int8()</code></td>
<td><em>Not Available</em></td>
<td><code>INT1</code></td>
<td><code>INTEGER</code></td>
</tr>
<tr>
<td><code>z.number().uint8()</code></td>
<td><em>Not Available</em></td>
<td><code>UTINYINT</code></td>
<td><code>INTEGER</code></td>
</tr>
<tr>
<td><code>z.number().int16()</code></td>
<td><code>INT2</code></td>
<td><code>INT2</code></td>
<td><code>INTEGER</code></td>
</tr>
<tr>
<td><code>z.number().uint16()</code></td>
<td><em>Not Available</em></td>
<td><code>USMALLINT</code></td>
<td><code>INTEGER</code></td>
</tr>
<tr>
<td><code>z.number().uint32()</code></td>
<td><em>Not Available</em></td>
<td><code>UINTEGER</code></td>
<td><code>INTEGER</code></td>
</tr>
<tr>
<td colspan="4"><strong>Bigint</strong></td>
</tr>
<tr>
<td><code>z.bigint()</code></td>
<td><code>INT8</code></td>
<td><code>INT8</code></td>
<td><em>Not Available</em></td>
</tr>
<tr>
<td><code>z.bigint().int64()</code></td>
<td><code>INT8</code></td>
<td><code>INT8</code></td>
<td><em>Not Available</em></td>
</tr>
<tr>
<td><code>z.bigint().int64().dbPk().dbAutoInc()</code></td>
<td><code>SERIAL8 PRIMARY KEY</code></td>
<td><code>INT8 PRIMARY KEY</code></td>
<td><em>Not Available</em></td>
</tr>
<tr>
<td><code>z.bigint().uint64()</code></td>
<td><em>Not Available</em></td>
<td><code>UBIGINT</code></td>
<td><em>Not Available</em></td>
</tr>
<tr>
<td><code>z.bigint().uint128()</code></td>
<td><em>Not Available</em></td>
<td><code>UHUGEINT</code></td>
<td><em>Not Available</em></td>
</tr>
<tr>
<td><code>z.bigint().int128()</code></td>
<td><em>Not Available</em></td>
<td><code>HUGEINT</code></td>
<td><em>Not Available</em></td>
</tr>
<tr>
<td colspan="4"><strong>Boolean</strong></td>
</tr>
<tr>
<td><code>z.boolean()</code></td>
<td><code>BOOLEAN</code></td>
<td><code>BOOLEAN</code></td>
<td><em>Not Available</em></td>
</tr>
<tr>
<td colspan="4"><strong>JSON</strong></td>
</tr>
<tr>
<td><code>z.object({ v: z.string() })</code></td>
<td><code>JSONB</code></td>
<td><code>JSON</code></td>
<td><em>Not Available</em></td>
</tr>
<tr>
<td><code>z.json()</code></td>
<td><code>JSONB</code></td>
<td><code>JSON</code></td>
<td><em>Not Available</em></td>
</tr>
<tr>
<td colspan="4"><strong>Date/time types</strong></td>
</tr>
<tr>
<td><code>z.date()</code></td>
<td><code>TIMESTAMPTZ</code></td>
<td><code>TIMESTAMPTZ</code></td>
<td><em>Not Available</em></td>
</tr>
<tr>
<td><code>z.iso.time()</code></td>
<td><code>TIME</code></td>
<td><code>TIME</code></td>
<td><code>TEXT</code></td>
</tr>
<tr>
<td><code>z.iso.date()</code></td>
<td><code>DATE</code></td>
<td><code>DATE</code></td>
<td><code>TEXT</code></td>
</tr>
<tr>
<td><code>z.iso.datetime()</code></td>
<td><em>Not Available</em></td>
<td><em>Not Available</em></td>
<td><code>TEXT</code></td>
</tr>
<tr>
<td><code>z.string().naiveDatetime()</code></td>
<td><code>TIMESTAMP</code></td>
<td><code>TIMESTAMP</code></td>
<td><code>TEXT</code></td>
</tr>
<tr>
<td colspan="4"><strong>GUID / UUID</strong></td>
</tr>
<tr>
<td><code>z.uuid()</code></td>
<td><code>UUID</code></td>
<td><code>UUID</code></td>
<td><code>TEXT</code></td>
</tr>
<tr>
<td><code>z.guid()</code></td>
<td><code>UUID</code></td>
<td><code>UUID</code></td>
<td><code>TEXT</code></td>
</tr>
<tr>
<td colspan="4"><strong>Various string formats</strong></td>
</tr>
<tr>
<td><code>z.url()</code></td>
<td><code>TEXT</code></td>
<td><code>TEXT</code></td>
<td><code>TEXT</code></td>
</tr>
<tr>
<td><code>z.email()</code></td>
<td><code>TEXT</code></td>
<td><code>TEXT</code></td>
<td><code>TEXT</code></td>
</tr>
<tr>
<td><code>z.emoji()</code></td>
<td><code>TEXT</code></td>
<td><code>TEXT</code></td>
<td><code>TEXT</code></td>
</tr>
<tr>
<td><code>z.nanoid()</code></td>
<td><code>VARCHAR(21)</code></td>
<td><code>VARCHAR(21)</code></td>
<td><code>TEXT</code></td>
</tr>
<tr>
<td><code>z.cuid2()</code></td>
<td><code>TEXT</code></td>
<td><code>TEXT</code></td>
<td><code>TEXT</code></td>
</tr>
<tr>
<td><code>z.ulid()</code></td>
<td><code>VARCHAR(26)</code></td>
<td><code>VARCHAR(26)</code></td>
<td><code>TEXT</code></td>
</tr>
<tr>
<td><code>z.xid()</code></td>
<td><code>VARCHAR(20)</code></td>
<td><code>VARCHAR(20)</code></td>
<td><code>TEXT</code></td>
</tr>
<tr>
<td><code>z.ksuid()</code></td>
<td><code>VARCHAR(27)</code></td>
<td><code>VARCHAR(27)</code></td>
<td><code>TEXT</code></td>
</tr>
<tr>
<td><code>z.base64()</code></td>
<td><code>TEXT</code></td>
<td><code>TEXT</code></td>
<td><code>TEXT</code></td>
</tr>
<tr>
<td><code>z.base64url()</code></td>
<td><code>TEXT</code></td>
<td><code>TEXT</code></td>
<td><code>TEXT</code></td>
</tr>
<tr>
<td><code>z.e164()</code></td>
<td><code>TEXT</code></td>
<td><code>TEXT</code></td>
<td><code>TEXT</code></td>
</tr>
<tr>
<td><code>z.jwt()</code></td>
<td><code>TEXT</code></td>
<td><code>TEXT</code></td>
<td><code>TEXT</code></td>
</tr>
<tr>
<td colspan="4"><strong>Network types</strong></td>
</tr>
<tr>
<td><code>z.ipv4()</code></td>
<td><code>INET</code></td>
<td><code>TEXT</code></td>
<td><code>TEXT</code></td>
</tr>
<tr>
<td><code>z.ipv6()</code></td>
<td><code>INET</code></td>
<td><code>TEXT</code></td>
<td><code>TEXT</code></td>
</tr>
<tr>
<td><code>z.mac()</code></td>
<td><code>MACADDR</code></td>
<td><code>TEXT</code></td>
<td><code>TEXT</code></td>
</tr>
<tr>
<td><code>z.cidrv4()</code></td>
<td><code>CIDR</code></td>
<td><code>TEXT</code></td>
<td><code>TEXT</code></td>
</tr>
<tr>
<td><code>z.cidrv6()</code></td>
<td><code>CIDR</code></td>
<td><code>TEXT</code></td>
<td><code>TEXT</code></td>
</tr>
<tr>
<td colspan="4"><strong>Array types</strong></td>
</tr>
<tr>
<td><code>z.int().array()</code></td>
<td><code>INT4[]</code></td>
<td><code>INT4[]</code></td>
<td><em>Not Available</em></td>
</tr>
<tr>
<td><code>z.string().array()</code></td>
<td><code>TEXT[]</code></td>
<td><code>TEXT[]</code></td>
<td><em>Not Available</em></td>
</tr>
<tr>
<td><code>z.int().array().array()</code></td>
<td><code>INT4[][]</code></td>
<td><code>INT4[][]</code></td>
<td><em>Not Available</em></td>
</tr>
<tr>
<td><code>z.string().array().nullable()</code></td>
<td><code>TEXT[] NULL</code></td>
<td><code>TEXT[] NULL</code></td>
<td><em>Not Available</em></td>
</tr>
<tr>
<td colspan="4"><strong>Container types</strong></td>
</tr>
<tr>
<td><code>z.string().nullable()</code></td>
<td><code>TEXT NULL</code></td>
<td><code>TEXT NULL</code></td>
<td><code>TEXT NULL</code></td>
</tr>
<tr>
<td><code>z.string().nullish()</code></td>
<td><code>TEXT NULL</code></td>
<td><code>TEXT NULL</code></td>
<td><code>TEXT NULL</code></td>
</tr>
<tr>
<td><code>z.string().default("hello")</code></td>
<td><code>TEXT DEFAULT hello</code></td>
<td><code>TEXT DEFAULT hello</code></td>
<td><code>TEXT DEFAULT hello</code></td>
</tr>
<tr>
<td><code>z.string().prefault("hello")</code></td>
<td><code>TEXT DEFAULT hello</code></td>
<td><code>TEXT DEFAULT hello</code></td>
<td><code>TEXT DEFAULT hello</code></td>
</tr>
<tr>
<td><code>z.string().dbPk()</code></td>
<td><code>TEXT PRIMARY KEY</code></td>
<td><code>TEXT PRIMARY KEY</code></td>
<td><code>TEXT PRIMARY KEY</code></td>
</tr>
<tr>
<td><code>z.int64().dbFk(UserSchema, "id")</code></td>
<td><code>INT8 FOREIGN KEY REFERENCES users(id)</code></td>
<td><code>INT8 FOREIGN KEY REFERENCES users(id)</code></td>
<td><em>Not Available</em></td>
</tr>
<tr>
<td><code>z.bigint().int128().refine(n => n % 2n === 0n, { message: "Must be an even number" })</code></td>
<td><em>Not Available</em></td>
<td><code>HUGEINT</code></td>
<td><em>Not Available</em></td>
</tr>
<tr>
<td><code>z.uint64().refine(n => n % 2n === 0n, { message: "Must be an even number" })</code></td>
<td><em>Not Available</em></td>
<td><code>UBIGINT</code></td>
<td><em>Not Available</em></td>
</tr>
  </tbody>
</table>
</details>

## Ormer-Valibot package
<details>
<summary>Field type mapping table</summary>
<table>
  <thead>
    <tr>
      <th>Valibot Schema</th>
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
<td><code>v.string()</code></td>
<td><code>TEXT</code></td>
<td><code>TEXT</code></td>
<td><code>TEXT</code></td>
</tr>
<tr>
<td><code>v.pipe(v.string(), v.maxLength(255))</code></td>
<td><code>VARCHAR(255)</code></td>
<td><code>VARCHAR(255)</code></td>
<td><code>TEXT</code></td>
</tr>
<tr>
<td colspan="4"><strong>Number types</strong></td>
</tr>
<tr>
<td><code>v.number()</code></td>
<td><code>FLOAT8</code></td>
<td><code>FLOAT8</code></td>
<td><code>REAL</code></td>
</tr>
<tr>
<td><code>v.pipe(v.number(), v.integer())</code></td>
<td><code>INT4</code></td>
<td><code>INT4</code></td>
<td><code>INTEGER</code></td>
</tr>
<tr>
<td><code>v.pipe(v.number(), d.float32())</code></td>
<td><code>FLOAT4</code></td>
<td><code>FLOAT4</code></td>
<td><code>REAL</code></td>
</tr>
<tr>
<td><code>v.pipe(v.number(), d.float64())</code></td>
<td><code>FLOAT8</code></td>
<td><code>FLOAT8</code></td>
<td><code>REAL</code></td>
</tr>
<tr>
<td><code>v.pipe(v.number(), d.int32())</code></td>
<td><code>INT4</code></td>
<td><code>INT4</code></td>
<td><code>INTEGER</code></td>
</tr>
<tr>
<td><code>v.pipe(v.number(), d.int32(), d.primaryKey(), d.autoIncrement())</code></td>
<td><code>SERIAL4 PRIMARY KEY</code></td>
<td><code>INT4 PRIMARY KEY</code></td>
<td><code>INTEGER PRIMARY KEY AUTOINCREMENT</code></td>
</tr>
<tr>
<td><code>v.pipe(v.number(), d.int32())</code></td>
<td><code>INT4</code></td>
<td><code>INT4</code></td>
<td><code>INTEGER</code></td>
</tr>
<tr>
<td><code>v.pipe(v.number(), d.uint32())</code></td>
<td><em>Not Available</em></td>
<td><code>UINTEGER</code></td>
<td><code>INTEGER</code></td>
</tr>
<tr>
<td><code>v.pipe(v.number(), d.int8())</code></td>
<td><em>Not Available</em></td>
<td><code>INT1</code></td>
<td><code>INTEGER</code></td>
</tr>
<tr>
<td><code>v.pipe(v.number(), d.int16())</code></td>
<td><code>INT2</code></td>
<td><code>INT2</code></td>
<td><code>INTEGER</code></td>
</tr>
<tr>
<td><code>v.pipe(v.number(), d.uint8())</code></td>
<td><em>Not Available</em></td>
<td><code>UTINYINT</code></td>
<td><code>INTEGER</code></td>
</tr>
<tr>
<td><code>v.pipe(v.number(), d.uint16())</code></td>
<td><em>Not Available</em></td>
<td><code>USMALLINT</code></td>
<td><code>INTEGER</code></td>
</tr>
<tr>
<td colspan="4"><strong>Bigint</strong></td>
</tr>
<tr>
<td><code>v.bigint()</code></td>
<td><code>INT8</code></td>
<td><code>INT8</code></td>
<td><em>Not Available</em></td>
</tr>
<tr>
<td><code>v.pipe(v.bigint(), d.int64())</code></td>
<td><code>INT8</code></td>
<td><code>INT8</code></td>
<td><em>Not Available</em></td>
</tr>
<tr>
<td><code>v.pipe(v.bigint(), d.int64(), d.primaryKey(), d.autoIncrement())</code></td>
<td><code>SERIAL8 PRIMARY KEY</code></td>
<td><code>INT8 PRIMARY KEY</code></td>
<td><em>Not Available</em></td>
</tr>
<tr>
<td><code>v.pipe(v.bigint(), d.uint64())</code></td>
<td><em>Not Available</em></td>
<td><code>UBIGINT</code></td>
<td><em>Not Available</em></td>
</tr>
<tr>
<td><code>v.pipe(v.bigint(), d.int128())</code></td>
<td><em>Not Available</em></td>
<td><code>HUGEINT</code></td>
<td><em>Not Available</em></td>
</tr>
<tr>
<td><code>v.pipe(v.bigint(), d.uint128())</code></td>
<td><em>Not Available</em></td>
<td><code>UHUGEINT</code></td>
<td><em>Not Available</em></td>
</tr>
<tr>
<td colspan="4"><strong>Boolean</strong></td>
</tr>
<tr>
<td><code>v.boolean()</code></td>
<td><code>BOOLEAN</code></td>
<td><code>BOOLEAN</code></td>
<td><em>Not Available</em></td>
</tr>
<tr>
<td colspan="4"><strong>JSON</strong></td>
</tr>
<tr>
<td><code>v.object({ v: v.string() })</code></td>
<td><code>JSONB</code></td>
<td><code>JSON</code></td>
<td><em>Not Available</em></td>
</tr>
<tr>
<td colspan="4"><strong>Date/time types</strong></td>
</tr>
<tr>
<td><code>v.date()</code></td>
<td><code>TIMESTAMPTZ</code></td>
<td><code>TIMESTAMPTZ</code></td>
<td><em>Not Available</em></td>
</tr>
<tr>
<td><code>v.pipe(v.string(), v.isoTime())</code></td>
<td><em>Not Available</em></td>
<td><em>Not Available</em></td>
<td><code>TEXT</code></td>
</tr>
<tr>
<td><code>v.pipe(v.string(), v.isoTimeSecond())</code></td>
<td><code>TIME</code></td>
<td><code>TIME</code></td>
<td><code>TEXT</code></td>
</tr>
<tr>
<td><code>v.pipe(v.string(), v.isoDate())</code></td>
<td><code>DATE</code></td>
<td><code>DATE</code></td>
<td><code>TEXT</code></td>
</tr>
<tr>
<td><code>v.pipe(v.string(), v.isoDateTime())</code></td>
<td><em>Not Available</em></td>
<td><em>Not Available</em></td>
<td><code>TEXT</code></td>
</tr>
<tr>
<td><code>v.pipe(v.string(), d.naiveDatetime())</code></td>
<td><code>TIMESTAMP</code></td>
<td><code>TIMESTAMP</code></td>
<td><code>TEXT</code></td>
</tr>
<tr>
<td colspan="4"><strong>UUID</strong></td>
</tr>
<tr>
<td><code>v.pipe(v.string(), v.uuid())</code></td>
<td><code>UUID</code></td>
<td><code>UUID</code></td>
<td><code>TEXT</code></td>
</tr>
<tr>
<td colspan="4"><strong>Various string formats</strong></td>
</tr>
<tr>
<td><code>v.pipe(v.string(), v.url())</code></td>
<td><code>TEXT</code></td>
<td><code>TEXT</code></td>
<td><code>TEXT</code></td>
</tr>
<tr>
<td><code>v.pipe(v.string(), v.email())</code></td>
<td><code>VARCHAR(320)</code></td>
<td><code>VARCHAR(320)</code></td>
<td><code>TEXT</code></td>
</tr>
<tr>
<td><code>v.pipe(v.string(), v.emoji())</code></td>
<td><code>TEXT</code></td>
<td><code>TEXT</code></td>
<td><code>TEXT</code></td>
</tr>
<tr>
<td><code>v.pipe(v.string(), v.nanoid())</code></td>
<td><code>VARCHAR(21)</code></td>
<td><code>VARCHAR(21)</code></td>
<td><code>TEXT</code></td>
</tr>
<tr>
<td><code>v.pipe(v.string(), v.cuid2())</code></td>
<td><code>TEXT</code></td>
<td><code>TEXT</code></td>
<td><code>TEXT</code></td>
</tr>
<tr>
<td><code>v.pipe(v.string(), v.ulid())</code></td>
<td><code>VARCHAR(26)</code></td>
<td><code>VARCHAR(26)</code></td>
<td><code>TEXT</code></td>
</tr>
<tr>
<td><code>v.pipe(v.string(), v.base64())</code></td>
<td><code>TEXT</code></td>
<td><code>TEXT</code></td>
<td><code>TEXT</code></td>
</tr>
<tr>
<td><code>v.pipe(v.string(), v.isbn())</code></td>
<td><code>TEXT</code></td>
<td><code>TEXT</code></td>
<td><code>TEXT</code></td>
</tr>
<tr>
<td colspan="4"><strong>Network types</strong></td>
</tr>
<tr>
<td><code>v.pipe(v.string(), v.ipv4())</code></td>
<td><code>INET</code></td>
<td><code>TEXT</code></td>
<td><code>TEXT</code></td>
</tr>
<tr>
<td><code>v.pipe(v.string(), v.ipv6())</code></td>
<td><code>INET</code></td>
<td><code>TEXT</code></td>
<td><code>TEXT</code></td>
</tr>
<tr>
<td><code>v.pipe(v.string(), v.mac())</code></td>
<td><code>MACADDR</code></td>
<td><code>TEXT</code></td>
<td><code>TEXT</code></td>
</tr>
<tr>
<td colspan="4"><strong>Array types</strong></td>
</tr>
<tr>
<td><code>v.array(v.pipe(v.number(), d.int32()))</code></td>
<td><code>INT4[]</code></td>
<td><code>INT4[]</code></td>
<td><em>Not Available</em></td>
</tr>
<tr>
<td><code>v.array(v.string())</code></td>
<td><code>TEXT[]</code></td>
<td><code>TEXT[]</code></td>
<td><em>Not Available</em></td>
</tr>
<tr>
<td><code>v.array(v.array(v.pipe(v.number(), d.int32())))</code></td>
<td><code>INT4[][]</code></td>
<td><code>INT4[][]</code></td>
<td><em>Not Available</em></td>
</tr>
<tr>
<td><code>v.nullable(v.array(v.string()))</code></td>
<td><code>TEXT[] NULL</code></td>
<td><code>TEXT[] NULL</code></td>
<td><em>Not Available</em></td>
</tr>
<tr>
<td colspan="4"><strong>Other</strong></td>
</tr>
<tr>
<td><code>v.pipe(v.string(), v.trim())</code></td>
<td><code>TEXT</code></td>
<td><code>TEXT</code></td>
<td><code>TEXT</code></td>
</tr>
<tr>
<td><code>v.nullish(v.pipe(v.string(), v.trim()))</code></td>
<td><code>TEXT NULL</code></td>
<td><code>TEXT NULL</code></td>
<td><code>TEXT NULL</code></td>
</tr>
<tr>
<td colspan="4"><strong>Container types</strong></td>
</tr>
<tr>
<td><code>v.nullable(v.string())</code></td>
<td><code>TEXT NULL</code></td>
<td><code>TEXT NULL</code></td>
<td><code>TEXT NULL</code></td>
</tr>
<tr>
<td><code>v.nullish(v.string())</code></td>
<td><code>TEXT NULL</code></td>
<td><code>TEXT NULL</code></td>
<td><code>TEXT NULL</code></td>
</tr>
<tr>
<td><code>v.optional(v.string(), "hello")</code></td>
<td><code>TEXT DEFAULT hello</code></td>
<td><code>TEXT DEFAULT hello</code></td>
<td><code>TEXT DEFAULT hello</code></td>
</tr>
<tr>
<td><code>v.fallback(v.string(), "hello")</code></td>
<td><code>TEXT DEFAULT hello</code></td>
<td><code>TEXT DEFAULT hello</code></td>
<td><code>TEXT DEFAULT hello</code></td>
</tr>
<tr>
<td><code>v.pipe(v.string(), d.primaryKey())</code></td>
<td><code>TEXT PRIMARY KEY</code></td>
<td><code>TEXT PRIMARY KEY</code></td>
<td><code>TEXT PRIMARY KEY</code></td>
</tr>
<tr>
<td><code>v.pipe(v.bigint(), d.int64(), d.foreignKey("users", "id"))</code></td>
<td><code>INT8 FOREIGN KEY REFERENCES users(id)</code></td>
<td><code>INT8 FOREIGN KEY REFERENCES users(id)</code></td>
<td><em>Not Available</em></td>
</tr>
<tr>
<td><code>v.nullish(v.pipe(v.string(), v.url()))</code></td>
<td><code>TEXT NULL</code></td>
<td><code>TEXT NULL</code></td>
<td><code>TEXT NULL</code></td>
</tr>
  </tbody>
</table>
</details>

## Ormer-Arktype package
<details>
<summary>Field type mapping table</summary>
<table>
  <thead>
    <tr>
      <th>ArkType Schema</th>
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
<td><code>type("string")</code></td>
<td><code>TEXT</code></td>
<td><code>TEXT</code></td>
<td><code>TEXT</code></td>
</tr>
<tr>
<td><code>type("string <= 255")</code></td>
<td><code>TEXT</code></td>
<td><code>TEXT</code></td>
<td><code>TEXT</code></td>
</tr>
<tr>
<td><code>db.varchar(255)</code></td>
<td><code>VARCHAR(255)</code></td>
<td><code>VARCHAR(255)</code></td>
<td><code>TEXT</code></td>
</tr>
<tr>
<td colspan="4"><strong>Number types</strong></td>
</tr>
<tr>
<td><code>type("number")</code></td>
<td><code>FLOAT8</code></td>
<td><code>FLOAT8</code></td>
<td><code>REAL</code></td>
</tr>
<tr>
<td><code>type("number.integer")</code></td>
<td><code>FLOAT8</code></td>
<td><code>FLOAT8</code></td>
<td><code>REAL</code></td>
</tr>
<tr>
<td><code>db.type("float32")</code></td>
<td><code>FLOAT4</code></td>
<td><code>FLOAT4</code></td>
<td><code>REAL</code></td>
</tr>
<tr>
<td><code>db.type("float64")</code></td>
<td><code>FLOAT8</code></td>
<td><code>FLOAT8</code></td>
<td><code>REAL</code></td>
</tr>
<tr>
<td><code>db.type("int8")</code></td>
<td><em>Not Available</em></td>
<td><code>INT1</code></td>
<td><code>INTEGER</code></td>
</tr>
<tr>
<td><code>db.type("uint8")</code></td>
<td><em>Not Available</em></td>
<td><code>UTINYINT</code></td>
<td><code>INTEGER</code></td>
</tr>
<tr>
<td><code>db.type("uint16")</code></td>
<td><em>Not Available</em></td>
<td><code>USMALLINT</code></td>
<td><code>INTEGER</code></td>
</tr>
<tr>
<td><code>db.type("int16")</code></td>
<td><code>INT2</code></td>
<td><code>INT2</code></td>
<td><code>INTEGER</code></td>
</tr>
<tr>
<td><code>db.type("int32")</code></td>
<td><code>INT4</code></td>
<td><code>INT4</code></td>
<td><code>INTEGER</code></td>
</tr>
<tr>
<td><code>db.type("uint32")</code></td>
<td><em>Not Available</em></td>
<td><code>UINTEGER</code></td>
<td><code>INTEGER</code></td>
</tr>
<tr>
<td><code>db.primaryKey("int32")</code></td>
<td><code>SERIAL4 PRIMARY KEY</code></td>
<td><code>INT4 PRIMARY KEY</code></td>
<td><code>INTEGER PRIMARY KEY AUTOINCREMENT</code></td>
</tr>
<tr>
<td colspan="4"><strong>Bigint</strong></td>
</tr>
<tr>
<td><code>type("bigint")</code></td>
<td><code>INT8</code></td>
<td><code>INT8</code></td>
<td><em>Not Available</em></td>
</tr>
<tr>
<td><code>db.type("int64")</code></td>
<td><code>INT8</code></td>
<td><code>INT8</code></td>
<td><em>Not Available</em></td>
</tr>
<tr>
<td><code>db.type("uint64")</code></td>
<td><em>Not Available</em></td>
<td><code>UBIGINT</code></td>
<td><em>Not Available</em></td>
</tr>
<tr>
<td><code>db.type("uint128")</code></td>
<td><em>Not Available</em></td>
<td><code>UHUGEINT</code></td>
<td><em>Not Available</em></td>
</tr>
<tr>
<td><code>db.primaryKey("int64")</code></td>
<td><code>SERIAL8 PRIMARY KEY</code></td>
<td><code>INT8 PRIMARY KEY</code></td>
<td><em>Not Available</em></td>
</tr>
<tr>
<td colspan="4"><strong>Boolean</strong></td>
</tr>
<tr>
<td><code>type("boolean")</code></td>
<td><code>BOOLEAN</code></td>
<td><code>BOOLEAN</code></td>
<td><em>Not Available</em></td>
</tr>
<tr>
<td colspan="4"><strong>JSON</strong></td>
</tr>
<tr>
<td><code>type({ v: "string" })</code></td>
<td><code>JSONB</code></td>
<td><code>JSON</code></td>
<td><em>Not Available</em></td>
</tr>
<tr>
<td colspan="4"><strong>Date/time types</strong></td>
</tr>
<tr>
<td><code>type("Date")</code></td>
<td><code>TIMESTAMPTZ</code></td>
<td><code>TIMESTAMPTZ</code></td>
<td><em>Not Available</em></td>
</tr>
<tr>
<td><code>db.type("timepart")</code></td>
<td><code>TIME</code></td>
<td><code>TIME</code></td>
<td><code>TEXT</code></td>
</tr>
<tr>
<td><code>db.type("datepart")</code></td>
<td><code>DATE</code></td>
<td><code>DATE</code></td>
<td><code>TEXT</code></td>
</tr>
<tr>
<td><code>type("string.date.iso")</code></td>
<td><code>TEXT</code></td>
<td><code>TEXT</code></td>
<td><code>TEXT</code></td>
</tr>
<tr>
<td><code>db.type("naivedatetime")</code></td>
<td><code>TIMESTAMP</code></td>
<td><code>TIMESTAMP</code></td>
<td><code>TEXT</code></td>
</tr>
<tr>
<td colspan="4"><strong>GUID / UUID</strong></td>
</tr>
<tr>
<td><code>type("string.uuid")</code></td>
<td><code>TEXT</code></td>
<td><code>TEXT</code></td>
<td><code>TEXT</code></td>
</tr>
<tr>
<td><code>db.type("uuid")</code></td>
<td><code>UUID</code></td>
<td><code>UUID</code></td>
<td><code>TEXT</code></td>
</tr>
<tr>
<td colspan="4"><strong>Various string formats</strong></td>
</tr>
<tr>
<td><code>type("string.url")</code></td>
<td><code>TEXT</code></td>
<td><code>TEXT</code></td>
<td><code>TEXT</code></td>
</tr>
<tr>
<td><code>type("string.email")</code></td>
<td><code>TEXT</code></td>
<td><code>TEXT</code></td>
<td><code>TEXT</code></td>
</tr>
<tr>
<td colspan="4"><strong>Network types</strong></td>
</tr>
<tr>
<td><code>type("string.ip.v4")</code></td>
<td><code>TEXT</code></td>
<td><code>TEXT</code></td>
<td><code>TEXT</code></td>
</tr>
<tr>
<td><code>type("string.ip.v6")</code></td>
<td><code>TEXT</code></td>
<td><code>TEXT</code></td>
<td><code>TEXT</code></td>
</tr>
<tr>
<td colspan="4"><strong>Array types</strong></td>
</tr>
<tr>
<td><code>db.type("int32[]")</code></td>
<td><code>INT4[]</code></td>
<td><code>INT4[]</code></td>
<td><em>Not Available</em></td>
</tr>
<tr>
<td><code>db.type("int64[][]")</code></td>
<td><code>INT8[][]</code></td>
<td><code>INT8[][]</code></td>
<td><em>Not Available</em></td>
</tr>
<tr>
<td><code>type("string[]")</code></td>
<td><code>TEXT[]</code></td>
<td><code>TEXT[]</code></td>
<td><em>Not Available</em></td>
</tr>
<tr>
<td><code>type("string[] | null")</code></td>
<td><code>TEXT[] NULL</code></td>
<td><code>TEXT[] NULL</code></td>
<td><em>Not Available</em></td>
</tr>
<tr>
<td colspan="4"><strong>Container types</strong></td>
</tr>
<tr>
<td><code>type("string | null")</code></td>
<td><code>TEXT NULL</code></td>
<td><code>TEXT NULL</code></td>
<td><code>TEXT NULL</code></td>
</tr>
<tr>
<td><code>type("string | null | undefined")</code></td>
<td><code>TEXT NULL</code></td>
<td><code>TEXT NULL</code></td>
<td><code>TEXT NULL</code></td>
</tr>
<tr>
<td><code>type("string").default("")</code></td>
<td><code>TEXT</code></td>
<td><code>TEXT</code></td>
<td><code>TEXT</code></td>
</tr>
<tr>
<td><code>db.type("int64").default(0n)</code></td>
<td><code>INT8</code></td>
<td><code>INT8</code></td>
<td><em>Not Available</em></td>
</tr>
<tr>
<td><code>db.primaryKey("string")</code></td>
<td><code>TEXT PRIMARY KEY</code></td>
<td><code>TEXT PRIMARY KEY</code></td>
<td><code>TEXT PRIMARY KEY</code></td>
</tr>
<tr>
<td><code>db.foreignKeyRef(UserSchema, "id")</code></td>
<td><code>INT8 FOREIGN KEY REFERENCES users(id)</code></td>
<td><code>INT8 FOREIGN KEY REFERENCES users(id)</code></td>
<td><em>Not Available</em></td>
</tr>
<tr>
<td><code>db.foreignKey("int64", "users", "id")</code></td>
<td><code>INT8 FOREIGN KEY REFERENCES users(id)</code></td>
<td><code>INT8 FOREIGN KEY REFERENCES users(id)</code></td>
<td><em>Not Available</em></td>
</tr>
  </tbody>
</table>
</details>

## Ormer-Effect package
<details>
<summary>Field type mapping table</summary>
<table>
  <thead>
    <tr>
      <th>Effect Schema</th>
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
<td><code>Schema.String</code></td>
<td><code>TEXT</code></td>
<td><code>TEXT</code></td>
<td><code>TEXT</code></td>
</tr>
<tr>
<td><code>VarChar(255)</code></td>
<td><code>VARCHAR(255)</code></td>
<td><code>VARCHAR(255)</code></td>
<td><code>TEXT</code></td>
</tr>
<tr>
<td colspan="4"><strong>Number types</strong></td>
</tr>
<tr>
<td><code>Schema.Number</code></td>
<td><code>FLOAT8</code></td>
<td><code>FLOAT8</code></td>
<td><code>REAL</code></td>
</tr>
<tr>
<td><code>Schema.Number.check(Schema.isInt())</code></td>
<td><code>INT4</code></td>
<td><code>INT4</code></td>
<td><code>INTEGER</code></td>
</tr>
<tr>
<td><code>Float32</code></td>
<td><code>FLOAT4</code></td>
<td><code>FLOAT4</code></td>
<td><code>REAL</code></td>
</tr>
<tr>
<td><code>Float64</code></td>
<td><code>FLOAT8</code></td>
<td><code>FLOAT8</code></td>
<td><code>REAL</code></td>
</tr>
<tr>
<td><code>Int32</code></td>
<td><code>INT4</code></td>
<td><code>INT4</code></td>
<td><code>INTEGER</code></td>
</tr>
<tr>
<td><code>Int32.pipe(PrimaryKey(), AutoIncrement())</code></td>
<td><code>SERIAL4 PRIMARY KEY</code></td>
<td><code>INT4 PRIMARY KEY</code></td>
<td><code>INTEGER PRIMARY KEY AUTOINCREMENT</code></td>
</tr>
<tr>
<td><code>Int32</code></td>
<td><code>INT4</code></td>
<td><code>INT4</code></td>
<td><code>INTEGER</code></td>
</tr>
<tr>
<td><code>Int8</code></td>
<td><em>Not Available</em></td>
<td><code>INT1</code></td>
<td><code>INTEGER</code></td>
</tr>
<tr>
<td><code>Uint8</code></td>
<td><em>Not Available</em></td>
<td><code>UTINYINT</code></td>
<td><code>INTEGER</code></td>
</tr>
<tr>
<td><code>Int16</code></td>
<td><code>INT2</code></td>
<td><code>INT2</code></td>
<td><code>INTEGER</code></td>
</tr>
<tr>
<td><code>Uint16</code></td>
<td><em>Not Available</em></td>
<td><code>USMALLINT</code></td>
<td><code>INTEGER</code></td>
</tr>
<tr>
<td><code>Uint32</code></td>
<td><em>Not Available</em></td>
<td><code>UINTEGER</code></td>
<td><code>INTEGER</code></td>
</tr>
<tr>
<td colspan="4"><strong>Bigint</strong></td>
</tr>
<tr>
<td><code>Schema.BigInt</code></td>
<td><code>INT8</code></td>
<td><code>INT8</code></td>
<td><em>Not Available</em></td>
</tr>
<tr>
<td><code>Int64</code></td>
<td><code>INT8</code></td>
<td><code>INT8</code></td>
<td><em>Not Available</em></td>
</tr>
<tr>
<td><code>Int64.pipe(PrimaryKey(), AutoIncrement())</code></td>
<td><code>SERIAL8 PRIMARY KEY</code></td>
<td><code>INT8 PRIMARY KEY</code></td>
<td><em>Not Available</em></td>
</tr>
<tr>
<td><code>Uint64</code></td>
<td><em>Not Available</em></td>
<td><code>UBIGINT</code></td>
<td><em>Not Available</em></td>
</tr>
<tr>
<td><code>Int128</code></td>
<td><em>Not Available</em></td>
<td><code>HUGEINT</code></td>
<td><em>Not Available</em></td>
</tr>
<tr>
<td><code>Uint128</code></td>
<td><em>Not Available</em></td>
<td><code>UHUGEINT</code></td>
<td><em>Not Available</em></td>
</tr>
<tr>
<td colspan="4"><strong>Boolean</strong></td>
</tr>
<tr>
<td><code>Schema.Boolean</code></td>
<td><code>BOOLEAN</code></td>
<td><code>BOOLEAN</code></td>
<td><em>Not Available</em></td>
</tr>
<tr>
<td colspan="4"><strong>JSON</strong></td>
</tr>
<tr>
<td><code>Schema.Struct({ v: Schema.String })</code></td>
<td><code>JSONB</code></td>
<td><code>JSON</code></td>
<td><em>Not Available</em></td>
</tr>
<tr>
<td colspan="4"><strong>Date/time types</strong></td>
</tr>
<tr>
<td><code>Schema.Date</code></td>
<td><code>TIMESTAMPTZ</code></td>
<td><code>TIMESTAMPTZ</code></td>
<td><em>Not Available</em></td>
</tr>
<tr>
<td><code>IsoTime</code></td>
<td><em>Not Available</em></td>
<td><em>Not Available</em></td>
<td><code>TEXT</code></td>
</tr>
<tr>
<td><code>IsoTimeSecond</code></td>
<td><code>TIME</code></td>
<td><code>TIME</code></td>
<td><code>TEXT</code></td>
</tr>
<tr>
<td><code>IsoDate</code></td>
<td><code>DATE</code></td>
<td><code>DATE</code></td>
<td><code>TEXT</code></td>
</tr>
<tr>
<td><code>IsoDateTime</code></td>
<td><em>Not Available</em></td>
<td><em>Not Available</em></td>
<td><code>TEXT</code></td>
</tr>
<tr>
<td><code>NaiveDatetime</code></td>
<td><code>TIMESTAMP</code></td>
<td><code>TIMESTAMP</code></td>
<td><code>TEXT</code></td>
</tr>
<tr>
<td colspan="4"><strong>UUID</strong></td>
</tr>
<tr>
<td><code>UuidString</code></td>
<td><code>UUID</code></td>
<td><code>UUID</code></td>
<td><code>TEXT</code></td>
</tr>
<tr>
<td colspan="4"><strong>Various string formats</strong></td>
</tr>
<tr>
<td><code>UrlString</code></td>
<td><code>TEXT</code></td>
<td><code>TEXT</code></td>
<td><code>TEXT</code></td>
</tr>
<tr>
<td><code>EmailString</code></td>
<td><code>VARCHAR(320)</code></td>
<td><code>VARCHAR(320)</code></td>
<td><code>TEXT</code></td>
</tr>
<tr>
<td><code>Schema.String</code></td>
<td><code>TEXT</code></td>
<td><code>TEXT</code></td>
<td><code>TEXT</code></td>
</tr>
<tr>
<td><code>VarChar(21)</code></td>
<td><code>VARCHAR(21)</code></td>
<td><code>VARCHAR(21)</code></td>
<td><code>TEXT</code></td>
</tr>
<tr>
<td><code>Schema.String</code></td>
<td><code>TEXT</code></td>
<td><code>TEXT</code></td>
<td><code>TEXT</code></td>
</tr>
<tr>
<td><code>VarChar(26)</code></td>
<td><code>VARCHAR(26)</code></td>
<td><code>VARCHAR(26)</code></td>
<td><code>TEXT</code></td>
</tr>
<tr>
<td><code>Schema.String</code></td>
<td><code>TEXT</code></td>
<td><code>TEXT</code></td>
<td><code>TEXT</code></td>
</tr>
<tr>
<td><code>Schema.String</code></td>
<td><code>TEXT</code></td>
<td><code>TEXT</code></td>
<td><code>TEXT</code></td>
</tr>
<tr>
<td colspan="4"><strong>Network types</strong></td>
</tr>
<tr>
<td><code>Ipv4String</code></td>
<td><code>INET</code></td>
<td><code>TEXT</code></td>
<td><code>TEXT</code></td>
</tr>
<tr>
<td><code>Ipv6String</code></td>
<td><code>INET</code></td>
<td><code>TEXT</code></td>
<td><code>TEXT</code></td>
</tr>
<tr>
<td><code>MacString</code></td>
<td><code>MACADDR</code></td>
<td><code>TEXT</code></td>
<td><code>TEXT</code></td>
</tr>
<tr>
<td colspan="4"><strong>Array types</strong></td>
</tr>
<tr>
<td><code>Schema.Array(Int32)</code></td>
<td><code>INT4[]</code></td>
<td><code>INT4[]</code></td>
<td><em>Not Available</em></td>
</tr>
<tr>
<td><code>Schema.Array(Schema.String)</code></td>
<td><code>TEXT[]</code></td>
<td><code>TEXT[]</code></td>
<td><em>Not Available</em></td>
</tr>
<tr>
<td><code>Schema.Array(Schema.Array(Int32))</code></td>
<td><code>INT4[][]</code></td>
<td><code>INT4[][]</code></td>
<td><em>Not Available</em></td>
</tr>
<tr>
<td><code>Schema.NullOr(Schema.Array(Schema.String))</code></td>
<td><code>TEXT[] NULL</code></td>
<td><code>TEXT[] NULL</code></td>
<td><em>Not Available</em></td>
</tr>
<tr>
<td colspan="4"><strong>Other</strong></td>
</tr>
<tr>
<td><code>Schema.String</code></td>
<td><code>TEXT</code></td>
<td><code>TEXT</code></td>
<td><code>TEXT</code></td>
</tr>
<tr>
<td><code>Schema.NullOr(Schema.String)</code></td>
<td><code>TEXT NULL</code></td>
<td><code>TEXT NULL</code></td>
<td><code>TEXT NULL</code></td>
</tr>
<tr>
<td colspan="4"><strong>Container types</strong></td>
</tr>
<tr>
<td><code>Schema.NullOr(Schema.String)</code></td>
<td><code>TEXT NULL</code></td>
<td><code>TEXT NULL</code></td>
<td><code>TEXT NULL</code></td>
</tr>
<tr>
<td><code>Schema.NullOr(Schema.String)</code></td>
<td><code>TEXT NULL</code></td>
<td><code>TEXT NULL</code></td>
<td><code>TEXT NULL</code></td>
</tr>
<tr>
<td><code>Schema.String.pipe(WithDefault("hello"))</code></td>
<td><code>TEXT DEFAULT hello</code></td>
<td><code>TEXT DEFAULT hello</code></td>
<td><code>TEXT DEFAULT hello</code></td>
</tr>
<tr>
<td><code>Schema.String.pipe(WithDefault("hello"))</code></td>
<td><code>TEXT DEFAULT hello</code></td>
<td><code>TEXT DEFAULT hello</code></td>
<td><code>TEXT DEFAULT hello</code></td>
</tr>
<tr>
<td><code>Schema.String.pipe(PrimaryKey())</code></td>
<td><code>TEXT PRIMARY KEY</code></td>
<td><code>TEXT PRIMARY KEY</code></td>
<td><code>TEXT PRIMARY KEY</code></td>
</tr>
<tr>
<td><code>Int64.pipe(ForeignKey({ table: "users", column: "id" }))</code></td>
<td><code>INT8 FOREIGN KEY REFERENCES users(id)</code></td>
<td><code>INT8 FOREIGN KEY REFERENCES users(id)</code></td>
<td><em>Not Available</em></td>
</tr>
<tr>
<td><code>Schema.NullOr(UrlString)</code></td>
<td><code>TEXT NULL</code></td>
<td><code>TEXT NULL</code></td>
<td><code>TEXT NULL</code></td>
</tr>
  </tbody>
</table>
</details>