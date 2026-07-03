// CP-GITDIFF-021 / S-22: R-052 (eco-diff-within-impact, §2.17, ref-v0.7, K-GIT).
// diff_audit opt-in: allowed diff (bomdd/ + allowed_paths) = no finding; an out-of-impact file =
// R-052 1 finding per file; entries without diff_audit are never checked; git/baseline failure =
// X-GIT-001 (info) skip; --eco absence disables both R-052 and X-GIT-001 entirely (opt-in gate,
// not just the output-side ladder filter).
//
// Per 40-work-order.md §2: git fixtures are built by the test itself in a temp dir (this repo may
// not carry a .git). Skip (fail-open) when git is unavailable on the host.

import { test } from "node:test";
import assert from "node:assert/strict";
import { rmSync, mkdtempSync, mkdirSync, writeFileSync } from "node:fs";
import { runCli } from "./helpers/run-cli.js";
import { initGitFixture, gitAvailable } from "./helpers/git-fixture.js";
import { hashTree, diffHashes } from "./helpers/hash.js";
import { tmpdir } from "node:os";
import { join } from "node:path";

const HAS_GIT = gitAvailable();

function baseRegister(diffAudit) {
  const da = diffAudit
    ? `\n    diff_audit:\n      baseline: ${diffAudit.baseline}\n      allowed_paths: [${diffAudit.allowedPaths.join(", ")}]`
    : "";
  return `changes:\n  - id: ECO-200\n    title: R-052 fixture ECO\n    status: open${da}\n`;
}

function minimalBomdd(fx) {
  fx.write("bomdd/10-requirements.yaml", "requirements: []\n");
}

test("R-052: allowed-only diff (bomdd/ + allowed_paths) yields no R-052 finding", (t) => {
  if (!HAS_GIT) return t.skip("git not available on host (fail-open)");
  const fx = initGitFixture("bomdd-r052-ok-");
  const out = mkdtempSync(join(tmpdir(), "bomdd-r052-ok-out-"));
  try {
    minimalBomdd(fx);
    fx.write("src/allowed.txt", "v1\n");
    fx.addAll();
    fx.commit("baseline");
    fx.tag("baseline-tag");

    // Post-baseline changes: one under bomdd/ (always allowed), one under allowed_paths (src/).
    fx.write("bomdd/60-change-register.yaml", baseRegister({ baseline: "baseline-tag", allowedPaths: ["src/"] }));
    fx.write("src/allowed.txt", "v2\n");
    fx.addAll();
    fx.commit("in-impact change");

    const res = runCli([fx.dir, "--eco", "--format", "json", "--out", out]);
    const diag = JSON.parse(res.stdout);
    assert.equal(diag.findings.filter((f) => f.rule === "R-052").length, 0);
    assert.equal(diag.findings.filter((f) => f.rule === "X-GIT-001").length, 0);
  } finally {
    rmSync(fx.dir, { recursive: true, force: true });
    rmSync(out, { recursive: true, force: true });
  }
});

test("R-052: a file outside bomdd/+allowed_paths yields exactly one R-052 finding (targetId=ECO id)", (t) => {
  if (!HAS_GIT) return t.skip("git not available on host (fail-open)");
  const fx = initGitFixture("bomdd-r052-over-");
  const out = mkdtempSync(join(tmpdir(), "bomdd-r052-over-out-"));
  try {
    minimalBomdd(fx);
    fx.write("src/allowed.txt", "v1\n");
    fx.write("other/unrelated.txt", "v1\n");
    fx.addAll();
    fx.commit("baseline");
    fx.tag("baseline-tag");

    fx.write("bomdd/60-change-register.yaml", baseRegister({ baseline: "baseline-tag", allowedPaths: ["src/"] }));
    fx.write("src/allowed.txt", "v2\n"); // in-impact
    fx.write("other/unrelated.txt", "v2\n"); // OUT of impact
    fx.addAll();
    fx.commit("mixed change");

    const res = runCli([fx.dir, "--eco", "--format", "json", "--out", out]);
    const diag = JSON.parse(res.stdout);
    const r052 = diag.findings.filter((f) => f.rule === "R-052");
    assert.equal(r052.length, 1);
    assert.equal(r052[0].targetId, "ECO-200");
    assert.equal(r052[0].gate, "eco");
    assert.equal(r052[0].severity, "error");
    assert.match(r052[0].message, /other\/unrelated\.txt/);
  } finally {
    rmSync(fx.dir, { recursive: true, force: true });
    rmSync(out, { recursive: true, force: true });
  }
});

test("R-052: entries without diff_audit are never checked (no finding for that ECO)", (t) => {
  if (!HAS_GIT) return t.skip("git not available on host (fail-open)");
  const fx = initGitFixture("bomdd-r052-noaudit-");
  const out = mkdtempSync(join(tmpdir(), "bomdd-r052-noaudit-out-"));
  try {
    minimalBomdd(fx);
    fx.write("other/unrelated.txt", "v1\n");
    fx.addAll();
    fx.commit("baseline");
    fx.tag("baseline-tag");

    fx.write("bomdd/60-change-register.yaml", baseRegister(undefined)); // no diff_audit at all
    fx.write("other/unrelated.txt", "v2\n");
    fx.addAll();
    fx.commit("change without audit");

    const res = runCli([fx.dir, "--eco", "--format", "json", "--out", out]);
    const diag = JSON.parse(res.stdout);
    assert.equal(diag.findings.filter((f) => f.rule === "R-052").length, 0);
    assert.equal(diag.findings.filter((f) => f.rule === "X-GIT-001").length, 0);
  } finally {
    rmSync(fx.dir, { recursive: true, force: true });
    rmSync(out, { recursive: true, force: true });
  }
});

test("R-052: unresolvable baseline yields X-GIT-001 (info) and skips the R-052 judgment", (t) => {
  if (!HAS_GIT) return t.skip("git not available on host (fail-open)");
  const fx = initGitFixture("bomdd-r052-badbase-");
  const out = mkdtempSync(join(tmpdir(), "bomdd-r052-badbase-out-"));
  try {
    minimalBomdd(fx);
    fx.write(
      "bomdd/60-change-register.yaml",
      baseRegister({ baseline: "no-such-tag-ever", allowedPaths: ["src/"] })
    );
    fx.write("other/unrelated.txt", "v1\n");
    fx.addAll();
    fx.commit("only commit");

    const res = runCli([fx.dir, "--eco", "--format", "json", "--out", out]);
    const diag = JSON.parse(res.stdout);
    assert.equal(diag.findings.filter((f) => f.rule === "R-052").length, 0);
    const xgit = diag.findings.filter((f) => f.rule === "X-GIT-001");
    assert.equal(xgit.length, 1);
    assert.equal(xgit[0].severity, "info");
    assert.equal(xgit[0].targetId, "ECO-200");
    assert.match(xgit[0].message, /no-such-tag-ever/);
  } finally {
    rmSync(fx.dir, { recursive: true, force: true });
    rmSync(out, { recursive: true, force: true });
  }
});

test("R-052: a non-git directory yields X-GIT-001 (info), no crash", () => {
  // Not a git-availability-dependent test: this exercises the "non-git repo" fail-open path
  // regardless of whether git itself is installed (spawnSync will either ENOENT or exit non-zero
  // inside a non-repo directory — both are fail-open per §2.17).
  const dir = mkdtempSync(join(tmpdir(), "bomdd-r052-nogit-"));
  const out = mkdtempSync(join(tmpdir(), "bomdd-r052-nogit-out-"));
  try {
    const bomddDir = join(dir, "bomdd");
    mkdirSync(bomddDir, { recursive: true });
    writeFileSync(join(bomddDir, "10-requirements.yaml"), "requirements: []\n");
    writeFileSync(
      join(bomddDir, "60-change-register.yaml"),
      baseRegister({ baseline: "HEAD~1", allowedPaths: ["src/"] })
    );

    const res = runCli([dir, "--eco", "--format", "json", "--out", out]);
    assert.notEqual(res.status, 2, "must not crash (exit 2 = uncaught exception)");
    const diag = JSON.parse(res.stdout);
    assert.equal(diag.findings.filter((f) => f.rule === "R-052").length, 0);
    const xgit = diag.findings.filter((f) => f.rule === "X-GIT-001");
    assert.equal(xgit.length, 1);
    assert.equal(xgit[0].severity, "info");
  } finally {
    rmSync(dir, { recursive: true, force: true });
    rmSync(out, { recursive: true, force: true });
  }
});

test("R-052/X-GIT-001: --eco absent disables both (opt-in gate, not just the ladder filter)", (t) => {
  if (!HAS_GIT) return t.skip("git not available on host (fail-open)");
  const fx = initGitFixture("bomdd-r052-noeco-");
  const out = mkdtempSync(join(tmpdir(), "bomdd-r052-noeco-out-"));
  try {
    minimalBomdd(fx);
    fx.write("src/allowed.txt", "v1\n");
    fx.write("other/unrelated.txt", "v1\n");
    fx.addAll();
    fx.commit("baseline");
    fx.tag("baseline-tag");

    fx.write("bomdd/60-change-register.yaml", baseRegister({ baseline: "baseline-tag", allowedPaths: ["src/"] }));
    fx.write("other/unrelated.txt", "v2\n"); // would be out-of-impact
    fx.addAll();
    fx.commit("change");

    const res = runCli([fx.dir, "--format", "json", "--out", out]); // no --eco
    const diag = JSON.parse(res.stdout);
    assert.equal(diag.findings.filter((f) => f.rule === "R-052").length, 0);
    assert.equal(diag.findings.filter((f) => f.rule === "X-GIT-001").length, 0);
  } finally {
    rmSync(fx.dir, { recursive: true, force: true });
    rmSync(out, { recursive: true, force: true });
  }
});

test("R-052: read-only — the fixture repo's tree is unchanged by the lint run (no git write subcommands)", (t) => {
  if (!HAS_GIT) return t.skip("git not available on host (fail-open)");
  const fx = initGitFixture("bomdd-r052-readonly-");
  const out = mkdtempSync(join(tmpdir(), "bomdd-r052-readonly-out-"));
  try {
    minimalBomdd(fx);
    fx.write("src/allowed.txt", "v1\n");
    fx.addAll();
    fx.commit("baseline");
    fx.tag("baseline-tag");

    fx.write("bomdd/60-change-register.yaml", baseRegister({ baseline: "baseline-tag", allowedPaths: ["src/"] }));
    fx.write("src/allowed.txt", "v2\n");
    fx.addAll();
    fx.commit("in-impact change");

    const before = hashTree(fx.dir);
    const res = runCli([fx.dir, "--eco", "--format", "json", "--out", out]);
    assert.equal(res.status, 0);
    const after = hashTree(fx.dir);
    assert.deepEqual(diffHashes(before, after), []);
  } finally {
    rmSync(fx.dir, { recursive: true, force: true });
    rmSync(out, { recursive: true, force: true });
  }
});

test("R-052: a Japanese/space-containing out-of-impact path is reported correctly (quotepath)", (t) => {
  if (!HAS_GIT) return t.skip("git not available on host (fail-open)");
  const fx = initGitFixture("bomdd-r052-jp-");
  const out = mkdtempSync(join(tmpdir(), "bomdd-r052-jp-out-"));
  try {
    minimalBomdd(fx);
    fx.write("src/allowed.txt", "v1\n");
    fx.addAll();
    fx.commit("baseline");
    fx.tag("baseline-tag");

    fx.write("bomdd/60-change-register.yaml", baseRegister({ baseline: "baseline-tag", allowedPaths: ["src/"] }));
    fx.write("other/日本語 パス.txt", "v1\n"); // Japanese + space, outside allowed_paths
    fx.addAll();
    fx.commit("jp path change");

    const res = runCli([fx.dir, "--eco", "--format", "json", "--out", out]);
    const diag = JSON.parse(res.stdout);
    const r052 = diag.findings.filter((f) => f.rule === "R-052");
    assert.equal(r052.length, 1);
    assert.match(r052[0].message, /other\/日本語 パス\.txt/);
    // quotepath=false must prevent octal-escaped garbage like "\346\227\245..." from leaking.
    assert.doesNotMatch(r052[0].message, /\\\d{3}/);
  } finally {
    rmSync(fx.dir, { recursive: true, force: true });
    rmSync(out, { recursive: true, force: true });
  }
});
