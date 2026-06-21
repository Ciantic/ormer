import { Project, SyntaxKind } from "ts-morph";
import {
  PGCOLUMN_TO_SQLTYPE,
  DUCKDBCOLUMN_TO_SQLTYPE,
  SQLITECOLUMN_TO_SQLTYPE,
} from "ormer";
import { md } from "./md.ts";
import { writeFileSync } from "fs";
import {
  ALL_PG_FIELDS,
  ALL_DUCKDB_FIELDS,
  ALL_SQLITE_FIELDS,
} from "../ormer-zod/tests/fields.ts";
import {
  ALL_PG_FIELDS as ALL_PG_FIELDS_VALIBOT,
  ALL_DUCKDB_FIELDS as ALL_DUCKDB_FIELDS_VALIBOT,
  ALL_SQLITE_FIELDS as ALL_SQLITE_FIELDS_VALIBOT,
} from "../ormer-valibot/tests/fields.ts";
import {
  ALL_PG_FIELDS as ALL_PG_FIELDS_ARKTYPE,
  ALL_DUCKDB_FIELDS as ALL_DUCKDB_FIELDS_ARKTYPE,
  ALL_SQLITE_FIELDS as ALL_SQLITE_FIELDS_ARKTYPE,
} from "../ormer-arktype/tests/fields.ts";

/** Collapse multiline expressions into single-line for clean table display */
function compact(expr: string): string {
  return expr.replace(/\s+/g, " ").trim();
}

/**
 * Given a pg column object (e.g. `pg.int8({ primaryKey: true })`),
 * return the SQL column type name (e.g. `SERIAL8`).
 */
function pgColumnToSqlDisplay(col: any): string {
  if (typeof col === "string") {
    if (col === "ERROR") return "<em>Not Available</em>";
    return col;
  }
  if (!col || typeof col.type !== "string") return String(col);

  const { type, ...params } = col;
  const fn = PGCOLUMN_TO_SQLTYPE[type as keyof typeof PGCOLUMN_TO_SQLTYPE];

  const isPk = col.primaryKey ? " PRIMARY KEY" : "";
  const isNullable = col.nullable ? " NULL" : "";
  const defaultValue = col.default ? ` DEFAULT ${col.default}` : "";
  const arraySuffix = typeof col.array === "string" ? col.array : "";
  const isFk = col.foreignKeyTable
    ? ` FOREIGN KEY REFERENCES ${col.foreignKeyTable}(${col.foreignKeyColumn})`
    : "";

  return `<code>${fn(params).toUpperCase() + arraySuffix + isPk + isNullable + defaultValue + isFk}</code>`;
}

/**
 * Given a duckdb column object (e.g. `duckdb.int8({ primaryKey: true })`),
 * return the SQL column type name (e.g. `BIGINT`).
 */
function duckdbColumnToSqlDisplay(col: any): string {
  if (typeof col === "string") {
    if (col === "ERROR") return "<em>Not Available</em>";
    return col;
  }
  if (!col || typeof col.type !== "string") return String(col);

  const { type, ...params } = col;
  const fn =
    DUCKDBCOLUMN_TO_SQLTYPE[type as keyof typeof DUCKDBCOLUMN_TO_SQLTYPE];

  const isPk = col.primaryKey ? " PRIMARY KEY" : "";
  const isNullable = col.nullable ? " NULL" : "";
  const defaultValue = col.default ? ` DEFAULT ${col.default}` : "";
  const arraySuffix = typeof col.array === "string" ? col.array : "";
  const isFk = col.foreignKeyTable
    ? ` FOREIGN KEY REFERENCES ${col.foreignKeyTable}(${col.foreignKeyColumn})`
    : "";

  return `<code>${fn(params).toUpperCase() + arraySuffix + isPk + isNullable + defaultValue + isFk}</code>`;
}

/**
 * Given a sqlite column object (e.g. `sqlite.integer({ primaryKey: true })`),
 * return the SQL column type name (e.g. `INTEGER`).
 */
function sqliteColumnToSqlDisplay(col: any): string {
  if (typeof col === "string") {
    if (col === "ERROR") return "<em>Not Available</em>";
    return col;
  }
  if (!col || typeof col.type !== "string") return String(col);

  const { type, ...params } = col;
  const fn =
    SQLITECOLUMN_TO_SQLTYPE[type as keyof typeof SQLITECOLUMN_TO_SQLTYPE];

  const isPk = col.primaryKey ? " PRIMARY KEY" : "";
  const isAutoIncrement = col.autoIncrement ? " AUTOINCREMENT" : "";
  const isNullable = col.nullable ? " NULL" : "";
  const defaultValue = col.default ? ` DEFAULT ${col.default}` : "";
  const isFk = col.foreignKeyTable
    ? ` FOREIGN KEY REFERENCES ${col.foreignKeyTable}(${col.foreignKeyColumn})`
    : "";

  return `<code>${fn().toUpperCase() + isPk + isAutoIncrement + isNullable + defaultValue + isFk}</code>`;
}

function zodSrcToDisplay(zodSrc: string): string {
  return `<code>${compact(zodSrc)}</code>`;
}

function valibotSrcToDisplay(src: string): string {
  return `<code>${compact(src)}</code>`;
}

function arktypeSrcToDisplay(src: string): string {
  return `<code>${compact(src)}</code>`;
}

function makeZodTestCaseTableHtml() {
  const project = new Project();
  const sf = project.addSourceFileAtPath("../ormer-zod/tests/fields.ts");
  if (!sf) throw new Error("Could not load fields.ts");

  const decl = sf.getVariableDeclarationOrThrow("ALL_ZOD_FIELDS");
  let initializer = decl.getInitializerOrThrow();
  // Unwrap `as const` if present
  if (initializer.isKind(SyntaxKind.AsExpression)) {
    initializer = initializer
      .asKindOrThrow(SyntaxKind.AsExpression)
      .getExpression();
  }

  const objectLiteral = initializer.asKindOrThrow(
    SyntaxKind.ObjectLiteralExpression,
  );

  const rows = objectLiteral
    .getProperties()
    .flatMap((prop) => {
      // Extract leading comments (e.g. "// String values") from the property's leading trivia
      const fullText = prop.getFullText();
      const text = prop.getText();
      const leadingTrivia = fullText.substring(0, fullText.indexOf(text));
      const commentMatch = leadingTrivia.match(/\/\/\s*(.+?)\s*$/m);

      const result: string[] = [];
      if (commentMatch) {
        result.push(md`
          <tr>
            <td colspan="4"><strong>${commentMatch[1]}</strong></td>
          </tr>
        `);
      }

      if (!prop.isKind(SyntaxKind.PropertyAssignment)) return result;
      const assignment = prop.asKindOrThrow(SyntaxKind.PropertyAssignment);
      const value = assignment.getInitializerOrThrow();

      if (!value.isKind(SyntaxKind.ObjectLiteralExpression)) return result;
      const inner = value.asKindOrThrow(SyntaxKind.ObjectLiteralExpression);

      // Find the "zod" property
      const zodProp = inner.getProperty("zod");

      if (!zodProp || !zodProp.isKind(SyntaxKind.PropertyAssignment))
        return result;

      const zodExpr = zodProp
        .asKindOrThrow(SyntaxKind.PropertyAssignment)
        .getInitializerOrThrow();

      const propName = assignment.getName();
      const zodDisplay = zodSrcToDisplay(zodExpr.getText());
      const pgCol = ALL_PG_FIELDS[propName as keyof typeof ALL_PG_FIELDS];
      const pgDisplay = pgColumnToSqlDisplay(pgCol);
      const duckCol =
        ALL_DUCKDB_FIELDS[propName as keyof typeof ALL_DUCKDB_FIELDS];
      const duckDisplay = duckdbColumnToSqlDisplay(duckCol);
      const sqliteCol =
        ALL_SQLITE_FIELDS[propName as keyof typeof ALL_SQLITE_FIELDS];
      const sqliteDisplay = sqliteColumnToSqlDisplay(sqliteCol);
      result.push(md`
        <tr>
          <td>${zodDisplay}</td>
          <td>${pgDisplay}</td>
          <td>${duckDisplay}</td>
          <td>${sqliteDisplay}</td>
        </tr>
      `);
      return result;
    })
    .join("\n");

  return md`
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
          ${rows}
        </tbody>
      </table>
    `;
}

function makeValibotTestCaseTableHtml() {
  const project = new Project();
  const sf = project.addSourceFileAtPath("../ormer-valibot/tests/fields.ts");
  if (!sf) throw new Error("Could not load valibot fields.ts");

  const decl = sf.getVariableDeclarationOrThrow("ALL_VALIBOT_FIELDS");
  let initializer = decl.getInitializerOrThrow();
  // Unwrap `as const` if present
  if (initializer.isKind(SyntaxKind.AsExpression)) {
    initializer = initializer
      .asKindOrThrow(SyntaxKind.AsExpression)
      .getExpression();
  }

  const objectLiteral = initializer.asKindOrThrow(
    SyntaxKind.ObjectLiteralExpression,
  );

  const rows = objectLiteral
    .getProperties()
    .flatMap((prop) => {
      const fullText = prop.getFullText();
      const text = prop.getText();
      const leadingTrivia = fullText.substring(0, fullText.indexOf(text));
      const commentMatch = leadingTrivia.match(/\/\/\s*(.+?)\s*$/m);

      const result: string[] = [];
      if (commentMatch) {
        result.push(md`
          <tr>
            <td colspan="4"><strong>${commentMatch[1]}</strong></td>
          </tr>
        `);
      }

      if (!prop.isKind(SyntaxKind.PropertyAssignment)) return result;
      const assignment = prop.asKindOrThrow(SyntaxKind.PropertyAssignment);
      const value = assignment.getInitializerOrThrow();

      if (!value.isKind(SyntaxKind.ObjectLiteralExpression)) return result;
      const inner = value.asKindOrThrow(SyntaxKind.ObjectLiteralExpression);

      const valibotProp = inner.getProperty("valibot");

      if (!valibotProp || !valibotProp.isKind(SyntaxKind.PropertyAssignment))
        return result;

      const valibotExpr = valibotProp
        .asKindOrThrow(SyntaxKind.PropertyAssignment)
        .getInitializerOrThrow();

      const propName = assignment.getName();
      const valibotDisplay = valibotSrcToDisplay(valibotExpr.getText());
      const pgCol =
        ALL_PG_FIELDS_VALIBOT[propName as keyof typeof ALL_PG_FIELDS_VALIBOT];
      const pgDisplay = pgColumnToSqlDisplay(pgCol);
      const duckCol =
        ALL_DUCKDB_FIELDS_VALIBOT[
          propName as keyof typeof ALL_DUCKDB_FIELDS_VALIBOT
        ];
      const duckDisplay = duckdbColumnToSqlDisplay(duckCol);
      const sqliteCol =
        ALL_SQLITE_FIELDS_VALIBOT[
          propName as keyof typeof ALL_SQLITE_FIELDS_VALIBOT
        ];
      const sqliteDisplay = sqliteColumnToSqlDisplay(sqliteCol);
      result.push(md`
        <tr>
          <td>${valibotDisplay}</td>
          <td>${pgDisplay}</td>
          <td>${duckDisplay}</td>
          <td>${sqliteDisplay}</td>
        </tr>
      `);
      return result;
    })
    .join("\n");

  return md`
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
          ${rows}
        </tbody>
      </table>
    `;
}

function makeArktypeTestCaseTableHtml() {
  const project = new Project();
  const sf = project.addSourceFileAtPath("../ormer-arktype/tests/fields.ts");
  if (!sf) throw new Error("Could not load arktype fields.ts");

  const decl = sf.getVariableDeclarationOrThrow("ALL_ARKTYPE_FIELDS");
  let initializer = decl.getInitializerOrThrow();
  // Unwrap `as const` if present
  if (initializer.isKind(SyntaxKind.AsExpression)) {
    initializer = initializer
      .asKindOrThrow(SyntaxKind.AsExpression)
      .getExpression();
  }

  const objectLiteral = initializer.asKindOrThrow(
    SyntaxKind.ObjectLiteralExpression,
  );

  const rows = objectLiteral
    .getProperties()
    .flatMap((prop) => {
      const fullText = prop.getFullText();
      const text = prop.getText();
      const leadingTrivia = fullText.substring(0, fullText.indexOf(text));
      const commentMatch = leadingTrivia.match(/\/\/\s*(.+?)\s*$/m);

      const result: string[] = [];
      if (commentMatch) {
        result.push(md`
          <tr>
            <td colspan="4"><strong>${commentMatch[1]}</strong></td>
          </tr>
        `);
      }

      if (!prop.isKind(SyntaxKind.PropertyAssignment)) return result;
      const assignment = prop.asKindOrThrow(SyntaxKind.PropertyAssignment);
      const value = assignment.getInitializerOrThrow();

      if (!value.isKind(SyntaxKind.ObjectLiteralExpression)) return result;
      const inner = value.asKindOrThrow(SyntaxKind.ObjectLiteralExpression);

      const arktypeProp = inner.getProperty("arktype");

      if (!arktypeProp || !arktypeProp.isKind(SyntaxKind.PropertyAssignment))
        return result;

      const arktypeExpr = arktypeProp
        .asKindOrThrow(SyntaxKind.PropertyAssignment)
        .getInitializerOrThrow();

      const propName = assignment.getName();
      const arktypeDisplay = arktypeSrcToDisplay(arktypeExpr.getText());
      const pgCol =
        ALL_PG_FIELDS_ARKTYPE[propName as keyof typeof ALL_PG_FIELDS_ARKTYPE];
      const pgDisplay = pgColumnToSqlDisplay(pgCol);
      const duckCol =
        ALL_DUCKDB_FIELDS_ARKTYPE[
          propName as keyof typeof ALL_DUCKDB_FIELDS_ARKTYPE
        ];
      const duckDisplay = duckdbColumnToSqlDisplay(duckCol);
      const sqliteCol =
        ALL_SQLITE_FIELDS_ARKTYPE[
          propName as keyof typeof ALL_SQLITE_FIELDS_ARKTYPE
        ];
      const sqliteDisplay = sqliteColumnToSqlDisplay(sqliteCol);
      result.push(md`
        <tr>
          <td>${arktypeDisplay}</td>
          <td>${pgDisplay}</td>
          <td>${duckDisplay}</td>
          <td>${sqliteDisplay}</td>
        </tr>
      `);
      return result;
    })
    .join("\n");

  return md`
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
          ${rows}
        </tbody>
      </table>
    `;
}

function generateReadmeMd() {
  let readme: string[] = [];

  readme.push(md`
    <!-- This README.md is generated from packages/ormer-docs/docs.ts. Please edit that file instead of this one. -->

    # Ormer

    This is Work In Progress!

    Made of three packages \`packages/ormer\`, \`packages/ormer-zod\` and \`packages/ormer-valibot\`. There is also old \`packages/ormer-experiments\` which is not used for other than ideas.

    ## Ormer package

    This is pure dependency free package that allows to define database schemas.

    Supported are SQLite, Postgres (pg, pglite) and DuckDB.

    To make schemas useful with databases, the input and output types should match with the schema. For example Zod schema input should match with Postgres SELECT (output) value. Likewise Zod schema output value should be usable in Postgres UPDATE and INSERT (input) value:

    Database SELECT -> Zod input -> Zod output -> Database INSERT or UPDATE.
  `);

  readme.push(md`
    ## Ormer-Zod package

    The table below is generated from the test cases in \`packages/ormer-zod/examples/fields.ts\`.

    I have patched the Zod namespace to add first \`dbPk()\` and \`dbFk()\`, etc modifiers, and make \`ZodNumberFormat\` and \`ZodBigIntFormat\` retain the format at type-level, see this [feature request](https://github.com/colinhacks/zod/issues/6045).

    To use these extension one must import the \`zod-ext.ts\` file. (To be determined how this work in practice)

    Notes:

    - Optional Zod schemas, e.g. \`z.string().optional()\`, are not supported for now. Suppose I mapped it to be nullable column, then INSERT and UPDATE would work correctly, because PG/PGLite and DuckDB converts the undefined to null on INSERT and UPDATE. Problem is when you SELECT a field with null values. They are not then assignable to Zod schema, because null doesn't validate against optional schema.
    - \`z.uint64()\` and \`z.uint32()\` have no good mapping in the Postgres.
    - \`z.bigint()\` is mapped to be INT8 in postgres, this might be incorrect for arbitrary sized bigints. If you need that use custom mapping.
    - \`z.int()\` is mapped to be INT4 in postgres, and thus not all of the IEEE 754 safe integers are valid values.
    - \`z.iso.datetime()\` can't be used, it does not allow timestamp format without a T divider. Postgres returns TIMESTAMP values as YYYY-MM-DD HH:MM:SS without the T.
    - SQLite only ha primitive datatypes, and it would need a custom serialization layer for bigint/boolean/date/array/object types, which I haven't found a good way to do yet. One idea involves using column names as a hint for custom serialization. This half-baked idea is in ormer-experiments as Kysely transformer.
  `);

  readme.push(md`
<details>
<summary>Field type mapping table</summary>
  `);
  readme.push(makeZodTestCaseTableHtml());
  readme.push(md`
</details>
  `);
  readme.push("");

  readme.push(md`
## Ormer-Valibot package
  `);

  readme.push(md`
<details>
<summary>Field type mapping table</summary>
  `);
  readme.push(makeValibotTestCaseTableHtml());
  readme.push(md`
</details>
  `);
  readme.push("");

  readme.push(md`
## Ormer-Arktype package
  `);

  readme.push(md`
<details>
<summary>Field type mapping table</summary>
  `);
  readme.push(makeArktypeTestCaseTableHtml());
  readme.push(md`
</details>
  `);

  return readme.join("\n");
}

function writeReadme() {
  // Ensure we are in the root of the project, so that README.md is generated
  // in the correct place
  if (!process.cwd().endsWith("ormer-docs")) {
    throw new Error(
      "Please run this script from the root of the project, e.g. with `npm run build` from the root",
    );
  }
  writeFileSync("../../README.md", generateReadmeMd());
}
function main() {
  writeReadme();
}

if (import.meta.main) {
  main();
}
