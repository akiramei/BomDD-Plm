# Work Order — ECO-002 部分改修(fresh factory 用)

> 変更オーダー: [60-change-order-eco-002.md](60-change-order-eco-002.md)(§1 変更要求 3 項目・§2 影響分析)。
> **部分改修**: 既存の受入済みソース(tag `eco-002-input` 時点)への最小変更。
> **影響分析にある箇所だけを改修せよ。影響なし箇所への変更は禁止。納品 diff を測定する。**

## 1. 改修対象(これ以外に触れない)

| 対象 | 変更内容 | 典拠 |
|---|---|---|
| packages/core — **新規** git diff アダプタ | `git -c core.quotepath=false diff --name-only <baseline> HEAD` を spawnSync(shell 不使用)で実行し、変更ファイル一覧(リポルート相対・`/` 区切り)を返す。ENOENT/status≠0 は「実行不能」として区別して返す。**読み取り専用サブコマンド以外を発行しない** | 仕様 §2.17・K-GIT(31-kbom) |
| packages/core — schema/load | 60-change-register の changes[] から `diff_audit: { baseline, allowed_paths[] }` を読む(無ければ undefined) | ref-v0.7(schemas/ref-v0/ref-edges.draft.yaml ヘッダ) |
| packages/core — rules 評価 | **R-052**(gate=eco・error): diff_audit を持つ ECO エントリのみ、diff の各ファイルが `bomdd/` または allowed_paths のいずれかに前方一致しなければ 1 ファイル 1 所見(file= register の正準パス・targetId= ECO id・message の {ref}= 当該ファイル)。git/baseline 不能= **X-GIT-001**(info)を ECO ごとに 1 件出し skip。文言は rule-messages.yaml が正 | 仕様 §2.17 |
| packages/core — resolve(パス解決) | 受理形3(`repo名:相対`)の repo 名が workspace に不在の場合、R-004 でなく **X-XREPO-001(info)で skip** に変更(形式2 への非フォールバックは維持。repo 実在でパス不在は R-004 のまま) | 仕様 §2.4 rev3 |
| packages/core — SARIF ビルダ+出力 | `--sarif` 時のみ `--out` に **sarif.json** を追加生成。写像は仕様 §2.9 rev3 の記載どおり(schemaVersion 2.1.0 / level 写像 / 正準パス+startLine / suppressions[kind=external] / 発火規則のみ rules[] id 昇順 / 正規シリアライズ= LF・2sp・キー順は仕様記載順・時刻/絶対パス/乱数なし)。plm-diag/1 は不変 | 仕様 §2.9 rev3 |
| packages/cli | `--sarif` フラグ追加(--help の Options にも1行)。既存フラグの挙動・exit code 規約は不変 | 仕様 §2.10 rev3 |
| 対応する unit test(test/) | 変更分の test_vectors(33-control-plan の CP-GITDIFF-021 / CP-SARIF-020 / CP-RESOLVE-005 ECO-002 行)を写像 | 33-control-plan |

**変更禁止**: packages/viewer 全体 / core の discover・parse・gate・suppress・output の既存経路
(diagnostics/graph/ledger の内容・正規形は不変)/ 既存 exit code 規約 / rule-messages.yaml(改訂済み・転記のみ)/
既存テストの改変(新仕様で正当に期待が変わる場合のみ許可し 51 形式で報告)。

## 2. 製造条件(ECO-001 と同一の規律)
- 本パッケージ以外を参照しない。設計対話・オラクル実装・他工場成果は不在。
- **ずる報告の義務**: BOM/仕様から導けず慣習で埋めた判断は全件 51-cheat-log 形式で報告。
- ビルド: `npm run build` 警告 0 / TypeScript strict / 決定性(§2.9)を壊さない。
- **git fixture を使う unit test は、テスト自身が一時 dir に git init して組み立てる**(リポに .git は置けない)。
  git 不在環境では当該テストを skip にする(fail-open — CI には git がある)。

## 3. 自己受入(緑が納品条件・赤=stop/report)
1. 既存 `node --test` 全緑(96 本を退行させない)。
2. 変更分 unit test(最低限):
   - R-052: 許容内=なし / はみ出し=1 ファイル 1 所見 / diff_audit なし=非起動 / baseline 不能= X-GIT-001 /
     非 git リポ= X-GIT-001 / --eco なし=非発火 / 日本語+空白パスのはみ出しが正しく報告(quotepath)
   - SARIF: --sarif なし=非生成 / level 写像 3 種 / suppressions / line 欠落= region 省略 / rules[] 発火のみ昇順 / 2 回 byte 同一
   - repo: skip: repo 不在= X-XREPO info(error/warn なし)/ repo 実在パス不在= R-004 維持
3. L1 スモーク: 自リポ lint がクラッシュ 0(exit 0/1)。`--eco` 付き自リポ lint もクラッシュ 0。
- **自己受入赤のまま納品しない**(manufacturing nonconformance として停止・報告)。

## 4. 納品物
- 変更ソース+追加テスト / 51 形式のずる報告(0 件でも明記)/ as-built 素片(変更ファイル一覧・テスト本数・自己受入結果)
