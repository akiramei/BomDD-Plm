# oracle/ — 固定オラクル実装(設計者側・製造装置に渡さない)

`bomdd/41-fixed-oracle.yaml` の実体。**リンタという題材では「欠陥植込 fixture への期待所見
プロファイル一致」= 較正がそのまま製品オラクル**(charter 完了定義)。

## 構成
- `fixtures/` — 欠陥植込リポ群(S-01〜S-08, S-12, S-16 の入力)。各 fixture の repo ディレクトリ名が
  正準パスの repo.name になる(例 `repo/bomdd/30-ebom.yaml`)
- `expected/` — 期待プロファイル(JSON。治具が YAML 依存を持たないための形式選択)
- `harness/` — 治具: `lib.mjs`(比較器)/ `selftest.mjs`(治具セルフテスト)/ `run-oracle.mjs`(ランナー)

## 実行
```
node harness/selftest.mjs                                      # 治具セルフテスト(製品不要)
node harness/run-oracle.mjs --cli "node ../packages/cli/dist/main.js"   # 全ケース採点
node harness/run-oracle.mjs --cli "..." --only S-04            # 単一ケース
```

## 比較規約(プロファイルの意味論)
- `findings` = **error+warn の完全集合**(過検出も過少検出も FAIL — CP-LINT-007)
- `infos` = **宣言分の存在検査(subset)**。過剰 info は許容 — R-005(孤立定義)の意味論が
  ref-v0 でまだ開いているため(記録系 family の扱い)。ref-v0 側に注記済み
- 所見カウント規約: **R-002 は後発定義1件につき1所見**(初出定義には出さない)
- 空 YAML ファイル= X-TYPE-001(warn)/ 不正 UTF-8= X-PARSE-001(error)
- `message_contains` / `suppressRef_contains` は部分一致条件

## 手続き検査(fixture でなくランナー直実装)
- S-09 決定性: clean を2回実行し 4出力(diag/graph/ledger/plm-view)の byte 同一
- S-10 read-only: 対象リポの SHA-256 ツリー前後不変
- S-14 viewer 自己完結: 外部 URL(w3.org 名前空間は除外)・script src・fetch・localStorage 等の静的検出
- S-15/S-17(DOM 突合)・S-18(基準 workspace 性能)は製品完成後にランナーへ追補(41 の fixture 欄)
- S-19 実リポ遡及は受入(Phase 5)で手動実行

## 凍結プロトコル(playbook §4.4)
1. **治具セルフテスト**: `selftest.mjs` 11 tests — **PASS(2026-07-03)**
2. **凍結**: 本コミットに tag `plm-v0-input` を打ち、41 の `frozen_since` に記録。以後、収束ループ中は
   fixture・expected・比較規約を**不変**に保つ(同一ヤードスティック)
3. **較正(初回製造後)**: 工場個体への初回採点で FAIL が出た場合、**製品帰属の前に必ず治具帰属を検討**する
   (C2 は測定ハーネスにも現れる — saga/forward-01 で実証済み)。治具側欠陥だった場合は cheat-log に
   CHEAT-*-H* として記録し、修正後に**全ケースを再採点**する(部分再採点しない)
4. プローブ(42)は合否に混ぜない。オラクル行の追加は次ループ開始時のみ
