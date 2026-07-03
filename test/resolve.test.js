// CP-RESOLVE-005: family 判定・id-or-path 4分岐・M01 vs M-BOM 分離・ID トークン貪欲一致。

import { test } from "node:test";
import assert from "node:assert/strict";
import { determineFamily, loadSchema } from "@bomdd/core";
import { join } from "node:path";
import { REPO_ROOT } from "./helpers/run-cli.js";

const SCHEMA_DIR = join(REPO_ROOT, "schemas", "ref-v0");
const schema = loadSchema(SCHEMA_DIR);

test("family: prefix match picks the longest matching prefix", () => {
  assert.equal(determineFamily("E-SAMPLE-001", schema)?.prefix, "E");
  assert.equal(determineFamily("REQ-001", schema)?.prefix, "REQ");
});

test("family: M0<n> (migration oracle) is distinguished from M-<name> (M-BOM) via family_pattern", () => {
  assert.equal(determineFamily("M01", schema)?.prefix, "M0");
  assert.equal(determineFamily("M-SAMPLE-001", schema)?.prefix, "M");
});

test("family: S/S-01 pattern family matches both legacy and new numbering", () => {
  assert.equal(determineFamily("S1", schema)?.prefix, "S");
  assert.equal(determineFamily("S-01", schema)?.prefix, "S");
});

test("family: unknown-family id returns undefined (=> X-ID-001 upstream)", () => {
  assert.equal(determineFamily("ZZZ-NOTAFAMILY-001", schema), undefined);
});

test("family: greedy ID token matching does not split ECO-001-child into ECO-001 + child", () => {
  // ECO-001-child as a whole token belongs to family ECO (prefix match consumes the whole tail).
  assert.equal(determineFamily("ECO-001-child", schema)?.prefix, "ECO");
});

test("family: ui-id namespace pattern matches dotted component ids", () => {
  assert.equal(determineFamily("screen.findings", schema)?.prefix, "ui-id");
  assert.equal(determineFamily("component.summary-card.error", schema)?.prefix, "ui-id");
});
