// CP-SCHEMA-004: family 追加/pattern 変更で再ビルドなし追随・未対応記法= X-SCHEMA-001・
// 読込不能/トップキー欠落= exit 2(SchemaExitError)。

import { test } from "node:test";
import assert from "node:assert/strict";
import { loadSchema, SchemaExitError } from "@bomdd/core";
import { join } from "node:path";
import { REPO_ROOT } from "./helpers/run-cli.js";

test("schema: default ref-v0 snapshot loads with families/artifacts/lint_rules populated", () => {
  const schema = loadSchema(join(REPO_ROOT, "schemas", "ref-v0"));
  assert.ok(schema.families.length > 0);
  assert.ok(schema.artifacts.length > 0);
  assert.ok(schema.lintRules.length > 0);
  assert.equal(schema.schemaFindings.length, 0);
});

test("schema: missing required top key (families) throws SchemaExitError", () => {
  assert.throws(
    () => loadSchema(join(REPO_ROOT, "test", "fixtures", "schema-variants", "missing-topkey")),
    SchemaExitError
  );
});

test("schema: unreadable schema directory throws SchemaExitError", () => {
  assert.throws(
    () => loadSchema(join(REPO_ROOT, "test", "fixtures", "schema-variants", "does-not-exist")),
    SchemaExitError
  );
});

test("schema: unsupported selector/kind entry is disabled and recorded as a schemaFinding (X-SCHEMA-001 upstream)", () => {
  const schema = loadSchema(join(REPO_ROOT, "test", "fixtures", "schema-variants", "unsupported-selector"));
  assert.equal(schema.schemaFindings.length, 1);
  assert.match(schema.schemaFindings[0].ref, /totally-unsupported-kind/);
  // The artifact's refs[] should NOT include the invalid entry (it's disabled, not silently ignored).
  const artifact = schema.artifacts.find((a) => a.file === "bomdd/99-test.yaml");
  assert.equal(artifact.refs.length, 0);
  assert.equal(artifact.defines.length, 1);
});
