// CP-LINT-007 / R-020 (ui-surface-has-cad): UI surface 品目が workspace 内いずれかの
// ui-trace-map.json からも参照されていない場合に検出。複数 trace-map 存在時の網羅を検証。

import { test } from "node:test";
import assert from "node:assert/strict";
import { runCli, REPO_ROOT } from "./helpers/run-cli.js";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

const FIXTURE = join(REPO_ROOT, "test", "fixtures", "r020-multi-tracemap");

test("R-020: item referenced by one of several trace-maps is NOT flagged", () => {
  const out = mkdtempSync(join(tmpdir(), "bomdd-r020-covered-"));
  try {
    const res = runCli([FIXTURE, "--gate", "G3", "--format", "json", "--out", out]);
    const diag = JSON.parse(res.stdout);
    const r020 = diag.findings.filter((f) => f.rule === "R-020");
    assert.equal(r020.some((f) => f.targetId === "E-UI-COVERED-001"), false);
  } finally {
    rmSync(out, { recursive: true, force: true });
  }
});

test("R-020: item referenced by no trace-map across the workspace is flagged", () => {
  const out = mkdtempSync(join(tmpdir(), "bomdd-r020-uncovered-"));
  try {
    const res = runCli([FIXTURE, "--gate", "G3", "--format", "json", "--out", out]);
    const diag = JSON.parse(res.stdout);
    const r020 = diag.findings.filter((f) => f.rule === "R-020");
    assert.equal(r020.length, 1);
    assert.equal(r020[0].targetId, "E-UI-UNCOVERED-002");
  } finally {
    rmSync(out, { recursive: true, force: true });
  }
});
