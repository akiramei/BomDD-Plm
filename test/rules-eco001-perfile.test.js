// CP-LINT-007 / ECO-001 (S-21): R-002 per-file uniqueness scope (§2.5 rev2 / ref-v0.4).
// A define site declaring `uniqueness_scope: per-file` (ui-ir.json tempPartNo / uiId) has its
// R-002 duplicate check scoped to the extracting file:
//   - intra-file duplicate  => R-002 fires (one finding per def site)
//   - same name across files => legal, no R-002 (画面別 IR の独立採番)
//   - a define site WITHOUT the declaration keeps workspace-global scope (fires cross-file)
//   - the ID index (reference resolution) stays workspace-global (per-file ID still resolves)

import { test } from "node:test";
import assert from "node:assert/strict";
import { runCli, REPO_ROOT } from "./helpers/run-cli.js";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

const FIXTURE = join(REPO_ROOT, "test", "fixtures", "eco001-perfile");

function lintPerFile() {
  const out = mkdtempSync(join(tmpdir(), "bomdd-eco001-perfile-"));
  try {
    const res = runCli([FIXTURE, "--format", "json", "--out", out]);
    return JSON.parse(res.stdout);
  } finally {
    rmSync(out, { recursive: true, force: true });
  }
}

function r002For(diag, targetId) {
  return diag.findings.filter((f) => f.rule === "R-002" && f.targetId === targetId);
}

test("S-21: per-file intra-file duplicate fires R-002 (one finding per def site, all in that file)", () => {
  const diag = lintPerFile();
  // TMP-UI-SCR-0001 appears twice in ir-a/ui-ir.json (single file) => 2 R-002 findings, both in ir-a.
  const dup = r002For(diag, "TMP-UI-SCR-0001");
  assert.equal(dup.length, 2);
  const files = new Set(dup.map((f) => f.file));
  assert.equal(files.size, 1);
  assert.ok([...files][0].endsWith("ir-a/ui-ir.json"));
});

test("S-21: same per-file-scoped name across different files is legal (no R-002)", () => {
  const diag = lintPerFile();
  // TMP-UI-SCR-0002 appears once in ir-a and once in ir-b => no R-002 (cross-file independence).
  assert.equal(r002For(diag, "TMP-UI-SCR-0002").length, 0);
});

test("S-21: a define site without uniqueness_scope keeps global scope (cross-file duplicate fires)", () => {
  const diag = lintPerFile();
  // TL-DUP (trace_id, distributed_defines, no per-file declaration) is duplicated across ir-a and
  // ir-b => workspace-global R-002 still fires: one finding per def site (2 total, one per file).
  const dup = r002For(diag, "TL-DUP");
  assert.equal(dup.length, 2);
  const files = dup.map((f) => f.file.replace(/^.*\/ui\//, "")).sort();
  assert.deepEqual(files, ["ir-a/ui-ir.json", "ir-b/ui-ir.json"]);
});

test("S-21: per-file-scoped IDs still resolve via the global index (references are not R-003)", () => {
  const diag = lintPerFile();
  // ui-bom.json references TMP-UI-SCR-0001 and TMP-UI-SCR-0002; both resolve via the global index
  // even though those define sites are per-file-scoped for R-002.
  assert.equal(diag.findings.filter((f) => f.rule === "R-003").length, 0);
});
