import * as s from "../../simplevalidation.ts";
import { describe, it, expect, beforeAll, afterAll } from "vitest";
import pg from "pg";
import { PG_TYPE_MAPPING } from "../mappings/pg.ts";
import type { StandardSchemaV1 } from "@standard-schema/spec";
import { typedValidate } from "../../simplevalidation.ts";
import { type PostgresType, type PostgresTypeBuilder } from "../types.ts";
import { startContainer } from "./test-container.ts";
import { table } from "../../table.ts";

export type TestTable = Record<
  string,
  {
    type: PostgresType;
    input: any;
    output?: any;
    buggyOutputSchema?: StandardSchemaV1<any, any>;
  }
>;

interface Opts {
  table: TestTable;
  mapping: PostgresTypeBuilder<{
    input: StandardSchemaV1;
    output: StandardSchemaV1;
  }>;
  exec(sql: string): Promise<void>;
  query(sql: string, params?: any[]): Promise<{ rows: Record<string, any>[] }>;
}

export async function runMappingTest(opts: Opts) {
  const createTableSql = `
      CREATE TABLE test_pg (
        ${Object.entries(opts.table)
          .map(([columnName, { type }]) => `"${columnName}" ${type} NOT NULL`)
          .join(",\n        ")}
      );
    `;
  await opts.query(createTableSql);

  const insertValue = Object.fromEntries(
    Object.entries(opts.table).map(([columnName, { input: value }]) => [
      columnName,
      value,
    ]),
  );

  const expectValue = Object.fromEntries(
    Object.entries(opts.table).map(
      ([columnName, p]: [string, { output?: any; input: any }]) => [
        columnName,
        p.output ?? p.input,
      ],
    ),
  );

  // Insert
  const columns = Object.keys(insertValue);
  const placeholders = columns.map((_, i) => `$${i + 1}`).join(", ");
  await opts.query(
    `INSERT INTO test_pg (${columns.join(", ")}) VALUES (${placeholders})`,
    Object.values(insertValue),
  );

  // Select
  const result = await opts.query(`SELECT * FROM test_pg`);
  const row = result.rows[0] as Record<string, any>;
  expect(row).toMatchObject(expectValue);

  // Validate against mapping
  Object.entries(opts.table).forEach(
    ([columnName, { type, input, buggyOutputSchema }]) => {
      const key = type as keyof typeof opts.mapping;
      let mapping = opts.mapping[key];
      const isArrayType = type.endsWith("[]");
      const baseTypeMatch = type.match(/^(\w+)/)?.[1];
      const decimalMatch = type.match(/^decimal\((\d+),\s*(\d+)\)/);
      const varcharMatch = type.match(/^varchar\((\d+)\)/);
      const charMatch = type.match(/^char\((\d+)\)/);
      const bitMatch = type.match(/^bit\((\d+)\)/);
      const varbitMatch = type.match(/^varbit\((\d+)\)/);
      if (baseTypeMatch && baseTypeMatch in opts.mapping) {
        mapping = opts.mapping[baseTypeMatch as keyof typeof opts.mapping];
      }

      if (decimalMatch) {
        mapping = () =>
          opts.mapping?.["decimal"]?.({
            precision: Number(decimalMatch[1]),
            scale: Number(decimalMatch[2]),
          })!;
      } else if (varcharMatch) {
        mapping = () =>
          opts.mapping?.["varchar"]?.({ maxLength: Number(varcharMatch[1]) })!;
      } else if (charMatch) {
        mapping = () =>
          opts.mapping?.["char"]?.({ length: Number(charMatch[1]) })!;
      } else if (bitMatch) {
        mapping = () =>
          opts.mapping?.["bit"]?.({ length: Number(bitMatch[1]) })!;
      } else if (varbitMatch) {
        mapping = () =>
          opts.mapping?.["varbit"]?.({ maxLength: Number(varbitMatch[1]) })!;
      }

      if (typeof mapping !== "function") {
        throw new Error(`No mapping found for type "${type}"`);
      }
      if (isArrayType) {
        const innerMapping = mapping();
        mapping = () => s.ioarray(innerMapping);
      }

      if (buggyOutputSchema) {
        const inputSchema = mapping().input;
        mapping = () => ({
          input: inputSchema,
          output: buggyOutputSchema,
        });
      }

      let schemas: {
        input: StandardSchemaV1<any, any>;
        output: StandardSchemaV1<any, any>;
      } = mapping();

      const inputResult = typedValidate(schemas.input, input);
      expect(
        inputResult.issues,
        `Input validation failed for column "${columnName}"`,
      ).toBeUndefined();

      const result = typedValidate(schemas.output, row[columnName]);
      expect(
        result.issues,
        `Output validation failed for column "${columnName}"`,
      ).toBeUndefined();
    },
  );
}
