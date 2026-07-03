import type { Diagnostics, Graph, Ledger } from "./types.js";
import type { RefSchema } from "./schema/types.js";
import type { Workspace } from "./workspace/workspace.js";
export interface LintOptions {
    target: string;
    gate: string;
    eco: boolean;
    schemaDir: string;
}
export interface LintResult {
    diagnostics: Diagnostics;
    graph: Graph;
    ledger: Ledger;
    workspace: Workspace;
    schema: RefSchema;
}
export declare function runLint(opts: LintOptions): LintResult;
//# sourceMappingURL=lint.d.ts.map