// CP-DISCOVER-002: 発見ファイル→型の写像が期待一致(1ファイル=1型・配列順先勝ち・パターン外無視)。

import { test } from "node:test";
import assert from "node:assert/strict";
import { discover, loadSchema } from "@bomdd/core";
import { join } from "node:path";
import { REPO_ROOT } from "./helpers/run-cli.js";

const SCHEMA_DIR = join(REPO_ROOT, "schemas", "ref-v0");
const schema = loadSchema(SCHEMA_DIR);

test("discover: typed files map to exactly their artifacts[].file pattern", () => {
  const repoAbs = join(REPO_ROOT, "test", "fixtures", "l1-smoke");
  const artifacts = discover([{ name: "l1-smoke", absPath: repoAbs }], schema);
  const byType = new Map(artifacts.map((a) => [a.relPath, a.type]));
  assert.equal(byType.get("bomdd/10-requirements.yaml"), "bomdd/10-requirements.yaml");
  assert.equal(byType.get("bomdd/30-ebom.yaml"), "bomdd/30-ebom.yaml");
  assert.equal(byType.get("bomdd/32-mbom.yaml"), "bomdd/32-mbom.yaml");
  assert.equal(byType.get("bomdd/33-control-plan.yaml"), "bomdd/33-control-plan.yaml");
  assert.equal(artifacts.length, 4);
});

test("discover: nested bomdd/ui/** files are found via ** glob", () => {
  const repoAbs = join(REPO_ROOT, "test", "fixtures", "workspace-cross", "repoB");
  const artifacts = discover([{ name: "repoB", absPath: repoAbs }], schema);
  const traceMap = artifacts.find((a) => a.relPath.endsWith("ui-trace-map.json"));
  assert.ok(traceMap, "expected bomdd/ui/image-tab/ui-trace-map.json to be discovered");
  assert.equal(traceMap.type, "bomdd/ui/**/ui-trace-map.json");
});

test("discover: canonical paths use repo-name prefix + posix separators (INV-004)", () => {
  const repoAbs = join(REPO_ROOT, "test", "fixtures", "l1-smoke");
  const artifacts = discover([{ name: "l1-smoke", absPath: repoAbs }], schema);
  for (const a of artifacts) {
    assert.ok(a.canonicalPath.startsWith("l1-smoke/"));
    assert.ok(!a.canonicalPath.includes("\\"));
  }
});

test("discover: results are sorted deterministically by canonicalPath", () => {
  const repoAbs = join(REPO_ROOT, "test", "fixtures", "l1-smoke");
  const artifacts = discover([{ name: "l1-smoke", absPath: repoAbs }], schema);
  const paths = artifacts.map((a) => a.canonicalPath);
  const sorted = [...paths].sort();
  assert.deepEqual(paths, sorted);
});
