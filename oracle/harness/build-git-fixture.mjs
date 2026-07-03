// S-22 用: git 履歴付き fixture を一時ディレクトリに組み立てる(設計者側治具)。
// .git はリポに格納できないため、採点時に決定的な履歴を毎回構築する。
// 決定性: author/committer/日時を固定(コミット SHA も安定するが、期待は tag 名参照なので SHA 非依存)。
import { mkdtempSync, mkdirSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { execFileSync } from 'node:child_process';

const GIT_ENV = {
  ...process.env,
  GIT_AUTHOR_NAME: 'oracle', GIT_AUTHOR_EMAIL: 'oracle@bomdd',
  GIT_COMMITTER_NAME: 'oracle', GIT_COMMITTER_EMAIL: 'oracle@bomdd',
  GIT_AUTHOR_DATE: '2026-07-03T00:00:00Z', GIT_COMMITTER_DATE: '2026-07-03T00:00:00Z',
};
function git(cwd, ...args) {
  return execFileSync('git', args, { cwd, env: GIT_ENV, encoding: 'utf-8' });
}
function write(root, rel, content) {
  const p = join(root, ...rel.split('/'));
  mkdirSync(join(p, '..'), { recursive: true });
  writeFileSync(p, content);
}

/**
 * 組み立てる履歴:
 *  base(tag: eco-base) … bomdd/ 台帳+src/allowed/a.txt
 *  HEAD               … a.txt 変更(許容内)+src/outside/b.txt 追加+src/外側/日本語 データ.txt 追加(はみ出し2)
 * register の ECO 4 態:
 *  ECO-A: diff_audit{baseline: eco-base, allowed_paths:[src/]}          → diff 全て許容内= 所見なし
 *  ECO-B: diff_audit{baseline: eco-base, allowed_paths:[src/allowed/]}  → はみ出し2ファイル= R-052 ×2
 *  ECO-C: diff_audit{baseline: no-such-rev, ...}                        → X-GIT-001 info(skip)
 *  ECO-D: diff_audit なし                                               → 非起動(所見なし)
 * @returns {string} fixture リポの絶対パス
 */
export function buildGitFixture() {
  const root = join(mkdtempSync(join(tmpdir(), 'plm-git-fixture-')), 'gitrepo');
  mkdirSync(root, { recursive: true });

  write(root, 'bomdd/10-requirements.yaml',
`bomdd:
  product: gitrepo
  layer: Requirements
requirements:
  - id: REQ-001
    statement: R-052 diff-audit fixture
`);
  write(root, 'src/allowed/a.txt', 'v1\n');

  git(root, 'init', '-q', '-b', 'main');
  git(root, '-c', 'core.autocrlf=false', 'add', '-A');
  git(root, 'commit', '-q', '-m', 'base');
  git(root, 'tag', 'eco-base');

  // register は HEAD 側で追加/更新(bomdd/ 内の diff は常に許容 — register 自身の改訂が R-052 を汚さないことも同時に検証)
  write(root, 'bomdd/60-change-register.yaml',
`bomdd:
  product: gitrepo
  layer: ChangeRegister
changes:
  - id: ECO-901
    title: within-allowed
    status: in-progress
    diff_audit: { baseline: eco-base, allowed_paths: [src/] }
  - id: ECO-902
    title: out-of-impact
    status: in-progress
    diff_audit: { baseline: eco-base, allowed_paths: [src/allowed/] }
  - id: ECO-903
    title: bad-baseline
    status: in-progress
    diff_audit: { baseline: no-such-rev, allowed_paths: [src/] }
  - id: ECO-904
    title: no-diff-audit(past ECO)
    status: verified
`);
  write(root, 'src/allowed/a.txt', 'v2\n');
  write(root, 'src/outside/b.txt', 'new\n');
  write(root, 'src/外側/日本語 データ.txt', 'jp\n');   // quotepath 検証(日本語+空白)
  git(root, '-c', 'core.autocrlf=false', 'add', '-A');
  git(root, 'commit', '-q', '-m', 'change');

  return root;
}
