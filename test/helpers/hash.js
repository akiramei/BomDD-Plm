// Test helper: byte comparator (SHA-256) for read-only invariant checks (CP-READONLY-001, INV-001)
// and byte-diff determinism checks (CP-OUTPUT-010, INV-003).

import { createHash } from "node:crypto";
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative } from "node:path";

/** Recursively hash every file under `dir`, keyed by posix-relative path. Deterministic order. */
export function hashTree(dir) {
  const out = new Map();
  function walk(d) {
    const entries = readdirSync(d).sort();
    for (const name of entries) {
      const p = join(d, name);
      const st = statSync(p);
      if (st.isDirectory()) walk(p);
      else if (st.isFile()) {
        const rel = relative(dir, p).replace(/\\/g, "/");
        const buf = readFileSync(p);
        out.set(rel, createHash("sha256").update(buf).digest("hex"));
      }
    }
  }
  walk(dir);
  return out;
}

/** Compare two hash maps (as produced by hashTree). Returns list of differing/missing/extra keys. */
export function diffHashes(before, after) {
  const diffs = [];
  for (const [k, v] of before) {
    if (!after.has(k)) diffs.push(`missing: ${k}`);
    else if (after.get(k) !== v) diffs.push(`changed: ${k}`);
  }
  for (const k of after.keys()) {
    if (!before.has(k)) diffs.push(`added: ${k}`);
  }
  return diffs;
}

export function sha256File(path) {
  return createHash("sha256").update(readFileSync(path)).digest("hex");
}
