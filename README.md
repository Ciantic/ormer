<!-- This README.md is generated from packages/ormer-docs/docs.ts. Please edit that file instead of this one. -->

# Ormer

Made of two packages `packages/ormer` and `packages/ormer-zod`. There is also old `packages/ormer-experiments` which is not used for other than ideas.

## Ormer package

This is pure dependency free package that allows to define database schemas.

Supported are SQLite, Postgres (pg, pglite) and DuckDB.
## Ormer-Zod package

The table below is generated from the test cases in `packages/ormer-zod/src/zod-examples.ts`, which are used for testing the `derivePgColumn` function. Each row corresponds to a test case, showing the Zod schema and the expected Ormer column definition.
<table>
  <thead>
    <tr>
      <th>Index</th>
      <th>Zod Schema</th>
      <th>Expected Column</th>
    </tr>
  </thead>
  <tbody>
    
  <tr>
    <td>0</td>
    <td><code>z.string()</code></td>
    <td><code>pg.text()</code></td>
  </tr>


  <tr>
    <td>1</td>
    <td><code>z.string().max(255)</code></td>
    <td><code>pg.varchar({ maxLength: 255 })</code></td>
  </tr>


  <tr>
    <td>2</td>
    <td><code>z.uuid()</code></td>
    <td><code>pg.uuid()</code></td>
  </tr>


  <tr>
    <td>3</td>
    <td><code>z.number()</code></td>
    <td><code>pg.float8()</code></td>
  </tr>


  <tr>
    <td>4</td>
    <td><code>z.number().int()</code></td>
    <td><code>pg.float8()</code></td>
  </tr>


  <tr>
    <td>5</td>
    <td><code>z.float32()</code></td>
    <td><code>pg.float4()</code></td>
  </tr>


  <tr>
    <td>6</td>
    <td><code>z.float64()</code></td>
    <td><code>pg.float8()</code></td>
  </tr>


  <tr>
    <td>7</td>
    <td><code>z.int()</code></td>
    <td><code>pg.int4()</code></td>
  </tr>


  <tr>
    <td>8</td>
    <td><code>z.int().dbPk()</code></td>
    <td><code>pg.int4({ primaryKey: true, autoIncrement: true })</code></td>
  </tr>


  <tr>
    <td>9</td>
    <td><code>z.bigint()</code></td>
    <td><code>pg.decimal()</code></td>
  </tr>


  <tr>
    <td>10</td>
    <td><code>z.int32()</code></td>
    <td><code>pg.int4()</code></td>
  </tr>


  <tr>
    <td>11</td>
    <td><code>z.uint32()</code></td>
    <td><code>{ type: "ERROR" } as { type: "ERROR" }</code></td>
  </tr>


  <tr>
    <td>12</td>
    <td><code>z.int64()</code></td>
    <td><code>pg.int8()</code></td>
  </tr>


  <tr>
    <td>13</td>
    <td><code>z.int64().dbPk()</code></td>
    <td><code>pg.int8({ primaryKey: true, autoIncrement: true })</code></td>
  </tr>


  <tr>
    <td>14</td>
    <td><code>z.uint64()</code></td>
    <td><code>pg.decimal({ precision: 20, scale: 0 })</code></td>
  </tr>


  <tr>
    <td>15</td>
    <td><code>z.boolean()</code></td>
    <td><code>pg.boolean()</code></td>
  </tr>


  <tr>
    <td>16</td>
    <td><code>z.date()</code></td>
    <td><code>pg.timestamptz()</code></td>
  </tr>


  <tr>
    <td>17</td>
    <td><code>z.url()</code></td>
    <td><code>pg.text()</code></td>
  </tr>


  <tr>
    <td>18</td>
    <td><code>z.email()</code></td>
    <td><code>pg.text()</code></td>
  </tr>


  <tr>
    <td>19</td>
    <td><code>z.emoji()</code></td>
    <td><code>pg.text()</code></td>
  </tr>


  <tr>
    <td>20</td>
    <td><code>z.nanoid()</code></td>
    <td><code>pg.varchar({ maxLength: 21 })</code></td>
  </tr>


  <tr>
    <td>21</td>
    <td><code>z.cuid2()</code></td>
    <td><code>pg.text()</code></td>
  </tr>


  <tr>
    <td>22</td>
    <td><code>z.ulid()</code></td>
    <td><code>pg.varchar({ maxLength: 26 })</code></td>
  </tr>


  <tr>
    <td>23</td>
    <td><code>z.xid()</code></td>
    <td><code>pg.varchar({ maxLength: 20 })</code></td>
  </tr>


  <tr>
    <td>24</td>
    <td><code>z.ksuid()</code></td>
    <td><code>pg.varchar({ maxLength: 27 })</code></td>
  </tr>


  <tr>
    <td>25</td>
    <td><code>z.base64()</code></td>
    <td><code>pg.text()</code></td>
  </tr>


  <tr>
    <td>26</td>
    <td><code>z.base64url()</code></td>
    <td><code>pg.text()</code></td>
  </tr>


  <tr>
    <td>27</td>
    <td><code>z.e164()</code></td>
    <td><code>pg.text()</code></td>
  </tr>


  <tr>
    <td>28</td>
    <td><code>z.jwt()</code></td>
    <td><code>pg.text()</code></td>
  </tr>


  <tr>
    <td>29</td>
    <td><code>z.guid()</code></td>
    <td><code>pg.uuid()</code></td>
  </tr>


  <tr>
    <td>30</td>
    <td><code>z.ipv4()</code></td>
    <td><code>pg.inet()</code></td>
  </tr>


  <tr>
    <td>31</td>
    <td><code>z.ipv6()</code></td>
    <td><code>pg.inet()</code></td>
  </tr>


  <tr>
    <td>32</td>
    <td><code>z.mac()</code></td>
    <td><code>pg.macaddr()</code></td>
  </tr>


  <tr>
    <td>33</td>
    <td><code>z.cidrv4()</code></td>
    <td><code>pg.cidr()</code></td>
  </tr>


  <tr>
    <td>34</td>
    <td><code>z.cidrv6()</code></td>
    <td><code>pg.cidr()</code></td>
  </tr>


  <tr>
    <td>35</td>
    <td><code>z.string().nullable()</code></td>
    <td><code>pg.text({ nullable: true })</code></td>
  </tr>


  <tr>
    <td>36</td>
    <td><code>z.string().optional()</code></td>
    <td><code>pg.text({ nullable: true })</code></td>
  </tr>


  <tr>
    <td>37</td>
    <td><code>z.string().default("hello")</code></td>
    <td><code>pg.text({ default: "hello" })</code></td>
  </tr>


  <tr>
    <td>38</td>
    <td><code>z.string().prefault("hello")</code></td>
    <td><code>pg.text({ default: "hello" })</code></td>
  </tr>


  <tr>
    <td>39</td>
    <td><code>z.string().dbPk()</code></td>
    <td><code>pg.text({ primaryKey: true })</code></td>
  </tr>


  <tr>
    <td>40</td>
    <td><code>z.string().dbFk( z.object({ id: z.string() }).dbTable("users"), "id", )</code></td>
    <td><code>pg.text({ foreignKeyTable: "users", foreignKeyColumn: "id" })</code></td>
  </tr>


  <tr>
    <td>41</td>
    <td><code>z.int().array()</code></td>
    <td><code>pg.int4({ array: "[]" })</code></td>
  </tr>


  <tr>
    <td>42</td>
    <td><code>z.string().array()</code></td>
    <td><code>pg.text({ array: "[]" })</code></td>
  </tr>


  <tr>
    <td>43</td>
    <td><code>z.int().array().array()</code></td>
    <td><code>pg.int4({ array: "[][]" })</code></td>
  </tr>


  <tr>
    <td>44</td>
    <td><code>z.string().array().nullable()</code></td>
    <td><code>pg.text({ array: "[]", nullable: true })</code></td>
  </tr>

  </tbody>
</table>