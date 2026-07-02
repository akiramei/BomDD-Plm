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

console.log(`\nselftest: ${n} tests PASS`);
