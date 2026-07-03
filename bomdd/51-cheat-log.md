# ずる台帳 — BomDD-Plm

> 工場側の cheat-log は各工場の納品物(`BomDD-Plm-factory-NN/bomdd/51-cheat-log.md`)にあり、
> 受入確定時に本台帳へ取り込む。本ファイルは**設計者側**(治具・オラクル・工程)のずるを先行記録する。

## CHEAT-PLM-V0-H001 [harness] 採点治具がゲートフィルタを欠いていた
- 手法が与えなかったもの: 仕様 §2.7「diagnostics.json は常に全所見」に対し、期待プロファイルは
  ゲート適用後集合 — 両者の橋渡し(比較前フィルタ)が治具に未実装だった。
- 代替した判断: run-oracle.mjs に gateFilter を追加(梯子+eco)。
- 重大度: friction(初回採点で偽 FAIL 5件を発生させ、S-07 全滅の主因になった)
- 分類: C2-in-harness(検査器側の暗黙知)。saga/forward-01 の H 系列の7例目。
  **治具セルフテストは比較器を検証したが「治具が仕様のどの断面を比較すべきか」は検証しなかった** —
  セルフテストの盲点として手法へ還元候補。

## CHEAT-PLM-V0-H002 [harness] S-11 ランナーがフラグ値までパス解決していた
- 手法が与えなかったもの: cli-matrix の引数をどう絶対化するかの規約。
- 代替した判断: スラッシュを含む引数のみパス解決(`G3`/`json` 等のフラグ値は素通し)。
- 重大度: minor(偽 FAIL 2件。製品は正しく exit 2 を返していた=製品の引数検証が偽陽性を可視化した)

## CHEAT-ECO-001-H003 [harness] S-20 期待プロファイルの severity 断面誤り(較正が凍結前捕捉)
- 手法が与えなかったもの: エッジ severity 無指定(per-family)がパスエッジ(family なし)で何になるかの
  期待プロファイル側の宣言。設計者は S-02 の実例(severity: warn **明記**のエッジ)から warn と類推した。
- 代替した判断: 較正(変更前個体への動的実行)で実装既定= error を観測し、期待側を error/exit 1 に是正。
  ECO-001 の変更断面(受理形)とは独立の既存挙動につき、期待側を実装に合わせるのが正
  (この断面は S-01〜S-19 で凍結済みの挙動の連続)。
- 重大度: none(凍結前捕捉=較正プロトコルが機能。H001 の教訓「比較すべき断面はセルフテストで検証されない」の
  再演を較正が防いだ — playbook §4.4 較正3段の実証2例目)

## CHEAT-ECO-001-D001 [designer] 41-fixed-oracle 追記行の YAML 記法ミス(self-hosting lint が検出)
- 手法が与えなかったもの: フロースタイル mapping 内の plain scalar に `[ ]` を含めてはならない、という
  YAML 記述罠の警告(plm-intake/yaml-authoring-traps.md の既知3型に含まれていなかった第4型)。
- 代替した判断: S-20/S-21 の scenario/contract_expectation をダブルクォートで囲んで修正(意味内容は不変)。
- 重大度: friction(X-PARSE-001 error 55件が self-hosting に発生。**製品リンタが設計者の記述ミスを検出した**
  = self-hosting の防壁価値の初実証。工場パッケージ・オラクル採点(expected ベース)には無影響。
  凍結 tag `eco-001-input` 時点から混入 — 凍結前の self-hosting lint を工程に足すべき示唆)。

## ECO-001 工場ずる報告の取込み(受入確定 2026-07-03)
- **CHEAT-ECO01-F01-001 [minor/採用個体]** per-file 宣言サイトと全域サイトが同一 family/ID を共有する場合の
  R-002 スコープが未規定 → per-file サイトを独立名前空間とする最も素直な読みで実装(仕様の穴として記録)。
- **CHEAT-ECO01-F01-002 [minor/採用個体]** `repo:` 判定の Windows ドライブレター誤認回避
  (`colon>0 && colon<len-1` ガード)— 仕様非言及の防御的限定。
- **CHEAT-ECO01-F02-001 [friction/対照個体]** node_modules 内 @bomdd/* がジャンクションでなく実体コピーで、
  再ビルドが import に反映されない環境不整合 → npm install で復旧(パッケージ組成由来。工場は正直に申告し
  「ビルド緑・テスト緑・実行は旧コード」の偽陰性リスクを指摘 — 工程還元候補: 隔離パッケージの組成手順に
  node_modules コピーでなく npm ci を指定する)。
