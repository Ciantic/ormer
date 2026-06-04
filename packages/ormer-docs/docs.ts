import { Project, SyntaxKind } from "ts-morph";
import { pg, PGCOLUMN_TO_SQLTYPE } from "ormer";
import { md } from "./md.ts";
import { writeFileSync } from "fs";

/** Collapse multiline expressions into single-line for clean table display */
function compact(expr: string): string {
  return expr.replace(/\s+/g, " ").trim();
}

/**
 * Eval a pg expression (e.g. `pg.int8({ primaryKey: true, autoIncrement: true })`)
 * and return the SQL column type name (e.g. `SERIAL8`).
 */
function pgColumnToSqlDisplay(pgSrc: string): string {
  if (pgSrc.includes("ERROR")) return "<em>Not Available</em>";
  let col: any;
  try {
    col = new Function("pg", `return (${pgSrc})`)(pg);
  } catch {
    return pgSrc; // fallback to source text
  }
  if (!col || typeof col.type !== "string") return pgSrc;

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

function zodSrcToDisplay(zodSrc: string): string {
  zodSrc = zodSrc.replace(
    `z.object({ id: z.int64().dbPk() }).dbTable("users")`,
    "UserSchema",
  );
  // For now just collapse whitespace, but we could do more formatting here if needed
  return `<code>${compact(zodSrc)}</code>`;
}

function makeZodTestCaseTableHtml() {
  const project = new Project();
  const sf = project.addSourceFileAtPath("../ormer-zod/examples/fields.ts");
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
    .map((prop) => {
      if (!prop.isKind(SyntaxKind.PropertyAssignment)) return "";
      const assignment = prop.asKindOrThrow(SyntaxKind.PropertyAssignment);
      const value = assignment.getInitializerOrThrow();

      if (!value.isKind(SyntaxKind.ObjectLiteralExpression)) return "";
      const inner = value.asKindOrThrow(SyntaxKind.ObjectLiteralExpression);

      // Find the "zod" and "pg" properties
      const zodProp = inner.getProperty("zod");
      const pgProp = inner.getProperty("pg");

      if (
        !zodProp ||
        !pgProp ||
        !zodProp.isKind(SyntaxKind.PropertyAssignment) ||
        !pgProp.isKind(SyntaxKind.PropertyAssignment)
      )
        return "";

      const zodExpr = zodProp
        .asKindOrThrow(SyntaxKind.PropertyAssignment)
        .getInitializerOrThrow();
      const pgExpr = pgProp
        .asKindOrThrow(SyntaxKind.PropertyAssignment)
        .getInitializerOrThrow();

      const zodDisplay = zodSrcToDisplay(zodExpr.getText());
      const pgDisplay = pgColumnToSqlDisplay(compact(pgExpr.getText()));
      return md`
        <tr>
          <td>${zodDisplay}</td>
          <td>${pgDisplay}</td>
          <td><code></code></td>
          <td><code></code></td>
        </tr>
      `;
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

function generateReadmeMd() {
  let readme: string[] = [];

  readme.push(md`
    <!-- This README.md is generated from packages/ormer-docs/docs.ts. Please edit that file instead of this one. -->

    # Ormer

    This is Work In Progress!

    Made of two packages \`packages/ormer\` and \`packages/ormer-zod\`. There is also old \`packages/ormer-experiments\` which is not used for other than ideas.

    ## Ormer package

    This is pure dependency free package that allows to define database schemas.

    Supported are SQLite, Postgres (pg, pglite) and DuckDB.
  `);

  readme.push(md`
    ## Ormer-Zod package

    The table below is generated from the test cases in \`packages/ormer-zod/src/zod-examples.ts\`.

    I have patched the Zod namespace to add first \`dbPk()\` and \`dbFk()\`, etc modifiers, and make \`ZodNumberFormat\` and \`ZodBigIntFormat\` retain the format at type-level, see this [feature request](https://github.com/colinhacks/zod/issues/6045).

    To use these extension one must import the \`zod-ext.ts\` file. (To be determined how this work in practice)

    Notes:

    - Optional Zod schemas, e.g. \`z.string().optional()\`, are not supported for now. Suppose I mapped it to be nullable column, then INSERT and UPDATE would work correctly, because PG/PGLite and DuckDB converts the undefined to null on INSERT and UPDATE. Problem is when you SELECT a field with null values. They are not then assignable to Zod schema, because null doesn't validate against optional schema.
    - \`z.uint64()\` and \`z.uint32()\` have no good mapping in the Postgres.
    - \`z.bigint()\` is mapped to be INT8 in postgres, this might be incorrect for arbitrary sized bigints. If you need that use custom mapping.
    - \`z.int()\` is mapped to be INT4 in postgres, and thus not all of the IEEE 754 safe integers are valid values.
  `);

  readme.push(makeZodTestCaseTableHtml());

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
