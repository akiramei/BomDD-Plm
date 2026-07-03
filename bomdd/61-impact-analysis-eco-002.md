# Impact Analysis — ECO-002 影響分析(Phase 7)

> [60-change-order-eco-002.md](60-change-order-eco-002.md) §2 の詳細版。影響なし予測を製造前に凍結(§2)。
> 粒度: M unit では 4/8(RULES/GRAPH/OUTPUT/CLI)に広がるため、**E-BOM 部品粒度+63 diff 測定**で統制
> (今回は R-052 の自己適用も併走)。

## 1. 影響あり(トレース逆引き)

| 段 | 影響 ID | 何が変わるか |
|---|---|---|
| 仕様 | §2.4 / §2.9 / §2.10 / **§2.17 新設** / §5 | CH-3 skip 化 / SARIF 意味論 / --sarif フラグ / R-052 意味論 / トレース行 |
| REQ | REQ-010 rev2・REQ-027 新設・REQ-007 rev3 | R-052 解除 / SARIF / 受理形3 不在= skip |
| E-BOM | E-CORE-LINT-007・E-CORE-RESOLVE-005・**E-CORE-GITDIFF-030 新設**・**E-CLI-SARIF-031 新設** | R-052 評価 / repo: skip / git 読み取りアダプタ(read-only 契約)/ SARIF ビルダ |
| M-BOM | M-CORE-RULES-003・M-CORE-GRAPH-002・M-CORE-OUTPUT-004・M-CLI-005 | 4/8 unit(部分改修) |
| CP | CP-LINT-007・CP-RESOLVE-005(vectors 追加)・**CP-SARIF-020**・**CP-GITDIFF-021 新設** | 受入の追加 |
| 固定オラクル | **S-22/S-23/S-24 追加**+**S-20 ghost 行の文書化改訂**(意味論変更・rev1 前例と同型) | 既存 26 ケースは不変 |
| 治具 | run-oracle.mjs(git fixture 組立+sarif 検査)・selftest 追補 | セルフテスト+較正を再実施 |
| スキーマ | ref-edges → **ref-v0.7**(60-register の diff_audit 規定+X-GIT-001 凡例) | 本体と製品スナップショット同期 |
| K-BOM | K-REFV0(v0.7 差替)+**K-GIT 新設候補**(git 呼び出しの慣習判断: diff 構文・quotepath・cwd) | 事前抽出は §3 BOM 改訂時に実施 |

## 2. 影響なし予測(反証可能 — 製造前に凍結)

> 検証方法: fixture/expected の実値照合(2026-07-03)。鍵は3つの opt-in 設計 —
> R-052 は「--eco **かつ** register に diff_audit があるエントリ」のみ・SARIF は「--sarif」のみ・
> CH-3 は「repo: 形の repo 不在」経路のみ。

| 既存行 | 予測 | 根拠 |
|---|---|---|
| S-01 clean | 不変 | 3変更とも opt-in / 特定経路。clean fixture は register も repo: 値も持たない |
| S-02 R-003/R-004 | 不変 | 発火値 `src/missing.ts` は repo: 形でない(受理形1/2 の経路は無変更) |
| S-03 / S-21 R-002 | 不変 | 一意性検査は無関係 |
| S-04 parse | 不変 | パース層無変更 |
| S-05 R-020 / S-06 R-040 | 不変 | 対象規則無変更 |
| S-07 gate-matrix(+eco 含む) | 不変 | fixture の register に diff_audit なし→ R-052 は起動せず(opt-in)。X-GIT-001 も出ない(検査自体が非起動)。R-051 経路は無変更 |
| S-08 suppress | 不変 | 抑制照合は無変更。fixture に repo: 値なし |
| S-09 決定性 | 不変 | --sarif 不使用→出力集合不変。同一入力2回の self-consistency は新コードでも成立 |
| S-10 read-only | 不変 | fixture 実行は --eco なし= git 呼び出しなし。(R-052 の git は read-only 契約 — S-22 側で検証) |
| S-11 CLI matrix | 不変 | --help 期待は `stdout_contains: "Usage"`(部分一致)= フラグ追加に不変。既存フラグの行は挙動無変更。不正フラグ検査は「未知フラグ= exit 2」の一般則で --sarif は既知化されるが、fixture の不正フラグ値は --sarif でない |
| S-12 workspace | 不変 | cross_repo ID 経路は無変更。fixture に repo: 形パス値なし |
| S-13 schema 差替 | 不変 | fixture は --schema 差替で検査。diff_audit/X-GIT-001 は additionalProperties/凡例の範囲 |
| S-14 viewer | 不変 | viewer は変更禁止(影響外) |
| S-16 ledger | 不変 | register の diff_audit は ledger 抽出対象外フィールド(未知キー無視) |
| **S-20 path-forms** | **ghost 行のみ改訂** | `ghost:assets/logo.txt`: R-004(error)→ X-XREPO-001(info)。他の行(実在値の解決・repo: パス不在の R-004・真の不在の R-004)は**不変** — CH-3 が変えるのは「repo 名不在」の1経路のみ。exit も error 残2件により 1 のまま |
| 非対象ファイル | diff 0 | packages/viewer 全体・core の discover/parse/gate/suppress/util — 63+**R-052 自己適用**で測定 |

## 3. 採点(製造・回帰の後に記入)
- under-inclusion:
- over-inclusion:
- 粒度の観察:
- R-052 自己適用の突合(手動 63 との一致):
