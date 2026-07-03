# Change / Corrective Order — ECO-003(R-041 ID 形エンドポイントへの CH-3 適用是非)

> Phase 7(playbook §8)。ECO-002 対照個体(factory2-01/opus)指摘 Q3 の残課題。
> CH-3(repo: 形の repo 不在= X-XREPO-001 skip)は ECO-002 受入で「パス解決を行う全経路共通」
> と確定済み(§2.4 rev3 — R-041 のパス fallback 含む)。残る非対称は trace_links エンドポイントの
> **ID 形**のみ。本 ECO はその適用是非を裁定し、裁定結果を仕様とオラクルに固定する。
> **裁定: CH-B 採択(akira 2026-07-03)** — 非適用+文書化改訂+S-25 固定。本文 §5 に実施結果。

## 0. 変更前 baseline の凍結
- As-Maintained 個体: **ECO-002 採用個体= main**(tag `v0.3-eco-002-accepted` 系譜・HEAD 9653e87)。
  部分改修につき起票時 HEAD が diff 基準点(63)。
- 既存固定オラクル: S-01〜S-24(33 ケース採点)。**不変**(裁定が CH-B でも S-25 は追加のみ)。

## 1. 裁定質問と証拠

### 論点: trace_links[].from/to の ID 形エンドポイントに cross-repo skip 意味論を適用するか

現行の skip 意味論マップ(2026-07-03 実装確認・resolve/model.ts):

| 参照形 | cross-repo 意図の明示 | 対象不在時の所見 |
|---|---|---|
| `kind: id` + `cross_repo: true`(スキーマ宣言) | エッジ宣言 | X-XREPO-001 skip(§2.5) |
| パス repo: 形 — kind: path / path-at-rev / id-or-path ② / **R-041 パス fallback** | `repo:` 前置 | X-XREPO-001 skip(§2.4 rev3 = CH-3 全経路共通) |
| **trace_links の ID 形エンドポイント** | **なし** | **R-041 warn** ← 本論点 |
| id-or-path の ID 分岐(①一致・索引不在) | なし | R-003(参考 — 本論点と同型) |

### 証拠(2026-07-03 設計者測定)
- **R-041 発火実績 0**: ViewPrism2 単一リポ実行・workspace 実行とも R-041 = 0
  (単一: R-004 73 / R-005 354 / X-XREPO 20。workspace: R-004 74 / R-005 354 / X-XREPO 11)。
  self-hosting も 0。**dormant rule**。
- **実物の trace_links[] は 3 リポとも本番台帳に 0 行**: BomDD-Plm 10-requirements に
  「20-spec / 30-ebom 作成時に張る(G1 時点では空)」の予告のみ。ViewPrism2 / ViewPrismUI は
  機構自体未使用(ui-trace-map.json はエッジ宣言経由で trace_links ではない)。
- **オラクル被覆の穴**: R-041 の**発火分岐(warn)を固定するケースが存在しない**
  (S-20 は「id-or-path ②で解決するため R-041 なし」の非発火側のみ pin)。
- 同型論点: id-or-path の ID 分岐(R-003)も意図明示なしで skip しない。R-041 の ID 形だけを
  skip にすると、こんどは R-003 との間に新たな非対称が生まれる。

### 案 CH-A(適用)
- 内容: resolveIdOrPath の ID 分岐に §2.5 のエッジ実装と同一の判定を追加 —
  「対象 family の定義サイトが workspace に存在しない場合は X-XREPO-001(info)skip」。
- 利点: 単一リポ実行で将来 cross-repo ID を trace_links に書いたときのノイズ予防。
- 欠点: (a) **意図の明示なき skip =過剰受理**(family 全不在の typo が黙って通る。R-041 は
  S-19 で dangling 参照系の真正欠陥を捕捉した系統の防御線)(b) R-003(同型の ID 分岐)との
  新たな非対称 (c) 今日の時点で救う実例が 0。
- 影響: src(resolve/model.ts)+ S-25 追加+ **fresh factory 1周**(小型だが製造工程が要る)。

### 案 CH-B(非適用+文書化改訂) — **推奨**
- 内容: §2.4 に「trace_links の ID 形エンドポイントは skip しない — skip は書き手による
  cross-repo 意図の明示(`repo:` 前置、またはエッジ宣言 `cross_repo: true`)がある場合に限る」を
  明記(未規定次元の解消)。あわせて R-041 発火分岐を **S-25 で初固定**(検証の穴を塞ぐ)。
- 利点: skip 意味論の原理を「意図の明示」に統一(CH-3 の rationale と同根)。src 変更なし=
  designer 作業のみで完結(fixture+expected+治具較正は要る)。
- 欠点: 単一リポ実行で cross-repo ID の trace_links を書くと warn — その場合の正規の書き方は
  repo: パス形(skip される)か workspace 宣言(解決される)で、逃げ道は既にある。
- 影響: 20-spec §2.4(明記)・41-fixed-oracle(S-25 登録)・oracle/fixtures+expected(S-25)・
  治具較正(変更前個体で S-25 FAIL 確認は不要 — 現行挙動の固定につき **PASS を確認して凍結**)。

### 推奨の rationale
skip の根拠を一貫して「書き手の cross-repo 意図の明示」に置く。opus Q3 の価値は未規定次元の
指摘であり、その解消は文書化+オラクル固定で足りる。発火実績 0 の規則のためにコードを動かす
根拠がない(動かすなら実例が現れてからで遅くない — 早すぎる形式化の回避)。

## 2. 影響分析(裁定後に 61 として確定)
| 段 | CH-B(推奨) | CH-A |
|---|---|---|
| 仕様 | §2.4 明記のみ | §2.4 改訂(意味論変更) |
| REQ | REQ-007 note 追記(改訂なし) | REQ-007 rev4 |
| E-BOM / M-BOM | 変更なし | E-CORE-RESOLVE-005 / M-CORE-GRAPH-002 |
| CP | 変更なし | CP-RESOLVE-005(vectors 追加) |
| オラクル | S-25 追加(現行挙動の固定) | S-25 追加(新挙動)+較正で FAIL 確認 |
| スキーマ | 変更なし(ref-v0.7 のまま) | ref-v0.8(R-041 note に skip 意味論) |
| 製造 | **なし(designer 作業のみ)** | fresh factory 1周 |

## 3. BOM 改訂(裁定 CH-B 実施・2026-07-03)
- 改訂ファイル: 20-spec(§2.4 に「ID 形は skip しない」を明文化)/ 10-requirements(REQ-007 note 追記・
  rev 不変)/ 41-fixed-oracle(S-25 登録+frozen_since 追補)/ oracle/fixtures/rules/R-041(新設)/
  oracle/expected/S-25(新設)/ 60-change-register(本 ECO)/ 52-metrics(eco_003 節)
- スキーマ: 変更なし(ref-v0.7 のまま)。input tag: なし(製造なしにつき凍結対象は S-25 の較正のみ)

## 4. 部分再製造
- **対象なし**(designer 作業のみ — src 変更ゼロが本裁定の帰結)

## 5. 受入(2026-07-03)
- 較正=受入: 変更前個体(v0.3-eco-002-accepted 系譜 HEAD)で **34/34 PASS**(既存 33+S-25。
  現行挙動の固定につき「変更前個体で PASS」が凍結条件 — FAIL 確認を要する意味論変更が無いことの検証)。
- 起票時プローブ(scratchpad/r041-probe)で観測し S-25 に固定した現行挙動:
  (a) 10-requirements の不解決 ID エンドポイントは **R-003+R-041 の二重所見**(from/to が id-or-path
  エッジ宣言と R-041 スキャンの両方に載る)— エッジ宣言なし成果物(32-mbom 等)は R-041 単独
  (b) R-041 は**エンドポイント単位**に発火(from/to 双方不解決なら同一 trace_id で 2 所見。
  メッセージに endpoint 値が出ず判別しづらい — 軽微 UX 債務として 52 に記録)
  (c) ghost repo: 形は X-XREPO skip のみ= CH-3 全経路共通が R-041 経路でも機能
- self-hosting lint: error/warn 0 維持(--eco 込み・R-051 で本 ECO の affected_refs 解決を確認)

## 6. 記録
- register: verified / 52-metrics: eco_003 節 / 61 影響分析: 本文 §2 の表をもって代替
  (製造なしの文書化 ECO につき独立 61 は起こさない — under/over-inclusion の測定対象が無い)
