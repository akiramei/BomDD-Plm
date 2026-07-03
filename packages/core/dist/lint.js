// Top-level lint orchestration. Pure of process concerns (no process.exit / stdout).
import { readFileSync } from "node:fs";
import { loadSchema } from "./schema/load.js";
import { discover } from "./discover/discover.js";
import { parseArtifact } from "./parse/parse.js";
import { buildModel } from "./resolve/model.js";
import { evaluate } from "./rules/evaluate.js";
import { evaluateR052 } from "./rules/r052.js";
import { applySuppress } from "./suppress/suppress.js";
import { buildDiagnostics, buildGraph, buildLedger } from "./output/build.js";
import { resolveWorkspace } from "./workspace/workspace.js";
export function runLint(opts) {
    const workspace = resolveWorkspace(opts.target);
    const schema = loadSchema(opts.schemaDir);
    const artifacts = discover(workspace.repos, schema);
    const parsed = [];
    const parseFindings = [];
    for (const art of artifacts) {
        const raw = readFileSync(art.absPath);
        const res = parseArtifact(art, raw);
        parseFindings.push(...res.findings);
        // Include artifact in the model even if parse failed (doc may be undefined) — .md returns doc.
        parsed.push({ artifact: art, doc: res.doc, lineOf: res.lineOf });
    }
    const model = buildModel(parsed, schema, workspace.repos);
    const ruleFindings = evaluate(model);
    // R-052 (§2.17) requires git I/O and is opt-in at the --eco boundary — excluded from the
    // always-evaluate rule set in evaluate() (§2.6 note) and evaluated here instead.
    const r052Findings = evaluateR052(model, workspace.repos, opts.eco);
    const allFindings = [...parseFindings, ...ruleFindings, ...r052Findings];
    const suppressed = applySuppress(allFindings, workspace.suppress, workspace.workspaceFileCanonical);
    const diagnostics = buildDiagnostics({
        model,
        findings: suppressed.findings,
        gate: opts.gate,
        eco: opts.eco,
        refSchemaVersion: schema.grammarVersion,
        repos: workspace.repos.map((r) => (r.role !== undefined ? { name: r.name, role: r.role } : { name: r.name })),
    });
    const graph = buildGraph(model);
    const ledger = buildLedger(model, schema);
    return { diagnostics, graph, ledger, workspace, schema };
}
