import * as k from "npm:kysely";

export class ParseOrmer implements k.KyselyPlugin {
    transformQuery(args: k.PluginTransformQueryArgs): k.RootOperationNode {
        return args.node;
    }

    async transformResult(args: k.PluginTransformResultArgs): Promise<k.QueryResult<k.UnknownRow>> {
        args.result.rows;
        for (const element of args.result.rows) {
            // TODO: Read database tables and columns, and modify the result
            element["foo"] = "JOHN";
        }
        return args.result;
    }
}
