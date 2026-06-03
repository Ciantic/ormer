import { Project, SyntaxKind } from "ts-morph";
import { md } from "./md.ts";
import { writeFileSync } from "fs";

/** Collapse multiline expressions into single-line for clean table display */
function compact(expr: string): string {
  return expr.replace(/\s+/g, " ").trim();
}

function makeZodTestCaseTableHtml() {
  const project = new Project();
  const sf = project.addSourceFileAtPath("../ormer-zod/src/zod-examples.ts");
  if (!sf) throw new Error("Could not load zod-examples.ts");

  const decl = sf.getVariableDeclarationOrThrow("ZOD_EXAMPLES");
  let initializer = decl.getInitializerOrThrow();
  // Unwrap `as const` if present
  if (initializer.isKind(SyntaxKind.AsExpression)) {
    initializer = initializer
      .asKindOrThrow(SyntaxKind.AsExpression)
      .getExpression();
  }

  const arrayLiteral = initializer.asKindOrThrow(
    SyntaxKind.ArrayLiteralExpression,
  );

  const rows = arrayLiteral
    .getElements()
    .map((element, index) => {
      // Each element is an arrow function: () => [zodExpr, pgExpr] as const
      //
      // For example: () => [z.string(), pg.text()] as const
      if (!element.isKind(SyntaxKind.ArrowFunction)) return "";
      let body = element.asKindOrThrow(SyntaxKind.ArrowFunction).getBody();
      if (!body) return "";

      // Unwrap `as const` if present
      if (body.isKind(SyntaxKind.AsExpression)) {
        body = body.asKindOrThrow(SyntaxKind.AsExpression).getExpression();
      }

      if (!body.isKind(SyntaxKind.ArrayLiteralExpression)) return "";

      const [zodExpr, pgExpr] = body
        .asKindOrThrow(SyntaxKind.ArrayLiteralExpression)
        .getElements();

      if (!zodExpr || !pgExpr) return "";
      const zodSrc = compact(zodExpr.getText());
      const pgSrc = compact(pgExpr.getText());
      return `
        <tr>
          <td>${index}</td>
          <td><code>${zodSrc}</code></td>
          <td><code>${pgSrc}</code></td>
        </tr>
      `;
    })
    .join("\n");

  return md`
      <table>
        <thead>
          <tr>
            <th>Index</th>
            <th>Zod Schema</th>
            <th>Expected Column</th>
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

    Made of two packages \`packages/ormer\` and \`packages/ormer-zod\`. There is also old \`packages/ormer-experiments\` which is not used for other than ideas.

    ## Ormer package

    This is pure dependency free package that allows to define database schemas.

    Supported are SQLite, Postgres (pg, pglite) and DuckDB.
  `);

  readme.push(md`
    ## Ormer-Zod package

    The table below is generated from the test cases in \`packages/ormer-zod/src/zod-examples.ts\`, which are used for testing the \`derivePgColumn\` function. Each row corresponds to a test case, showing the Zod schema and the expected Ormer column definition.
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
