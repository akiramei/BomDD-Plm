# Charter — BomDD-Plm v0(bomdd-lint + read-only viewer)

<!-- 固定の強さ(phase0-charter.md):
     工場構成・予算・役割・境界種別 = この時点で固定(以後不変)
     題材・スコープ = 仮置き可。`(仮)` を付け、Phase 1 終了時(G1)に確定 -->

> **前史**: 旧試作(`C:\Users\akira\OneDrive\ドキュメント\BOM-DD PLM`、2026-06-18〜22、未コミット)は破棄。
> 失敗帰属: (a) YAML→DB コピーのミラー型=正本の二重化 (b) 参照が文字列でグラフ整合性なし
> (c) 未凍結スキーマを手書きパーサが追跡 (d) 台帳+監査+AI協調+オンボーディングの同時建設 (e) BomDD 自身を不使用。
> 本 charter はその是正: **git が正本・read-only・スキーマ先行(ref-v0)・BomDD 自身で製造**。

## 題材
- 何を作るか: BomDD 成果物リポジトリ(単一または workspace=複数リポ)を**直読**し、
  (1) ref-v0 参照スキーマ([BomDD/method/schemas/draft/](../../BomDD/method/schemas/draft/))に基づく**参照整合リント**(CLI)と
  (2) 人間向け**読み取り専用ビュー**(品目グラフ・トレースマトリクス・台帳)を提供する工具。
  **DB を持たない。書き込まない。リロード=常に正本と一致。**
- 種別: CLI + GUI(Web ビュー)
- 黒箱境界: CLI = wire(引数+リポパス → stdout JSON 所見レポート+exit code)/ Web ビュー = GUI(golden+承認者)

## スコープ
- 含む:
  - ref-v0 リントルール R-001〜R-051 のうち **git 履歴不要のもの全て**(R-052 diff-within-impact は v0.5 以降)
  - ゲート指定実行(`--gate G3` 等。draft BOM に完全性を要求しない)
  - workspace 解決: `bomdd-workspace.yaml` による UI-CAD リポ ↔ 製造リポの越境参照(R-020 ui-surface-has-cad を含む)
  - read-only ビュー: リント所見 / 品目グラフ(E/M/K/CP/S の参照グラフ・lineage 表示) / トレースマトリクス(REQ→E→M→CP→証跡) / ECO 台帳 / ずる台帳 / 裁定台帳(UQ-002 承認時)
  - 遡及実証: ViewPrism2 + ViewPrismUI(workspace)と BomDD-LibraryLending-Sample を読めること(受入の一部)
- 含まない(理由付き):
  - **DB ミラー・取り込み・同期**: 旧試作の失敗根因(正本の二重化)。git が唯一の正本
  - **書き込み・編集機能**: v0 は read-only。台帳の編集はエディタ+git で行う(履歴・レビューが自動で付く)
  - **AI ドラフト協調編集**(旧試作 AiDraftSession): 良い着想だが独立製品。棚上げ
  - **手法準拠の助言生成**(旧試作 ConformanceAnalyzer の推奨候補・修理チケット): リントは機械的検査に限定。準拠判断・是正案は設計者(人間+AI)の仕事であり、工具が意見を持つと責任境界が濁る
  - **複数プロジェクト横断の履歴集計**: DB が正当化される唯一の候補だが、必要性が実証されるまで保留
  - **HTML モックのレンダリング・ホスティング**: モックはブラウザで直接開ける。ビューからはリンクするだけ

## 工場構成(受入経済性 — playbook §5.2)
- ティア: 推奨(初回 2 工場 → 収束後 1 工場)
- 使用モデル: opus + sonnet
- 収束ループ予算: 2

## 役割
- 設計者: akira + 設計 AI
- 仕様監査リーダー数(G2): 3
- 承認者: akira(Web ビューは golden+承認者の G。CLI は automated)

## 完了の定義
- **固定オラクル全通過**: 本題材の固定オラクルは「**既知欠陥を植えた fixture リポ群+正しいリポに対する期待所見プロファイル**」
  (壊れ参照・重複 ID・IR なし UI surface・superseded への active 参照 等を1件ずつ植えた合成 bomdd/ リポ)。
  リンタという題材では**較正(negative control)がそのまま製品オラクルになる**(playbook §4.4 の一般化)。
  期待所見と完全一致=合格(過検出も過少検出も FAIL)。
- **実リポ受入**: ViewPrism2+ViewPrismUI workspace・BomDD-LibraryLending-Sample に対し実行し、
  全 false positive が裁定済み(スキーマ側欠陥 → ref-v0 改訂 / 実リポ側欠陥 → 対象リポの ECO 起票)。
  draft スキーマの規律: **実物とスキーマが衝突したら、どちらが欠陥かを毎回裁定して記録する**(これ自体が ref-v0 の検証データ)。
- blocker ずるゼロ
- 納品物: 成果物 + bomdd/ 一式(BOM・オラクル・fixture リポ・As-Built・cheat-log)

## 標準成果物パス
- `bomdd/00-charter.md`(本書)
- `bomdd/10-requirements.yaml`
- `bomdd/20-spec.md`
- `bomdd/ui/mock/`(Web ビューの HTML モック — **本製品の UI も UI-CAD 経路を通す。R-020 を自分に適用**)
- `bomdd/ui/**/ui-ir.json` / `ui-bom.json` / `ui-trace-map.json`
- `bomdd/db/` — **not-applicable**(DB を持たないことが本製品の要件)
- `bomdd/30-ebom.yaml`
- `bomdd/31-kbom.yaml`
- `bomdd/32-mbom.yaml`
- `bomdd/33-control-plan.yaml`
- `bomdd/34-routing.yaml`
- `bomdd/35-design-system-bom.yaml`(Web ビューがある場合必須)
- `bomdd/40-work-order.md`
- `bomdd/41-fixed-oracle.yaml`(+ `oracle/fixtures/` 欠陥植え込み fixture リポ群)
- `bomdd/50-as-built.yaml`
- `bomdd/53-service-bom.yaml`(監視対象: ref-v0 スキーマ改訂・YAML/JSON パーサ依存・対象リポのテンプレ進化)
- `bomdd/plm-intake/`

## 実装開始 Gate
| Gate | 判定 | 証跡 |
|---|---|---|
| G0 Intake | pending | ref-v0 スキーマ一式・旧試作の失敗帰属(本書前史)・実リポ ID 棚卸し(2026-07-03) |
| G1 Requirements | pending | `10-requirements.yaml` |
| G2 Spec | pending | `20-spec.md` |
| G2' Measurement | pending | `33-control-plan.yaml` |
| G3 BOM dry run | pending | `bomdd/plm-intake/00-index.md` |
| Self-lint Gate | pending | 本リポの bomdd/ に対する bomdd-lint 実行結果(初回は手動検査で代替。self-hosting は v1 目標) |

## PLM 同期方針
- 本製品自身が PLM の初代なので、旧テンプレの「PLM sync」は **bomdd-lint の自己適用**に読み替える。
- 初回: `00/10/20` 作成後にスキーマ照合(手動)。製造前: `30-34/40` 作成後。
- 受入(Phase 5)以降: 製造された bomdd-lint を本リポ自身と対象実リポへ適用。
- stop finding がある場合: 実装開始しない。

## 未解決事項
| ID | Question | Severity | Owner | Target artifact | Status |
|---|---|---|---|---|---|
| UQ-001 | ref-v0 の ID ファミリー台帳(37 families)を承認するか。特に INV/OC/FMEA/GF の advisory 扱い・S(`S1`/`S-01` 両許容)・移行オラクル `M01` の pattern 分離 | blocker | human | BomDD/method/schemas/draft | **decided → [DEC-0001](65-decision-register.yaml)**(draft として承認・advisory 維持・実物互換優先・strict 化は段階的) |
| UQ-002 | 裁定台帳(DEC- / `65-decision-register.yaml`)を各製品リポに新設するか。ビューの台帳一覧と R-系ルール追加に影響 | blocker | human | ref-v0 + 本製品スコープ | **decided → [DEC-0001](65-decision-register.yaml)**(新設。reserved 開始・記録対象を限定) |
| UQ-003 | `bomdd-workspace.yaml` の置き場所(製造リポ側 or 独立)と複数製造リポの表現 | non-blocker | human | ref-v0 workspace 節 | open |
| UQ-004 | Web ビューの形態: リント時に吐く**静的サイト生成**(推奨: 状態レス原則に合致・ホスト不要) vs ローカルサーバ | non-blocker | human | 20-spec | open |
| UQ-005 | 技術スタック(.NET / Node+TS / Python)。fixture・治具・CI 連携の言語も連動 | blocker | human | 32-mbom | **decided → [DEC-0002](65-decision-register.yaml)**(TypeScript。core/cli/viewer 分離) |
| UQ-006 | 旧試作からの回収物(ArtifactType 分類学・ConformanceAnalyzer の検査アイデア→リントルール候補)を K-BOM 化するか | non-blocker | AI | 31-kbom | open |
| UQ-007 | 対象リポの実 YAML がテンプレと乖離している場合(例 ViewPrism2 の独自フィールド)の受理方針 — draft 期間は「実物が正」で確定か | non-blocker | human | ref-v0 README §4 | open |
