// 治具セルフテスト(凍結前必須 — playbook §4.4 / forward-01 CHEAT-F01-H001 の教訓)
// 比較器・ハッシュ検査器・自己完結検査器を合成データで検証する。製品(CLI)は不要。
import assert from 'node:assert/strict';
import { mkdtempSync, writeFileSync, mkdirSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { compareFindings, compareInfos, hashTree, diffTree, checkSelfContained, byteEqual } from './lib.mjs';

let n = 0;
const t = (name, fn) => { fn(); n++; console.log('  ok', name); };

console.log('== compareFindings ==');
const F = (rule, severity, file, targetId, message) => ({ rule, severity, file, targetId, message });
t('完全一致で ok', () => {
  const r = compareFindings([F('R-003', 'error', 'a.yaml', 'REQ-9')], [{ rule: 'R-003', severity: 'error', file: 'a.yaml', targetId: 'REQ-9' }]);
  assert.equal(r.ok, true);
});
t('過検出(extra)を検出', () => {
  const r = compareFindings([F('R-003', 'error', 'a.yaml', 'REQ-9'), F('R-002', 'error', 'b.yaml', 'E-1')], [{ rule: 'R-003', severity: 'error', file: 'a.yaml' }]);
  assert.equal(r.ok, false); assert.equal(r.extra.length, 1); assert.equal(r.extra[0].rule, 'R-002');
});
t('過少検出(missing)を検出', () => {
  const r = compareFindings([], [{ rule: 'R-003', severity: 'error', file: 'a.yaml' }]);
  assert.equal(r.ok, false); assert.equal(r.missing.length, 1);
});
t('severity 不一致は missing+extra 両方に出る', () => {
  const r = compareFindings([F('R-003', 'warn', 'a.yaml', 'REQ-9')], [{ rule: 'R-003', severity: 'error', file: 'a.yaml' }]);
  assert.equal(r.ok, false); assert.equal(r.missing.length, 1); assert.equal(r.extra.length, 1);
});
t('info は findings 比較の対象外', () => {
  const r = compareFindings([F('R-005', 'info', 'a.yaml', 'TL-1')], []);
  assert.equal(r.ok, true);
});
t('message_contains 条件', () => {
  const bad = compareFindings([F('X-PARSE-001', 'error', 'a.yaml', undefined, 'syntax error')], [{ rule: 'X-PARSE-001', severity: 'error', file: 'a.yaml', message_contains: 'hint:' }]);
  assert.equal(bad.ok, false);
  const good = compareFindings([F('X-PARSE-001', 'error', 'a.yaml', undefined, 'syntax error hint: quote it')], [{ rule: 'X-PARSE-001', severity: 'error', file: 'a.yaml', message_contains: 'hint:' }]);
  assert.equal(good.ok, true);
});
t('同一プロファイル行2件は実所見2件を要求する', () => {
  const r = compareFindings([F('R-003', 'error', 'a.yaml', 'REQ-9')], [
    { rule: 'R-003', severity: 'error', file: 'a.yaml' }, { rule: 'R-003', severity: 'error', file: 'a.yaml' }]);
  assert.equal(r.ok, false); assert.equal(r.missing.length, 1);
});

console.log('== compareInfos ==');
t('宣言 info の存在(subset)+suppressRef 部分一致', () => {
  const actual = [{ rule: 'R-003', severity: 'info', file: 'a.yaml', targetId: 'REQ-9', suppressed: true, suppressRef: 'ws.yaml#suppress[0]' },
                  { rule: 'R-005', severity: 'info', file: 'b.yaml', targetId: 'TL-1' }];
  const r = compareInfos(actual, [{ rule: 'R-003', severity: 'info', suppressed: true, suppressRef_contains: 'suppress[0]' }]);
  assert.equal(r.ok, true);
  const r2 = compareInfos(actual, [{ rule: 'R-003', severity: 'info', suppressed: true, suppressRef_contains: 'suppress[1]' }]);
  assert.equal(r2.ok, false);
});

console.log('== hashTree / diffTree ==');
t('変更・追加・削除を検出', () => {
  const d = mkdtempSync(join(tmpdir(), 'plm-selftest-'));
  mkdirSync(join(d, 'sub'));
  writeFileSync(join(d, 'a.txt'), 'one');
  writeFileSync(join(d, 'sub', 'b.txt'), 'two');
  const before = hashTree(d);
  writeFileSync(join(d, 'a.txt'), 'CHANGED');
  writeFileSync(join(d, 'c.txt'), 'new');
  const after = hashTree(d);
  const diff = diffTree(before, after);
  assert.equal(diff.ok, false);
  assert.deepEqual(diff.changed, ['a.txt']);
  assert.deepEqual(diff.added, ['c.txt']);
  const same = diffTree(after, hashTree(d));
  assert.equal(same.ok, true);
});

console.log('== byteEqual ==');
t('byte 同一と差分', () => {
  const d = mkdtempSync(join(tmpdir(), 'plm-selftest-'));
  writeFileSync(join(d, 'x1'), 'abc');
  writeFileSync(join(d, 'x2'), 'abc');
  writeFileSync(join(d, 'x3'), 'abd');
  assert.equal(byteEqual(join(d, 'x1'), join(d, 'x2')), true);
  assert.equal(byteEqual(join(d, 'x1'), join(d, 'x3')), false);
});

console.log('== checkSelfContained ==');
t('SVG xmlns は許容・外部参照は検出', () => {
  const okHtml = '<svg xmlns="http://www.w3.org/2000/svg"></svg><script>const x=1;</script>';
  assert.equal(checkSelfContained(okHtml).ok, true);
  assert.equal(checkSelfContained('<script src="https://cdn.example.com/x.js"></script>').ok, false);
  assert.equal(checkSelfContained('<script>localStorage.setItem("a",1)</script>').ok, false);
  assert.equal(checkSelfContained('<img src="https://example.com/i.png">').ok, false);
});

// ---- ECO-002 追補(2026-07-03): 新検査器も凍結前にセルフテスト(H001 教訓: 比較すべき断面込み) ----
console.log('== checkSarif(ECO-002) ==');
{
  const { checkSarif } = await import('./lib.mjs');
  const findings = [
    { rule: 'R-003', severity: 'error', file: 'repo/bomdd/30-ebom.yaml', line: 7 },
    { rule: 'R-004', severity: 'warn',  file: 'repo/bomdd/30-ebom.yaml', suppressed: true },
  ];
  const good = { version: '2.1.0', runs: [{ tool: { driver: { name: 'bomdd-lint', rules: [{ id: 'R-003' }, { id: 'R-004' }] } },
    results: [
      { ruleId: 'R-003', level: 'error',   message: { text: 'm' }, locations: [{ physicalLocation: { artifactLocation: { uri: 'repo/bomdd/30-ebom.yaml' }, region: { startLine: 7 } } }] },
      { ruleId: 'R-004', level: 'warning', message: { text: 'm' }, locations: [{ physicalLocation: { artifactLocation: { uri: 'repo/bomdd/30-ebom.yaml' } } }], suppressions: [{ kind: 'external' }] },
    ] }] };
  assert.equal(checkSarif(good, findings).ok, true);
  const clone = () => JSON.parse(JSON.stringify(good));
  let x = clone(); x.runs[0].results[1].level = 'error';
  assert.equal(checkSarif(x, findings).ok, false);
  x = clone(); delete x.runs[0].results[1].suppressions;
  assert.equal(checkSarif(x, findings).ok, false);
  x = clone(); x.runs[0].tool.driver.rules = [{ id: 'R-003' }];
  assert.equal(checkSarif(x, findings).ok, false);
  x = clone(); x.runs[0].results[1].locations[0].physicalLocation.region = { startLine: 1 };
  assert.equal(checkSarif(x, findings).ok, false);
  n++; console.log('  ok SARIF 写像: 整合で ok・level/suppressions/rules/region の各不整合を検出');
}

console.log('== buildGitFixture(ECO-002。履歴3コミット化= ECO-005) ==');
{
  const { execFileSync } = await import('node:child_process');
  let hasGit = true;
  try { execFileSync('git', ['--version'], { encoding: 'utf-8' }); } catch { hasGit = false; }
  if (!hasGit) {
    console.log('  (git 不在につき skip — CI/基準機では実行される)');
  } else {
    const { buildGitFixture } = await import('./build-git-fixture.mjs');
    const root = buildGitFixture();
    const out = execFileSync('git', ['-c', 'core.quotepath=false', 'diff', '--name-only', 'eco-base', 'HEAD'], { cwd: root, encoding: 'utf-8' });
    const files = out.split('\n').filter(Boolean).sort();
    assert.deepEqual(files, ['bomdd/60-change-register.yaml', 'src/allowed/a.txt', 'src/allowed/late.txt', 'src/outside/b.txt', 'src/外側/日本語 データ.txt'].sort());
    // head アンカー窓(eco-base..eco-accept)には受入後コミットの late.txt が入らない(ECO-005)
    const anchored = execFileSync('git', ['-c', 'core.quotepath=false', 'diff', '--name-only', 'eco-base', 'eco-accept'], { cwd: root, encoding: 'utf-8' });
    const anchoredFiles = anchored.split('\n').filter(Boolean).sort();
    assert.deepEqual(anchoredFiles, ['bomdd/60-change-register.yaml', 'src/allowed/a.txt', 'src/outside/b.txt', 'src/外側/日本語 データ.txt'].sort());
    let bad = false;
    try { execFileSync('git', ['diff', '--name-only', 'no-such-rev', 'HEAD'], { cwd: root, encoding: 'utf-8', stdio: ['ignore', 'pipe', 'pipe'] }); }
    catch { bad = true; }
    assert.equal(bad, true);
    n++; console.log('  ok git fixture: 動的窓/固定窓の diff 集合(日本語+空白パス込み)と baseline 不能分岐が期待どおり');
  }
}

console.log(`\nselftest: ${n} tests PASS`);
