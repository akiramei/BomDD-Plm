// 固定オラクル実行ランナー(設計者側・製造装置に渡さない)
// 使い方: node run-oracle.mjs --cli "node ../packages/cli/dist/main.js" [--only S-02]
// 期待プロファイル(../expected/*.json)を全実行し、per-case PASS/FAIL を報告。exit 1 = FAIL あり。
import { readFileSync, readdirSync, mkdtempSync, existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { execSync } from 'node:child_process';
import { compareFindings, compareInfos, hashTree, diffTree, byteEqual, checkSelfContained } from './lib.mjs';

const ORACLE = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const args = process.argv.slice(2);
const cli = argOf('--cli');
const only = argOf('--only');
function argOf(name) { const i = args.indexOf(name); return i >= 0 ? args[i + 1] : undefined; }
if (!cli) { console.error('usage: node run-oracle.mjs --cli "<command>" [--only S-XX]'); process.exit(2); }

let pass = 0, fail = 0;
const failDetails = [];

function runCli(target, { gate, eco, extraArgs = [] } = {}) {
  const out = mkdtempSync(join(tmpdir(), 'plm-oracle-'));
  const cmd = [cli, JSON.stringify(resolve(ORACLE, target)),
    ...(gate ? ['--gate', gate] : []), ...(eco ? ['--eco'] : []),
    '--out', JSON.stringify(out), ...extraArgs].join(' ');
  let exit = 0, stdout = '';
  try { stdout = execSync(cmd, { encoding: 'utf-8', stdio: ['ignore', 'pipe', 'pipe'] }); }
  catch (e) { exit = e.status ?? 2; stdout = e.stdout ?? ''; }
  return { exit, stdout, out };
}
const readJson = p => JSON.parse(readFileSync(p, 'utf-8'));
const diag = out => readJson(join(out, 'diagnostics.json'));

function judge(name, ok, detail) {
  if (ok) { pass++; console.log('PASS', name); }
  else { fail++; console.log('FAIL', name); failDetails.push({ name, detail }); }
}

function checkRun(name, target, spec) {
  const r = runCli(target, { gate: spec.gate, eco: spec.eco });
  const problems = [];
  if (spec.expect_exit !== undefined && r.exit !== spec.expect_exit)
    problems.push(`exit ${r.exit} != ${spec.expect_exit}`);
  let d;
  try { d = diag(r.out); } catch { problems.push('diagnostics.json unreadable'); }
  if (d) {
    if (spec.findings) {
      const c = compareFindings(d.findings ?? [], spec.findings);
      if (!c.ok) problems.push(`findings missing=${JSON.stringify(c.missing)} extra=${JSON.stringify(c.extra.map(f => [f.rule, f.severity, f.file, f.targetId]))}`);
    }
    if (spec.infos) {
      const c = compareInfos(d.findings ?? [], spec.infos);
      if (!c.ok) problems.push(`infos missing=${JSON.stringify(c.missing)}`);
    }
    if (spec.checks?.includes('all X-PARSE findings have line and column')) {
      const bad = (d.findings ?? []).filter(f => f.rule === 'X-PARSE-001' && (f.line == null || f.column == null));
      if (bad.length) problems.push(`X-PARSE without line/column: ${bad.length}`);
    }
    if (spec.ledger) {
      let l;
      try { l = readJson(join(r.out, 'ledger.json')); } catch { problems.push('ledger.json unreadable'); }
      if (l) for (const [kind, entries] of Object.entries(spec.ledger)) {
        for (const exp of entries) {
          const hit = (l.ledgers?.[kind] ?? []).find(a => a.id === exp.id);
          if (!hit) { problems.push(`ledger ${kind}: ${exp.id} missing`); continue; }
          for (const k of Object.keys(exp)) if (k !== 'id' && hit[k] !== exp[k]) problems.push(`ledger ${kind} ${exp.id}.${k}: ${hit[k]} != ${exp[k]}`);
        }
        const expIds = new Set(entries.map(e => e.id));
        for (const a of l.ledgers?.[kind] ?? []) if (!expIds.has(a.id)) problems.push(`ledger ${kind}: unexpected ${a.id}`);
      }
    }
  }
  judge(name, problems.length === 0, problems);
  return r;
}

// ---- expected/*.json を走査 ----
for (const file of readdirSync(join(ORACLE, 'expected')).sort()) {
  const spec = readJson(join(ORACLE, 'expected', file));
  if (only && !spec.case.startsWith(only)) continue;

  if (spec.case === 'S-11') {          // CLI 引数マトリクス
    spec.runs.forEach((run, i) => {
      const cmd = [cli, ...run.args.map(a => a.startsWith('--') ? a : JSON.stringify(resolve(ORACLE, a)))].join(' ');
      let exit = 0, stdout = '';
      try { stdout = execSync(cmd, { encoding: 'utf-8', stdio: ['ignore', 'pipe', 'pipe'] }); }
      catch (e) { exit = e.status ?? 2; stdout = e.stdout ?? ''; }
      const p = [];
      if (exit !== run.expect_exit) p.push(`exit ${exit} != ${run.expect_exit}`);
      if (run.stdout_contains && !stdout.includes(run.stdout_contains)) p.push('stdout_contains failed');
      if (run.stdout_is_json) { try { JSON.parse(stdout); } catch { p.push('stdout not JSON'); } }
      judge(`S-11[${i}] ${run.args.join(' ')}`, p.length === 0, p);
    });
  } else if (spec.runs) {              // S-07 / S-12(複数ラン)
    spec.runs.forEach((run, i) =>
      checkRun(`${spec.case}[${i}] gate=${run.gate ?? '-'}${run.eco ? '+eco' : ''}`, run.target ?? spec.fixture, run));
  } else {
    checkRun(`${spec.case} ${file}`, spec.fixture, spec);
  }
}

// ---- 手続き検査(fixture 非対応の S ケース) ----
if (!only || 'S-09'.startsWith(only)) { // 決定性: 2回実行 byte 同一
  const a = runCli('fixtures/clean/repo', { gate: 'G3', extraArgs: ['--view'] });
  const b = runCli('fixtures/clean/repo', { gate: 'G3', extraArgs: ['--view'] });
  const p = [];
  for (const f of ['diagnostics.json', 'graph.json', 'ledger.json', 'plm-view.html']) {
    if (!existsSync(join(a.out, f)) || !existsSync(join(b.out, f))) { p.push(`${f} missing`); continue; }
    if (!byteEqual(join(a.out, f), join(b.out, f))) p.push(`${f} byte-diff`);
  }
  judge('S-09 determinism (2-run byte identity)', p.length === 0, p);
}
if (!only || 'S-10'.startsWith(only)) { // read-only: 前後ハッシュ不変
  const target = join(ORACLE, 'fixtures/rules/R-003/repo');
  const before = hashTree(target);
  runCli('fixtures/rules/R-003/repo', { gate: 'G3', extraArgs: ['--view'] });
  const d = diffTree(before, hashTree(target));
  judge('S-10 read-only (tree hash invariant)', d.ok, d);
}
if (!only || 'S-14'.startsWith(only)) { // viewer 自己完結
  const r = runCli('fixtures/clean/repo', { gate: 'G3', extraArgs: ['--view'] });
  const html = existsSync(join(r.out, 'plm-view.html')) ? readFileSync(join(r.out, 'plm-view.html'), 'utf-8') : null;
  const c = html ? checkSelfContained(html) : { ok: false, violations: ['plm-view.html missing'] };
  judge('S-14 viewer self-contained', c.ok, c.violations);
}
// S-15/S-17(DOM 検査)・S-18(性能)は製品完成後に本ランナーへ追補する(41 の fixture 欄参照)

console.log(`\n== oracle result: ${pass} PASS / ${fail} FAIL ==`);
if (failDetails.length) console.log(JSON.stringify(failDetails, null, 2));
process.exit(fail ? 1 : 0);
