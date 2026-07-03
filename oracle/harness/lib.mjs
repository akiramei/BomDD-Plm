// oracle harness 共有ライブラリ(設計者側治具 — Node 標準のみ・依存ゼロ)
import { createHash } from 'node:crypto';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';

/** 所見を正規化キーへ(profile 比較用) */
export function findingKey(f) {
  return [f.rule ?? '', f.severity ?? '', f.file ?? '', f.targetId ?? ''].join('|');
}

/**
 * 期待プロファイル(error+warn の完全集合)と実所見を突合。
 * - expected の各行は実所見のちょうど1件とマッチしなければならない(message_contains は部分一致条件)
 * - マッチされない error/warn の実所見が残れば過検出
 * 戻り値: { ok, missing: [...], extra: [...], detail }
 */
export function compareFindings(actualAll, expected) {
  const actual = actualAll.filter(f => f.severity === 'error' || f.severity === 'warn');
  const used = new Set();
  const missing = [];
  for (const exp of expected) {
    const idx = actual.findIndex((a, i) => !used.has(i) && matches(a, exp));
    if (idx === -1) missing.push(exp);
    else used.add(idx);
  }
  const extra = actual.filter((_, i) => !used.has(i));
  return { ok: missing.length === 0 && extra.length === 0, missing, extra };
}

/** infos は「宣言分が存在すること」の subset 比較(過剰 info は許容 — R-005 等の意味論が開いているため) */
export function compareInfos(actualAll, expectedInfos) {
  const actual = actualAll.filter(f => f.severity === 'info');
  const missing = expectedInfos.filter(exp => !actual.some(a => matches(a, exp)));
  return { ok: missing.length === 0, missing };
}

function matches(a, exp) {
  if (exp.rule !== undefined && a.rule !== exp.rule) return false;
  if (exp.severity !== undefined && a.severity !== exp.severity) return false;
  if (exp.file !== undefined && a.file !== exp.file) return false;
  if (exp.targetId !== undefined && a.targetId !== exp.targetId) return false;
  if (exp.suppressed !== undefined && Boolean(a.suppressed) !== exp.suppressed) return false;
  if (exp.message_contains !== undefined && !(a.message ?? '').includes(exp.message_contains)) return false;
  if (exp.suppressRef_contains !== undefined && !(a.suppressRef ?? '').includes(exp.suppressRef_contains)) return false;
  return true;
}

/** ディレクトリ木の SHA-256 マニフェスト(read-only 検査 CP-READONLY-001) */
export function hashTree(dir) {
  const out = new Map();
  const walk = (d, rel) => {
    for (const name of readdirSync(d).sort()) {
      const p = join(d, name);
      const r = rel ? rel + '/' + name : name;
      if (statSync(p).isDirectory()) walk(p, r);
      else out.set(r, createHash('sha256').update(readFileSync(p)).digest('hex'));
    }
  };
  walk(dir, '');
  return out;
}

export function diffTree(before, after) {
  const changed = [], added = [], removed = [];
  for (const [k, v] of after) {
    if (!before.has(k)) added.push(k);
    else if (before.get(k) !== v) changed.push(k);
  }
  for (const k of before.keys()) if (!after.has(k)) removed.push(k);
  return { ok: !changed.length && !added.length && !removed.length, changed, added, removed };
}

export function byteEqual(fileA, fileB) {
  const a = readFileSync(fileA), b = readFileSync(fileB);
  return a.length === b.length && a.equals(b);
}

/** viewer 自己完結検査(CP-VIEWER-012): 外部リソース参照・永続 API の静的検出 */
export function checkSelfContained(html) {
  const violations = [];
  // xmlns / w3.org の名前空間 URI は除外して http(s) 参照を検出
  const urls = [...html.matchAll(/https?:\/\/[^\s"'<>)]+/g)].map(m => m[0])
    .filter(u => !u.includes('www.w3.org'));
  if (urls.length) violations.push('external URL: ' + urls.slice(0, 3).join(', '));
  for (const pat of ['<link ', '<script src=', 'fetch(', 'XMLHttpRequest', 'localStorage', 'sessionStorage', 'indexedDB', 'navigator.sendBeacon', '@import']) {
    if (html.includes(pat)) violations.push('forbidden pattern: ' + pat);
  }
  return { ok: violations.length === 0, violations };
}

/** S-23: sarif.json の断面検査(diagnostics との整合)。仕様 §2.9 rev3 の写像規約。 */
export function checkSarif(sarif, diagFindings, { expectSuppressed = false } = {}) {
  const problems = [];
  const LEVEL = { error: 'error', warn: 'warning', info: 'note' };
  if (sarif.version !== '2.1.0' && sarif.schemaVersion !== '2.1.0')
    problems.push(`schemaVersion/version != 2.1.0 (${sarif.version ?? sarif.schemaVersion})`);
  const run = sarif.runs?.[0];
  if (!run) { problems.push('runs[0] missing'); return { ok: false, problems }; }
  if (run.tool?.driver?.name !== 'bomdd-lint') problems.push(`driver.name != bomdd-lint`);
  const results = run.results ?? [];
  if (results.length !== diagFindings.length)
    problems.push(`results ${results.length} != findings ${diagFindings.length}`);
  const n = Math.min(results.length, diagFindings.length);
  for (let i = 0; i < n; i++) {
    const r = results[i], f = diagFindings[i];
    if (r.ruleId !== f.rule) problems.push(`[${i}] ruleId ${r.ruleId} != ${f.rule}`);
    if (r.level !== LEVEL[f.severity]) problems.push(`[${i}] level ${r.level} != map(${f.severity})`);
    const loc = r.locations?.[0]?.physicalLocation;
    if (loc?.artifactLocation?.uri !== f.file) problems.push(`[${i}] uri ${loc?.artifactLocation?.uri} != ${f.file}`);
    if (f.line != null) {
      if (loc?.region?.startLine !== f.line) problems.push(`[${i}] startLine ${loc?.region?.startLine} != ${f.line}`);
    } else if (loc?.region !== undefined) problems.push(`[${i}] region present for line-less finding`);
    const sup = Boolean(r.suppressions?.some(s => s.kind === 'external'));
    if (sup !== Boolean(f.suppressed)) problems.push(`[${i}] suppressions ${sup} != suppressed ${Boolean(f.suppressed)}`);
  }
  const fired = [...new Set(diagFindings.map(f => f.rule))].sort();
  const listed = (run.tool?.driver?.rules ?? []).map(r => r.id);
  if (JSON.stringify(listed) !== JSON.stringify(fired))
    problems.push(`driver.rules ${JSON.stringify(listed)} != fired ${JSON.stringify(fired)}`);
  if (expectSuppressed && !diagFindings.some(f => f.suppressed))
    problems.push('fixture has no suppressed finding (test precondition)');
  return { ok: problems.length === 0, problems };
}
