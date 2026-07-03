# BomDD-Plm — bomdd-lint + read-only viewer

BomDD 成果物リポジトリを**直読**して参照整合を検査(lint)し、人間向けの読み取り専用ビュー
(品目グラフ・トレースマトリクス・台帳)を描画する工具。**DB を持たない。書き込まない。git が唯一の正本。**

- 憲章: [bomdd/00-charter.md](bomdd/00-charter.md)
- CI: GitHub Actions(ubuntu/windows 両 OS で build+test+固定オラクル27+self-hosting lint = CP-NFR-017)
- pre-commit 常駐(クローン後1回): `git config core.hooksPath bomdd/hooks`(自リポ lint の error ゲート・fail-open)
- 依拠するスキーマ: [BomDD/method/schemas/draft/](../BomDD/method/schemas/draft/)(ref-v0, draft)
- 開発方法: BomDD 自身(playbook v1 フォワード・モード)で製造する。本リポの `bomdd/` が設計原本。

> 旧試作(Blazor+EF ミラー型)は失敗帰属を charter 前史に記録のうえ破棄。
