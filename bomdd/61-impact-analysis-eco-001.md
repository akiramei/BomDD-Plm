# Impact Analysis — ECO-001 影響分析(Phase 7)

> [60-change-order-eco-001.md](60-change-order-eco-001.md) §2 の詳細版。
> 規律: 影響なし予測を**反証可能な形で製造前に凍結**(本書 §2)。回帰結果が予測の採点になる。
> 粒度: M-BOM unit では core 1 unit に集中するため、**E-BOM 部品粒度+不要改変 diff 測定(63)**で統制する(playbook §4.1)。

## 1. 影響あり(トレース逆引き)

| 段 | 影響 ID | 何が変わるか |
|---|---|---|
| 仕様節 | §2.4(参照解決) | パス受理形3種の明文化: 正準 `<repo>/<相対>` / repo 相対(プレフィックスなし・セグメント数不問・file/dir 不問) / `repo名:相対`(正準と等価)。id-or-path の②フォールバックにも同一受理形 |
| 仕様節 | §2.5(workspace・一意性) | R-002 の一意性スコープ: 定義サイトの `uniqueness_scope: per-file` 宣言を尊重(既定= workspace 全域) |
| E-BOM 部品 | E-CORE-RESOLVE-005 | パス解決の受理形実装(pathExists 相当の非一貫是正+repo: 記法) |
| E-BOM 部品 | E-CORE-LINT-007 | R-002 評価が定義サイトの uniqueness_scope を尊重 |
| M-BOM unit | M-CORE-GRAPH-002・M-CORE-RULES-003 | 部分改修: resolve/model.ts・rules/evaluate.ts 近傍のみ。**8 unit 中 2**(forward-01.5 の 3/3 と対照的に unit 粒度で絞り込みが効く規模) |
| Control Plan 特性 | CP-RESOLVE-005 | test_vectors 追加: 受理形3種×(file/dir)×(単一/多セグメント)+不在値の反例 |
| Control Plan 特性 | CP-LINT-007 | test_vectors 追加: per-file 宣言サイトのファイル内重複(発火)/ファイル間同名(非発火)/宣言なしサイトのファイル間重複(発火維持) |
| 固定オラクル | **S-20・S-21 追加のみ** | S-20=パス受理形プロファイル / S-21=per-file スコーププロファイル。既存 S-01〜S-19 は不変 |
| K-BOM | K-REFV0 | ref-v0.4 スナップショット差替(managed_knowledge の判断内容は不変) |
| スキーマ | ref-edges.draft.yaml → ref-v0.4 | (a) kind 凡例にパス受理形を明記 (b) ui-ir defines(tempPartNo/uiId)に `uniqueness_scope: per-file` (c) 改訂履歴。本体 BomDD/method/schemas/draft/ と製品 schemas/ref-v0/ を同期 |
| Routing / Work Order | 40-work-order-eco-001.md 新設 | 部分改修指示+診断非改変の宣言+stop/report |
| 台帳 | 60-change-register.yaml 新設 | ECO-001 の構造化記録(R-051 の正定義サイト) |

## 2. 影響なし予測(反証可能 — 製造前に凍結)

> 検証方法: 各既存オラクル行の fixture/expected を設計者が直接照合した(2026-07-03)。
> 予測「不変」の根拠が fixture の中身に依存する行は、その値を明記する(反証可能性)。

| 既存行 | 予測 | 根拠 |
|---|---|---|
| S-01 clean | 不変 | 受理形**拡張**は解決集合を広げる方向のみ。全解決(所見ゼロ)の fixture は広げても所見ゼロ |
| S-02 R-003/R-004 | 不変 | 期待 R-004 の発火値は `src/missing.ts` のみ=多セグメント・**真に不在**。受理形拡張後も不解決。単一セグメント値・`repo:` 形式値は fixture に存在しない(全数 grep 済み) |
| S-03 R-002 | 不変 | 重複は 10-requirements/30-ebom 等 YAML 台帳由来= `uniqueness_scope` 宣言のない定義サイト → 従来どおり workspace 全域検査 |
| S-04 parse | 不変 | パース層。参照解決に到達しない |
| S-05 R-020 | 不変 | ui-ir は fixture 内に1つ。per-file 化は「複数ファイル間の同名」の扱いのみ変える |
| S-06 R-040 | 不変 | lineage/active 参照の判定。パス受理形・一意性スコープと交差しない |
| S-07 gate-matrix | 不変 | 期待プロファイルに R-002/R-004 行なし(発火源は R-051/R-030 系)。ゲート割付は変更しない |
| S-08 suppress | 不変 | 期待 R-004 の発火値は `src/missing.ts`(真に不在)。suppress 照合は正準パス照合であり受理形拡張の影響を受けない(照合仕様 §2.8 は不変) |
| S-09 決定性 | 不変 | 同一入力2回の self-consistency 比較。所見集合が変わっても検査自体は独立。かつ本 fixture 群に受理形拡張で解決が変わる値なし |
| S-10 read-only | 不変 | ファイルシステム不変性の検査。解決ロジックと無関係 |
| S-11 CLI matrix | 不変 | 引数処理層。参照解決と無関係 |
| S-12 workspace | 不変 | R-002 期待所見は 31-kbom の K-DUP(リポ間)=宣言のない定義サイト → 全域検査のまま。cross_repo ID 解決(X-XREPO 分岐)はパス受理形と別経路 |
| S-13 schema 差替 | 不変 | fixture は `--schema` で独自スキーマに差し替えて検査する(同梱スキーマの v0.4 化の影響を受けない)。未知キー `uniqueness_scope` は additionalProperties: true の範囲 |
| S-14 viewer 自己完結 | 不変 | viewer は diagnostics/graph JSON の消費者。生成物の形(スキーマ)は変えない |
| S-15 マトリクス1対1 | 不変 | 突合対象の fixture に受理形・スコープの影響値なし(S-02/S-03 と同根拠) |
| S-16 ledger | 不変 | 台帳抽出層。**注意**: 本 ECO で 60-change-order-eco-001.md と 60-change-register.yaml が**製品リポに**増えるが、S-16 の fixture は合成リポであり影響しない |
| S-17 DC/DE DOM | 不変 | viewer 表示契約。データ源の形は不変 |
| S-18 perf | 不変 | 受理形追加は参照1件あたり O(1) の分岐追加。現測定 0.75s vs 閾値 15s(13倍マージン) |
| S-19 実リポ遡及 | 契約不変 | 契約は「クラッシュ0・全所見裁定可能」。所見**数**は減る方向(PD-7/8/per-file の誤検出解消= ECO の目的そのもの)だが、これは S-20/S-21 が合成 fixture で固定する変更受入であり S-19 の契約ではない |
| 非対象ファイル群 | diff 0 | packages/cli・packages/viewer・core の discover/parse/gate/suppress/output/util — 63 の diff 監査で測定 |

## 3. 採点(製造・回帰の後に記入)
- under-inclusion(影響なし予測が外れた箇所):
- over-inclusion(影響ありとしたが変わらなかった箇所):
- 粒度の観察(絞り込み効果が出たか):
