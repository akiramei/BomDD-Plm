// CP-SARIF-020: --sarif additional output (§2.9 rev3, ECO-002 CH-2). schemaVersion 2.1.0 /
// results count+ruleId+level mapping+suppressions consistent with diagnostics.json / rules[] =
// fired-only, id-ascending / canonical serialization (byte-identical across 2 runs).

import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, rmSync, existsSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { runCli, REPO_ROOT } from "./helpers/run-cli.js";

const PARSE_BROKEN = join(REPO_ROOT, "test", "fixtures", "parse-broken");
const SUPPRESS_VALID = join(REPO_ROOT, "test", "fixtures", "suppress-basic", "ws-valid.yaml");
const L1_SMOKE = join(REPO_ROOT, "test", "fixtures", "l1-smoke");

function runSarif(target, extraArgs, tmpPrefix) {
  const out = mkdtempSync(join(tmpdir(), tmpPrefix));
  try {
    const res = runCli([target, "--sarif", "--format", "json", "--out", out, ...extraArgs]);
    const diag = JSON.parse(res.stdout);
    const sarifPath = join(out, "sarif.json");
    const sarif = existsSync(sarifPath) ? JSON.parse(readFileSync(sarifPath, "utf8")) : undefined;
    return { res, diag, sarif, out };
  } finally {
    rmSync(out, { recursive: true, force: true });
  }
}

test("SARIF: --sarif absent => sarif.json is NOT generated (default unchanged)", () => {
  const out = mkdtempSync(join(tmpdir(), "bomdd-sarif-absent-"));
  try {
    const res = runCli([L1_SMOKE, "--out", out]);
    assert.equal(res.status, 0);
    assert.ok(!existsSync(join(out, "sarif.json")));
    // Existing outputs are unaffected.
    assert.ok(existsSync(join(out, "diagnostics.json")));
  } finally {
    rmSync(out, { recursive: true, force: true });
  }
});

test("SARIF: --sarif generates sarif.json with schema/version/driver metadata", () => {
  const { sarif } = runSarif(PARSE_BROKEN, ["--gate", "acceptance"], "bomdd-sarif-meta-");
  assert.ok(sarif, "sarif.json must exist");
  assert.equal(sarif.version, "2.1.0");
  assert.equal(sarif.runs.length, 1);
  const driver = sarif.runs[0].tool.driver;
  assert.equal(driver.name, "bomdd-lint");
  assert.match(driver.version, /^\d+\.\d+\.\d+/);
  assert.ok(typeof driver.informationUri === "string" && driver.informationUri.length > 0);
});

test("SARIF: results count and ruleId set match diagnostics.json findings 1:1", () => {
  const { diag, sarif } = runSarif(PARSE_BROKEN, ["--gate", "acceptance"], "bomdd-sarif-count-");
  assert.equal(sarif.runs[0].results.length, diag.findings.length);
  const diagRules = diag.findings.map((f) => f.rule).sort();
  const sarifRules = sarif.runs[0].results.map((r) => r.ruleId).sort();
  assert.deepEqual(sarifRules, diagRules);
});

test("SARIF: level mapping — error→error, warn→warning, info→note", () => {
  const { diag, sarif } = runSarif(PARSE_BROKEN, ["--gate", "acceptance"], "bomdd-sarif-level-");
  const byIndex = diag.findings.map((f, i) => [f, sarif.runs[0].results[i]]);
  const expected = { error: "error", warn: "warning", info: "note" };
  for (const [f, r] of byIndex) {
    assert.equal(r.ruleId, f.rule);
    assert.equal(r.level, expected[f.severity], `severity ${f.severity} must map to ${expected[f.severity]}`);
    assert.equal(r.message.text, f.message);
  }
});

test("SARIF: locations use canonical path + startLine; a line-less finding omits region", () => {
  const { diag, sarif } = runSarif(PARSE_BROKEN, ["--gate", "acceptance"], "bomdd-sarif-loc-");
  const withLine = diag.findings.findIndex((f) => f.line !== undefined);
  const withoutLine = diag.findings.findIndex((f) => f.line === undefined);
  assert.ok(withLine >= 0 && withoutLine >= 0, "fixture must contain both a lined and line-less finding");

  const rWithLine = sarif.runs[0].results[withLine];
  assert.equal(rWithLine.locations[0].physicalLocation.artifactLocation.uri, diag.findings[withLine].file);
  assert.equal(rWithLine.locations[0].physicalLocation.region.startLine, diag.findings[withLine].line);

  const rNoLine = sarif.runs[0].results[withoutLine];
  assert.equal(rNoLine.locations[0].physicalLocation.artifactLocation.uri, diag.findings[withoutLine].file);
  assert.equal(rNoLine.locations[0].physicalLocation.region, undefined, "line-less finding must omit region, not fake it with 0");
});

test("SARIF: suppressed findings are included in results with suppressions[kind=external]", () => {
  const { diag, sarif } = runSarif(SUPPRESS_VALID, ["--gate", "G3"], "bomdd-sarif-suppress-");
  const idx = diag.findings.findIndex((f) => f.suppressed === true);
  assert.ok(idx >= 0, "fixture must produce a suppressed finding");
  const r = sarif.runs[0].results[idx];
  assert.deepEqual(r.suppressions, [{ kind: "external" }]);
  assert.equal(r.level, "note", "suppressed finding is demoted to info => SARIF level note");
  // Non-suppressed findings must NOT carry a suppressions array.
  const nonSuppressedIdx = diag.findings.findIndex((f) => !f.suppressed);
  assert.equal(sarif.runs[0].results[nonSuppressedIdx].suppressions, undefined);
});

test("SARIF: driver.rules[] lists only fired rules, sorted by rule id (byte order), no duplicates", () => {
  const { diag, sarif } = runSarif(PARSE_BROKEN, ["--gate", "acceptance"], "bomdd-sarif-rules-");
  const firedUnique = [...new Set(diag.findings.map((f) => f.rule))].sort();
  const driverIds = sarif.runs[0].tool.driver.rules.map((r) => r.id);
  assert.deepEqual(driverIds, firedUnique);
  for (const r of sarif.runs[0].tool.driver.rules) {
    assert.ok(typeof r.shortDescription.text === "string" && r.shortDescription.text.length > 0);
  }
});

test("SARIF: determinism — two runs produce byte-identical sarif.json", () => {
  const out1 = mkdtempSync(join(tmpdir(), "bomdd-sarif-det1-"));
  const out2 = mkdtempSync(join(tmpdir(), "bomdd-sarif-det2-"));
  try {
    const r1 = runCli([PARSE_BROKEN, "--gate", "acceptance", "--sarif", "--out", out1]);
    const r2 = runCli([PARSE_BROKEN, "--gate", "acceptance", "--sarif", "--out", out2]);
    assert.equal(r1.status, r2.status);
    const a = readFileSync(join(out1, "sarif.json"));
    const b = readFileSync(join(out2, "sarif.json"));
    assert.ok(a.equals(b), "sarif.json must be byte-identical across runs");
  } finally {
    rmSync(out1, { recursive: true, force: true });
    rmSync(out2, { recursive: true, force: true });
  }
});

test("SARIF: --sarif does not change plm-diag/1's status of being the primary contract (diagnostics.json unaffected)", () => {
  const outA = mkdtempSync(join(tmpdir(), "bomdd-sarif-parity-a-"));
  const outB = mkdtempSync(join(tmpdir(), "bomdd-sarif-parity-b-"));
  try {
    const withSarif = runCli([L1_SMOKE, "--sarif", "--out", outA]);
    const withoutSarif = runCli([L1_SMOKE, "--out", outB]);
    const diagA = readFileSync(join(outA, "diagnostics.json"));
    const diagB = readFileSync(join(outB, "diagnostics.json"));
    assert.ok(diagA.equals(diagB), "diagnostics.json must be unaffected by --sarif");
    assert.equal(withSarif.status, withoutSarif.status);
  } finally {
    rmSync(outA, { recursive: true, force: true });
    rmSync(outB, { recursive: true, force: true });
  }
});
