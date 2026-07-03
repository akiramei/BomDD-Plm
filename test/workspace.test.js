// CP-WORKSPACE-006: 2リポ fixture で解決/skip/R-002 衝突の3分岐(exact)。

import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { runCli, REPO_ROOT } from "./helpers/run-cli.js";

const REPO_B = join(REPO_ROOT, "test", "fixtures", "workspace-cross", "repoB");
const WS_FILE = join(REPO_ROOT, "test", "fixtures", "workspace-cross", "ws.yaml");

test("workspace: single-repo run treats a cross_repo edge as X-XREPO-001 (info, skip)", () => {
  const out = mkdtempSync(join(tmpdir(), "bomdd-ws-single-"));
  try {
    const res = runCli([REPO_B, "--format", "json", "--out", out]);
    const diag = JSON.parse(res.stdout);
    const xrepo = diag.findings.filter((f) => f.rule === "X-XREPO-001");
    assert.equal(xrepo.length, 1);
    assert.equal(xrepo[0].severity, "info");
    assert.doesNotMatch(xrepo[0].message, /^$/);
  } finally {
    rmSync(out, { recursive: true, force: true });
  }
});

test("workspace: multi-repo run resolves the cross_repo edge and detects R-002 across repos", () => {
  const out = mkdtempSync(join(tmpdir(), "bomdd-ws-multi-"));
  try {
    const res = runCli([WS_FILE, "--format", "json", "--out", out]);
    const diag = JSON.parse(res.stdout);

    // No X-XREPO-001 now that repoA (which defines E family) is present.
    assert.equal(diag.findings.filter((f) => f.rule === "X-XREPO-001").length, 0);

    // R-002: one finding per definition site (rev1 counting rule) => exactly 2 for REQ-100.
    const r002 = diag.findings.filter((f) => f.rule === "R-002" && f.targetId === "REQ-100");
    assert.equal(r002.length, 2);
    const files = r002.map((f) => f.file).sort();
    assert.deepEqual(files, ["repoA/bomdd/10-requirements.yaml", "repoB/bomdd/10-requirements.yaml"]);

    // workspace.repos in diagnostics carries name+role only (no path — INV-003).
    assert.deepEqual(diag.workspace.repos, [
      { name: "repoA", role: "manufacturing" },
      { name: "repoB", role: "ui-cad" },
    ]);
  } finally {
    rmSync(out, { recursive: true, force: true });
  }
});
