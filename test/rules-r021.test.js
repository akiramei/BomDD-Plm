// CP-LINT-007 / R-021 (design-system-sync) + candidate 定義 fallback 意味論 (ref-v0.2):
// 35-design-system-bom の ebom_surface_parts[].id が 30-ebom.items にも存在すれば R-021 は発火しない。
// candidate:true の定義サイトは R-002 一意性検査の対象外(30 と 35 の二重定義であっても R-002 は出ない)。

import { test } from "node:test";
import assert from "node:assert/strict";
import { runCli, REPO_ROOT } from "./helpers/run-cli.js";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

const FIXTURE = join(REPO_ROOT, "test", "fixtures", "r021-candidate");

test("R-021: part present in both 30-ebom and 35-design-system-bom is not flagged", () => {
  const out = mkdtempSync(join(tmpdir(), "bomdd-r021-synced-"));
  try {
    const res = runCli([FIXTURE, "--gate", "G3", "--format", "json", "--out", out]);
    const diag = JSON.parse(res.stdout);
    const r021 = diag.findings.filter((f) => f.rule === "R-021");
    assert.equal(r021.some((f) => f.targetId === "E-DESIGN-SYNCED-001"), false);
  } finally {
    rmSync(out, { recursive: true, force: true });
  }
});

test("R-021: part present only in 35-design-system-bom (not synced to 30) is flagged", () => {
  const out = mkdtempSync(join(tmpdir(), "bomdd-r021-missing-"));
  try {
    const res = runCli([FIXTURE, "--gate", "G3", "--format", "json", "--out", out]);
    const diag = JSON.parse(res.stdout);
    const r021 = diag.findings.filter((f) => f.rule === "R-021");
    assert.equal(r021.length, 1);
    assert.equal(r021[0].targetId, "E-DESIGN-MISSING-002");
  } finally {
    rmSync(out, { recursive: true, force: true });
  }
});

test("candidate definitions (35's ebom_surface_parts) are exempt from R-002, even when duplicated with 30", () => {
  const out = mkdtempSync(join(tmpdir(), "bomdd-r021-noR002-"));
  try {
    const res = runCli([FIXTURE, "--gate", "always", "--format", "json", "--out", out]);
    const diag = JSON.parse(res.stdout);
    assert.equal(diag.findings.filter((f) => f.rule === "R-002").length, 0);
  } finally {
    rmSync(out, { recursive: true, force: true });
  }
});
