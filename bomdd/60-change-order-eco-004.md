# Change / Corrective Order — ECO-004(R-041 メッセージの判別可能化+NUL バイト債務の是正)

> 52-metrics に記録済みの軽微債務 2 件をまとめて是正する小 ECO。裁量次元がゼロの機械的是正のため
> **設計者適用+全再認証**(forward-03 で確立した処置形態の準用 — fresh 工場の測定価値なし)。

## 0. 変更前 baseline
- As-Maintained: tag `v0.4-eco-003-accepted` 系譜 HEAD(93624ec)。

## 1. 変更要求(2件)

### CH-1: R-041 メッセージに endpoint 値({ref})を含める
- 発生契機: ECO-003 起票プローブの観測(52 product_debt_candidates 記録済み)— R-041 は
  エンドポイント単位に発火するため、from/to 双方不解決時に**同一 trace_id の所見が 2 件並んで判別不能**。
- 内容: 正準文言表(bomdd/rule-messages.yaml)の R-041 message を
  `trace_link {targetId} の from/to({ref})が解決できません` へ改訂(evaluate は既に ref=endpoint 値を
  渡しており、テンプレートが未使用だっただけ)。messages.ts は転記表につき同期改訂。
- 種別: 欠陥是正(UX 債務)+正準文言表改訂

### CH-2: dedup キー・センチネルの生 NUL バイトをエスケープ表記へ
- 発生契機: ECO-003 起票調査で発見(52 product_eco_candidates 記録済み)— resolve/model.ts(buildNodes の
  dedup キー区切り)と rules/evaluate.ts(R-002 バケツの GLOBAL センチネル)に**生の U+0000 がソース直埋め**され、
  ripgrep が両ファイルをバイナリ判定して検索から脱落する実害(ECO-003 調査中に Grep が空振りした実測)。
- 内容: 生 U+0000 → 6 文字のエスケープ表記(`(u0000)`)。**コンパイル後の文字列値は同一=挙動同値**。
- 種別: ソース衛生(挙動変更なし)

## 2. 影響分析
| 段 | 影響 |
|---|---|
| BOM | rule-messages.yaml(R-041 行のみ) |
| src | rules/messages.ts(転記同期)・resolve/model.ts(1 文字)・rules/evaluate.ts(1 文字)+dist 再生成 |
| オラクル | **S-25 の文書化改訂のみ**(R-041 所見 2 件に message_contains を追加=判別可能化の固定。他 33 採点行不変) |
| 仕様 | 変更なし(§2.6 は正準文言表を参照する構造のまま) |

影響なし予測: S-25 以外の全オラクル行 PASS 維持 / self-hosting・ViewPrism2 workspace の error/warn 0 維持
(R-041 は両リポで発火 0 の dormant rule・NUL 修正は挙動同値)。

## 3. 較正と受入(2026-07-04)
- 較正: S-25 改訂版(message_contains 追加)を**変更前個体で FAIL 確認**(missing= message_contains 2 件)→ 適用。
- 受入: build 0 エラー・**116/116 tests・オラクル 34/34**(S-25 改訂版 PASS)・self-hosting error/warn 0・
  **ViewPrism2 workspace 回帰 error/warn 0**・dist の NUL 0。
- 実害解消の実証: 是正前は `rg "R-041" packages/core/src` が messages.ts しか返さなかった(2 ファイルが
  バイナリ判定)→ 是正後は **3 ファイル**(model.ts / evaluate.ts / messages.ts)を返す。
- diff 監査(63 手動): 変更 = rule-messages.yaml / messages.ts / model.ts / evaluate.ts / S-25 expected
  / dist 再生成のみ(影響分析どおり)。R-052 の機械監査は本 ECO では**宣言しない** — §4 の発見のため。

## 4. 副発見: verified 済み ECO の diff_audit が stale 化する(R-052 の意味論ギャップ)
本 ECO の受入で `--eco` を実行したところ、**ECO-002/003 の R-052 が誤発火**していた: R-052 は
`git diff <baseline> HEAD` の動的評価のため、受入後の無関係コミット(CI 整備の .github/)が
diff 窓に入り続け、**closed/verified な ECO の宣言影響集合を遡及的に破る**。
- 当面の運用(本 ECO で適用): **verified になった ECO の diff_audit は register から外す**
  (dogfood は受入時に実施済み・結果は order/52 に記録済み)。
- 恒久修正の候補(52 に記録): R-052 の評価対象を open な ECO に限る、または diff_audit に
  `head:`(結果タグ)アンカーを追加(ref-v0.8 候補・製品変更を伴うため別 ECO)。

## 5. 記録
- register: ECO-004 verified / 52-metrics: eco_004 節+債務候補 2 件を解消マーク+R-052 stale 候補を追加。
