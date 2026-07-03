// CP-LINT-007 (message/fixTarget 凍結文言): rule-messages.yaml との一致を機械判定する(§2.6)。
// unit 検査: (a) fixTarget 非空 (b) message 非空 (c) rule-messages.yaml との一致。

import { test } from "node:test";
import assert from "node:assert/strict";
import { getMessage, hasMessage, allRuleIds } from "@bomdd/core";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { parse as yamlParse } from "yaml";
import { REPO_ROOT } from "./helpers/run-cli.js";

const raw = readFileSync(join(REPO_ROOT, "bomdd", "rule-messages.yaml"), "utf8");
const table = yamlParse(raw);
const canonicalRows = new Map(table.rules.map((r) => [r.rule, r]));

test("messages: every canonical rule in rule-messages.yaml is transcribed into core (a/b/c)", () => {
  for (const [rule, row] of canonicalRows) {
    assert.equal(hasMessage(rule), true, `core is missing a transcription for ${rule}`);
    const filled = getMessage(rule, {
      targetId: "X",
      file: "f",
      family: "FAM",
      ref: "R",
      supIndex: 0,
    });
    assert.notEqual(filled.message, "", `${rule} message must be non-empty`);
    assert.notEqual(filled.fixTarget, "", `${rule} fixTarget must be non-empty`);

    // (c) transcription must match verbatim (placeholders substituted identically).
    const expectedMessage = substitute(row.message, { targetId: "X", file: "f", family: "FAM", ref: "R", supIndex: 0 });
    const expectedFixTarget = substitute(row.fixTarget, { targetId: "X", file: "f", family: "FAM", ref: "R", supIndex: 0 });
    assert.equal(filled.message, expectedMessage, `${rule} message text mismatch vs rule-messages.yaml`);
    assert.equal(filled.fixTarget, expectedFixTarget, `${rule} fixTarget text mismatch vs rule-messages.yaml`);
  }
});

test("messages: core does not define rules absent from rule-messages.yaml", () => {
  for (const rule of allRuleIds()) {
    assert.ok(canonicalRows.has(rule), `core defines ${rule} but rule-messages.yaml has no row for it`);
  }
});

test("messages: looking up an unknown rule throws (spec hole => blocker, per §2.6)", () => {
  assert.throws(() => getMessage("R-999-NOPE", {}));
});

function substitute(tpl, vars) {
  return tpl.replace(/\{(targetId|file|family|ref|rule|supIndex)\}/g, (_m, key) => {
    const v = vars[key];
    return v === undefined || v === null ? "" : String(v);
  });
}
