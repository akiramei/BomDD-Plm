// 引継修正回帰テスト(CHEAT-記録済み): ref-edges で severity:none かつ kind: id-or-path/path 等が
// 明示された参照エッジは、解決検査を一切しない(§2.4「severity: none のエッジ — 解決検査しない」)。
// 修正前は kind が明示されていると severity:none の効果が無視され、誤って R-003/R-004 が出ていた
// (例: kbom.items[].source は kind:id-or-path,severity:none だが R-004 が発生していた)。

import { test } from "node:test";
import assert from "node:assert/strict";
import { runCli, REPO_ROOT } from "./helpers/run-cli.js";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

const FIXTURE = join(REPO_ROOT, "test", "fixtures", "severity-none");

test("severity:none suppresses resolution checks even when kind is explicitly id-or-path", () => {
  const out = mkdtempSync(join(tmpdir(), "bomdd-sevnone-"));
  try {
    const res = runCli([FIXTURE, "--format", "json", "--out", out]);
    const diag = JSON.parse(res.stdout);
    assert.equal(diag.findings.filter((f) => f.rule === "R-003").length, 0);
    assert.equal(diag.findings.filter((f) => f.rule === "R-004").length, 0);
    assert.equal(res.status, 0);
  } finally {
    rmSync(out, { recursive: true, force: true });
  }
});
