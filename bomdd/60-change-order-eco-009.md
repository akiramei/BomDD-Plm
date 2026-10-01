# Change Order — ECO-009(測定不能を違反と区別して出す: 区分の出力・上流宣言の実装・R-050 (d) の追随+スナップショット同期 0.11→0.12 — implemented・独立検査の前)

> BomDD ECO-089(契約の規則文言・ref-v0.12)の実装側。裁定: BomDD 側 user DECIDE「2:A」(2026-10-01 — 実装側の ECO を今起票する・連鎖の帰属と終了コードの値を設計入力に持たせる・起票ファイルだけを書きコードは変えない・製造は別裁定)。
> 目的(BomDD 側 user・要旨): **不良を見つけたのか、測定器が測れなかったのかを混ぜない** — M-BOM / Control Plan の再設計(後続)の前後比較で、「不良が増えた」と「測れなくなった」を区別できる前提にする。
> 本 ECO は**起票のみ**。設計は未実施で、収束(`/converge` 相当)は製造裁定の前に別途行う。コード・仕様・スキーマ・固定オラクルは変更していない。

## 担当設備

- 起票: `claude-sonnet-5-5`・Claude Code(Claude Agent SDK)・来歴 self-reported(BomDD 設備台帳 EQ-005)
- 製造・独立検査: **未裁定**(製造裁定で決める)。前例= ECO-008 は設計者適用+異系統の独立検査(BomDD 設備台帳 EQ-002)。
- 設計・製造(設計者適用・2026-10-01): `claude-opus-5-5`・Claude Code・来歴 self-reported(**設備交代**: 起票は claude-sonnet-5-5、設計の途中から claude-opus-5-5 — user のモデル切り替え)。
  BomDD 設備台帳に claude-opus-5-5 の行は EQ-004 として既存。
- 独立検査: 製造裁定「4:A」で異系統(BomDD 設備台帳 EQ-002)を併用する。**未実施**(受入個体の commit の後に起動する)。

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

## 1A. 設計(2026-10-01・設計者 `claude-opus-5-5`・収束は未収束 — 下の収束 receipt)

### 1A.1 設計の前提として実測・実読したこと

- 出力スキーマ `schemas/plm-diag-1.schema.json` は**全階層で `additionalProperties: false`**。欄の追加は、このスキーマで検証する読み手にとって非互換になる(§2.9「非互換変更はメジャー版上げ」)。
- 終了コード 3 を使うと、製品の hook が素通しする: BomDD-Plm と ViewPrism2 の pre-commit は `exit 1` のときだけ遮断し、それ以外は通す(`bomdd/hooks/pre-commit`・ViewPrism2 `bomdd/hooks/pre-commit:83`)。
  BomDDWiki の `wiki_manifest.py` は UNKNOWN に 3 を使うが、hook に結線されていない。
- 固定オラクルの照合は **error と warn の完全集合**(`oracle/harness/lib.mjs` compareFindings — 期待に無い error/warn は過検出で落ちる)。新しい error/warn 所見を足すと既存行が落ちうる。
- 固定オラクルの検体で「製造可能な E 品目があるのに M unit が 0 件」は **0 件**。単体テストの検体では 2 件(`test/fixtures/r040-lineage`・`test/fixtures/r050/brokenmbom`)。
- 族の定義サイトは ref-edges の `artifacts[].defines`・`distributed_defines` に宣言がある。INV 族には定義サイトの宣言が無い(BomDD ECO-089 の延長 1 周で曖昧だった INV 形の 11 件は、この条件で帰属の対象から外れる)。

### 1A.2 設計

| # | 決めること | 設計 | 根拠 |
|---|---|---|---|
| D1 | 区分の持ち方 | 判定を表す所見(error・warn と R-050 (d) の info)に `outcome`(RED / MEASUREMENT_FAILURE / NOT_APPLICABLE)を付ける。観測だけの info(R-005・X-XREPO)には付けない | 所見の rule・severity・件数は変えない(既存オラクルの照合を壊さない) |
| D2 | 測定不能の原因 | 所見の外に、新しい最上位の節 `measurement: [{cause, family?, file?, rule?}]` を置き、`stats` に区分ごとの件数を足す。原因は所見にしない | 原因を error 所見にすると、構文エラーを含む既存オラクル(S-04)に過検出が出る |
| D3 | 定義サイトの状態 | 定義サイトの宣言を持つ族ごとに、状態を ok / absent(成果物なし)/ unreadable(構文エラー)/ selector-miss(キーが無い)/ empty(空)で判定する | 原因の閉語彙(ref-v0.12)を、宣言済みの定義サイトから機械的に決める |
| D4 | 対象 0 件の判定 | R-012: 製造可能な品目が 1 件以上で、M 族の定義サイトが ok でない → 測定不能(原因= その状態)。品目ごとの R-012 は `outcome: MEASUREMENT_FAILURE`。R-011: E 族の定義サイトが ok でない → 測定不能。R-014・R-050 は D9 | 「定義サイトが読めない」ことを、「読めた上で対象が空」と分ける |
| D5 | 連鎖の帰属 | R-003 の所見のうち、参照先の族が判定でき、その族に定義サイトの宣言があり、その族の定義サイトが**すべて** ok でない(定義 0 件)ものに `outcome: MEASUREMENT_FAILURE` を付け、`measurement` の原因へ対応づける。それ以外は RED のまま | 延長 1 周の規則(厳格な族・定義 0)に「宣言された定義サイト」の条件を足し、INV 形や判定できない文字列を外す |
| D6 | 終了コード | 0/1/2 を維持する。測定不能(`outcome` の付いた error か、実行ゲート内の `measurement` の項目)は exit 1 | 3 は hook が素通しする(1A.1)。REQ-014 の反例「構文エラーは診断として exit 1」とも整合 |
| D7 | 出力スキーマの版 | **裁定事項**: (a) plm-diag/1 を改訂して任意欄を足す(版は据え置き)/ (b) plm-diag/2 へ版上げ | 1A.1 のとおり、欄の追加はスキーマ上は非互換。リポ内に JSON Schema で出力を検証する読み手は無い(grep)。`schemaVersion` が `plm-diag/1` であることを検査するテストが 3 本(cli・l1-smoke・sarif)あり、(b) なら改訂が要る。リポ外の読み手(製品の検査スクリプト等)は未調査 |
| D8 | 表示 | text 出力のサマリに区分ごとの件数を足す。SARIF は result の properties に `outcome`。viewer は本 ECO では変えない | 範囲を検査器の出力までに閉じる |
| D9 | BomDD 側の規則文言(ref-v0.12)の是正 | **R-014 と R-050 (d) の上流宣言は「対象の空」と「定義サイトの空」を混同している**。R-014: 全行が golden などで深さ unit/L2/L3 の行が 0 件でも、上流があれば測定不能になってしまう(誤報)。R-050 (d): M unit が読めて存在するが acceptance_refs が無いときも測定不能になってしまう(境界規則「読めた定義サイトは RED/適用外」と矛盾)。是正案= 測定不能は**定義サイトの状態が ok でないとき**に限り、読めた上で対象が空なら適用外 | BomDD ECO-089 の製造物の欠陥。実装の前に BomDD 側で是正が要る |
| D10 | 受入の検体の追加 | A10: CP 行が全て golden(測定不能にならないこと・負の対照)/ A11: M unit はあるが acceptance_refs が無い(R-050 (d) が適用外の info)/ A12: 定義ファイル 2 本のうち 1 本だけ構文エラー(定義が残るので連鎖は RED のまま) | D4・D5・D9 の境界に、その規則固有の理由で赤くなる検体を置く |

### 1A.3 影響の見立て(設計時点)

- 既存オラクル S-01〜S-26: error/warn の所見の集合は変わらない見込み(D1・D2)。終了コードも、検体に「M unit 0 件」が無いので変わらない見込み(1A.1 の走査)。**実装後に全ランで確かめる**。
- 単体テスト: `r040-lineage`・`r050/brokenmbom` の 2 検体で、終了コードか `measurement` の期待が変わりうる(テストの期待の改訂が要る)。
- 実リポ: 区分が付くだけで、rule・severity・件数は不変の見込み。`measurement` の項目が新たに出て exit が 0→1 になるリポがありうる(A9 型: 製造可能な品目があるのに M unit が 0 件)— 製造前の突合で全数を測る。

### 1A.4 収束 receipt(/converge — 起動経路: 人間呼び出し〔user「Plm の ECO-009 の設計を始めて」〕)

- **判定: 未収束**(round 軌跡: 5→2→1・上限 3 周に到達・2 周連続ゼロに至らず)。裁定質問= 打ち切り採用 / 延長 / 差し戻し。製造は裁定まで進めない。
- 周回と新規指摘:
  - round 1(5 件): ①出力スキーマが閉じていて欄の追加は非互換(D7)②終了コード 3 は hook が素通し(D6)③ref-v0.12 の R-014 が「対象の空」と「定義サイトの空」を混同(D9)④測定不能の原因を、宣言済みの定義サイトから決める方法が要る(D3)⑤固定オラクルが error/warn の完全集合で照合するため、原因を所見にすると既存行が落ちる(D2)。
  - round 2(2 件): ⑥ R-050 (d) も同じ混同(D9)⑦連鎖の帰属を「定義サイトの宣言がある族」に限れば INV 形が外れる(D5・実読で確認)。
  - round 3(1 件): ⑧ M unit 0 件の測定不能をコミット時ゲートで出すと、既存オラクルの終了コードが変わりうる → 走査で該当 0 件(単体テストは 2 件)。
- DoD:
  - ✘ 各規則に必ず起きるイベントのアンカーがある — 受入ゲートの製品判定経路への結線は範囲外(§5)。
  - ✔ 各規則に実在確認済みの実装先がある — `rules/evaluate.ts`(emitItemRules・emitR050・emitRefFinding)・`rules/context.ts`(mbomUnits・cpChars・ebomItems)・`output/build.ts`・`cli/src/main.ts`(computeExit)・`schemas/plm-diag-1.schema.json`(実読)。
  - ✔ 各検査にその規則固有の理由で赤くなる検体の方針がある — BomDD ECO-089 の arms A2〜A9 と、D10 の A10〜A12。
  - ✔ 全状態に所有者がある — 規則の意味= BomDD ref-edges・写像と出力= 本リポの仕様 §2.6・§2.9・hook の方針= 各製品。
  - ✔ 正本が一意 — 意味は ref-edges だけに置き、本リポの仕様は写像だけを持つ。D9 の欠陥は BomDD 側で直す(本リポで意味を再定義しない)。
  - ✔ 凍結行・既裁定の実文と突合済み — REQ-014 の反例・§2.2・§2.6・§2.9(閉じたスキーマ)・§2.10/INV-006・hook の実文・BomDD ECO-089 の ref-v0.12。
  - ✔ 影響が列挙されている — 1A.3(固定オラクル・単体テスト・実リポ)。実リポの全数は未測定と宣言。
- 検証した主張(要点):
  - 「出力スキーマは閉じている」= 実読(plm-diag-1.schema.json)。「hook は exit 1 だけ遮断」= 実読(2 リポの pre-commit)。「オラクルは error/warn の完全集合」= 実読(lib.mjs)。
  - 「オラクル検体に M unit 0 件は無い」= 実測(49 検体の走査・HIT 2 件はどちらも単体テストの検体)。「INV 族に定義サイトの宣言が無い」= 実読(ref-edges)。
  - 「D5 が実在リポで誤帰属しない」= **疑い(未検証)**— 延長 1 周の規則に条件を足した版は測っていない。実装後に `cascade-attribution.py` と同型で測る。
- 未収束事項: ①周回ごとに指摘が 1 件以上残っている ②D7(出力スキーマの版)は裁定事項 ③D9 は BomDD 側の規則文言の是正が先に要る ④リポ外に plm-diag/1 の読み手(スキーマ検証をするもの)がいるかは未調査(リポ内には無い)⑤D5 の誤帰属は未測定。

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

## 3c. 製造裁定(2026-10-01・user DECIDE「1:A 2:B 3:A 4:A」)

- **1:A 収束の扱い= 打ち切り採用**(条件= 3 の是正を先に済ませる)。収束 receipt の判定(未収束・5→2→1)は書き換えない — 採用は裁定によるもので、収束したからではない。
- **2:B 出力スキーマ= plm-diag/2 へ版上げ**(D7)。
- **3:A BomDD 側の規則文言の是正= BomDD ECO-089 の中で直す**(D9)。BomDD ECO-089 §4b で R-014・R-050 (d) を「定義サイトの状態が ok でないときだけ測定不能」へ是正済み(版は ref-v0.12 のまま)。本 ECO のスナップショットはその是正後の ref-edges を複写した。
- **4:A 配員= 設計者が製造し、異系統の独立検査を併用**(ECO-008 の前例)。

## 4. 製造と較正の実測(2026-10-01・作業木・commit 前)

- **較正の赤**(変更前個体 7c1e157 の dist): 新設・改訂したテストを先に書き、**152 本中 16 本が FAIL** を確認してから実装した(新設 `test/measurability.test.js` の 13 本・版の期待を改訂した 2 本・brokenmbom の (d) の期待を改訂した 1 本)。
  新設のうち A10(CP が全て golden)は変更前から PASS — 負の対照で、変えない挙動。A2 のコミット時ゲートの 1 本は、`outcome` が無い出力でも「RED 0 件」が成り立つ空振りだったため、測定不能の存在を先に要求する形へ強めた(計器側の是正)。
- 製造: `packages/core/src/measure/measure.ts`(新設: 定義サイトの状態と区分の割当)・`rules/evaluate.ts`(R-050 (d) の追随)・`types.ts`・`output/build.ts`(plm-diag/2・measurement・stats.outcomes)・`output/sarif.ts`(properties.outcome)・
  `lint.ts`(区分の割当を抑止の前に・X-SUPPRESS は RED)・`cli/src/main.ts`(適用ゲート内の measurement で exit 1)・`cli/src/text.ts`(区分の行と原因の行)・`viewer/src/generate.ts`(版の表示)・
  `schemas/plm-diag-2.schema.json`(新設)・`schemas/ref-v0/ref-edges.draft.yaml`(BomDD の是正後= commit 2748359 の `method/schemas/draft/ref-edges.draft.yaml` を byte 複写。id-grammar と bomdd-ref は同一)・`bomdd/rule-messages.yaml`(R-050 (d) の理由の語彙を 1 つ追加)・仕様 §2.6・§2.9・§2.10(rev6)・33 の CP-LINT-007 の test_vectors・dist 再生成。
- **製造中の是正(正直記載)**: X-GIT-001(git が使えず R-052 を飛ばす info)に最初は測定不能を付けたが、fail-open は ref-v0.7 の凍結済みの裁定で、「測定不能を exit 0 にしない」と矛盾する。本 ECO では区分を付けない宣言済みの例外とした(仕様 §2.6)。
- **受入の実測**(作業木): build 警告 0 / **152/152 tests** / **固定オラクル 49/49**(既存行は無変更)/ 治具セルフテスト 13/13 / self-hosting `--eco` error 0・warn 0(exit 0)。
- **実リポの突合**(7 本・2 ゲート= 14 構成・BomDD `bomdd/reports/eco-089-measurability/compare-real-repos.md`): **区分以外の所見と終了コードは全構成で変更前後同一**。
  新たに付いた測定不能の区分: LibraryLending 45・UnitConv 99・Transfer03 86・TimetableAdv 124・ViewTube 13・ViewPrism2 73(R-050 (c) の文書方言)。
  連鎖の原因として、TimetableAdv で DE・FMEA・ROUTE、ViewTube で CAPA・ECO の族が測定不能の原因に挙がった — **帰属が正しいかは未確認**(§1A.4 未収束事項 ⑤・独立検査の範囲に渡す)。
- **BomDD ECO-089 の V5**(BomDD `v5-arms-post.md`): **36 組中 35 組が期待と一致**。不一致 1 組= A9(他から参照されない M-BOM の改名)のコミット時ゲート(exit 0)。
  always ゲートには M-BOM を読む規則が無く、R-012 の測定不能は G3 以降に出る(仕様 §2.6 の宣言済みの限界)。
  これを直す案(always で「成果物はあるのに宣言された定義サイトが ok でない」を一律に測定不能とする)は採らない — 実リポ 7 本全てで、任意の定義サイト(GF・DC・DE・FMEA・TE・AB・P・ROUTING)が引っかかり、
  BomDD-Plm 自身と ViewPrism2 の always の終了コードが 0→1 になる(走査の実測)。V5 の A9 の期待(always で測定不能)の扱いは**裁定事項**。
- 固定オラクルへの行の追加は無し: オラクルの照合器(`lib.mjs` matches)は `outcome` と `measurement` を比べないため、新しい挙動の検体は単体テスト側に置いた。
- 自リポの製造記録(50-as-built)への本 ECO のエントリは、独立検査の後の受入で置く。
- 状態: register `filed → implemented`(受入個体の commit・独立検査・受入の前)。

## 5. 残すもの(本 ECO が支持しないこと・候補)

- 受入ゲートが、いずれかの製品の判定経路で実行されていること(結線は範囲外)。
- 契約が適用される規則は R-011・R-012・R-014・R-050 のみ。他の規則の対象 0 件の意味は未宣言のまま。
- 区分が付いても、hook・CI が区分に応じた処置を取ることは保証されない(各製品の方針)。
