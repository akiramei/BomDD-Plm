# Change Order — ECO-005(R-052 stale 恒久修正: diff_audit `head:` アンカー・ref-v0.8)

> ECO-004 §4 の副発見(52 product_eco_candidates 記録済み)の恒久修正。R-052 の意味論ギャップ
> (verified 済み ECO の宣言影響集合が受入後コミットで遡及的に破れる)を **diff 窓の終端アンカー**で閉じる。
> 挙動追加は仕様(§2.17 rev4)で裁量次元まで固定済みのため **設計者適用+全再認証**(ECO-004 の処置形態)。

## 0. 変更前 baseline

- As-Maintained: tag `v0.5-eco-004-accepted` 系譜 HEAD(e0bbee4)= tag `eco-005-input`。

## 1. 変更要求

### CH-1: diff_audit に任意フィールド `head:` を追加(ref-v0.8)

- 形: `diff_audit: { baseline: <git rev>, head: <git rev(受入タグ推奨)>, allowed_paths: [...] }`。
- 意味論:
  - `head` **有り** → `git diff <baseline> <head>` — **固定窓**。HEAD 非依存で恒久決定的。
    verified 後も監査が遡及的に破れない(status に関わらず常に評価= 恒久回帰検査)。
  - `head` **無し** → 従来どおり `git diff <baseline> HEAD` — open ECO の生きた監査窓。
  - `head` 解決不能 → 既存 baseline 不能と同型の **X-GIT-001(info)fail-open**。
- 運用の転換: verified 時は diff_audit を「除去」(ECO-004 の当面運用=記録喪失)ではなく
  「**head: に受入タグを追記して窓を閉じる**」。

### CH-2: ECO-002/003 の diff_audit を head 付きで復元

- ECO-004 で除去した宣言を履歴(`v0.4-eco-003-accepted` 時点)から復元し、head を受入タグで固定:
  - ECO-002: `{ baseline: eco-002-input, head: v0.3-eco-002-accepted, allowed_paths: [packages/core/, packages/cli/, test/, oracle/] }`
  - ECO-003: `{ baseline: v0.3-eco-002-accepted, head: v0.4-eco-003-accepted, allowed_paths: [oracle/] }`
- 窓の清浄性は履歴順で確認済み(v0.3→v0.4 間の介在コミットは 9653e87 docs= bomdd/ のみ。
  CI 整備 .github/ は v0.4 **より後**= 窓外)。

### CH-3: CI self-hosting に `--eco` を常設

- 復元された恒久監査(CH-2)+R-051 を CI で毎 push 検証する(`fetch-depth: 0` でタグ/履歴を取得)。
  stale 化が構造的に不可能になったこと(CH-1)が常設の前提条件 — ECO-002 時点で常設しなかった理由
  (動的窓の誤発火リスク)が本 ECO で消える。

## 2. 裁定: 恒久修正 2 案の選択(52 記録の候補から)

| 案 | 内容 | 裁定 |
|---|---|---|
| A: 評価対象を open な ECO に限る | status ∈ {open,…} のみ評価 | **不採用** |
| B: `head:` アンカー | 窓の終端を宣言で固定 | **採用** |

- A 不採用の理由: ① `status` は ref-v0 **未規定語彙**(自由フィールド)であり、R-052 の意味論を
  未規定次元に結合させる(語彙の正式化という別の仕様拡張を強制する)。② verified 後の恒久機械監査
  能力を失う(検査が status 変更で黙って消える= 沈黙次元の新設)。
- B は diff_audit 自身の内部で意味論が閉じ(R-052 の opt-in 構造の中の追加 1 フィールド)、
  「窓を閉じる」操作が register 上に**明示的な記録として残る**。

## 3. 影響分析

| 段 | 影響 |
|---|---|
| BOM | 20-spec §2.17(rev4)・10-requirements REQ-010(rev3)・rule-messages.yaml(X-GIT-001 文言= baseline 限定表現の一般化)・60-register(ECO-002/003 復元+本 ECO 起票)・41-fixed-oracle(S-22 行の改訂註) |
| スキーマ | schemas/ref-v0/ref-edges.draft.yaml → **ref-v0.8**(diff_audit 形の拡張) |
| src | gitdiff.ts(head 引数)・r052.ts(head 読取り/受渡し+X-GIT ref 表現)・messages.ts(転記同期)+dist 再生成 |
| テスト | rules-r052.test.js に head 系 2 分岐追加(アンカー窓が後続コミットを無視/head 不能= X-GIT-001) |
| オラクル | S-22 **改訂**(fixture 履歴に受入後コミットを追加・ECO-905 head アンカー/ECO-906 head 不能を追加。既存 ECO-901〜904 の期待は不変)+ build-git-fixture.mjs / selftest.mjs(治具側)改訂 |
| CI | ci.yml: checkout fetch-depth 0+self-hosting lint に `--eco` |

影響なし予測: S-22 以外の全採点行 PASS 維持(git 連携は R-052 系に閉じる)/ self-hosting・
ViewPrism2 workspace の error/warn 0 維持 / head 無し diff_audit の挙動は完全後方互換
(既存テスト 8 本は無改変で PASS 維持)。

## 4. 較正と受入(記入は §5)

- 較正: 改訂版 S-22(ECO-905= 所見なし・ECO-906= X-GIT-001)を**変更前個体で FAIL 確認**
  (旧実装は head を黙って無視 → ECO-905 の受入後コミットが動的窓に入り R-052 誤発火= stale 現象の
  fixture 内再現・ECO-906 の X-GIT-001 が出ない)→ 適用。
- 受入: build 0 エラー・unit tests 全通過・オラクル全行 PASS・self-hosting error/warn 0
  (**--eco 込み・ECO-002/003 復元監査+本 ECO dogfood を含む**)・ViewPrism2 workspace 回帰 0。

## 5. 記録(2026-07-04 受入)

- 較正の赤(変更前個体・改訂版 S-22): `extra= R-052[ECO-905]`(head 無視で受入後コミットが動的窓に
  混入= **stale 現象の fixture 内再現**)+`missing= X-GIT-001[ECO-906]`。予測どおりの 2 故障モード。
- 受入: build 0 エラー・**118/118 tests**(head 系 2 本追加)・**オラクル 34/34**(S-22 改訂版 PASS)・
  self-hosting `--eco` error/warn 0(**復元 ECO-002/003 の恒久監査 clean**・X-GIT-001 0= タグ全解決)・
  ViewPrism2 workspace 回帰 error/warn 0・治具セルフテスト 13/13(固定窓 diff 集合の検査を追補)。
- 影響なし予測の的中: S-22 以外の全採点行 PASS 維持・既存 R-052 テスト 8 本無改変 PASS(後方互換)。
- dogfood: 本 ECO 自身の diff_audit(open 窓)で監査 → verified 時に `head: v0.5-eco-005-accepted` で
  窓を閉じる= 「除去せず閉じる」運用の初適用。受入後の最終 `--eco`(タグ作成後)で R-052/X-GIT 0 を確認。
- ECO-004 への遡及宣言はしない(タグ窓に ECO 外の CI コミットが介在 — register 註 / 52 retro_note)。
- **影響分析の是正 1 件(under-inclusion・コミット前点検で捕捉)**: `packages/cli/tsconfig.tsbuildinfo`
  (依存先 core の d.ts 変更で tsc -b が更新するビルドキャッシュ)が §3 の宣言影響集合外だった。
  ECO-004 の「core tsbuildinfo 取りこぼし」と同型= **tsc -b は依存元パッケージの tsbuildinfo も更新する**。
  allowed_paths へ当該 1 ファイルを前方一致(=実質 exact)で追加。
- register: ECO-005 verified / 52-metrics: eco_005 節+R-052 stale 候補を解消マーク。
