# 実リポ ID 棚卸し(2026-07-03) — ViewPrism2/bomdd の ID 使用実態

`grep -rhoE` による ViewPrism2 実 YAML/MD の ID 出現集計(接頭辞パターン、数値部を N に正規化)。
**含意: リンタの ID 文法はテンプレ理想形でなく、この実態を false positive なしで受理しなければならない。**

## 主要観測(頻度上位・特記)

| 実例 | 件数(概数) | テンプレとの差・含意 |
|---|---|---|
| `REQ-N` / `ECO-N` | 873 / 855 | 標準形。ECO は 60-change-order-eco-NNN.md のファイル名が定義サイト |
| `S-N` | 502 | テンプレは `S1` 形、実物は `S-01` 形。**両受理が必要**(id-grammar family_pattern 済) |
| `INV-N` / `OC-N` | 242 / 232 | 散文定義(仕様・invariants)。**advisory**(DEC-0001) |
| `K-DESIGN` / `K-AVALONIA` / `K-PHASH` | 77 / 69 / 16 | **無番号 K-BOM ID**。tail の数値を要求してはならない |
| `CP-UI-G1` / `CP-L1-SMOKE` | 72 / 25 | CP tail は自由形(golden 系・スモーク系) |
| `GF-N` / `GF-V4-N` / `GF-TAGCTRL-N` | 126+ | golden 所見。散文定義 → advisory |
| `E-UI-BROWSE-N` 等 | 74+ | E tail に領域名セグメント。複数セグメント許容が必要 |
| `EQ-RANK` | 17 | 無番号 EQ |
| `CHEAT-V4-04` / `CHEAT-F01-H001` | 35+ | 複合 tail。51-cheat-log.md 見出し定義 → advisory |
| `M01`〜`M04` | (forward-01.5) | 移行オラクル。M-BOM(`M-<name>`)と pattern 分離済み |
| `UQ-I07` | 27 | UQ tail も自由形 |

## 規模の実測(受入・性能要求の基準)

- ViewPrism2/bomdd: YAML/MD 約 50 ファイル(ECO 27本含む)、E-BOM 41品目・M-BOM 29単位・
  固定オラクル 73 facts・ずる台帳 59件。ID 出現総数(参照込み)は**数千のオーダー**。
- ViewPrismUI: HTML モック十数本+screens CAD 7本+ui-ir/ui-bom/ui-trace-map(JSON)。
- 「E-BOM」「M-BOM」等の**文書名としての語**が ID 抽出パターンに引っかかる(132/72件)。
  散文からの ID 抽出(60-*.md 等)は誤検出フィルタが必要という根拠。
