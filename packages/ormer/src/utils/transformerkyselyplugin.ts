import type { StandardSchemaV1 } from "@standard-schema/spec";
import * as k from "kysely";

type UnknownSchema = StandardSchemaV1<unknown, unknown>;
type TableName = string;
type ColumnName = string;

type DatabaseSerializerMapping = Record<
  TableName,
  Record<
    ColumnName,
    {
      from: UnknownSchema;
      to: UnknownSchema;
    }
  >
>;

export class TransformerKyselyPlugin implements k.KyselyPlugin {
  private transformer: Transformer;
  private mapping: DatabaseSerializerMapping;

  constructor(mapping: DatabaseSerializerMapping) {
    this.mapping = mapping;
    this.transformer = new Transformer(mapping);
  }

  transformQuery(args: k.PluginTransformQueryArgs): k.RootOperationNode {
    return this.transformer.transformNode(args.node);
  }

  transformResult(
    args: k.PluginTransformResultArgs,
  ): Promise<k.QueryResult<k.UnknownRow>> {
    // TODO: Use the mapping to transform the result
    // Field `from`
    return Promise.resolve(args.result);
  }
}

function debugLogValue(value: unknown) {
  try {
    return JSON.stringify(value);
  } catch (_e) {
    return "" + value;
  }
}

class Transformer extends k.OperationNodeTransformer {
  private mapping: DatabaseSerializerMapping;
  constructor(mapping: DatabaseSerializerMapping) {
    super();
    this.mapping = mapping;
  }

  protected override transformPrimitiveValueList(
    node: k.PrimitiveValueListNode,
  ): k.PrimitiveValueListNode {
    // console.log(node);
    return node;
  }

  protected override transformValue(node: k.ValueNode): k.ValueNode {
    // console.log(node);
    return node;
  }

  protected override transformColumnUpdate(
    node: k.ColumnUpdateNode,
  ): k.ColumnUpdateNode {
    // Note: Used in UPDATE and ON CONFLICT UPDATE
    // console.log(node);
    return node;
  }

  private mapValue(tableName: string, columnName: string, value: unknown) {
    const schema = this.mapping?.[tableName]?.[columnName]?.to;
    if (schema) {
      // const res = v.safeParse(schema, value);
      const res = schema["~standard"].validate(value);
      if (res instanceof Promise) {
        throw new Error("Async validation not supported yet");
      }

      if (!res.issues) {
        // console.info(
        //     `Value ${debugLogValue(value)} mapped to ${debugLogValue(res.output)}`
        // );
        return res.value;
      } else {
        console.error("Errors found", res.issues);
      }
    } else {
      console.warn(`Table "${tableName}" or column "${columnName}" not found`);
    }
    return value;
  }

  protected override transformInsertQuery(
    node: k.InsertQueryNode,
  ): k.InsertQueryNode {
    const tableName = node.into?.table.identifier.name;

    // Get columns and values from the query
    if (node.values?.kind && node.values.kind === "ValuesNode") {
      const valuesNode = node.values as k.ValuesNode;
      if (valuesNode.values.length === 1) {
        const primitiveList = valuesNode.values[0] as k.PrimitiveValueListNode;
        if (primitiveList.kind !== "PrimitiveValueListNode") {
          return node;
        }

        const newValues = primitiveList.values.map((value, i) => {
          const columnName = node.columns?.[i]?.column.name;

          if (tableName && columnName) {
            return this.mapValue(tableName, columnName, value);
          } else {
            console.warn("Table or column name not found");
          }
        });

        return {
          ...node,
          values: k.ValuesNode.create([
            k.PrimitiveValueListNode.create(newValues),
          ]),
        };
      }
    }

    return node;
  }

  protected override transformUpdateQuery(
    node: k.UpdateQueryNode,
  ): k.UpdateQueryNode {
    // console.log(node);
    return node;
  }

  // override transformNode<T extends k.OperationNode | undefined>(node: T): T {
  //     console.log(node);
  //     return node;
  // }

  // protected override transformSetOperation(node: k.SetOperationNode): k.SetOperationNode {
  //     console.log(node);
  //     return node;
  // }
}
