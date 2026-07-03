# Change / Corrective Order — ECO-001(パス受理形の仕様化+R-002 一意性スコープ per-file)

> Phase 7(playbook §8)。plm-v0 S-19 裁定ループで保留にした製品 ECO 候補 PD-7/PD-8 と、
> ref-v0.4 候補(per-file 一意性スコープ)をセットで実施する。**BomDD-Plm 自身への初の Phase 7**。
> 詳細影響分析: [61-impact-analysis-eco-001.md](61-impact-analysis-eco-001.md)

## 0. 変更前 baseline の凍結
- As-Maintained 個体: **factory-03 ビルド=製品リポ採用ソース**(tag `v0.1-plm-accepted` = 4533b5d)。
  部分改修のため HEAD が diff 基準点(63)。
- データ fixture: 対象外(本製品は永続データを持たない。read-only 工具)
- 既存固定オラクル: S-01〜S-19(25 ケース採点)。**凍結済み・不変**(回帰のヤードスティック)

## 1. 変更/欠陥要求(3項目)

### CH-1(PD-7): repo 相対パスの受理 — 単一セグメント値の非一貫の是正
- 発生契機: S-19 裁定ループの保留事項(s19-adjudication self-hosting 節)
- 内容: `kind: path` / `id-or-path` パス fallback の受理形として **repo 相対パス(repo 名プレフィックスなし)**を仕様に明文化する。単一/多セグメント・file/dir を問わず一貫して「いずれかの repo からの相対で実在すれば解決」。
- 種別: **欠陥修正 + REQ 改訂**
- 欠陥帰属: **spec_omission** — 仕様 §2.4 は「正準パスとしてファイル実在を検査」のみで、repo 相対形の受理が未規定。実装は未規定次元を fallback で埋めたが(model.ts pathExists)、`indexOf("/") < 0 → 即 false` により**単一セグメント値だけが実在検査から漏れる**非一貫になった。
- 観測と再現手順(2026-07-03 設計者再現・scratchpad/pd7-repro):
  | 値 | 実在 | 現行結果 |
  |---|---|---|
  | `test`(単一セグメント dir) | ✓ | **R-004 誤検出** |
  | `single.md`(単一セグメント file) | ✓ | **R-004 誤検出**(S-19 観測「dir のみ」より広い) |
  | `packages/core`(多セグメント dir) | ✓ | 解決 |
  | `pd7-repro/test`(正準形) | ✓ | 解決 |
  | `nope/missing.md`(不在) | ✗ | R-004(正当) |
- 原因が宿った上流成果物: `bomdd/20-spec.md` §2.4(受理形未規定)
- 根拠(実物が正): 自リポ台帳・ViewPrism2 とも repo 相対記法を常用(S-19 裁定で `bomdd/20-spec.md#節` 形式へ正規化した記法自体が repo 相対)。正準形のみへの強制は台帳の書き直しコストに見合わない。

### CH-2(PD-8): `repo名:相対パス` 記法の受理
- 発生契機: S-19 裁定ループ(ViewPrism workspace R-004 8件)
- 内容: cross-repo パス参照の実物慣行 **`repo名:相対パス`**(例 `ViewPrismUI:資料/xxx.md`)を、正準 `repo名/相対パス` と**等価**として受理する。repo 名が workspace に不在の場合は従来どおり不解決。
- 種別: **REQ 改訂**(機能追加寄りの受理形拡張)
- 欠陥帰属: spec_omission(実物の慣行が仕様・スキーマに無い。「実物が正」の裁定済み)
- 原因が宿った上流成果物: `bomdd/20-spec.md` §2.4+ref-v0 kind 凡例(受理形の記載なし)

### CH-3: R-002 一意性スコープ per-file(ref-v0.4 とセット)
- 発生契機: S-19 裁定ループ(ViewPrism workspace R-002 18件=画面別 ui-ir×3 の仮品番衝突)
- 内容: 定義サイト宣言に **`uniqueness_scope: per-file`** を導入し(ref-v0.4)、R-002 は宣言のある定義サイト由来の ID を**抽出ファイル単位**で一意性検査する(既定は従来どおり workspace 全域)。対象: `bomdd/ui/**/ui-ir.json` の tempPartNo(TMP-UI-*)と uiId(ui-id)。
- 種別: **REQ 改訂**(外部ソース ref-v0 の版上げへの追随)
- 欠陥帰属: **refv0_gap** — ViewPrism2 は画面別 ui-ir(3ファイル)で各々 0001 から採番する運用(実物が正)。ref-v0.3 まで一意性スコープの概念がなかった。
- 原因が宿った上流成果物: `schemas/ref-v0/ref-edges.draft.yaml`(→ ref-v0.4 改訂)+`bomdd/20-spec.md` §2.5

### REQ への反映
- **REQ-007 改訂**(rev2): パス参照の受理形3種(正準 `<repo>/<相対>` / repo 相対 / `repo:相対`)を statement に明文化。判定質問(受入深さ・許容差)は従来どおり unit/exact で通る。
- **REQ-010**: 改訂不要(「ref-v0 の忠実な実装」— 追随先が ref-v0.4 に上がるのみ。external_source の版を追記)。
- **REQ-009**: 改訂不要(cross_repo ID 解決の話。パス受理形は REQ-007 の管轄)。

## 2. 影響分析(要約 — 詳細は 61)
| 段 | 影響 ID |
|---|---|
| 仕様節 | §2.4(受理形)・§2.5(一意性スコープ) |
| E-BOM 部品 | E-CORE-RESOLVE-005(パス解決)・E-CORE-LINT-007(R-002 スコープ) |
| M-BOM unit | M-CORE-GRAPH-002・M-CORE-RULES-003(部分改修: resolve/model.ts・rules/evaluate.ts 近傍のみ) |
| Control Plan 特性 | CP-RESOLVE-005・CP-LINT-007(test_vectors 追加) |
| 固定オラクル | **追加行のみ**: S-20(パス受理形)・S-21(per-file スコープ)。既存 S-01〜S-19 不変 |
| K-BOM | K-REFV0(ref-v0.4 スナップショット差替のみ・記載判断の変更なし) |
| スキーマ | ref-edges.draft.yaml → **ref-v0.4**(kind 凡例の受理形+uniqueness_scope。本体 BomDD/method/schemas/draft/ と製品スナップショット schemas/ref-v0/ を同期) |
- **影響なし予測**: 61 §2 に反証可能な形で凍結(製造前)

## 3. BOM 改訂
- bom_rev: plm-v0-input-rev1 → **eco-001-input**(tag)
- 改訂ファイル: 20-spec(§2.4/§2.5)/ 10-requirements(REQ-007)/ 30-ebom(2品目 note)/ 33-control-plan(2特性 vectors)/ 41-fixed-oracle(S-20/S-21 追加)/ schemas/ref-v0(v0.4)/ 60-change-register.yaml(新設)
- 部品分割・置換: なし(64 不要)
- **変更分の受入を先に追加**(オラクル・ファースト): S-20/S-21 の fixture+expected+治具対応
- **治具の凍結条件**: セルフテスト+較正 — 変更前個体(v0.1-plm-accepted ビルド)に対し **S-01〜S-19=PASS(25ケース)・S-20/S-21=FAIL** を確認してから凍結 tag

## 4. 部分再製造
- 再製造/改修対象: **packages/core の参照解決+R-002 評価まわりのみ**(影響分析の E-BOM 2品目に対応する実装箇所)+追随する test
- 再利用 unit: cli / viewer / core の他モジュール(discover/parse/gate/suppress/output 等)は**変更禁止**
- 工場: fresh factory(設計対話・固定オラクル・旧 cheat 非開示)。diff 基準点= tag `v0.1-plm-accepted`
- 渡すもの: 改訂 BOM 一式+本 ECO(§1〜§4)+現ソース / **渡さないもの**: 設計対話・固定オラクル(S-20/S-21 の fixture/expected 含む)・探索プローブ・他工場成果・51/52/61 §2(影響なし予測)
- 自己受入: 既存 `node --test`(87)+変更対象の追加 unit test(受理形3種・per-file の test_vectors)。**赤=stop/report**
- 事前宣言: 「影響分析にある箇所だけを改修。影響なし箇所への変更は禁止。diff を測定する」

## 5. 回帰+変更受入(失敗5分類)
- 実行: 既存 S-01〜S-19(25ケース)+新規 S-20/S-21。納品 diff を tag 基準で 63 監査。
- 結果: (製造後に記入)

## 6. 記録
- As-Built 追記(AB-PLM-ECO-001)/ cheat-log / 52-metrics ECO 行 / 61 §3 採点(影響なし予測の的中率)
