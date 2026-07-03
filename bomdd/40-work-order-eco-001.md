# Work Order — ECO-001 部分改修(fresh factory 用)

> 変更オーダー: [60-change-order-eco-001.md](60-change-order-eco-001.md)(§1 変更要求・§2 影響分析)。
> 本改修は**部分改修**である: 既存の受入済みソース(tag `v0.1-plm-accepted`)への最小変更。
> **影響分析にある箇所だけを改修せよ。影響なし箇所への変更は禁止。納品 diff を測定する。**

## 1. 改修対象(これ以外に触れない)

| 対象 | 変更内容 | 典拠 |
|---|---|---|
| packages/core の参照解決(パス実在検査) | パス値の受理形3種の実装: ①正準 `<repo>/<相対>` ②repo 相対(**セグメント数不問**=単一セグメント `test` も。file/dir 不問)③`repo名:相対`(正準と等価。repo 名不在なら不解決 — **形式2 へフォールバックしない**)。kind: path / id-or-path の② / path-at-rev のパス部/ trace_links エンドポイントのパス解決に共通 | 仕様 §2.4(rev2) |
| packages/core の R-002 評価 | 定義サイト宣言の `uniqueness_scope: per-file`(ref-v0.4)を尊重: per-file 宣言サイト由来の ID は**抽出ファイル単位**で重複判定(同一ファイル内のみ R-002。別ファイル間の同名は合法)。**ID 索引への登録・参照解決は従来どおり全域**。宣言のないサイトは従来どおり workspace 全域 | 仕様 §2.5(rev2)・schemas/ref-v0/ref-edges.draft.yaml |
| ref-v0 スキーマ読込(schema/load) | defines エントリの `uniqueness_scope` キーの読込(未知値は無視でよい — 現版の値は per-file のみ) | ref-v0.4 |
| 対応する unit test(packages/*/test) | 変更分の test_vectors を追加(下記 §3) | 33-control-plan CP-RESOLVE-005 / CP-LINT-007 |

**変更禁止**: packages/cli / packages/viewer / core の discover・parse・gate・suppress・output・util /
既存出力契約(diagnostics/graph/ledger スキーマ・正規シリアライズ §2.9)/ rule-messages.yaml の凍結文言 /
R-004・R-002 の severity・gate・message 形。既存テストの改変は「新仕様で正当に期待が変わる場合」のみ許可し、
その場合は 51-cheat-log 形式で1件ずつ報告する。

## 2. 製造条件(plm-v0 と同一の規律)
- 本パッケージ(bomdd/ 一式+schemas/ref-v0+現ソース)以外を参照しない。設計対話・オラクル実装・他工場成果は不在。
- **ずる報告の義務**: BOM/仕様から導けず慣習で埋めた判断は、実装を止めずに全件 51-cheat-log 形式で報告する。
- ビルド: `npm run build` 警告 0 / TypeScript strict。決定性(§2.9)を壊さない(K-TS-DETERMINISM)。

## 3. 自己受入(緑が納品条件・赤=stop/report)
1. 既存 `node --test` 全緑(**87 本を退行させない**)。
2. 変更分の unit test(最低限 33-control-plan の ECO-001 test_vectors を写像):
   - 受理形: 単一セグメント dir 実在=解決 / 単一セグメント file 実在=解決 / 多セグメント dir=解決 /
     正準形=解決 / repo:形 実在=解決 / repo:形 repo 名不在=不解決(形式2へ非フォールバック)/ 真に不在=不解決 /
     id-or-path ②でも同受理形
   - per-file: 宣言サイトのファイル内重複=R-002 発火 / 別ファイル間同名=非発火 /
     宣言なしサイトのファイル間重複=発火維持 / per-file 対象 ID への参照解決=全域索引で解決
3. L1 スモーク: 実リポ(本リポ自身)への lint がクラッシュ 0・exit 0/1。
- **自己受入赤のまま納品しない**: 停止し、原因と現況を manufacturing nonconformance として報告する。

## 4. 納品物
- 変更ソース+追加テスト(diff は設計者が tag `v0.1-plm-accepted` 基準で監査する)
- 51-cheat-log 形式のずる報告(0件でも「0件」と明記)
- as-built 素片: 変更ファイル一覧・テスト本数・自己受入結果
