import type { Diagnostics, Finding, Graph, Ledger, RepoInfo } from "../types.js";
import type { Model } from "../resolve/model.js";
import type { RefSchema } from "../schema/types.js";
export interface BuildInput {
    model: Model;
    findings: Finding[];
    gate: string;
    eco: boolean;
    refSchemaVersion: string;
    repos: RepoInfo[];
}
export declare function buildDiagnostics(input: BuildInput): Diagnostics;
export declare function buildGraph(model: Model): Graph;
export declare function buildLedger(model: Model, schema: RefSchema): Ledger;
//# sourceMappingURL=build.d.ts.map