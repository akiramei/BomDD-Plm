// CP-LINT-007 / R-050 (acceptance-evidence-coverage, ref-v0.11 / ECO-008):
//  (a) 対象の全 CP に合格(result: pass)の証跡行 (b) 合格以外の証跡行が 1 本もない
//  (c) 対象があるのに製造記録を読めない= 測定不能(error) (d) 対象 0 件= 適用外(info)
// 陽性対照(違反を入れて止まる)・対象欠落チャレンジ・正常陰性対照を分けて持つ。
// 所見はゲートに関わらず diagnostics に載り(§2.6)、exit に効くのは適用ゲート内のみ(§2.7)。

import { test } from "node:test";
import assert from "node:assert/strict";
import { runCli, REPO_ROOT } from "./helpers/run-cli.js";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

const FIX = join(REPO_ROOT, "test", "fixtures", "r050");
const CP = "CP-CORE-001";
const AB = "repo/bomdd/50-as-built.yaml";
const MB = "repo/bomdd/32-mbom.yaml";

function lint(arm, gate = "acceptance") {
  const out = mkdtempSync(join(tmpdir(), "bomdd-r050-"));
  try {
    const res = runCli([join(FIX, arm, "repo"), "--gate", gate, "--format", "json", "--out", out]);
    const diag = JSON.parse(res.stdout);
    const r050 = diag.findings.filter((f) => f.rule === "R-050");
    return { status: res.status, diag, r050, errors: r050.filter((f) => f.severity === "error") };
  } finally {
    rmSync(out, { recursive: true, force: true });
  }
}

test("R-050 正常陰性対照: 全 CP に合格行・合格以外の行なし → 所見 0・exit 0", () => {
  const r = lint("good");
  assert.equal(r.r050.length, 0);
  assert.equal(r.status, 0);
});

for (const [arm, detail] of [
  ["fail", "result=fail"],
  ["notrun", "result=not-run"],
  ["blocked", "result=blocked"],
  ["nofield", "result 欄なし"],
  ["unknown", "result=expected-fail"],
]) {
  test(`R-050 違反陽性対照 (${arm}): 合格行なし (a) と合格以外の行 (b) の 2 所見・exit 1`, () => {
    const r = lint(arm);
    assert.equal(r.status, 1);
    assert.equal(r.errors.length, 2);
    const a = r.errors.filter((f) => f.message.includes("合格の証跡行がない"));
    const b = r.errors.filter((f) => f.message.includes(`合格以外の証跡行がある(${detail})`));
    assert.equal(a.length, 1);
    assert.equal(b.length, 1);
    for (const f of r.errors) {
      assert.equal(f.targetId, CP);
      assert.equal(f.file, AB);
      assert.equal(f.gate, "acceptance");
    }
  });
}

test("R-050 (b): 同一 CP に合格と不合格が混在 → 合格行があるので (a) は出ず (b) のみ", () => {
  const r = lint("mixed");
  assert.equal(r.status, 1);
  assert.equal(r.errors.length, 1);
  assert.ok(r.errors[0].message.includes("合格以外の証跡行がある(result=fail)"));
  assert.equal(r.errors[0].targetId, CP);
});

test("R-050 (b): 受入対象外の CP の不合格行も違反", () => {
  const r = lint("extra");
  assert.equal(r.status, 1);
  assert.equal(r.errors.length, 1);
  assert.equal(r.errors[0].targetId, "CP-OTHER-001");
  assert.ok(r.errors[0].message.includes("合格以外の証跡行がある(result=fail)"));
});

test("R-050 (a): 証拠行が空 → 対象の CP に合格行なしの 1 所見", () => {
  const r = lint("missing");
  assert.equal(r.status, 1);
  assert.equal(r.errors.length, 1);
  assert.equal(r.errors[0].targetId, CP);
  assert.match(r.errors[0].message, /合格の証跡行がない/);
});

for (const arm of ["noab", "emptylist", "docdialect"]) {
  test(`R-050 対象欠落チャレンジ (${arm}): 製造記録を読めない → 測定不能の error・exit 1(無音で通さない)`, () => {
    const r = lint(arm);
    assert.equal(r.status, 1);
    assert.equal(r.errors.length, 1);
    assert.equal(r.errors[0].targetId, CP);
    assert.equal(r.errors[0].file, MB);
    assert.match(r.errors[0].message, /測定不能/);
  });
}

test("R-050 ゲート: 製造前ゲート(G3)では製造記録なしが exit に効かない(所見は gate 付きで diagnostics に載る)", () => {
  const r = lint("noab", "G3");
  assert.equal(r.status, 0);
  assert.equal(r.errors.length, 1);
  assert.equal(r.errors[0].gate, "acceptance");
});

test("R-050 (d): 受入対象の M unit が 0 件 → 適用外を info で明示・error 0・exit 0", () => {
  const r = lint("notarget");
  assert.equal(r.status, 0);
  assert.equal(r.errors.length, 0);
  const info = r.r050.filter((f) => f.severity === "info");
  assert.equal(info.length, 1);
  assert.match(info[0].message, /適用外/);
  assert.equal(info[0].targetId, undefined);
});

test("R-050 (b) は対象の件数によらず適用: 対象 0 件でも不合格行は error(適用外の info と併存)", () => {
  const r = lint("notarget-fail");
  assert.equal(r.status, 1);
  assert.equal(r.errors.length, 1);
  assert.ok(r.errors[0].message.includes("合格以外の証跡行がある(result=fail)"));
  assert.equal(r.r050.filter((f) => f.severity === "info").length, 1);
});
