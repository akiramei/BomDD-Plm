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

### §5 追記(2026-08-02・独立検査 IA-ECO006-05 の是正 — 記録の精密化)

- **段階の区別**(上記本文は 2 段階の証拠が混在していた — 訂正): (i) 工場 workspace 段階=
  変更 3 ファイル・lint info 180(新 unit の R-005 孤立 4 件を含む)。(ii) 最終 fix commit
  8a874ea= 台帳 2 ファイルを加えた **5 ファイル**・register 影響集合更新により **info 176・
  新 unit 由来所見 0**(独立検査官の書込みなし API 再測定でも 176 を確認)。
- **ViewPrism2 workspace 回帰の再現条件(固定)**: コマンド=
  `node packages/cli/dist/main.js examples/viewprism-workspace.yaml --out <リポ外>`(--eco なし)/
  対象 revision= ViewPrism2 **6fe3706**(clean)・ViewPrismUI **204723b**。この条件で
  error 0 / **warn 12** / info 502 を変更前個体・変更後・追試(21:43)の 3 回とも再現。
  独立検査官の再測定値 warn 15 は実行条件差(--eco 等のオプション集合)由来とみられ、
  revision・コマンド未記録だった本欄の欠陥(IA-05)が原因 — 本追記で固定。
- 独立検査= REJECT・所見 5 件(medium 4/low 1)・当方突合で **5/5 CONFIRMED・誤検出 0**。
  工場帰属 IA-01〜04 は差戻 1 回目で是正(是正後の受入は本 order 末尾へ追記)。
  報告全文= BomDD loops/equip-03/independent-inspection-eco-006.md。

### §5 追記 2(2026-08-02・差戻 1/2 の是正後受入 — NEW-ECO006-01 の是正を兼ねる最終記録)

- **差戻 1(fix2= e876e81)**: IA-01= provenance 分離(鋳造 unit を packages/*/dist/ へ限定+
  M-PKGDEF-CORE-015/M-PKGDEF-VIEWER-016 新設・裁定 1 へ規則 (A)「unit は provenance で切る」)/
  IA-02= M-SCHEMA-013 を schemas/ref-v0/ へ縮小+M-SCHEMA-CONTRACT-014 分離/IA-03= 部分
  (viewer→core・CI→build/pkgdef 補完+意味論裁定 3「再製造前に成立していなければならない unit」)/
  IA-04= 論拠を「製造帰属が違う」へ差し替え。残余 1(tsbuildinfo の混載= パス機構の限界)を
  契約文へ明示(宣言済み境界)。是正確認の再検査(Codex fresh・対象 e876e81)= IA-01/02/04/05
  CLOSED・**境界受理 1**(tsbuildinfo — 現物一致で受理)・IA-03 PARTIAL・NEW-ECO006-01(本欄の
  未追記= 設計者帰属)→ REJECT。報告= BomDD loops/equip-03/independent-reinspection-eco-006.md。
- **差戻 2(fix3= 本 commit)**: IA-03 完全化 — 裁定 3 の基準を既存 8 unit へ一貫適用し
  **9 エッジ追加**(証拠等級 A= 直接参照 6/B= 受入 vector 経由 3 — B の理由= INV-007「パスを
  コードへ焼かない」により根拠 A が原理的に取得不能)。**張らない側 5 クラスも検算根拠つきで
  61 §8.3 に記録**(推移閉包を取らない・循環回避を含む)。既存 unit の変更は depends_on 追加行のみ
  (numstat 削除 0 の機械証明)。ずる追記 2(F008 証拠等級 B の構造的弱点/F009 不在宣言の
  再検証不能性)= 累計 9。
- **最終受入(fix3 個体・実リポ全再実測)**: 採点器 **unmapped 0・real_under 111 不変**・
  build 0 エラー・**118/118 tests**・self-hosting `--eco --fail-on error` **error 0/warn 0・
  info 176**(M-SCHEMA-013 の孤立解消 −1・register は rev2 追随 3 unit のまま変更なし)・
  diff= bomdd/ 5 ファイルのみ・**追加のみ(全段通算で既存記録の削除 0)**。
  61 末尾の `</content>` 混入(fix2 起源・検査官指摘)は衛生除去(設計者・宣言つき)。
- CI 実測は push 後に本欄へ追記(4 値判定)。fix3 677b43e= **緑**(実測)。

### §5 追記 3(2026-08-02・差戻 3= fix4 — IA-03 の完全クローズ)

- 第 3 回検査(677b43e)= NEW-01 CLOSED・new 0・IA-03 PARTIAL(基準の自己閉包未達 —
  欠落 2 エッジ+根拠 B の例外未明文化)。両指摘とも突合 CONFIRMED(通算 7/7・誤検出 0)。
- 差戻 3(工場= claude-opus-5): 欠落 2 エッジ追加(M-CLI-005 → M-PKGDEF-CORE-015 / 016・
  根拠 A= cli/tsconfig.json references の tsconfig 解決+package.json name/version 宣言実体)
  = **depends_on 全 11 エッジ**。例外規則は**妥当性条件 (C) 非循環**として本文化(裁定 3・
  61 §8.1 — 等級 A/B は証拠の強さ・採否は (C) が決める。自己受入サイクル内の依存は製造順序の
  前提でないことの論証つき)。閉性の機械検査(DAG PASS+根拠 B 候補 7 unit 全数処理= 宣言 3/
  自己 1/(C) 棄却 9/残余 0)を工場が自作実測(治具はリポ外・納品物でない)。
  ずる追記 1(F010= 33-control-plan test_vectors が散文でファイル参照でなく、閉性証明の
  unit→test 割当が手作業= 機械可読化は本 ECO スコープ外の設計者裁定候補)= **累計 10**。
- **最終受入(fix4 個体・実リポ全再実測)**: 採点器 unmapped 0・real_under 111 不変・
  118/118 tests・lint error 0/warn 0(info 176)・diff= bomdd/ のみ・numstat 追加のみ削除 0。
  CI 実測: fix4 6ef20f7= **緑**(実測)。

### §5 追記 4(2026-08-02・第 4 回独立検査= 最終クローズ確認)

- 第 4 回検査(Codex fresh・対象 677b43e..6ef20f7)= **IA-03 CLOSED**(2 エッジの根拠現物一致・
  (C) 明文化確認・**検査官が独立に DAG 解析: 16 unit・29 edge・未定義参照 0・循環 0・
  トポロジカル処理可能**・B 候補の抜き取り全数分類= 宣言 3/(C) 棄却 9/自己 1/**残余 0**)。
- new= NEW-IA03-01(low)1 件: 61 §8.5 の rev4 lint 行が workspace 段階値(info 178・孤立 2)を
  段階ラベルなしで記載(最終個体= 176・孤立 0)。**検査官の受理条件**=「当該行を 176/孤立 0 へ
  是正すればこの検査範囲で受理可能」。処置= 設計者追記で段階ラベルを固定(61 末尾・工場記録は
  非改竄)— 条件充足は機械実測(lint info 176)で証明済み。IA-05/NEW-01 と同族の
  **段階混在クラス 3 例目**(還元候補)。
- 独立検査シリーズ確定: 4 ラウンド・**提起 8・8/8 CONFIRMED・誤検出 0・境界受理 1**。
  残 open 所見 **0**(NEW-IA03-01 は本追記で条件充足)。
- 残= maintainer 裁定(verified+golden)→ verified 時に head: 受入タグで窓閉鎖・52 記帳
  (eco_006 節+候補行解消マーカー)・as-built 追記。
