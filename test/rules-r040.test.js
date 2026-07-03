// CP-LINT-007 / R-040 (active-graph-integrity): superseded/retired 品目への active 参照を検出。
// lineage.* 経由の参照(supersedes/superseded_by)は除外される(§2.4 isLineage / ref-v0 note)。

import { test } from "node:test";
import assert from "node:assert/strict";
import { runCli, REPO_ROOT } from "./helpers/run-cli.js";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

const FIXTURE = join(REPO_ROOT, "test", "fixtures", "r040-lineage");

test("R-040: active depends_on reference to a superseded item is flagged", () => {
  const out = mkdtempSync(join(tmpdir(), "bomdd-r040-"));
  try {
    const res = runCli([FIXTURE, "--gate", "always", "--format", "json", "--out", out]);
    const diag = JSON.parse(res.stdout);
    const r040 = diag.findings.filter((f) => f.rule === "R-040");
    assert.equal(r040.length, 1);
    assert.equal(r040[0].targetId, "E-ACTIVE-CALLER-001");
    assert.match(r040[0].message, /E-OLD-001/);
  } finally {
    rmSync(out, { recursive: true, force: true });
  }
});

test("R-040: lineage.supersedes / lineage.superseded_by edges do not themselves trigger R-040", () => {
  const out = mkdtempSync(join(tmpdir(), "bomdd-r040-lineage-excl-"));
  try {
    const res = runCli([FIXTURE, "--gate", "always", "--format", "json", "--out", out]);
    const diag = JSON.parse(res.stdout);
    const r040 = diag.findings.filter((f) => f.rule === "R-040");
    // Only the depends_on-based finding should exist — not one for E-NEW-001's lineage.supersedes edge.
    assert.equal(r040.filter((f) => f.targetId === "E-NEW-001").length, 0);
  } finally {
    rmSync(out, { recursive: true, force: true });
  }
});
