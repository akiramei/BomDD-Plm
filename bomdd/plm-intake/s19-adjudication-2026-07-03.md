# S-19 裁定ループ記録(2026-07-03) — 実リポ所見の全数帰属

規律: false positive は「スキーマ欠陥 or 実リポ欠陥」として**毎回どちらかへ裁定**する(DEC-0001)。
本記録が ref-v0 draft 卒業(schemas/draft/README §4)の検証データ第1点。

## 対象1: self-hosting(BomDD-Plm 自リポ) — **error+warn 67 → 0 達成**

| クラスタ | 件数 | 帰属 | 処置 |
|---|---|---|---|
| R-002 ui-ir uiId 重複 | 2 | 自リポ IR 欠陥 | CMP-0014 の uiId を STA 側へ一本化 |
| R-003 TMP-UI-LIV 不解決 | 4 | **ref-v0 欠陥** | v0.3: ui-bom/trace-map の family 列挙に LIV 追加 |
| R-004 41 spec_ref 散文 | 19 | 自リポ台帳記法 | `bomdd/20-spec.md#節` 形式へ正規化 |
| R-050 TE 証跡なし | 17 | **正当** | 50-as-built に test_evidence_refs 19行追加 |
| R-003 FMEA 不解決 | 11 | **ref-v0 欠陥** | v0.3: 33 fmea[].id 定義サイト追加 |
| R-004 BOM パス乖離 | 31 | 自リポ BOM 欠陥 | 複合パス記法排除・as-built 実パス整合・33 fixture 実在化・42 sweep_ref 正規化 |
| (残 info 126 = R-005 孤立可視化) | — | 正当(info) | 放置可。R-005 除外 family の拡張は将来候補 |

**保留(製品 ECO 候補 PD-7)**: 単一セグメントの dir パス(`test`)が R-004 不解決になった(多セグメント dir は解決)。
具体ファイル指定で回避したが、製品の path 実在検査の dir 扱いに疑い — 要検証。

## 対象2: ViewPrism workspace — **error+warn 412 → 286(スキーマ3補正)+残の全数帰属**

| クラスタ | 件数 | 帰属 | 処置/行き先 |
|---|---|---|---|
| R-001/X-ID `domain.*` | 36 | **ref-v0 欠陥**(実物が正) | v0.3: ui-id family に domain 追加 → **解消** |
| R-003 K-* 不解決 | 95 | **ref-v0 欠陥**(実物が正) | v0.3: `kbom:` 直下リスト構造を許容 → **解消** |
| R-002 TMP-UI-*/ui-id 重複(画面別 IR×3) | 18 | **ref-v0.4 候補+製品 ECO** | 一意性スコープ=抽出ファイル単位(per-file)。ref-edges に候補注記済み。製品側の実装 ECO(BomDD-Plm)とセットで導入 |
| R-003 trace-map 複合記法(`X / unmodeled`)・変種品番(0006A) | 71 | ViewPrism2 台帳記法 | **ECO 候補(ViewPrism2)**: uiIr 欄は単一 ID+注釈は note へ / 変種は IR に定義 |
| R-003 CP-WORKSPACE-028 不解決 | 1 | **真正の欠陥(初捕獲)** | ViewPrism2 32-mbom の dangling 参照 — ECO 候補 |
| R-003 warn FMEA-*(43)+散文値(2) | 45 | 正当(advisory) | ViewPrism2 に FMEA 構造表が無い実態の可視化 — ECO 候補(33 へ構造化) |
| R-004 41 spec_ref 散文 | 38 | ViewPrism2 台帳記法 | ECO 候補(path#節 正規化 — 本リポで実施済みと同型) |
| R-004 `ViewPrismUI:資料/...` 記法 | 8 | **製品 ECO 候補(PD-8)** | `repo名:相対パス` の cross-repo path 記法サポート(実物の慣行。正準 `repo名/相対` と等価扱い) |
| R-004 warn 注釈付きパス(`src/X(Models/, Common/)` 等) | 85 | ViewPrism2 台帳スタイル債務 | 段階的正規化(ECO 候補・低優先)。うち 35 の `<HTML mock...>` プレースホルダ残 1 件は**真正欠陥** |
| R-014 test_vectors 欠落 | 6 | **真正(CHEAT-005 予防リントの的中)** | ViewPrism2 ECO 候補(CP-NFR-001/CP-ROBUST-001/CP-TRASH-021 等へ vectors 追加) |

## 集計と含意

- **スキーマ帰属**: 5系統(LIV/FMEA定義/domain/kbom構造/ — +v0.4候補1) → ref-v0.3 で修正。
  「実物と衝突したらスキーマ側を直す」が5回適用され、**うち4回は実リポの慣行が正**だった。
- **真正の欠陥捕獲**: dangling CP 参照 1・プレースホルダ残 1・test_vectors 欠落 6・FMEA 表不在・TE 証跡不在(自リポ)
  — **リンタは初日から本物を捕まえている**。
- **ViewPrism2 ECO 候補**: 6件(上表)。着手は ViewPrism2 側の通常 ECO プロセスで。
  → **起票済み(2026-07-03・ViewPrism2 9ed8fee)**: ECO-028(dangling 受入参照 — 再走行で CP-TRASH-022・
  E-UI-DETAIL-023 残存も追加確認)/ ECO-029(複合記法・変種品番)/ ECO-030(FMEA 構造表)/
  ECO-031(41 spec_ref)/ ECO-032(注釈付きパス+placeholder 真正1)/ ECO-033(test_vectors 6)。
  起票検証で7件目を発見: register のリストキーが ref-v0 セレクタ(changes[])と不一致で全 ECO が
  PLM 不可視 → ECO-034 として即時適用(裁定: スキーマ側に寄せる)。
- **製品 ECO 候補**: PD-7(単一セグメント dir)・PD-8(repo: 記法)・per-file スコープ実装。
  → **ECO-001 として実施・受入完了(2026-07-03・tag v0.2-eco-001-accepted)**。PD-7 は再現検証で
  file にも及ぶと判明(単一セグメント全般)。ViewPrism workspace 286→261。
- 残 286 件の運用: ViewPrism2 の CI 導入時は当面 `--gate G3`+suppress(理由付き)で段階導入を推奨。
