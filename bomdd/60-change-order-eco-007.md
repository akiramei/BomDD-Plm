# Change Order — ECO-007(schemas/ref-v0 スナップショットの同期 — ref-v0.8 → v0.10)

> 供与入力(M-SCHEMA-013)の同期遅延の是正。BomDD ECO-029(ref-v0.10= as-built 文書方言宣言)の
> 適用経路。gate ①= maintainer 裁定 2026-08-03「b(bomdd-lint 側)で承認。製造に進んでください」
> (ViewPrism2 ECO-065 残面の是正チェーン)。

## 0. 実測(起票根拠)

- schemas/ref-v0 の 3 ファイルが **ref-v0.8 のまま**(正本= BomDD method/schemas/draft の
  v0.9= 2026-07-16 ECO-013 から 18 日、v0.10= 2026-08-03 ECO-029 と乖離・3 ファイルとも hash 不一致)。
- 実害: 同梱スキーマで lint する全経路(self-hosting・workspace)で v0.9 の ui 二方言被覆と
  v0.10 の as-built 文書方言被覆が**効いていなかった**。
- ECO-013 影響なし予測の宣言済み影響「次回リント実行から UI-CAD 方言の被覆が効き始め所見が
  増える可能性」の履行に当たる。

## 1. 変更・受入(2026-08-03 実測)

- 変更: 正本 3 ファイル(ref-edges / id-grammar / bomdd-ref.schema)を byte 複写で同期(0.8→0.10)。
- 受入(全て同期直後に実測):
  - self-hosting `--eco`: **177 info / error 0 / warn 0 — 同期前後で完全同値**(Plm 自リポの
    as-built はリスト方言・ui 資産は 0.9 追加セレクタ非該当= 影響なし予測どおり)。
  - tests **118/118**・オラクル **34/34** — 不変。
  - ViewPrism2 workspace(同梱経路): error 0 / warn 12 / info 502→**498** — BomDD ECO-029 の
    `--schema` 直指定受入と**同値**(供与経路で v0.10 が有効化した証明。差分= R-005 孤立解消
    4 件のみ・新規所見 0 は ECO-029 order §4 で機械帰属済み)。
- 担当設備: 設計者適用(claude-fable-5・byte 複写のみ・裁量次元ゼロ — ECO-004/005 の処置形態)。

## 2. スコープ外

- 将来の版同期の自動化・鮮度検査(kit-freshness 同型の supply 検査)— 同期遅延の再発が
  実測されたら起票(今回が 1 例目)。
