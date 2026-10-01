# Change Order — ECO-009(測定不能を違反と区別して出す: 区分の出力・上流宣言の実装・R-050 (d) の追随+スナップショット同期 0.11→0.12 — 起票のみ)

> BomDD ECO-089(契約の規則文言・ref-v0.12)の実装側。裁定: BomDD 側 user DECIDE「2:A」(2026-10-01 — 実装側の ECO を今起票する・連鎖の帰属と終了コードの値を設計入力に持たせる・起票ファイルだけを書きコードは変えない・製造は別裁定)。
> 目的(BomDD 側 user・要旨): **不良を見つけたのか、測定器が測れなかったのかを混ぜない** — M-BOM / Control Plan の再設計(後続)の前後比較で、「不良が増えた」と「測れなくなった」を区別できる前提にする。
> 本 ECO は**起票のみ**。設計は未実施で、収束(`/converge` 相当)は製造裁定の前に別途行う。コード・仕様・スキーマ・固定オラクルは変更していない。

## 担当設備

- 起票: `claude-sonnet-5-5`・Claude Code(Claude Agent SDK)・来歴 self-reported(BomDD 設備台帳 EQ-005)
- 製造・独立検査: **未裁定**(製造裁定で決める)。前例= ECO-008 は設計者適用+異系統の独立検査(BomDD 設備台帳 EQ-002)。

## 0. 変更前 baseline と実測(起票根拠)

- As-Maintained: `d02052b`(ECO-008 verified・作業木 clean)。固定オラクル 49 ラン・テスト 137 本・治具セルフテスト 13 本は **ECO-008 受入時の値**(起票時に再測定していない)。
- 実測(BomDD ECO-089 §0・証拠= BomDD `bomdd/reports/eco-089-measurability/`): 現行の bomdd-lint にキー改名・構文エラー・空文書(32-mbom・33-control-plan)を当てると、
  - 全て exit 1 で止まるが、**違反と同じ error** で出る(混在)。1 件の改名が R-003 の error 8〜158 件に見え、最小構成では既知の違反(存在しない ID への参照)と同じ規則・同じ件数(error R-003 +1)で区別できない。
  - 無音で緑(exit 0)になるのは「M ID が他ファイルから参照されない構成」のコミット時ゲート(always)の 1 構成。同じ構成は受入ゲートでは R-012 が error で止める。
- 実在 7 リポのうち 2 本は 33-control-plan が YAML として解析できず、TimetableAdv は選択子が拾う特性数(471)と字面の数(25)が食い違う。
- 連鎖の帰属の実測(延長 1 周): 規則「未解決の参照先の族に定義ノードが 1 件も無ければ測定不能の連鎖」は、人工の不良サンプルでは 100% 分離できたが、実在リポでは測定不能へ回った参照 91 件(族が判定できるもの)のうち字面の定義があるのは 78%・無いのが 22%・族が判定できないものが 6 件(`id:` の字面探索のみで 78% は下限)。
- **凍結行の実文(読んだ上で変更の要否を判断する対象)**: REQ-014(exit 契約・反例「構文エラーは診断として exit 1」)・仕様 §2.2(X-PARSE-001 は severity error)・§2.6(X-* は閉集合 8 種・全規則を毎回評価し gate を付ける)・§2.9(`diagnostics.json`= plm-diag/1・非互換変更はメジャー版上げ)・§2.10/INV-006(exit 0/1/2)。

## 1. 変更要求(候補 — 設計は未実施・製造裁定で凍結)

規則の意味は `schemas/ref-v0/ref-edges.draft.yaml`(ref-v0.12)の `measurability` 節が正(ここへ転記しない)。

- **CH-1 区分の出力**: 所見ごとの区分(RED / MEASUREMENT_FAILURE / NOT_APPLICABLE)を `diagnostics.json` に加法的に追加し、`stats` に件数を足す。MEASUREMENT_FAILURE は exit 0 にならない。
  終了コード 0/1/2 の意味を変えない案を第一候補とする(REQ-014 の反例と整合・規則単位の測定不能に exit 2 を割り当てない — hook が exit 2 を通す設計のため)。
- **CH-2 上流宣言の実装**: R-011・R-012・R-014・R-050 の「対象が 0 件」を、`measurability.upstream_declarations` の宣言に従い MEASUREMENT_FAILURE と NOT_APPLICABLE に分ける。R-050 の規則 (d) を ref-v0.12 に追随させる(上流が非 0 なら測定不能 error・上流も 0 なら適用外 info)。
- **CH-3 既存所見の区分の割当**: 現行の所見のうち測定不能に当たるもの(X-PARSE-001・X-TYPE-001 の空文書・R-050 (c))を MEASUREMENT_FAILURE に割り当てる。severity は凍結行(§2.2)どおり変えない。割当表は設計で確定する。
- **CH-4 連鎖所見の帰属**(BomDD ECO-089 の `deferred: cascade-attribution`・旧 V6): 測定不能の結果として生じる派生所見を原因の測定不能 1 件へ従属させ違反として数えない。**対象は厳格な族(R-003 が error)の、族が判定できる ID に限り、判定できない文字列は違反側に残す**
  (測定不能へ隠さない)。定義サイトが機械可読という族ごとの宣言の持ち方(id-grammar か Plm 仕様か)は未決。
- **CH-5 文言・表示**: `rule-messages.yaml`・viewer の表示・SARIF の扱いは設計で範囲を裁定する。
- **CH-6 schemas/ref-v0 スナップショットの同期(0.11 → 0.12)**: 正本(BomDD `method/schemas/draft/`・commit 42eaa38)から byte 複写。内容が変わるのは ref-edges.draft.yaml のみ。
- **CH-7 仕様の改訂**: §2.9(`diagnostics.json` の区分欄)・§2.6(区分の割当)を改訂する。INV-006 と REQ-014 の statement は不変であることを設計で確認する。

### 設計の未決(製造裁定の前に収束させる)

区分欄の名前と値の表記 / `plm-diag/1` の加法的拡張か版上げか / exit 0 の条件の文言 / 連鎖の帰属の対象族の宣言の持ち方 / viewer・SARIF の扱い /
実在リポで曖昧な 22%(INV で始まる注記つきの文字列 11 件を含む)の扱い。

### 採らない(宣言済み境界)

hook・CI の方針(各製品の判断)/ 受入ゲートの製品判定経路への結線 / M-BOM・Control Plan の再設計 / 他の規則(R-011・R-012・R-014・R-050 以外)の上流宣言 / BomDD 側の規則の意味の再定義。

## 2. 影響分析(起票時点の見立て — 製造裁定で凍結)

| 段 | 影響 |
|---|---|
| 仕様 | 20-spec §2.6・§2.9。§2.2・§2.10・INV-006 は不変の見込み(第一候補の場合) |
| 要求 | REQ-014(statement 不変・追随先の版)。出力契約の要求の追随は設計で確定 |
| E-BOM / M-BOM | E-CORE-LINT-007・E-CORE-OUTPUT-010・E-CONTRACT-DIAG-018・E-CLI-011 / M-CORE-RULES-003・M-CORE-OUTPUT-004・M-CLI-005・M-SCHEMA-013・M-SCHEMA-CONTRACT-014・M-ORACLE-009・M-HARNESS-008 |
| Control Plan | CP-LINT-007・CP-OUTPUT-010・CP-CLI-011・CP-GATE-008 |
| 固定オラクル | **追加行のみ**(既存 S-01〜S-26 は不変) |
| スキーマ | schemas/ref-v0/ref-edges.draft.yaml → ref-v0.12・出力 JSON Schema(区分欄の追加) |
| src・テスト | packages/core(rules・output)・packages/cli・packages/viewer(表示を変える場合)+dist 再生成・test/ |

影響なし予測(候補・製造前に凍結):
- 既存オラクル・既存テストは無改変で PASS 維持(区分は加法的な追加。ただし `diagnostics.json` の全文一致を見るオラクル・テストは欄の追加で影響しうる — 設計で確認)。
- 終了コードの割当(0/1/2)は全リポで不変(第一候補の場合)。既存所見の rule・severity・件数は不変で、区分が付くだけ。
- R-050 (d): 対象 0 件かつ上流が非 0 の構成が新たに測定不能 error になる(BomDD ECO-089 の arms の A2・A9 型)。実リポ全数への影響は**未予測**(製造前の突合で測る)。

## 3. 較正と受入(条件・候補 — 製造裁定で凍結・二部形)

- 較正(条件): BomDD ECO-089 の arms(`measure-arms.py` の ARMS)を**変更前個体で実行**し、期待= MEASUREMENT_FAILURE の arm が全て期待と不一致であること(起票時点で測定済み= BomDD `arms-pre.md`)— 検査法: 同スクリプトの出力。
- 受入(条件): build 警告 0・node --test 全通過・固定オラクル全ラン PASS・治具セルフテスト PASS・self-hosting `--eco` の error/warn 0・実リポの変更前後の突合で区分の追加以外の所見が同一・独立検査の判定が ACCEPT(配員は製造裁定)。
- BomDD ECO-089 の V5(条件): 実装個体で、期待= MEASUREMENT_FAILURE の全 arm に MEASUREMENT_FAILURE 区分の所見が 1 件以上あり exit 0 にならず、期待= RED の arm が RED、期待= PASS の arm が PASS(A8 は always で PASS・acceptance で RED)であること — 検査法: `measure-arms.py` へ期待比較モード(--expect post)を足して実行。
- 連鎖の帰属(条件・旧 BomDD V6): 実装個体で、A3(Control Plan のキー改名)が違反として数える error 件数が、原因の測定不能 1 件分を超えないこと。かつ実在リポのコーパスで、族が判定できる ID のうち測定不能へ回ったものの誤帰属(字面の定義が無い 22% 相当)を列挙し、人が確認すること — 検査法: `cascade-attribution.py` と同型の測定。
- 受入結果は受入時に観測行(`V<n>= PASS | FAIL | UNMEASURABLE(観測: …)`)で記入する。条件行は書き換えない。

## 4. 状態

起票時点では**設計・製造とも未着手**。起票の根拠は BomDD ECO-089 §0(実測)・§3c(製造裁定「2:C」で連鎖の帰属を本 ECO へ移管)。製造裁定(収束の扱い・配員・範囲)の後に、本節へ製造・較正・受入の実測を追記する。

## 5. 残すもの(本 ECO が支持しないこと・候補)

- 受入ゲートが、いずれかの製品の判定経路で実行されていること(結線は範囲外)。
- 契約が適用される規則は R-011・R-012・R-014・R-050 のみ。他の規則の対象 0 件の意味は未宣言のまま。
- 区分が付いても、hook・CI が区分に応じた処置を取ることは保証されない(各製品の方針)。
