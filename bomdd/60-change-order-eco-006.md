# Change Order — ECO-006(M-BOM 写像被覆ギャップの解消 — 治具・生成物・CI・スキーマ派生の所有 unit 宣言)

> 52 `product_eco_candidates` の台帳債務候補(2026-07-04 起票・2026-07-10 定量)の単独昇格。
> 「治具は製品と同格」の原則(M-HARNESS-008 で宣言済み)を、未宣言のまま残る 4 系統へ台帳反映する。
> **挙動不変 ECO**(src/test/oracle/仕様本文の変更なし — 変更は bomdd/ の宣言のみ)。

## 0. 出自と gate ①

- 出自: unmapped 実変更 **76 files**(採点規約 v2/fail-closed 見出し・2026-07-10 再測定)。内訳=
  oracle/ 27・packages/ 生成物 43(dist/・tsconfig.tsbuildinfo)・.github/ 3・schemas/ 3。
  実在例: BomDD harness ECO-003 の再測定で「unmapped 3・under 0= 影響予測完璧」に見えていた
  (v1 見出しの盲点 — 52 候補行参照)。
- gate ①: **maintainer 再裁定 2026-08-02**(BomDD equip-03 題材の単独昇格)。既存判断
  「単独 ECO は過剰(次回 32-mbom 改訂時に便乗)」を、①測定価値(equip-03= ECO 適用製造の
  測定 4 次元のうち影響抽出・BOM 同期・証拠クローズを直接測る)②在庫の新事実(src 変更を伴う
  未起票候補ゼロの実測)で更新した。
- 製造設備: BomDD equip-03 protocol(凍結 93b1be9)に従い **claude-opus-5(工場 subagent)**。
  担当設備欄は BomDD loops/equip-03/measurements.md に記録(ECO-028 様式)。

## 1. 変更要求

### CH-1: 32-mbom `manufacturing_units` の所有宣言拡張(unmapped 76 → 0)

- 対象 4 系統(2026-08-02 変更前個体の実測。採点器= BomDD method/tools/impact-retrospective.py・
  写像= artifact.path 最長前方一致・bomdd/ と .md は採点対象外):
  1. `oracle/`(fixtures・expected・harness .mjs)
  2. `packages/*/dist/`・`packages/*/tsconfig.tsbuildinfo`(ビルド生成物 — ECO-004/005 で
     under-inclusion 2 例の実績があるクラス)
  3. `.github/`(CI 定義)
  4. `schemas/`(ref-v0 派生スキーマ)
- 宣言先: `bomdd/32-mbom.yaml` manufacturing_units(新 unit 追加 or 既存 unit の帰属拡張 —
  設計は §2 裁定点)。M-BOM 冒頭の粒度原則(独立に再製造・交換できる単位)との整合を
  影響分析に明記すること。

### スコープ外(明示)

- src・test・oracle・schemas・.github の**実体変更**(宣言のみ)。
- 採点器(BomDD 側治具)の生成物除外パターン導入(治具側課題として 52 に併記済み — 別リポの裁定)。
- 33-control-plan の acceptance_refs 接続の新設(既存 unit と同水準の宣言までを本 ECO とする)。

## 2. 裁定点(gate ① 裁定 2 により工場設計へ委任 — 独立検査+maintainer 裁定で審査)

1. **生成物(dist/・tsbuildinfo)の帰属方式**: a) ソース unit が生成物も所有(dist は鋳造出力)/
   b) 生成物専用 unit / c) その他。設計根拠を影響分析に記載。
2. 新 unit の粒度と命名(既存 M-HARNESS-008= 治具 unit の前例に整合させるか)。

## 3. 影響分析

**工場(claude-opus-5)が起草する**(equip-03 gate ① 裁定 2 — 測定次元 1 の直接測定)。
起草物は workspace の `impact-analysis-eco-006.md`。設計者側の事前予測(較正用・工場非開示):
変更は bomdd/ のみ・全回帰不変。

## 4. 較正と受入(起票時凍結)

- **較正(V2・変更前個体の赤)**: 2026-08-02 実測済み — `impact-retrospective --repo .` の
  `summary.decomposition.unmapped_files = 76`(受入条件が現状不成立であることの凍結)。
- 受入:
  - V1: 凍結採点器で `unmapped_files = 0` **かつ** `real_under_files = 111` 不変
    (76 が mapped へ移るだけで実変更集合は不変 — 見出しの付け替えでない証明)。
  - V3: 回帰 — `npm run build` 0 エラー・`node --test` 全通過・オラクル全行 PASS・
    self-hosting lint(`--eco` 込み)error/warn 0(新宣言の参照実在= R-004 系 green を含む)・
    ViewPrism2 workspace 回帰 error/warn 0。
  - V4: R-051(register affected_refs 解決)green。
  - V5: diff_audit dogfood — 本 ECO の diff が `bomdd/` に閉じる(下記宣言)。verified 時に
    head: で窓を閉じる(ECO-005 運用)。
- diff_audit(起票時宣言): `{ baseline: eco-006-input, allowed_paths: [bomdd/] }`

## 5. 記録(2026-08-02 受入)

- 製造: claude-opus-5[1m](工場 subagent・自己申告)— 影響分析起草(61)+32-mbom 宣言 5 unit
  (M-ORACLE-009/M-BUILD-CORE-010/M-BUILD-VIEWER-011/M-CI-012/M-SCHEMA-013)+51 ずる 4 件。
  裁定 1= 案 b(生成物専用 unit — 帰属規則「生成物を一意に生む製造手順を持つ最小の unit」)/
  裁定 2= M-HARNESS-008 様式整合・通番 009〜013(oracle/ を 008 へ併合しない根拠= 供与境界が逆)。
  介入 0・自己受入 5/5。詳細= BomDD loops/equip-03/(equip-03 測定ラウンド)。
- 設計者側 受入(実リポ・全再実測): V1= 凍結採点器 **unmapped_files 0**(較正の赤 76 → 0)かつ
  **real_under_files 111 不変**(見出し付け替えでない証明)。V3= build 0 エラー・**118/118 tests**・
  **オラクル 34/34**・self-hosting `--eco --fail-on error` **error/warn 0**(info 176→180:
  増分は新 unit 4 件の R-005 孤立定義のみ= register 影響集合の更新で解消)・
  **ViewPrism2 workspace 回帰差分 0**(変更前個体との対照実測で error 0/warn 12/info 502 が
  完全同値 — warn 12 は ViewPrism2 側の既存状態であり本 ECO 非起因)。V4= R-051 green。
  V5= diff が bomdd/ に閉じる(git status 3 ファイルすべて bomdd/)。
- 影響なし予測の的中: src/test/oracle/schemas/.github 実体 diff ゼロ・全回帰不変。
- 工場の正直記載: 影響なし予測の外れ 1 件(multi_unit_ecos 5 予測 → 実測 4)を 61 §6 に自己申告。
- **F003(工場検出の order 欠陥)**: §3 の起草先「workspace の impact-analysis-eco-006.md」は
  誤記 — 正= `bomdd/61-impact-analysis-eco-006.md`(既存 61-eco-001/002 様式・diff_audit
  allowed_paths とも整合)。工場は実物が正で解決し本欄で訂正(§3 本文は歴史記録として非改竄)。
- register: affected_refs へ新 5 unit を追加(影響集合の実相化・R-005 孤立解消)。
- 残: 独立検査(Codex fresh)→ maintainer 裁定(verified+golden)→ head タグで窓閉鎖・
  52 記帳(eco_006 節+候補行解消マーカー)。
