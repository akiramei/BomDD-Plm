// CP-SUPPRESS-009: 降格(+exit 変化)・reason 転記・理由なし無効(X-SUPPRESS-001)・
// 死抑制(X-SUPPRESS-002)・パス target の case-insensitive 同定。

import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { runCli, REPO_ROOT } from "./helpers/run-cli.js";

const DIR = join(REPO_ROOT, "test", "fixtures", "suppress-basic");

function run(wsName, tmpPrefix) {
  const out = mkdtempSync(join(tmpdir(), tmpPrefix));
  try {
    const res = runCli([join(DIR, wsName), "--gate", "G3", "--format", "json", "--out", out]);
    return { res, diag: JSON.parse(res.stdout) };
  } finally {
    rmSync(out, { recursive: true, force: true });
  }
}

test("suppress: valid ID-target suppress demotes error to info and flips exit to 0", () => {
  const { res, diag } = run("ws-valid.yaml", "bomdd-sup-valid-");
  assert.equal(res.status, 0);
  const r010 = diag.findings.find((f) => f.rule === "R-010");
  assert.equal(r010.severity, "info");
  assert.equal(r010.suppressed, true);
  assert.equal(r010.suppressReason, "既知の未実装(次スプリント対応予定)");
  assert.equal(r010.suppressRef, "ws-valid.yaml#suppress[0]");
});

test("suppress: empty reason invalidates the row (X-SUPPRESS-001, error, exit 1)", () => {
  const { res, diag } = run("ws-invalid-reason.yaml", "bomdd-sup-invreason-");
  assert.equal(res.status, 1);
  const r010 = diag.findings.find((f) => f.rule === "R-010");
  assert.equal(r010.suppressed, undefined);
  assert.equal(r010.severity, "error");
  const xsup = diag.findings.find((f) => f.rule === "X-SUPPRESS-001");
  assert.equal(xsup.severity, "error");
  assert.match(xsup.message, /suppress\[0\]/);
});

test("suppress: a row matching no finding is a dead suppress (X-SUPPRESS-002, warn)", () => {
  const { res, diag } = run("ws-dead.yaml", "bomdd-sup-dead-");
  assert.equal(res.status, 1); // R-010 remains error, unaffected by the dead suppress row
  const xsup = diag.findings.find((f) => f.rule === "X-SUPPRESS-002");
  assert.equal(xsup.severity, "warn");
  assert.match(xsup.message, /死んだ抑制/);
});

test("suppress: path target matches case-insensitively (INV-004 identity)", () => {
  const { res, diag } = run("ws-path-target.yaml", "bomdd-sup-path-");
  assert.equal(res.status, 0);
  const r010 = diag.findings.find((f) => f.rule === "R-010");
  assert.equal(r010.suppressed, true);
});
