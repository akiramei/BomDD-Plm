# Change Order — ECO-002(v0.5: R-052 diff-audit 機械化+SARIF 追加出力+repo: 不在の skip 一貫化)

> Phase 7(playbook §8)。DEC-0004 が「v0.5 候補として ECO で扱う」と裁定した SARIF と、
> ref-v0 が「PLM v0 Phase 1 実装対象」と注記した R-052 を実装する。
> 詳細影響分析: [61-impact-analysis-eco-002.md](61-impact-analysis-eco-002.md)

## 0. 変更前 baseline の凍結
- As-Maintained 個体: **ECO-001 採用個体+CI 整備後の main**(tag `v0.2-eco-001-accepted` 系譜・公開後 HEAD)。
  部分改修につき起票時 HEAD が diff 基準点(63)。
- 既存固定オラクル: S-01〜S-21(27 ケース採点)。**原則不変** — 例外1件は §1 CH-3 に明記(意味論変更の文書化改訂)。

## 1. 変更要求(3項目)

### CH-1: R-052 eco-diff-within-impact — 63-diff-audit の機械化(製品初の git 連携)
- 発生契機: ref-v0 リント規則台帳の R-052 note「PLM v0 Phase 1 実装対象(v0 では手動 63 と併用)」。
  ECO-001 受入で設計者が手動実施した diff 監査(基準 tag と src 変更ファイルの目視突合)の自動化。
- 内容: `--eco` 実行時、60-change-register の **`diff_audit` フィールドを持つ** ECO エントリについて
  `git diff --name-only <baseline> HEAD` を対象リポで実行し、変更ファイルが**許容集合の外**にあれば
  R-052(error・gate=eco)を発火する。
- 意味論(仕様 §2.17 として新設):
  - **opt-in 設計**: 検査対象は `diff_audit: { baseline: <git rev(タグ名推奨)>, allowed_paths: [<リポ内プレフィックス>...] }`
    を持つエントリのみ。過去 ECO(baseline 未記載・closed 済み)には発火しない(「重いから使わない」D1 対策)。
  - **許容集合** = `bomdd/`(BOM 改訂は常に許容)+ allowed_paths の各プレフィックス。判定は正準 `/` 区切りの前方一致。
  - 1 はみ出しファイル= 1 所見(targetId= ECO id・message に file)。
  - **fail-open**: git が実行不能/baseline が解決不能な場合は **X-GIT-001(info)** を新設して skip
    (X-XREPO と同型。検査不能でコミット/CI を wedge しない)。
  - **read-only**(INV/S-10): git 呼び出しは `diff --name-only` のみ(履歴の読み取り。書き込み系サブコマンド禁止)。
  - **決定性**(§2.9): baseline はタグ名/SHA で固定されるため出力はリポ状態にのみ依存。所見ソートは既存規約。
  - ID→成果物パスの**導出**(E-BOM planned_output_artifact_ref 等からの allowed_paths 自動算出)は v0.5 対象外
    (実リポの artifact.path が注釈合成値=ECO-032(b) 債務のため機械可読でない)。将来候補として記録。
- 種別: 機能追加(REQ-010 の R-052 除外を解除する改訂+新 REQ)

### CH-2: SARIF 2.1.0 追加出力(DEC-0004 の後段)
- 発生契機: DEC-0004「SARIF エクスポートは将来の追加出力(v0.5 候補)として ECO で扱う」。
  用途: GitHub code scanning / 汎用 SARIF ビューアとの統合(CI 常設の次の一歩)。
- 内容: CLI フラグ **`--sarif`** 指定時、`--out` に **sarif.json** を追加生成する(既定は生成しない=既存出力不変)。
- 意味論(仕様 §2.9 追記):
  - schemaVersion 2.1.0・runs[0].tool.driver = { name: bomdd-lint, version, informationUri }。
  - findings→results[]: ruleId=rule / level(error→error・warn→warning・info→note)/ message.text /
    locations[0].physicalLocation = { artifactLocation.uri: 正準パス, region.startLine: line(あれば) }。
  - suppress 済み所見は results に含め **suppressions[{kind: external}]** を付与(SARIF の標準表現)。
  - driver.rules[] は**発火した規則のみ**を rule id 昇順で列挙(正準文言表の messageStrings)。
  - 決定性: §2.9 の正規シリアライズ規約(UTF-8/LF/2sp/ソート順は diagnostics.json と同一基準)を適用。
  - plm-diag/1 が一次契約のまま(DEC-0004 不変)。SARIF は派生ビュー — 情報の追加源泉にしない。
- 種別: 機能追加(REQ-017 系の追加出力・新 REQ)

### CH-3: repo: 形パス参照の repo 不在 = skip(info)へ — cross-repo 意味論の一貫化
- 発生契機: ECO-002 候補として 52-metrics に記録済み(2026-07-03)。ViewPrism2 pre-commit 常駐の実装で、
  単一リポ実行時に正当な `ViewPrismUI:` 形参照 7 件が R-004 error になる実害を観測。
- 内容: 仕様 §2.4 受理形3の「repo 名が workspace に不在なら**不解決**」を「**X-XREPO-001(info)で skip**」へ改訂。
  ID 参照の cross_repo(候補リポ不在= skip)と同じ意味論(repo: 前置は書き手による cross-repo の明示)。
- 帰属: ECO-001 の未規定次元(単一リポ実行との相互作用を影響分析が見ていなかった= under-inclusion では
  ないが設計盲点)。「形式2へ非フォールバック」は維持(変わるのは不在時の所見種別のみ)。
- **既存オラクル行への影響(明示)**: S-20 の `ghost:assets/logo.txt` 期待が R-004(error)→ X-XREPO(info)に変わる。
  rev1 の S-03/S-12[0] と同型の**意味論変更の文書化改訂**として扱う(41 frozen_since に記録。他 26 ケース不変)。
- 種別: 欠陥是正(設計盲点)+仕様改訂

### REQ への反映
- **REQ-010 改訂(rev2)**: 「R-052 は v0 対象外」を解除し「R-052 は diff_audit opt-in+git fail-open で実装」へ。
- **REQ-027 新設**: SARIF 追加出力(上記意味論)。
- **REQ-007 改訂(rev3)**: 受理形3の不在時挙動を skip へ(CH-3)。

## 2. 影響分析(要約 — 詳細と影響なし予測は 61)
| 段 | 影響 |
|---|---|
| 仕様 | §2.4(CH-3)・§2.9(SARIF)・§2.10(--sarif フラグ)・**§2.17 新設**(R-052)・§5 トレース表 |
| REQ | REQ-010 rev2・REQ-027 新設・REQ-007 rev3 |
| E-BOM | E-CORE-LINT-007(R-052)・E-CORE-RESOLVE-005(CH-3)・**E-CORE-GITDIFF-030 新設**(git 読み取りアダプタ)・**E-CLI-SARIF-031 新設**(SARIF ビルダ) |
| M-BOM | M-CORE-RULES-003(R-052)・M-CORE-GRAPH-002(CH-3)・M-CORE-OUTPUT-004(SARIF)・M-CLI-005(--sarif フラグ) |
| CP | CP-LINT-007(R-052 vectors)・CP-RESOLVE-005(CH-3 vectors)・**CP-SARIF-020 新設**・**CP-GITDIFF-021 新設** |
| オラクル | **S-22(R-052)・S-23(SARIF)・S-24(単一リポ repo: skip)追加**+S-20 の ghost 行のみ文書化改訂 |
| 治具 | run-oracle.mjs 拡張(git fixture 組み立て+sarif 検査)→ セルフテスト+較正必須 |
| スキーマ | ref-edges → **ref-v0.7**: 60-change-register に diff_audit フィールドの規定(opt-in・R-052 の入力)+X-GIT-001 凡例 |

## 3. BOM 改訂
- bom_rev: eco-001-input → **eco-002-input**(tag)
- オラクル・ファースト: S-22/S-23/S-24 の fixture+expected+治具拡張を製造前に凍結。
  治具はセルフテスト+較正(変更前個体で既存 26 ケース PASS・S-20 ghost 行と新規 3 行 FAIL)を通す。

## 4. 部分再製造
- 対象: packages/core(rules/evaluate・resolve/model・output/build+**新規 gitdiff アダプタ**)・
  packages/cli(args/--sarif)・schema/load(diff_audit 読み)+追随 test。**viewer は変更禁止**。
- fresh factory(設計対話・オラクル非開示)。diff 基準点= 起票時 HEAD。
- **受入で R-052 を自己適用**: 本 ECO 自身の register に diff_audit を書き、納品個体の R-052 で
  本 ECO の diff を機械監査する(63 手動監査との突合= dogfood 検証)。

## 5. 回帰+変更受入(失敗5分類)
- 既存 26 ケース不変+S-20(文書化改訂済み期待)+新規 S-22/S-23/S-24。結果: (製造後に記入)

## 6. 記録
- As-Built(AB-PLM-ECO-002)/ cheat-log / 52-metrics eco_002 節 / 61 §3 採点 / register status 更新 /
  DEC-0004 に後段実施の注記 / CI(両 OS)緑の確認
