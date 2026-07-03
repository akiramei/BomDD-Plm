// CP-VIEW-TRACE-015 / INV-010: トレースマトリクスは client-script.js が graph.json の edge kind
// (requirement_refs / ebom_refs / acceptance_refs|verifies / trace_links) から計算する。
// ブラウザ DOM がないため client-script のレンダリングそのものは検証できないが(cheat-log 記録済み)、
// その計算が依拠する graph.json のデータ契約(kind ラベルの生成)をここで固定する。

import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, rmSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { runCli, REPO_ROOT } from "./helpers/run-cli.js";

const FIXTURE = join(REPO_ROOT, "test", "fixtures", "l1-smoke");

test("graph.json edge kinds match the labels the trace view's client script keys off of", () => {
  const out = mkdtempSync(join(tmpdir(), "bomdd-trace-ds-"));
  try {
    const res = runCli([FIXTURE, "--gate", "G3", "--format", "json", "--out", out]);
    assert.equal(res.status, 0);
    const graph = JSON.parse(readFileSync(join(out, "graph.json"), "utf8"));
    const kinds = new Set(graph.edges.map((e) => e.kind));
    assert.ok(kinds.has("requirement_refs"), "E->REQ edge kind expected for REQ column");
    assert.ok(kinds.has("ebom_refs"), "M->E edge kind expected for M-BOM column");
    assert.ok(kinds.has("acceptance_refs") || kinds.has("verifies"), "E/CP edge kind expected for CP column");
  } finally {
    rmSync(out, { recursive: true, force: true });
  }
});

test("R-010 finding targetId matches the REQ node id it should map to an uncovered cell for", () => {
  // Uses r020-multi-tracemap-independent minimal setup: a REQ with no E referencing it.
  const out = mkdtempSync(join(tmpdir(), "bomdd-trace-r010-"));
  const fixture = join(REPO_ROOT, "test", "fixtures", "workspace-cross", "repoB");
  try {
    const res = runCli([fixture, "--gate", "G3", "--format", "json", "--out", out]);
    const diag = JSON.parse(res.stdout);
    const r010 = diag.findings.find((f) => f.rule === "R-010");
    assert.ok(r010);
    assert.equal(r010.targetId, "REQ-100");
  } finally {
    rmSync(out, { recursive: true, force: true });
  }
});
