// Top-level lint orchestration. Pure of process concerns (no process.exit / stdout).

import { readFileSync } from "node:fs";
import type { Diagnostics, Graph, Ledger } from "./types.js";
import type { RefSchema } from "./schema/types.js";
import { loadSchema } from "./schema/load.js";
import { discover } from "./discover/discover.js";
import { parseArtifact } from "./parse/parse.js";
import type { ParsedArtifact } from "./resolve/model.js";
import { buildModel } from "./resolve/model.js";
import { evaluate } from "./rules/evaluate.js";
import { applySuppress } from "./suppress/suppress.js";
import { buildDiagnostics, buildGraph, buildLedger } from "./output/build.js";
import { resolveWorkspace } from "./workspace/workspace.js";
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

export function runLint(opts: LintOptions): LintResult {
  const workspace = resolveWorkspace(opts.target);
  const schema = loadSchema(opts.schemaDir);
  const artifacts = discover(workspace.repos, schema);

  const parsed: ParsedArtifact[] = [];
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
  const allFindings = [...parseFindings, ...ruleFindings];

  const suppressed = applySuppress(
    allFindings,
    workspace.suppress,
    workspace.workspaceFileCanonical
  );

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
