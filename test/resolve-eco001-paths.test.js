// CP-RESOLVE-005 / ECO-001 (S-20): path acceptance forms (§2.4 rev2 / ref-v0.4, PD-7/PD-8).
// Three acceptance forms for path values (kind: path / id-or-path ② / path-at-rev part):
//   1. canonical `<repo>/<rel>`  2. repo-relative `<rel>` (any segment count, file/dir)
//   3. `repo:rel` (== canonical; repo name absent => unresolved, NO fallback to form 2)
// Fixture repo name (single-repo run) = directory name "eco001-paths".

import { test } from "node:test";
import assert from "node:assert/strict";
import { runCli, REPO_ROOT } from "./helpers/run-cli.js";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

const FIXTURE = join(REPO_ROOT, "test", "fixtures", "eco001-paths");

/** Run the fixture once and return the parsed diagnostics.json (stdout). */
function lintPaths() {
  const out = mkdtempSync(join(tmpdir(), "bomdd-eco001-paths-"));
  try {
    const res = runCli([FIXTURE, "--format", "json", "--out", out]);
    return JSON.parse(res.stdout);
  } finally {
    rmSync(out, { recursive: true, force: true });
  }
}

/** Extract the referenced path value from an R-004 message ("パス参照 <value> の…"). */
function r004Values(diag) {
  return diag.findings
    .filter((f) => f.rule === "R-004")
    .map((f) => f.message.match(/参照 (\S+)/)[1])
    .sort();
}

test("S-20: kind:path — the three acceptance forms resolve; only missing-repo and truly-absent are R-004", () => {
  const diag = lintPaths();
  const unresolved = r004Values(diag);
  // Resolve (no R-004): testdir (single-seg dir), single.md (single-seg file), sub/nested
  // (multi-seg dir), eco001-paths/testdir (canonical), eco001-paths:single.md (repo: form).
  // Unresolved (R-004): nosuchrepo:single.md (repo: form, repo absent — no fallback), nope/missing.md.
  assert.deepEqual(unresolved, ["nope/missing.md", "nosuchrepo:single.md"]);
});

test("S-20: single-segment dir and file are accepted (PD-7 non-consistency fixed)", () => {
  const unresolved = r004Values(lintPaths());
  assert.ok(!unresolved.includes("testdir"), "single-segment dir must resolve");
  assert.ok(!unresolved.includes("single.md"), "single-segment file must resolve");
});

test("S-20: repo: form is equivalent to canonical when repo name is present", () => {
  const unresolved = r004Values(lintPaths());
  assert.ok(!unresolved.includes("eco001-paths:single.md"), "repo: form with known repo must resolve");
});

test("S-20: repo: form with an unknown repo name does NOT fall back to form 2", () => {
  // single.md exists repo-relative, but the explicit (absent) repo name blocks form-2 fallback.
  const unresolved = r004Values(lintPaths());
  assert.ok(unresolved.includes("nosuchrepo:single.md"), "unknown repo: name must stay unresolved");
});

test("S-20: id-or-path ② accepts the same path forms (trace_link to a repo-relative path resolves)", () => {
  const diag = lintPaths();
  // trace_links[].to = "testdir" is id-or-path; it is not a known ID, so it falls to path ②
  // and resolves against the repo. => no R-003 and no R-041.
  assert.equal(diag.findings.filter((f) => f.rule === "R-003").length, 0);
  assert.equal(diag.findings.filter((f) => f.rule === "R-041").length, 0);
});
