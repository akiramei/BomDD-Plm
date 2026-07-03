// CP-GATE-008: ゲート×規則マトリクス+eco 合成+不正値 exit 2。

import { test } from "node:test";
import assert from "node:assert/strict";
import { appliedRules, gateOfRule, isValidGate, VALID_GATES, LADDER, loadSchema } from "@bomdd/core";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { runCli, REPO_ROOT } from "./helpers/run-cli.js";

const SCHEMA_DIR = join(REPO_ROOT, "schemas", "ref-v0");
const schema = loadSchema(SCHEMA_DIR);

test("gate ladder: always < G1 < G3 < freeze < acceptance", () => {
  assert.equal(LADDER.always, 0);
  assert.equal(LADDER.G1, 1);
  assert.equal(LADDER.G3, 2);
  assert.equal(LADDER.freeze, 3);
  assert.equal(LADDER.acceptance, 4);
});

test("isValidGate rejects unknown gate names", () => {
  for (const g of VALID_GATES) assert.equal(isValidGate(g), true);
  assert.equal(isValidGate("bogus"), false);
});

test("appliedRules: always gate includes only gate=always rules (+ X-* diagnostics)", () => {
  const applied = appliedRules("always", false, schema);
  assert.ok(applied.has("R-001")); // gate: always
  assert.ok(applied.has("R-002")); // gate: always
  assert.ok(!applied.has("R-010")); // gate: G3
  assert.ok(applied.has("X-PARSE-001"));
});

test("appliedRules: G3 includes always+G1+G3 rules", () => {
  const applied = appliedRules("G3", false, schema);
  assert.ok(applied.has("R-001")); // always
  assert.ok(applied.has("R-010")); // G3
  assert.ok(!applied.has("R-030")); // freeze
});

test("appliedRules: acceptance includes everything on the ladder", () => {
  const applied = appliedRules("acceptance", false, schema);
  for (const r of ["R-001", "R-010", "R-030", "R-050"]) assert.ok(applied.has(r));
});

test("appliedRules: --eco adds eco-gated rules independent of the ladder position", () => {
  const withoutEco = appliedRules("always", false, schema);
  const withEco = appliedRules("always", true, schema);
  assert.ok(!withoutEco.has("R-051"));
  assert.ok(withEco.has("R-051"));
});

test("gateOfRule: X-* rules are always gate=always regardless of schema", () => {
  assert.equal(gateOfRule("X-SUPPRESS-001", schema), "always");
  assert.equal(gateOfRule("X-ID-001", schema), "always");
});

test("CLI: --gate with an invalid value exits 2", () => {
  const res = runCli([join(REPO_ROOT, "test", "fixtures", "l1-smoke"), "--gate", "bogus"]);
  assert.equal(res.status, 2);
  assert.match(res.stderr, /--gate/);
});
