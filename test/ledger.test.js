// CP-VIEW-LEDGER-016: 台帳抽出エントリ(ID+タイトル)一致+非構造 fallback。
// ECO md+register 併存/register なし/見出し複数 ID(最初採用)/family ID 見出しゼロ(非構造)。

import { test } from "node:test";
import assert from "node:assert/strict";
import { runCli, REPO_ROOT } from "./helpers/run-cli.js";
import { mkdtempSync, rmSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

function runLedger(fixtureName, tmpPrefix) {
  const out = mkdtempSync(join(tmpdir(), tmpPrefix));
  try {
    const res = runCli([join(REPO_ROOT, "test", "fixtures", fixtureName), "--out", out]);
    assert.equal(res.status, 0);
    return JSON.parse(readFileSync(join(out, "ledger.json"), "utf8"));
  } finally {
    rmSync(out, { recursive: true, force: true });
  }
}

test("ledger: ECO with both .md and change-register.yaml — register's structured fields win", () => {
  const ledger = runLedger("ledger-basic", "bomdd-ledger-basic-");
  assert.equal(ledger.ledgers.eco.length, 1);
  const eco = ledger.ledgers.eco[0];
  assert.equal(eco.id, "ECO-025");
  assert.equal(eco.title, "表示列の進化(register 由来タイトル)");
  assert.equal(eco.status, "completed");
  assert.equal(eco.affectedCount, 2);
  assert.equal(eco.source, "ledger-basic/bomdd/60-change-register.yaml");
});

test("ledger: cheat-log heading extraction picks the first family-matching token as the entry id", () => {
  const ledger = runLedger("ledger-basic", "bomdd-ledger-cheat-");
  assert.equal(ledger.ledgers.cheat.length, 1);
  assert.equal(ledger.ledgers.cheat[0].id, "CHEAT-001");
  assert.equal(ledger.ledgers.cheat[0].title, "REQ-999 も混ざった見出し(最初のトークン採用確認)");
});

test("ledger: decision register carries status/binds/approver", () => {
  const ledger = runLedger("ledger-basic", "bomdd-ledger-dec-");
  assert.equal(ledger.ledgers.decision.length, 1);
  const dec = ledger.ledgers.decision[0];
  assert.equal(dec.id, "DEC-0001");
  assert.equal(dec.status, "decided");
  assert.deepEqual(dec.binds, ["UQ-001", "UQ-002"]);
  assert.equal(dec.approver, "akira");
});

test("ledger: ECO .md alone (no register) still yields id+title from filename+heading", () => {
  const ledger = runLedger("ledger-noregister", "bomdd-ledger-noreg-");
  assert.equal(ledger.ledgers.eco.length, 1);
  assert.equal(ledger.ledgers.eco[0].id, "ECO-030");
  assert.equal(ledger.ledgers.eco[0].title, "register なし・md 単独の ECO");
  assert.equal(ledger.ledgers.eco[0].status, undefined);
});
