// CP-READONLY-001: 実行前後で対象リポ全ファイル SHA-256 不変+残留物は出力先のみ+
// 出力先がリポ内なら exit 2。

import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, rmSync, cpSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { runCli, REPO_ROOT } from "./helpers/run-cli.js";
import { hashTree, diffHashes } from "./helpers/hash.js";

const FIXTURE = join(REPO_ROOT, "test", "fixtures", "l1-smoke");

test("CP-READONLY-001: repo files are byte-identical before/after a normal run", () => {
  const repoCopy = mkdtempSync(join(tmpdir(), "bomdd-ro-repo-"));
  const out = mkdtempSync(join(tmpdir(), "bomdd-ro-out-"));
  try {
    cpSync(FIXTURE, repoCopy, { recursive: true });
    const before = hashTree(repoCopy);
    const res = runCli([repoCopy, "--gate", "G3", "--view", "--out", out]);
    assert.equal(res.status, 0);
    const after = hashTree(repoCopy);
    assert.deepEqual(diffHashes(before, after), []);
  } finally {
    rmSync(repoCopy, { recursive: true, force: true });
    rmSync(out, { recursive: true, force: true });
  }
});

test("CP-READONLY-001: --out pointing inside the target repo is rejected with exit 2", () => {
  const repoCopy = mkdtempSync(join(tmpdir(), "bomdd-ro-repo2-"));
  try {
    cpSync(FIXTURE, repoCopy, { recursive: true });
    const insideOut = join(repoCopy, "plm-out");
    const res = runCli([repoCopy, "--out", insideOut]);
    assert.equal(res.status, 2);
    assert.match(res.stderr, /リポ配下/);
  } finally {
    rmSync(repoCopy, { recursive: true, force: true });
  }
});
