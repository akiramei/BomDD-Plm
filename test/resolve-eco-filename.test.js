// ECO-009 独立検査 r1 IA-01: ECO / CAPA の候補定義をファイル名から取り出す(仕様 §2.4 (a)
// 「拡張子を除いたファイル名の右端で family ID パターンに一致するトークン列を大文字化して ID とする」
// — 例 `60-change-order-eco-025.md` → `ECO-025`)。正定義(60-change-register)が無いときは候補が索引に入る(ref-v0.2 (b))。
// 是正前は `60-change-order-eco-999` 全体を 1 トークンとして族判定し、候補の定義が 0 件だった。

import { test } from "node:test";
import assert from "node:assert/strict";
import { runCli, REPO_ROOT } from "./helpers/run-cli.js";
import { cpSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

const CLEAN = join(REPO_ROOT, "oracle", "fixtures", "clean", "repo");

function lintWithOrder(fileName, refId) {
  const dir = mkdtempSync(join(tmpdir(), "bomdd-ecofn-"));
  const out = mkdtempSync(join(tmpdir(), "bomdd-ecofn-out-"));
  try {
    cpSync(CLEAN, join(dir, "repo"), { recursive: true });
    writeFileSync(join(dir, "repo", "bomdd", fileName), `# ${refId}\n`);
    const eb = join(dir, "repo", "bomdd", "30-ebom.yaml");
    writeFileSync(
      eb,
      readFileSync(eb, "utf8").replace(
        "      acceptance_refs: [CP-CORE-001]\n",
        `      acceptance_refs: [CP-CORE-001]\n      lineage: { change_ref: ${refId} }\n`
      )
    );
    const res = runCli([join(dir, "repo"), "--gate", "always", "--format", "json", "--out", out]);
    const diag = JSON.parse(res.stdout);
    const graph = JSON.parse(readFileSync(join(out, "graph.json"), "utf8"));
    return { status: res.status, diag, graph };
  } finally {
    rmSync(dir, { recursive: true, force: true });
    rmSync(out, { recursive: true, force: true });
  }
}

for (const [fileName, id] of [
  ["60-change-order-eco-999.md", "ECO-999"],
  ["60-change-order-capa-003.md", "CAPA-003"],
]) {
  test(`ファイル名の右端から候補定義を取り出す: ${fileName} → ${id}(参照が解決し、測定不能にもならない)`, () => {
    const r = lintWithOrder(fileName, id);
    assert.equal(r.diag.findings.filter((f) => f.rule === "R-003" && f.targetId === id).length, 0);
    assert.ok(r.graph.nodes.some((n) => n.id === id), `${id} の node が無い`);
    assert.equal(r.diag.measurement.filter((m) => m.family === "ECO" || m.family === "CAPA").length, 0);
    assert.equal(r.status, 0);
  });
}

test("ファイル名の右端に ID 族が無いときは候補を作らない(参照は未解決のまま R-003)", () => {
  const r = lintWithOrder("60-change-order-draft.md", "ECO-777");
  assert.ok(r.diag.findings.some((f) => f.rule === "R-003" && f.targetId === "ECO-777"));
  assert.ok(!r.graph.nodes.some((n) => n.id === "ECO-777"));
});
