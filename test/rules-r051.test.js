// CP-LINT-007 / R-051 (eco-impact-ids-resolve, ref-v0.2 専用規則エッジ):
// change-register.yaml の affected_refs 不解決は R-051(gate=eco)でのみ所見化し、
// 汎用 R-003(always)から除外する(初回製造で2工場とも二重計上に落ちた欠陥の補正 — ref-edges note)。

import { test } from "node:test";
import assert from "node:assert/strict";
import { runCli, REPO_ROOT } from "./helpers/run-cli.js";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

const FIXTURE = join(REPO_ROOT, "test", "fixtures", "r051-eco-impact");

test("R-051: unresolved affected_refs id is reported as R-051 (gate=eco), not R-003", () => {
  const out = mkdtempSync(join(tmpdir(), "bomdd-r051-"));
  try {
    const res = runCli([FIXTURE, "--gate", "always", "--format", "json", "--out", out]);
    const diag = JSON.parse(res.stdout);
    // diagnostics.json always carries all findings regardless of --gate/--eco (§2.7).
    const r051 = diag.findings.filter((f) => f.rule === "R-051");
    assert.equal(r051.length, 1);
    assert.equal(r051[0].gate, "eco");
    assert.equal(r051[0].targetId, "ECO-100");
    assert.match(r051[0].message, /E-NOTFOUND-999/);
    // No R-003 duplicate for the same unresolved value (dedicated-rule-edge exclusivity).
    assert.equal(diag.findings.filter((f) => f.rule === "R-003").length, 0);
  } finally {
    rmSync(out, { recursive: true, force: true });
  }
});

test("R-051: exit code only reflects R-051 when --eco is passed (gate=eco is orthogonal to the ladder)", () => {
  const outA = mkdtempSync(join(tmpdir(), "bomdd-r051-noeco-"));
  const outB = mkdtempSync(join(tmpdir(), "bomdd-r051-eco-"));
  try {
    const rNoEco = runCli([FIXTURE, "--gate", "always", "--out", outA]);
    const rEco = runCli([FIXTURE, "--gate", "always", "--eco", "--out", outB]);
    assert.equal(rNoEco.status, 0);
    assert.equal(rEco.status, 1);
  } finally {
    rmSync(outA, { recursive: true, force: true });
    rmSync(outB, { recursive: true, force: true });
  }
});
