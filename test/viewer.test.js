// CP-VIEWER-012 / CP-VIEW-FINDINGS-013 / CP-VIEW-GRAPH-014 / CP-VIEW-TRACE-015 / CP-VIEW-LEDGER-016 /
// CP-DESIGN-SYSTEM-019: plm-view.html の自己完結性+DC-*/DE-* 全要素の存在+design parts 適用の検査。

import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, rmSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { runCli, REPO_ROOT } from "./helpers/run-cli.js";
import { hasUiId, allUiIds, hasExternalReference, extractEmbeddedJson } from "./helpers/dom-check.js";

const FIXTURE = join(REPO_ROOT, "test", "fixtures", "l1-smoke");

function genView() {
  const out = mkdtempSync(join(tmpdir(), "bomdd-viewer-"));
  const res = runCli([FIXTURE, "--gate", "G3", "--view", "--out", out]);
  assert.equal(res.status, 0);
  const html = readFileSync(join(out, "plm-view.html"), "utf8");
  rmSync(out, { recursive: true, force: true });
  return html;
}

test("CP-VIEWER-012: zero external references (no http(s), fetch, XHR, localStorage)", () => {
  const html = genView();
  assert.equal(hasExternalReference(html), false);
});

test("CP-VIEWER-012: diagnostics/graph/ledger JSON are embedded verbatim (byte-identical round trip)", () => {
  const out = mkdtempSync(join(tmpdir(), "bomdd-viewer-embed-"));
  try {
    runCli([FIXTURE, "--gate", "G3", "--view", "--out", out]);
    const diagFile = JSON.parse(readFileSync(join(out, "diagnostics.json"), "utf8"));
    const graphFile = JSON.parse(readFileSync(join(out, "graph.json"), "utf8"));
    const ledgerFile = JSON.parse(readFileSync(join(out, "ledger.json"), "utf8"));
    const html = readFileSync(join(out, "plm-view.html"), "utf8");
    assert.deepEqual(extractEmbeddedJson(html, "data-diagnostics"), diagFile);
    assert.deepEqual(extractEmbeddedJson(html, "data-graph"), graphFile);
    assert.deepEqual(extractEmbeddedJson(html, "data-ledger"), ledgerFile);
  } finally {
    rmSync(out, { recursive: true, force: true });
  }
});

test("DC-FINDINGS-001: all DE-F01..DE-F06 display elements are present", () => {
  const html = genView();
  for (const id of [
    "component.summary-card.error",
    "component.summary-card.warn",
    "component.summary-card.info",
    "component.summary-card.suppressed",
    "action.findings.filter-severity",
    "input.findings.rule-filter",
    "input.findings.search",
    "component.findings-table",
    "state.findings.empty",
  ]) {
    assert.equal(hasUiId(html, id), true, `missing DE element: ${id}`);
  }
});

test("DC-GRAPH-001: all graph view display elements are present", () => {
  const html = genView();
  for (const id of [
    "component.graph-canvas",
    "region.graph-detail",
    "input.graph.search",
    "action.graph.filter-family",
    "input.graph.depth",
  ]) {
    assert.equal(hasUiId(html, id), true, `missing DE element: ${id}`);
  }
});

test("DC-TRACE-001: all trace matrix display elements are present", () => {
  const html = genView();
  for (const id of ["component.trace-matrix", "component.trace-legend", "action.trace.only-uncovered"]) {
    assert.equal(hasUiId(html, id), true, `missing DE element: ${id}`);
  }
});

test("DC-LEDGER-001: all ledger view display elements are present", () => {
  const html = genView();
  for (const id of [
    "region.ledger-tabs",
    "action.ledgers.tab-eco",
    "action.ledgers.tab-cheat",
    "action.ledgers.tab-dec",
    "component.ledger-table.eco",
    "component.ledger-table.cheat",
    "component.ledger-table.dec",
  ]) {
    assert.equal(hasUiId(html, id), true, `missing DE element: ${id}`);
  }
});

test("shell: READ-ONLY badge and run-meta stats are present", () => {
  const html = genView();
  assert.equal(hasUiId(html, "state.shell.read-only"), true);
  assert.equal(hasUiId(html, "component.scan-stats"), true);
  assert.match(html, /READ-ONLY/);
});

test("no duplicate data-ui-id parity break within a single static render pass", () => {
  const html = genView();
  const ids = allUiIds(html);
  // Master ids like component.summary-card.error are expected to be unique in the static shell
  // (occurrences under client-rendered rows are populated at runtime, not in the static HTML).
  const seen = new Set();
  const dups = [];
  for (const id of ids) {
    if (seen.has(id)) dups.push(id);
    seen.add(id);
  }
  assert.deepEqual(dups, []);
});
