# ずる台帳 — BomDD-Plm

> 工場側の cheat-log は各工場の納品物(`BomDD-Plm-factory-NN/bomdd/51-cheat-log.md`)にあり、
> 受入確定時に本台帳へ取り込む。本ファイルは**設計者側**(治具・オラクル・工程)のずるを先行記録する。

## CHEAT-PLM-V0-H001 [harness] 採点治具がゲートフィルタを欠いていた
- 手法が与えなかったもの: 仕様 §2.7「diagnostics.json は常に全所見」に対し、期待プロファイルは
  ゲート適用後集合 — 両者の橋渡し(比較前フィルタ)が治具に未実装だった。
- 代替した判断: run-oracle.mjs に gateFilter を追加(梯子+eco)。
- 重大度: friction(初回採点で偽 FAIL 5件を発生させ、S-07 全滅の主因になった)
- 分類: C2-in-harness(検査器側の暗黙知)。saga/forward-01 の H 系列の7例目。
  **治具セルフテストは比較器を検証したが「治具が仕様のどの断面を比較すべきか」は検証しなかった** —
  セルフテストの盲点として手法へ還元候補。

## CHEAT-PLM-V0-H002 [harness] S-11 ランナーがフラグ値までパス解決していた
- 手法が与えなかったもの: cli-matrix の引数をどう絶対化するかの規約。
- 代替した判断: スラッシュを含む引数のみパス解決(`G3`/`json` 等のフラグ値は素通し)。
- 重大度: minor(偽 FAIL 2件。製品は正しく exit 2 を返していた=製品の引数検証が偽陽性を可視化した)

## CHEAT-ECO-001-H003 [harness] S-20 期待プロファイルの severity 断面誤り(較正が凍結前捕捉)
- 手法が与えなかったもの: エッジ severity 無指定(per-family)がパスエッジ(family なし)で何になるかの
  期待プロファイル側の宣言。設計者は S-02 の実例(severity: warn **明記**のエッジ)から warn と類推した。
- 代替した判断: 較正(変更前個体への動的実行)で実装既定= error を観測し、期待側を error/exit 1 に是正。
  ECO-001 の変更断面(受理形)とは独立の既存挙動につき、期待側を実装に合わせるのが正
  (この断面は S-01〜S-19 で凍結済みの挙動の連続)。
- 重大度: none(凍結前捕捉=較正プロトコルが機能。H001 の教訓「比較すべき断面はセルフテストで検証されない」の
  再演を較正が防いだ — playbook §4.4 較正3段の実証2例目)

## CHEAT-ECO-001-D001 [designer] 41-fixed-oracle 追記行の YAML 記法ミス(self-hosting lint が検出)
- 手法が与えなかったもの: フロースタイル mapping 内の plain scalar に `[ ]` を含めてはならない、という
  YAML 記述罠の警告(plm-intake/yaml-authoring-traps.md の既知3型に含まれていなかった第4型)。
- 代替した判断: S-20/S-21 の scenario/contract_expectation をダブルクォートで囲んで修正(意味内容は不変)。
- 重大度: friction(X-PARSE-001 error 55件が self-hosting に発生。**製品リンタが設計者の記述ミスを検出した**
  = self-hosting の防壁価値の初実証。工場パッケージ・オラクル採点(expected ベース)には無影響。
  凍結 tag `eco-001-input` 時点から混入 — 凍結前の self-hosting lint を工程に足すべき示唆)。

## ECO-001 工場ずる報告の取込み(受入確定 2026-07-03)
- **CHEAT-ECO01-F01-001 [minor/採用個体]** per-file 宣言サイトと全域サイトが同一 family/ID を共有する場合の
  R-002 スコープが未規定 → per-file サイトを独立名前空間とする最も素直な読みで実装(仕様の穴として記録)。
- **CHEAT-ECO01-F01-002 [minor/採用個体]** `repo:` 判定の Windows ドライブレター誤認回避
  (`colon>0 && colon<len-1` ガード)— 仕様非言及の防御的限定。
- **CHEAT-ECO01-F02-001 [friction/対照個体]** node_modules 内 @bomdd/* がジャンクションでなく実体コピーで、
  再ビルドが import に反映されない環境不整合 → npm install で復旧(パッケージ組成由来。工場は正直に申告し
  「ビルド緑・テスト緑・実行は旧コード」の偽陰性リスクを指摘 — 工程還元候補: 隔離パッケージの組成手順に
  node_modules コピーでなく npm ci を指定する)。

## CHEAT-ECO-002-H004 [harness] S-23[1] の fixture 指定ミス(suppress は workspace 経由)
- 手法が与えなかったもの: expected 作成時、suppress fixture の実行形態(bomdd-workspace.yaml を target にする
  = S-08 と同型)の確認手順。repo 直指定では suppress が読まれず「suppressed 所見なし」の前提不成立になる。
- 代替した判断: S-08 の target と同じ workspace ファイル指定へ是正し全ケース再採点(凍結プロトコル §3)。
- 重大度: friction(採点1ラン偽 FAIL。checkSarif の precondition 検査が「治具の前提不成立」を
  製品欠陥と区別して報告した=検査器設計の勝ち)

## CHEAT-ECO-002-D002 [designer] E-CLI-SARIF-031 の external_source_ref に散文値
- 手法が与えなかったもの: external_source_ref(kind: id-or-path・family K)へ「SARIF 2.1.0(OASIS 標準)」の
  散文を書けないという台帳規律の自己適用(ECO-029 で ViewPrism2 に処方した「参照欄は単一 ID」の再演)。
- 代替した判断: K-SARIF パックを 31 に新設して参照(自己適用の R-004 warn をリンタが検出 — 設計者捕捉4例目)。
- 重大度: minor

## CHEAT-ECO-006-F001 [factory] 生成物 unit の「由来」を表す標準フィールドが M-BOM 慣行に無い
- 手法が与えなかったもの: ECO-006 裁定 1 で生成物専用 unit を立てたが、
  「この unit はどのソース unit の鋳造出力か」を書く欄が M-BOM の既存 8 unit の慣行に無かった
  (既存 unit は誰も `depends_on` を使っていない)。ref-v0 のエッジ台帳には
  `mbom.manufacturing_units[].depends_on[]`(family M・severity error)が定義されているのに、
  本製品の M-BOM は一度も使っていない=「使ってよいか」の前例が無い状態。
- 代替した判断: `depends_on` を由来欄として使う(自由キーの新設をしない)。理由=
  スキーマ既定のエッジなら R-003 が参照解決を機械検査するため、由来宣言が腐らない。
  自由キーだと宣言が壊れても誰も気づかない(silence)。
- 重大度: minor(挙動不変。ただし `depends_on` の意味論が「実行時依存」か「由来・鋳造元」かは
  ref-v0 に規定が無く、本 ECO で後者の用例を作った — 意味論の初回定着は設計者裁定を要する)

## CHEAT-ECO-006-F002 [factory] `artifact.type` の語彙が未規定
- 手法が与えなかったもの: `artifact.type` は閉集合でなく自由記述(既存値= `ts-module` /
  `ts-cli(bin=bomdd-lint)` / `node:test スイート` / `埋込 JS/CSS(生成 HTML に内包)` 等)。
  新 5 unit に何と書くかの語彙が無い。
- 代替した判断: 既存の書き癖(「何で出来ているか」の平文)に倣って
  `fixtures+expected+node 治具(.mjs)` / `ビルド生成物(dist/・tsconfig.tsbuildinfo)+パッケージ構成` /
  `GitHub Actions ワークフロー+変換スクリプト(.mjs)` / `json-schema+yaml(ref-v0 派生)` と記述。
- 重大度: minor(機械検査の対象外フィールド。ただし「生成物である/著述物である」の区別は
  台帳として意味があるので、`type` でなく専用の真偽値にする方が良い可能性 — 設計者裁定候補)

## CHEAT-ECO-006-F003 [factory] 影響分析の設置場所が order §3 と製造指示で食い違う
- 手法が与えなかったもの: order §3 は「起草物は workspace の `impact-analysis-eco-006.md`」
  (リポ外・番号なし)と書き、製造指示は `bomdd/61-impact-analysis-eco-006.md`(リポ内・61 番)と指定した。
  同一成果物の設置場所が 2 通り指示された。
- 代替した判断: **リポ内 `bomdd/61-impact-analysis-eco-006.md`** に置いた。根拠 3 つ —
  (a) 既存 ECO-001/002 の影響分析が `bomdd/61-impact-analysis-eco-NNN.md` として台帳に在る(実物が正)、
  (b) 影響分析は受入証拠であり台帳に残らないと後続 ECO から参照できない、
  (c) diff_audit の allowed_paths が `bomdd/` であり、リポ内設置が宣言と整合する。
- 重大度: friction(成果物は 1 箇所にしか無いので、order の字面を追う検査官は不在と誤認しうる。
  order §3 の文言是正が要る — 受入時に設計者裁定)

## CHEAT-ECO-006-F004 [factory] 新 unit が R-005 孤立定義(info)を 4 件増やすことの許容基準が無い
- 手法が与えなかったもの: 受入条件(order §4 V3)は「error/warn 0」であり info の増減は不問。
  一方 R-005 の是正先メッセージは「参照を張るか、不要なら retire を検討する」と書く。
  新設した生成物・CI・スキーマ unit は台帳上の被参照を持たない(誰も consume しない葉)ため、
  info を残すか 34-routing に参照を張って消すかの基準が無い。
- 代替した判断: **info を残す**(34-routing は変更しない)。理由= (a) order §1 スコープ外が
  「既存 unit と同水準の宣言まで」と限定している、(b) 被参照を作るためだけに工程宣言へ
  参照を足すのは、検査を黙らせるために台帳を歪める操作(silence の作り込み)になる。
  M-ORACLE-009 のみ M-CI-012 の `depends_on` から自然に参照されるため info が出ない(作為ではない)。
- 重大度: minor(受入に影響なし。「葉である unit は R-005 の対象外にすべきか」は規則側の裁定候補)

## CHEAT-ECO-006-F005 [factory] `depends_on` の意味論を工場が裁定した(rev2・スキーマ側は未規定のまま)
- 手法が与えなかったもの: ref-v0 は `mbom.manufacturing_units[].depends_on[]` を
  「family M・severity error の参照エッジ」としか規定せず、**意味論を規定していない**
  (実行時依存なのか、製造順序の前提なのか、由来・鋳造元なのか)。
  差戻 1 回目の所見 IA-ECO006-03 が「意味論が未裁定のまま用例が増えている」と指摘した。
- 代替した判断: 本製品の用法として
  **「この unit を再製造する前に成立していなければならない unit(製造順序の前提)」** を
  32-mbom のヘッダ(裁定 3)と 61 §1 に宣言した。実行時依存は procurement/K-BOM が持つ。
  この意味論で rev1 の宣言を検算し、M-BUILD-VIEWER-011(core の鋳造出力)と
  M-CI-012(鋳造 2 件+パッケージ定義 2 件)の取りこぼしを是正した。
- 重大度: minor(挙動不変。ただし**製品側の宣言でスキーマの空白を埋めた**状態であり、
  他製品の M-BOM が別の意味論で同じ欄を使うと横断解釈が割れる。
  ref-v0 への昇格可否は設計者裁定 — F001 の続報)

## CHEAT-ECO-006-F006 [factory] provenance 混載を 1 件だけ残した(パス機構の限界・是正不能)
- 手法が与えなかったもの: 差戻所見 IA-ECO006-01 は「鋳造 unit が著述物を吸収するな」と要求するが、
  `tsconfig.tsbuildinfo` は鋳造物でありながら `dist/` の外にあり、
  前方一致写像(`f == p` または `f` が `p/` で始まる)+ 1 unit = 1 artifact.path の下では
  著述物(`package.json` / `tsconfig.json`)から分離する手段が無い
  (`packages/core/tsconfig` はパス区切りで一致しないため共通前置を作れない)。
  「分離不能な混載をどう宣言するか」の規約が無い。
- 代替した判断: M-PKGDEF-CORE-015 / M-PKGDEF-VIEWER-016 の `artifact.type` と `notes` に
  **混載を明示**し(「package.json+tsconfig.json(著述)+tsconfig.tsbuildinfo(tsc の増分状態)」)、
  解消の 3 案(artifact.paths[] / 採点器の生成物パターン / 版管理から外す)を 61 §5-3 へ記録した。
  沈黙させず**契約文に書く**ことで、少なくとも rev1 の「契約と内容の矛盾」は消した。
- 重大度: minor(受入に影響なし。ただし「宣言できない構造を注記で埋める」のは台帳の弱点であり、
  3 案のいずれかで構造的に解くのが本筋 — 設計者裁定)

## CHEAT-ECO-006-F007 [factory] 差戻是正で unit を増やしたが register 追随は工場のスコープ外
- 手法が与えなかったもの: rev2 で unit を 5 → 8 に増やしたが、
  60-change-register の `affected_refs` は工場の変更対象外(設計者側が保持)。
  「工場が台帳の一部だけを更新し、整合の完成を他者に委ねる」場合の申し送り様式が無い。
- 代替した判断: **改名 0・削除 0・追加 3** に設計を制約して追随を加算のみに閉じ込め、
  必要な追随を 61 §7.3 に表で明示した(どの ID を足すか・なぜ既存 5 件は不変か・採点への影響なし)。
  rev1 で採番した 009〜013 を改名しなかったのはこのためである(命名の美しさより追随コストを優先)。
- 重大度: minor(整合は設計者の追記で完成する。なお **R-051 は「書いた ID が解決するか」しか見ず
  「書くべき ID を書いたか」を見ない**ため、追記漏れは機械検出されない — 観察として 61 §7.3 に記録)

## CHEAT-ECO-006-F008 [factory] depends_on の証拠等級(根拠 A/B)を工場が定義した(rev3)
- 手法が与えなかったもの: 差戻 2 回目は「追加する depends_on は実ファイルから検算し、根拠(ファイル・行)を
  記載」「推測で張らない・検算できるものだけ」と要求した。ところが **core の 3 unit → M-SCHEMA-013 は
  自 artifact 内に相手への実参照を原理的に持てない** — `packages/core/src/schema/types.ts:1` が
  「Loaded at runtime; **never baked into code (INV-007)**」と宣言するとおり、スキーマの場所を
  実装に焼かないことが不変条件だからである。「直接参照が取れない依存をどう検算したと言えるか」の
  基準が手法側に無い。
- 代替した判断: 証拠を 2 等級に分けて宣言した(61 §8.1)—
  **根拠 A(直接)** = 自 artifact 配下のファイルが相手 artifact を実参照 /
  **根拠 B(受入経由)** = 自 unit の acceptance_refs(CP)の test vector が相手 artifact を読む。
  A が取れる場合は A を使い、B は A が原理的に取れない場合の代替に限る。
  9 エッジ中 6 件が A・3 件が B(全て core → M-SCHEMA-013)。等級は 32-mbom の各行コメントにも残した。
- 重大度: minor(挙動不変。ただし **B は「自 unit の artifact 外の証拠」で依存を張る**ため、
  test/ の書き換えで根拠が静かに消えうる — 依存宣言の根拠が別 unit の中身に乗る構造は弱い。
  ref-v0 に依存種別(build/acceptance)の欄を設けるかは設計者裁定 — F001/F005 の続報)

## CHEAT-ECO-006-F009 [factory] 「張らないこと」の根拠は台帳に残らない(rev3)
- 手法が与えなかったもの: 差戻 2 回目は「基準の一貫適用 — 本当に必要なエッジが他にもあるなら全て追加」を
  要求した。一貫適用の証明には「**張らなかったエッジとその理由**」が要るが、32-mbom は
  存在する宣言しか書けない(不在の宣言を書く欄が無い)。
- 代替した判断: 検算して**棄却した 5 クラスのエッジ**を 61 §8.3 に表で残した
  (M-CORE-OUTPUT-004 → SCHEMA-013 / → SCHEMA-CONTRACT-014(2 循環になる)/
  viewer ソース 2 unit → BUILD-CORE-010 / M-HARNESS-008 → BUILD-VIEWER-011 /
  M-CORE-* → PKGDEF-CORE-015。いずれも全数 grep の結果つき)。
  台帳(32-mbom)でなく影響分析(61)側に置いたのは、**棄却の記録は変更の文脈に属する**ため。
- 重大度: minor(受入に影響なし。ただし次に誰かが「なぜ viewer ソースは core に依存しないのか」を
  問うとき、答えは 32-mbom でなく 61 §8.3 にしか無い — 台帳単体では一貫適用を再検証できない)

## CHEAT-ECO-006-F010 [factory] 受入 vector の CP→ファイル写像が機械可読でない(rev4)
- 手法が与えなかったもの: 第 3 回検査は「基準が自分の規則の下で閉じていること」を受理条件にした。
  根拠 B(受入経由)の閉性を機械検査するには「**どの CP の vector がどのファイルか**」の写像が要るが、
  33-control-plan の `test_vectors:` は**シナリオ名の散文リスト**(例: `[always 既定, G3=always+G1+G3, …]`)で
  ファイル参照ではない。`fixture:` はパスを持つが oracle/ 側の fixture であって unit test ファイルではない。
- 代替した判断: 閉性検査治具(`<workspace>/out/closure-check.py`・**リポ外**)の中で
  **unit → test ファイル名の割当表を明示的に書き下し**、その中身を実測して候補を作った。
  割当は名前の対応(`gate.test.js` → CP-GATE-008 等)に基づく推定であり、**この割当が誤れば検査も誤る**。
  限界は 61 §8.4 の末尾に明記した。
- 重大度: minor(検査結果自体は DAG/残余ゼロとも PASS。ただし**閉性の証明が工場の手作業の割当に
  乗っている** — `test_vectors` をファイル参照に機械可読化すれば治具が自力で写像でき、
  この弱点は消える。33 の改訂は本 ECO のスコープ外につき設計者裁定)

## ECO-002 工場ずる報告の取込み(受入確定 2026-07-03)
- 採用個体(F02/sonnet)4件: F02-001[friction] SARIF top-level キー= version 採用(仕様字句 schemaVersion は
  標準不整合 — 受入時に仕様側を補正)/ F02-002[friction] informationUri 不在→RFC 2606 プレースホルダ
  (受入時に設計者供給値へ充填)/ F02-003[minor] §2.6「X-* 7種」が rev3 で8種に(本文整合漏れ — 受入時補正)/
  F02-004[minor] allowed_paths 前方一致の境界(末尾スラッシュ規律 — 受入時に §2.17 へ明記)。
- 対照個体(F01/opus)3件: F01-001[minor] informationUri= 実 URL 推定(採用個体と対照的な判断)/
  F01-002[minor] S-20 ghost 行のテスト期待改訂(正当)/ F01-003[friction] trace_links への CH-3 非適用
  (採用個体は適用 — 2工場の分岐が §2.4 の未規定次元を検出し、受入時に「全経路共通」を明記)。
