// 治具セルフテスト(40-work-order.md 必須受入): byte 比較器・DOM 検査ヘルパを合成データで検証する。

import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, writeFileSync, mkdirSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { hashTree, diffHashes, sha256File } from "./helpers/hash.js";
import { hasUiId, allUiIds, hasExternalReference, extractEmbeddedJson } from "./helpers/dom-check.js";

test("hashTree: identical trees produce identical hashes", () => {
  const dir = mkdtempSync(join(tmpdir(), "bomdd-hash-"));
  try {
    writeFileSync(join(dir, "a.txt"), "hello");
    mkdirSync(join(dir, "sub"));
    writeFileSync(join(dir, "sub", "b.txt"), "world");
    const h1 = hashTree(dir);
    const h2 = hashTree(dir);
    assert.deepEqual([...h1.entries()], [...h2.entries()]);
    assert.equal(diffHashes(h1, h2).length, 0);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("hashTree: detects a changed file", () => {
  const dir = mkdtempSync(join(tmpdir(), "bomdd-hash-"));
  try {
    writeFileSync(join(dir, "a.txt"), "hello");
    const before = hashTree(dir);
    writeFileSync(join(dir, "a.txt"), "hello!");
    const after = hashTree(dir);
    const diffs = diffHashes(before, after);
    assert.deepEqual(diffs, ["changed: a.txt"]);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("hashTree: detects added and missing files", () => {
  const dir = mkdtempSync(join(tmpdir(), "bomdd-hash-"));
  try {
    writeFileSync(join(dir, "a.txt"), "hello");
    const before = hashTree(dir);
    writeFileSync(join(dir, "b.txt"), "new");
    const after = hashTree(dir);
    assert.deepEqual(diffHashes(before, after), ["added: b.txt"]);
    assert.deepEqual(diffHashes(after, before), ["missing: b.txt"]);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("sha256File: matches a known SHA-256 digest", () => {
  const dir = mkdtempSync(join(tmpdir(), "bomdd-hash-"));
  try {
    const p = join(dir, "x.txt");
    writeFileSync(p, "abc");
    // SHA-256("abc") is a well-known test vector.
    assert.equal(
      sha256File(p),
      "ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad"
    );
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("dom-check: hasUiId finds present ids and rejects absent ones", () => {
  const html = '<div data-ui-id="screen.findings"><span data-ui-id="component.chip">x</span></div>';
  assert.equal(hasUiId(html, "screen.findings"), true);
  assert.equal(hasUiId(html, "component.chip"), true);
  assert.equal(hasUiId(html, "screen.nonexistent"), false);
});

test("dom-check: allUiIds extracts every occurrence in document order", () => {
  const html = '<a data-ui-id="x.one"></a><b data-ui-id="x.two"></b>';
  assert.deepEqual(allUiIds(html), ["x.one", "x.two"]);
});

test("dom-check: hasExternalReference flags CDN/fetch/storage, clean doc passes", () => {
  assert.equal(hasExternalReference('<script src="https://cdn.example.com/x.js"></script>'), true);
  assert.equal(hasExternalReference("fetch('/api')"), true);
  assert.equal(hasExternalReference("localStorage.setItem('a','b')"), true);
  assert.equal(hasExternalReference('<div class="prefetch-hint">no refs here</div>'), false);
});

test("dom-check: extractEmbeddedJson round-trips a JSON payload", () => {
  const payload = { a: 1, b: [1, 2, 3] };
  const html = `<script type="application/json" id="data-x">${JSON.stringify(payload)}</script>`;
  assert.deepEqual(extractEmbeddedJson(html, "data-x"), payload);
  assert.equal(extractEmbeddedJson(html, "data-missing"), undefined);
});
