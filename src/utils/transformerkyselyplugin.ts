import * as k from "npm:kysely";
import * as v from "npm:valibot";

type ValibotSchema = v.BaseSchema<unknown, unknown, v.BaseIssue<unknown>>;
type TableName = string;
type ColumnName = string;

type DatabaseSerializerMapping = Record<
    TableName,
    Record<
        ColumnName,
        {
            from: ValibotSchema;
            to: ValibotSchema;
        }
    >
>;

export class TransformerKyselyPlugin implements k.KyselyPlugin {
    private transformer: Transformer;

    constructor(private mapping: DatabaseSerializerMapping) {
        this.transformer = new Transformer(mapping);
    }

    transformQuery(args: k.PluginTransformQueryArgs): k.RootOperationNode {
        return this.transformer.transformNode(args.node);
    }

    transformResult(args: k.PluginTransformResultArgs): Promise<k.QueryResult<k.UnknownRow>> {
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
    constructor(private mapping: DatabaseSerializerMapping) {
        // console.log(mapping);
        super();
    }

    protected override transformPrimitiveValueList(
        node: k.PrimitiveValueListNode
    ): k.PrimitiveValueListNode {
        console.log(node);
        return node;
    }

    protected override transformValue(node: k.ValueNode): k.ValueNode {
        console.log(node);
        return node;
    }

    protected override transformColumnUpdate(node: k.ColumnUpdateNode): k.ColumnUpdateNode {
        // Note: Used in UPDATE and ON CONFLICT UPDATE
        console.log(node);
        return node;
    }

    private mapValue(tableName: string, columnName: string, value: unknown) {
        const schema = this.mapping?.[tableName]?.[columnName]?.to;
        if (schema) {
            const res = v.safeParse(schema, value);
            if (res.success) {
                console.info(
                    `Value ${debugLogValue(value)} mapped to ${debugLogValue(res.output)}`
                );
                return res.output;
            } else {
                console.error(res.issues);
            }
        } else {
            console.warn(`Table "${tableName}" or column "${columnName}" not found`);
        }
        return value;
    }

    protected override transformInsertQuery(node: k.InsertQueryNode): k.InsertQueryNode {
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
                    const columnName = node.columns?.[i].column.name;

                    if (tableName && columnName) {
                        return this.mapValue(tableName, columnName, value);
                    } else {
                        console.warn("Table or column name not found");
                    }
                });

                return {
                    ...node,
                    values: k.ValuesNode.create([k.PrimitiveValueListNode.create(newValues)]),
                };
            }
        }

        return node;
    }

    protected override transformUpdateQuery(node: k.UpdateQueryNode): k.UpdateQueryNode {
        console.log(node);
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
