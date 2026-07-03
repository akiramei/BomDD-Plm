// CP-OUTPUT-010: 2回実行で対象出力 byte-diff 0(REQ-013・INV-003)。

import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, rmSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { runCli, REPO_ROOT } from "./helpers/run-cli.js";

const FIXTURE = join(REPO_ROOT, "test", "fixtures", "l1-smoke");

test("CP-OUTPUT-010: two runs produce byte-identical diagnostics/graph/ledger/view", () => {
  const out1 = mkdtempSync(join(tmpdir(), "bomdd-det-1-"));
  const out2 = mkdtempSync(join(tmpdir(), "bomdd-det-2-"));
  try {
    const r1 = runCli([FIXTURE, "--gate", "G3", "--view", "--out", out1]);
    const r2 = runCli([FIXTURE, "--gate", "G3", "--view", "--out", out2]);
    assert.equal(r1.status, 0);
    assert.equal(r2.status, 0);

    for (const name of ["diagnostics.json", "graph.json", "ledger.json", "plm-view.html"]) {
      const a = readFileSync(join(out1, name));
      const b = readFileSync(join(out2, name));
      assert.ok(a.equals(b), `${name} differs between runs`);
    }
    // stdout text body is also part of the determinism scope (§2.9).
    assert.equal(r1.stdout, r2.stdout);
  } finally {
    rmSync(out1, { recursive: true, force: true });
    rmSync(out2, { recursive: true, force: true });
  }
});

test("CP-OUTPUT-010: outputs contain no absolute paths, timestamps, or hostnames", () => {
  const out = mkdtempSync(join(tmpdir(), "bomdd-det-abs-"));
  try {
    const res = runCli([FIXTURE, "--gate", "G3", "--view", "--out", out]);
    assert.equal(res.status, 0);
    const diag = readFileSync(join(out, "diagnostics.json"), "utf8");
    const graph = readFileSync(join(out, "graph.json"), "utf8");
    // Windows absolute path pattern (C:\ or C:/) must not leak into output.
    assert.doesNotMatch(diag, /[A-Za-z]:[\\/]/);
    assert.doesNotMatch(graph, /[A-Za-z]:[\\/]/);
    // ISO timestamp pattern should not appear (REQ-013).
    assert.doesNotMatch(diag, /\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/);
  } finally {
    rmSync(out, { recursive: true, force: true });
  }
});

test("CP-OUTPUT-010: diagnostics.json keys follow schema-defined order", () => {
  const out = mkdtempSync(join(tmpdir(), "bomdd-det-order-"));
  try {
    const res = runCli([FIXTURE, "--gate", "G3", "--out", out]);
    assert.equal(res.status, 0);
    const raw = readFileSync(join(out, "diagnostics.json"), "utf8");
    const topKeyOrder = [...raw.matchAll(/^  "(\w+)":/gm)].map((m) => m[1]);
    assert.deepEqual(topKeyOrder, ["schemaVersion", "refSchema", "run", "workspace", "stats", "findings"]);
  } finally {
    rmSync(out, { recursive: true, force: true });
  }
});
