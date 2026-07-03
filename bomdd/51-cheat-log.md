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

## CHEAT-ECO-002-H004 [harness] S-23[1] の fixture 指定ミス(suppress は workspace 経由)
- 手法が与えなかったもの: expected 作成時、suppress fixture の実行形態(bomdd-workspace.yaml を target にする
  = S-08 と同型)の確認手順。repo 直指定では suppress が読まれず「suppressed 所見なし」の前提不成立になる。
- 代替した判断: S-08 の target と同じ workspace ファイル指定へ是正し全ケース再採点(凍結プロトコル §3)。
- 重大度: friction(採点1ラン偽 FAIL。checkSarif の precondition 検査が「治具の前提不成立」を
  製品欠陥と区別して報告した=検査器設計の勝ち)

## CHEAT-ECO-002-D002 [designer] E-CLI-SARIF-031 の external_source_ref に散文値
- 手法が与えなかったもの: external_source_ref(kind: id-or-path・family K)へ「SARIF 2.1.0(OASIS 標準)」の
  散文を書けないという台帳規律の自己適用(ECO-029 で ViewPrism2 に処方した「参照欄は単一 ID」の再演)。
- 代替した判断: K-SARIF パックを 31 に新設して参照(自己適用の R-004 warn をリンタが検出 — 設計者捕捉4例目)。
- 重大度: minor

## ECO-002 工場ずる報告の取込み(受入確定 2026-07-03)
- 採用個体(F02/sonnet)4件: F02-001[friction] SARIF top-level キー= version 採用(仕様字句 schemaVersion は
  標準不整合 — 受入時に仕様側を補正)/ F02-002[friction] informationUri 不在→RFC 2606 プレースホルダ
  (受入時に設計者供給値へ充填)/ F02-003[minor] §2.6「X-* 7種」が rev3 で8種に(本文整合漏れ — 受入時補正)/
  F02-004[minor] allowed_paths 前方一致の境界(末尾スラッシュ規律 — 受入時に §2.17 へ明記)。
- 対照個体(F01/opus)3件: F01-001[minor] informationUri= 実 URL 推定(採用個体と対照的な判断)/
  F01-002[minor] S-20 ghost 行のテスト期待改訂(正当)/ F01-003[friction] trace_links への CH-3 非適用
  (採用個体は適用 — 2工場の分岐が §2.4 の未規定次元を検出し、受入時に「全経路共通」を明記)。
