# Work Order — plm-v0

## ID
- Work Order ID: `WO-PLM-V0-001`
- 対象 BOM tag/commit: (G3 通過後に凍結 tag を記入)
- Routing ref: `bomdd/34-routing.yaml`

## 目的
BomDD 成果物リポジトリの参照整合リンタ(bomdd-lint CLI)と read-only viewer(自己完結 HTML 生成)を、
TypeScript モノレポ(packages/core・cli・viewer)として初回製造する。

## 実装開始条件
- G1/G2/G2'/G3 が pass・blocker unresolved questions が 0
- 製造パッケージに `20/30/31/32/33/34/35/40`+ref-v0 スナップショット(`schemas/ref-v0/`)+UI-CAD 一式が含まれる

## 入力(これがすべて。これ以外を参照しない)
- `bomdd/20-spec.md`(仕様。冒頭の併読規約に従うこと)
- `bomdd/30-ebom.yaml` / `31-kbom.yaml` / `32-mbom.yaml` / `33-control-plan.yaml` / `34-routing.yaml` / `35-design-system-bom.yaml`
- `bomdd/rule-messages.yaml`(所見の正準文言表 — 転記対象・創作禁止)
- ref-v0 スナップショット(id-grammar / ref-edges / bomdd-ref.draft.schema.json)
- UI-CAD: `bomdd/ui/mock/bomdd-plm-viewer.html`(設計原器)+`bomdd/ui/viewer/*`(UI-IR/UI-BOM/trace map)
- 注: `bomdd-workspace.yaml` のサンプルは**意図的に非同梱**(書式は仕様 §2.5 が正。テスト用 fixture は
  Control Plan の test_vectors に従い自作する)

## 製造対象
| M-BOM unit | E-BOM refs | Output artifact ref | Acceptance refs |
|---|---|---|---|
| M-CORE-INGEST-001 | E-CORE-READONLY-001/DISCOVER-002/PARSE-003 | packages/core/src/(runtime,discover,parse) | CP-READONLY-001, CP-DISCOVER-002, CP-PARSE-003 |
| M-CORE-GRAPH-002 | E-CORE-SCHEMA-004/RESOLVE-005/WORKSPACE-006 | packages/core/src/(schema,resolve,workspace) | CP-SCHEMA-004, CP-RESOLVE-005, CP-WORKSPACE-006 |
| M-CORE-RULES-003 | E-CORE-LINT-007/GATE-008/SUPPRESS-009 | packages/core/src/(rules,gate,suppress) | CP-LINT-007, CP-GATE-008, CP-SUPPRESS-009 |
| M-CORE-OUTPUT-004 | E-CORE-OUTPUT-010/E-CONTRACT-DIAG-018 | packages/core/src/output + schemas/ | CP-OUTPUT-010 |
| M-CLI-005 | E-CLI-011 | packages/cli/ | CP-CLI-011 |
| M-VIEWER-GEN-006 | E-VIEWER-SHELL-001 | packages/viewer/src/(generate,shell) | CP-VIEWER-012 |
| M-VIEWER-UI-007 | E-VIEWER-* 4ビュー+E-DESIGN-* 9部品 | packages/viewer/src/views/ | CP-VIEW-*-013〜016, CP-DESIGN-SYSTEM-019 |
| M-HARNESS-008 | (治具) | test/ | 自己受入(下記) |

## 必須受入(自己受入)
- `npm run build`(tsc)が警告ゼロで成功する
- `node --test` が全緑(Control Plan の unit/L2 行の test_vectors 全被覆)
- **L1 スモーク**: 同梱ミニ fixture に対し `bomdd-lint <fixture> --view --out <tmp>` を実行し、
  exit code・diagnostics.json/graph.json/plm-view.html の生成を確認する1本を含む
- **治具セルフテスト**: byte 比較器・DOM 検査ヘルパを合成データで検証するテストを含む
- **自己受入が赤のまま納品しない — stop して報告する**(nonconformance。forward-01 factory-06 事例)
- UI: `35-design-system-bom.yaml` の required design parts を対象 surface に適用する。
  素の table/text/div で代替した場合は cheat-log に報告する

## ずる報告(義務)
BOM/K-BOM/Control Plan から導けなかった判断は、**実装を止めずに**全件報告する:
```
### CHEAT-<ID> [分類] 一行要約
- 手法が与えなかったもの:
- 代替した判断(何をどう埋めたか):
- 重大度: blocker / friction / minor
```
特に以下の次元は判断したら必ず報告する(exploratory 宣言行):
- stderr ログの書式・進捗表現
- 内部並列化の有無・方式
- viewer の DOM 構造・CSS クラス命名(表示契約外)
- packages/ 配下のファイル分割・命名
- SVG レイアウトの具体的な座標計算(K-VIEWER-VANILLA の「決定的層状」の範囲内の詳細)

## 調達部品の規律
`32-mbom.yaml` の procurement に無いパッケージの採用は**ずる報告対象**。
迷ったら node 標準 API で代替する(テスト= node:test / 引数= util.parseArgs / グラフ= 自前 SVG)。

## blocker 時の手順
BOM の自己矛盾・実装不能を発見した場合: 当該 unit を `blocked` とマークして他 unit を続行し、
cheat-log に C6 で記録して納品時に報告する(製造の中断・設計者との往復はしない)。
