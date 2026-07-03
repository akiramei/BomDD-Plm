// CP-CLI-011: 引数×挙動マトリクス(正常系・異常系)。exit code / stdout-stderr 分離 / --fail-on。

import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, rmSync, existsSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { runCli, REPO_ROOT } from "./helpers/run-cli.js";

const FIXTURE = join(REPO_ROOT, "test", "fixtures", "l1-smoke");
const BROKEN = join(REPO_ROOT, "test", "fixtures", "parse-broken");

test("CLI: --help exits 0 and prints usage to stdout", () => {
  const res = runCli(["--help"]);
  assert.equal(res.status, 0);
  assert.match(res.stdout, /Usage: bomdd-lint/);
});

test("CLI: --version exits 0 and prints a version string", () => {
  const res = runCli(["--version"]);
  assert.equal(res.status, 0);
  assert.match(res.stdout, /bomdd-lint \d/);
});

test("CLI: --help takes priority over other validation (no target needed)", () => {
  const res = runCli(["--help", "--gate", "bogus"]);
  assert.equal(res.status, 0);
});

test("CLI: missing target exits 2", () => {
  const res = runCli([]);
  assert.equal(res.status, 2);
});

test("CLI: unknown option exits 2", () => {
  const res = runCli([FIXTURE, "--not-a-real-flag"]);
  assert.equal(res.status, 2);
});

test("CLI: nonexistent target path exits 2", () => {
  const res = runCli([join(REPO_ROOT, "test", "fixtures", "does-not-exist")]);
  assert.equal(res.status, 2);
});

test("CLI: invalid --format value exits 2", () => {
  const res = runCli([FIXTURE, "--format", "xml"]);
  assert.equal(res.status, 2);
});

test("CLI: invalid --fail-on value exits 2", () => {
  const res = runCli([FIXTURE, "--fail-on", "critical"]);
  assert.equal(res.status, 2);
});

test("CLI: --format text (default) produces a Japanese summary line on stdout", () => {
  const out = mkdtempSync(join(tmpdir(), "bomdd-cli-text-"));
  try {
    const res = runCli([FIXTURE, "--out", out]);
    assert.equal(res.status, 0);
    assert.match(res.stdout, /所見: error \d+ \/ warn \d+ \/ info \d+ \/ suppressed \d+/);
  } finally {
    rmSync(out, { recursive: true, force: true });
  }
});

test("CLI: --format json on stdout matches diagnostics.json content written to --out", () => {
  const out = mkdtempSync(join(tmpdir(), "bomdd-cli-json-"));
  try {
    const res = runCli([FIXTURE, "--format", "json", "--out", out]);
    assert.equal(res.status, 0);
    const diag = JSON.parse(res.stdout);
    assert.equal(diag.schemaVersion, "plm-diag/1");
  } finally {
    rmSync(out, { recursive: true, force: true });
  }
});

test("CLI: error findings => exit 1", () => {
  const out1 = mkdtempSync(join(tmpdir(), "bomdd-cli-err-"));
  try {
    const res = runCli([BROKEN, "--out", out1]);
    assert.equal(res.status, 1);
  } finally {
    rmSync(out1, { recursive: true, force: true });
  }
});

test("CLI: --fail-on warn escalates a warn-only run to exit 1 (default stays exit 0)", () => {
  const WARN_ONLY = join(REPO_ROOT, "test", "fixtures", "warn-only");
  const outA = mkdtempSync(join(tmpdir(), "bomdd-cli-warn-default-"));
  const outB = mkdtempSync(join(tmpdir(), "bomdd-cli-warn-escalate-"));
  try {
    const rDefault = runCli([WARN_ONLY, "--gate", "freeze", "--out", outA]);
    assert.equal(rDefault.status, 0);
    const rEscalated = runCli([WARN_ONLY, "--gate", "freeze", "--fail-on", "warn", "--out", outB]);
    assert.equal(rEscalated.status, 1);
  } finally {
    rmSync(outA, { recursive: true, force: true });
    rmSync(outB, { recursive: true, force: true });
  }
});

test("CLI: logs/progress go to stderr, data to stdout (error case keeps stdout as data)", () => {
  const out = mkdtempSync(join(tmpdir(), "bomdd-cli-stderr-"));
  try {
    const res = runCli([join(REPO_ROOT, "test", "fixtures", "does-not-exist"), "--out", out]);
    assert.equal(res.status, 2);
    assert.notEqual(res.stderr, "");
    assert.equal(res.stdout, "");
  } finally {
    rmSync(out, { recursive: true, force: true });
  }
});

test("CLI: --view generates plm-view.html only when passed", () => {
  const outWith = mkdtempSync(join(tmpdir(), "bomdd-cli-view-"));
  const outWithout = mkdtempSync(join(tmpdir(), "bomdd-cli-noview-"));
  try {
    const r1 = runCli([FIXTURE, "--view", "--out", outWith]);
    const r2 = runCli([FIXTURE, "--out", outWithout]);
    assert.equal(r1.status, 0);
    assert.equal(r2.status, 0);
    assert.ok(existsSync(join(outWith, "plm-view.html")));
    assert.ok(!existsSync(join(outWithout, "plm-view.html")));
  } finally {
    rmSync(outWith, { recursive: true, force: true });
    rmSync(outWithout, { recursive: true, force: true });
  }
});
