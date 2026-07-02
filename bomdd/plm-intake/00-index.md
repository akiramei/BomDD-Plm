# PLM Intake — 入力資料台帳(G0 証跡)

人間(akira)と設計セッションが最初に配置した原資料の一覧。要求台帳(10-requirements.yaml)の `source_refs` はここを指す。

| ID | 資料 | 所在 | 内容 |
|---|---|---|---|
| SRC-01 | ref-v0 参照スキーマ一式(draft) | `../../BomDD/method/schemas/draft/`(commit 329e57d) | id-grammar 37 families / ref-edges 15成果物+19リント規則 / bomdd-ref.draft.schema.json。**本製品の中核入力仕様** |
| SRC-02 | PLM v0 charter(前史=旧試作の失敗帰属5点を含む) | [../00-charter.md](../00-charter.md) | スコープ・除外・完了定義・工場構成 |
| SRC-03 | 裁定台帳 DEC-0001 / DEC-0002 | [../65-decision-register.yaml](../65-decision-register.yaml) | ref-v0 draft 承認・advisory 方針・TypeScript / core・cli・viewer 3分割 |
| SRC-04 | 実リポ ID 棚卸し(2026-07-03) | [id-inventory-2026-07-03.md](id-inventory-2026-07-03.md) | ViewPrism2 実 YAML の ID 使用実態。パーサ寛容性要求の根拠 |
| SRC-05 | YAML 記述の罠(実地observation) | [yaml-authoring-traps.md](yaml-authoring-traps.md) | 裁定台帳の初回作成時に踏んだ構文罠2件。頑健パース・親切診断要求の根拠 |
| SRC-06 | 遡及実証の対象リポ | ViewPrism2 + ViewPrismUI(workspace) / BomDD-LibraryLending-Sample | 受入(Phase 5)の実物対象。規模の実測値は id-inventory 参照 |

- 未配置(必要になったら追加): 診断 JSON スキーマの先行事例調査(SARIF 等)。REQ-017 の裁定材料。
