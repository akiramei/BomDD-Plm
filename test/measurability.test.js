// ECO-009 / BomDD ECO-089(ref-v0.12 measurability): 「違反(RED)」と「測れなかった(MEASUREMENT_FAILURE)」を区別して出す。
// 検体は固定オラクルの clean fixture(M unit 1・CP 1)+合格行 1 本の 50-as-built を一時ディレクトリへ複製し、腕ごとに 1 か所だけ壊す
// (BomDD bomdd/reports/eco-089-measurability/measure-arms.py の arms と同じ変異。A10〜A12 は ECO-009 §1A.2 D10)。
// 期待は実装の前に固定した(較正: 変更前の個体で赤になることを確かめてから実装する)。

import { test } from "node:test";
import assert from "node:assert/strict";
import { runCli, REPO_ROOT } from "./helpers/run-cli.js";
import { cpSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

const CLEAN = join(REPO_ROOT, "oracle", "fixtures", "clean", "repo");
const AB =
  "as_built:\n" +
  "  - id: AB-min-factory-01\n" +
  "    lifecycle_state: as-built\n" +
  "    test_evidence_refs:\n" +
  "      - { evidence_id: TE-min-001, cp_ref: CP-CORE-001, result: pass }\n";

function edit(dir, name, fn) {
  const p = join(dir, "repo", "bomdd", name);
  writeFileSync(p, fn(readFileSync(p, "utf8")));
}

const MUTATE = {
  clean: () => {},
  "rename-mbom": (d) => edit(d, "32-mbom.yaml", (s) => s.replace("  manufacturing_units:", "  process_units:")),
  "rename-cp": (d) => edit(d, "33-control-plan.yaml", (s) => s.replace("  characteristics:", "  checks:")),
  "broken-mbom": (d) => edit(d, "32-mbom.yaml", (s) => s.trimEnd() + "\nbroken: [unclosed\n"),
  "broken-cp": (d) => edit(d, "33-control-plan.yaml", (s) => s.trimEnd() + "\nbroken: [unclosed\n"),
  "empty-mbom": (d) => edit(d, "32-mbom.yaml", () => ""),
  dangling: (d) => edit(d, "32-mbom.yaml", (s) => s.replace("ebom_refs: [E-CORE-001]", "ebom_refs: [E-NOPE-999]")),
  "ab-fail": (d) => edit(d, "50-as-built.yaml", (s) => s.replace("result: pass", "result: fail")),
  // A9: M ID を他ファイルが参照しない構成でのキー改名
  "unref-rename": (d) => {
    edit(d, "33-control-plan.yaml", (s) => s.replace("verifies: [E-CORE-001, M-CORE-001]", "verifies: [E-CORE-001]"));
    edit(d, "32-mbom.yaml", (s) => s.replace("  manufacturing_units:", "  process_units:"));
  },
  // A10: CP の行が全て golden(depth unit/L2/L3 の行が 0 件)— 読めた定義サイトの上の空は測定不能にしない
  "golden-only": (d) => edit(d, "33-control-plan.yaml", (s) => s.replace("depth: unit", "depth: G")),
  // A11: M unit は読めて存在するが acceptance_refs が無い — R-050 (d) は適用外(info)
  "no-acceptance-refs": (d) => edit(d, "32-mbom.yaml", (s) => s.replace("      acceptance_refs: [CP-CORE-001]\n", "")),
  // A12: M 族の定義が残っている上での未解決参照 — 連鎖でなく違反(RED)
  "partial-family": (d) =>
    edit(d, "33-control-plan.yaml", (s) => s.replace("verifies: [E-CORE-001, M-CORE-001]", "verifies: [E-CORE-001, M-CORE-001, M-CORE-002]")),
};

function lint(arm, gate) {
  const dir = mkdtempSync(join(tmpdir(), "bomdd-meas-"));
  const out = mkdtempSync(join(tmpdir(), "bomdd-meas-out-"));
  try {
    cpSync(CLEAN, join(dir, "repo"), { recursive: true });
    writeFileSync(join(dir, "repo", "bomdd", "50-as-built.yaml"), AB);
    MUTATE[arm](dir);
    const res = runCli([join(dir, "repo"), "--gate", gate, "--format", "json", "--out", out]);
    const diag = JSON.parse(res.stdout);
    const judged = diag.findings.filter((f) => f.severity === "error" || f.severity === "warn");
    return {
      status: res.status,
      diag,
      red: judged.filter((f) => f.outcome === "RED"),
      mf: diag.findings.filter((f) => f.outcome === "MEASUREMENT_FAILURE"),
      measurement: diag.measurement ?? [],
      text: res.stdout,
    };
  } finally {
    rmSync(dir, { recursive: true, force: true });
    rmSync(out, { recursive: true, force: true });
  }
}

const has = (list, pred) => list.some(pred);

test("出力の版と形: plm-diag/2・measurement 節・stats.outcomes", () => {
  const r = lint("clean", "acceptance");
  assert.equal(r.status, 0);
  assert.equal(r.diag.schemaVersion, "plm-diag/2");
  assert.deepEqual(r.measurement, []);
  assert.equal(typeof r.diag.stats.outcomes, "object");
  assert.equal(r.diag.stats.outcomes.measurementFailure, 0);
  assert.equal(r.diag.stats.outcomes.red, 0);
});

test("判定を表す所見(error・warn)には必ず outcome が付く", () => {
  for (const arm of ["dangling", "rename-cp", "broken-mbom"]) {
    const r = lint(arm, "acceptance");
    for (const f of r.diag.findings) {
      if (f.severity === "error" || f.severity === "warn") assert.ok(f.outcome, `${arm}: ${f.rule} に outcome がない`);
    }
  }
});

test("A2 M-BOM のキー改名: 連鎖の R-003 も R-012 も測定不能・違反 0・原因= selector-miss", () => {
  const r = lint("rename-mbom", "acceptance");
  assert.equal(r.status, 1);
  assert.equal(r.red.length, 0);
  assert.ok(has(r.mf, (f) => f.rule === "R-003" && f.targetId === "M-CORE-001"));
  assert.ok(has(r.mf, (f) => f.rule === "R-012" && f.targetId === "E-CORE-001"));
  assert.ok(has(r.mf, (f) => f.rule === "R-050" && f.severity === "error"), "R-050 (d): 上流あり・M の定義サイトが ok でない → 測定不能 error");
  assert.ok(has(r.measurement, (m) => m.family === "M" && m.cause === "selector-miss" && m.gate === "always"));
  assert.ok(has(r.measurement, (m) => m.rule === "R-012" && m.cause === "selector-miss"));
});

test("A2 のコミット時ゲート(always): 連鎖の測定不能で exit 1", () => {
  const r = lint("rename-mbom", "always");
  assert.equal(r.status, 1);
  // 空振り防止: outcome が無い出力でも「RED 0 件」は成り立つので、測定不能の存在を先に要求する
  assert.ok(has(r.mf, (f) => f.gate === "always" && f.rule === "R-003"));
  assert.equal(r.red.filter((f) => f.gate === "always").length, 0);
});

test("A3 Control Plan のキー改名: CP への参照の連鎖は全て測定不能・違反 0", () => {
  const r = lint("rename-cp", "acceptance");
  assert.equal(r.status, 1);
  assert.equal(r.red.length, 0);
  assert.ok(r.mf.filter((f) => f.rule === "R-003").length >= 1);
  assert.ok(has(r.measurement, (m) => m.family === "CP" && m.cause === "selector-miss"));
});

test("A4 M-BOM の構文エラー: X-PARSE と連鎖は測定不能・原因= unreadable-input", () => {
  const r = lint("broken-mbom", "acceptance");
  assert.equal(r.status, 1);
  assert.equal(r.red.length, 0);
  assert.ok(has(r.mf, (f) => f.rule === "X-PARSE-001"));
  assert.ok(has(r.measurement, (m) => m.family === "M" && m.cause === "unreadable-input"));
});

test("A5 Control Plan の構文エラー: 原因= unreadable-input・違反 0", () => {
  const r = lint("broken-cp", "acceptance");
  assert.equal(r.status, 1);
  assert.equal(r.red.length, 0);
  assert.ok(has(r.measurement, (m) => m.family === "CP" && m.cause === "unreadable-input"));
});

test("A6 M-BOM の空文書: X-TYPE-001(空)は測定不能・原因= empty-required-source", () => {
  const r = lint("empty-mbom", "acceptance");
  assert.equal(r.status, 1);
  assert.equal(r.red.length, 0);
  assert.ok(has(r.mf, (f) => f.rule === "X-TYPE-001"));
  assert.ok(has(r.measurement, (m) => m.family === "M" && m.cause === "empty-required-source"));
});

test("A7 既知の違反(存在しない ID への参照): RED のまま・measurement は空", () => {
  const r = lint("dangling", "always");
  assert.equal(r.status, 1);
  assert.ok(has(r.red, (f) => f.rule === "R-003" && f.targetId === "E-NOPE-999"));
  assert.equal(r.mf.length, 0);
  assert.deepEqual(r.measurement, []);
});

test("A8 不合格の証跡行: always では R-050 は適用外ゲート(exit 0)・acceptance では RED", () => {
  assert.equal(lint("ab-fail", "always").status, 0);
  const r = lint("ab-fail", "acceptance");
  assert.equal(r.status, 1);
  assert.ok(has(r.red, (f) => f.rule === "R-050"));
  assert.equal(r.mf.length, 0);
});

test("A9 被参照の無い構成の改名: G3 以降で R-012 が測定不能(always では対象規則が無い)", () => {
  const r = lint("unref-rename", "acceptance");
  assert.equal(r.status, 1);
  assert.equal(r.red.length, 0);
  assert.ok(has(r.mf, (f) => f.rule === "R-012"));
  assert.ok(has(r.measurement, (m) => m.rule === "R-012" && m.gate === "G3"));
});

test("A10 CP が全て golden: 読めた定義サイトの上の空は測定不能にしない(freeze で exit 0)", () => {
  const r = lint("golden-only", "freeze");
  assert.equal(r.status, 0);
  assert.equal(r.mf.length, 0);
  assert.deepEqual(r.measurement, []);
});

test("A11 acceptance_refs の無い M unit: R-050 (d) は適用外の info(outcome= NOT_APPLICABLE)・測定不能にしない", () => {
  const r = lint("no-acceptance-refs", "acceptance");
  assert.equal(r.mf.length, 0);
  assert.ok(has(r.diag.findings, (f) => f.rule === "R-050" && f.severity === "info" && f.outcome === "NOT_APPLICABLE"));
  assert.deepEqual(r.measurement.filter((m) => m.rule === "R-050"), []);
});

test("A12 M 族の定義が残っている上での未解決参照: 連鎖でなく RED", () => {
  const r = lint("partial-family", "always");
  assert.equal(r.status, 1);
  assert.ok(has(r.red, (f) => f.rule === "R-003" && f.targetId === "M-CORE-002"));
  assert.equal(r.mf.length, 0);
});

test("text 出力: 区分ごとの件数の行がある", () => {
  const r = lint("rename-mbom", "acceptance");
  const dir = mkdtempSync(join(tmpdir(), "bomdd-meas-t-"));
  const out = mkdtempSync(join(tmpdir(), "bomdd-meas-t-out-"));
  try {
    cpSync(CLEAN, join(dir, "repo"), { recursive: true });
    writeFileSync(join(dir, "repo", "bomdd", "50-as-built.yaml"), AB);
    MUTATE["rename-mbom"](dir);
    const res = runCli([join(dir, "repo"), "--gate", "acceptance", "--out", out]);
    assert.match(res.stdout, /区分: RED \d+ \/ 測定不能 \d+ \/ 適用外 \d+/);
    assert.match(res.stdout, /測定不能の原因: selector-miss/);
  } finally {
    rmSync(dir, { recursive: true, force: true });
    rmSync(out, { recursive: true, force: true });
  }
  void r;
});
