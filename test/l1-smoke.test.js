// L1 スモーク(40-work-order.md 必須受入): 同梱ミニ fixture に対し
// `bomdd-lint <fixture> --view --out <tmp>` を実行し、exit code・
// diagnostics.json/graph.json/plm-view.html の生成を確認する。

import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, rmSync, existsSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { runCli, REPO_ROOT } from "./helpers/run-cli.js";
import { hasUiId, hasExternalReference } from "./helpers/dom-check.js";

const FIXTURE = join(REPO_ROOT, "test", "fixtures", "l1-smoke");

test("L1 smoke: CLI run produces diagnostics/graph/ledger/view, exit 0", () => {
  const out = mkdtempSync(join(tmpdir(), "bomdd-l1-"));
  try {
    const res = runCli([FIXTURE, "--gate", "G3", "--view", "--out", out]);
    assert.equal(res.status, 0, `expected exit 0, got ${res.status}. stderr: ${res.stderr}`);

    assert.ok(existsSync(join(out, "diagnostics.json")), "diagnostics.json missing");
    assert.ok(existsSync(join(out, "graph.json")), "graph.json missing");
    assert.ok(existsSync(join(out, "ledger.json")), "ledger.json missing");
    assert.ok(existsSync(join(out, "plm-view.html")), "plm-view.html missing");

    const diag = JSON.parse(readFileSync(join(out, "diagnostics.json"), "utf8"));
    assert.equal(diag.schemaVersion, "plm-diag/1");
    assert.equal(diag.stats.files, 4);

    const graph = JSON.parse(readFileSync(join(out, "graph.json"), "utf8"));
    assert.equal(graph.schemaVersion, "plm-graph/1");
    assert.ok(graph.nodes.length >= 4);

    const html = readFileSync(join(out, "plm-view.html"), "utf8");
    assert.equal(hasExternalReference(html), false, "plm-view.html must have zero external references");
    assert.equal(hasUiId(html, "screen.findings"), true);
    assert.equal(hasUiId(html, "screen.item-graph"), true);
    assert.equal(hasUiId(html, "screen.trace-matrix"), true);
    assert.equal(hasUiId(html, "screen.ledgers"), true);
  } finally {
    rmSync(out, { recursive: true, force: true });
  }
});

test("L1 smoke: broken-input corpus is fully detected without crashing (exit 1, no exceptions)", () => {
  const out = mkdtempSync(join(tmpdir(), "bomdd-l1-broken-"));
  const fixture = join(REPO_ROOT, "test", "fixtures", "parse-broken");
  try {
    const res = runCli([fixture, "--format", "json", "--out", out]);
    assert.equal(res.status, 1, `expected exit 1 (error findings present), got ${res.status}. stderr: ${res.stderr}`);
    assert.equal(res.stderr, "", "no uncaught-exception output expected on stderr");

    const diag = JSON.parse(res.stdout);
    const rules = diag.findings.map((f) => f.rule);
    assert.ok(rules.includes("X-PARSE-001"), "expected at least one X-PARSE-001 finding");
    assert.ok(rules.includes("X-TYPE-001"), "expected at least one X-TYPE-001 finding");

    // All findings with X-PARSE-001 must carry line/column (§2.2).
    for (const f of diag.findings) {
      if (f.rule === "X-PARSE-001" && f.file.endsWith("31-kbom.yaml")) {
        assert.ok(f.line !== undefined && f.column !== undefined);
      }
    }

    // Trap hints (canonical wording, §2.2).
    const star = diag.findings.find((f) => f.file.endsWith("10-requirements.yaml"));
    assert.ok(star.message.includes("hint: `*` 始まりの項目は引用符で囲む"));
    const colon = diag.findings.find((f) => f.file.endsWith("30-ebom.yaml"));
    assert.ok(colon.message.includes("hint: 行末の `:` を含む文は"));
    const quote = diag.findings.find((f) => f.file.endsWith("34-routing.yaml"));
    assert.ok(quote.message.includes("hint: 項目全体を引用符で囲むか"));
    const badUtf8 = diag.findings.find((f) => f.file.endsWith("31-kbom.yaml"));
    assert.ok(badUtf8.message.includes("不正な UTF-8 バイト列"));
    const dupKey = diag.findings.find((f) => f.rule === "X-TYPE-001" && f.file.endsWith("32-mbom.yaml"));
    assert.ok(dupKey.message.includes("重複キー"));
    const empty = diag.findings.find((f) => f.rule === "X-TYPE-001" && f.file.endsWith("33-control-plan.yaml"));
    assert.ok(empty.message.includes("空です"));

    // Continuation: all 6 files were discovered/processed (stats.files counts typed artifacts).
    assert.equal(diag.stats.files, 6);
  } finally {
    rmSync(out, { recursive: true, force: true });
  }
});
