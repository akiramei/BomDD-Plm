# Impact Analysis — ECO-006 影響分析(M-BOM 写像被覆ギャップの解消)

> [60-change-order-eco-006.md](60-change-order-eco-006.md) §1〜§2 の詳細版。
> 規律: 影響なし予測を**反証可能な形で製造前に凍結**(本書 §3・§4)。回帰結果が予測の採点になる。
> 粒度: 本 ECO は**宣言のみの挙動不変 ECO**。実体変更は 0 を予測するため、統制の主軸は
> 「変更が bomdd/ に閉じること」(V5)と「採点指標が予測どおり内訳だけ動くこと」(V1)。
> 起草者: claude-opus-5(工場 subagent。order §3 の委任 — 測定次元 1 の直接測定)。

## 0. 変更前個体の較正(赤の凍結・工場再実測 2026-08-02)

| 指標 | 実測値 | 出典 |
|---|---|---|
| `summary.decomposition.unmapped_files` | **76** | 凍結採点器 `impact-retrospective.py --repo .` |
| `summary.real_under_files` | **111**(= mapped_under 35 + unmapped 76) | 同上 |
| `summary.hub_concentration` | M-CORE-INGEST-001:18 / M-HARNESS-008:15 / M-CLI-005:2 | 同上 |
| self-hosting lint(`--eco`) | error 0 / warn 0 / info 176(全て R-005) | `packages/cli/dist/main.js . --eco` |
| `npm run build` / `node --test` | 0 エラー / 118 pass | — |

order §4 の較正値(unmapped 76)と一致。**受入条件が変更前個体で不成立**であることを確認した。

未写像 76 は**実体 54 ファイル**(複数 ECO で重複計上)。系統別内訳(実体数):
oracle/ 20・packages/core/(dist+tsbuildinfo)31・.github/ 2・schemas/ 1。

## 1. 裁定(work order §2 の委任事項)

> **本節は rev2(差戻 1 回目の是正後)が現行の裁定である。** rev1 からの変更は各項に明記し、
> 所見(IA-ECO006-01〜04)への処置対応表は §7 に置く。凍結済みの予測(§3・§4)と
> rev1 個体の採点(§6)は記録として書き換えず、rev2 の実測は §7 に併記する。

### 裁定 1 — 生成物(dist/・tsbuildinfo)の帰属方式: **案 b(生成物専用 unit)**

採用する一般規則(本 ECO で確立し、以後の package 追加に適用する):

> **(A) unit は provenance(誰が作るか)で切る。混載しない。**(rev2 で明文化)
> - **著述** = BOM から書かれる(src / test / oracle 治具 / package.json / tsconfig.json / CI 定義)
> - **鋳造** = 道具が決定的に生成する(dist/ / tsconfig.tsbuildinfo)。人手編集禁止
> - **供与** = 外部から版指定で持ち込む(schemas/ref-v0/ = K-REFV0 のスナップショット)
>
> **(B) 生成物は「その生成物を一意に生む製造手順を持つ最小の unit」に帰属する。**
> - 1 package = 1 unit のとき → そのソース unit が生成物も所有する(実質 案 a)。
> - 1 package = N unit のとき → 生成物は N unit の**共同出力**であり、どの単一 unit にも
>   「独立に再製造・交換できる単位」として帰属させられない → **生成物専用 unit** を立て、
>   由来を `depends_on`(機械検査対象エッジ・R-003)で明示する。

**rev1 → rev2 の是正(IA-ECO006-01)**: rev1 は鋳造 unit の `artifact.path` を
`packages/core/` `packages/viewer/`(package ルート)としていた。規則 (B) は満たすが
規則 (A) を破る — 著述されたビルド入力(`package.json` / `tsconfig.json`)まで吸収し、
同 unit の契約「決定的・**人手編集禁止**(著述物でなく鋳造物)」と**内容が矛盾**していた。
加えて package ルートを取ることは以後その package に置かれる全てを黙って飲み込む catch-all 化で、
本 ECO の主旨(写像を**明示**する)に反する。rev2 では鋳造 unit を `packages/<pkg>/dist/` に限定し、
著述側を **M-PKGDEF-CORE-015 / M-PKGDEF-VIEWER-016** として分離した。

**分離しきれない 1 件(パス機構の限界・正直記載)**: `tsconfig.tsbuildinfo` は鋳造物だが
`dist/` の外にあり `packages/<pkg>/` を前置に持つため M-PKGDEF-* 側に同居する。
前方一致写像(`f == p` または `f` が `p/` で始まる)+ 1 unit = 1 artifact.path の下では
`packages/core/tsconfig` はパス区切りで一致せず、分離する手段がない。
rev2 では **M-PKGDEF-* の `artifact.type` と `notes` に混載を明示**したため、
「人手編集禁止と宣言した unit が著述物を抱える」rev1 の矛盾は解消している
(混載そのものの解消には §5-3 の 3 案のいずれかが要る — 本 ECO のスコープ外)。

根拠 3 点:

1. **共同出力の帰属不能(決定的理由)**。`packages/core/dist` は `tsc -b packages/core` が
   `packages/core/src` 全体から鋳造する単一の出力である。ところが core の src は
   M-CORE-INGEST-001 / GRAPH-002 / RULES-003 / OUTPUT-004 の **4 unit が共有**しており
   (4 unit とも `artifact.path: packages/core/src`)、dist を 1 unit に帰属させると
   その unit が他 3 unit の出力を所有することになる。M-BOM 冒頭の粒度原則
   「独立に再製造・交換でき単独で自己受入できる単位」に正面から反する。
   viewer も同様(GEN-006 / UI-007 の 2 unit が `packages/viewer/src` を共有)。
2. **生成物は自 unit 以外の理由で変化する**。ECO-005 の受入で
   `packages/cli/tsconfig.tsbuildinfo` が「**依存先 core の d.ts 変更に伴う**ビルドキャッシュ」
   として under-inclusion 1 件になった実績がある(register の allowed_paths 註)。
   生成物をソース unit に畳み込むと、この変化が「そのソース unit が変わった」という
   偽の信号として台帳に出る。専用 unit + `depends_on` なら「由来 unit の変化に追従した鋳造」
   と読める。**由来関係を潰さずに残すことが台帳の情報量**である。
3. **再製造手順が違う**。ソース unit は BOM から**著述**される(fresh factory が書く)。
   生成物 unit は `npm run build` で**鋳造**される(決定的・人手編集禁止)。
   工程(34-routing)上も別ステップであり、手順が違うものを同一 unit に入れない。

**案 a を採らなかったことの副次的確認(採点上の帰結)**: core で案 a を採るには既存 unit の
`artifact.path` を `packages/core` へ広げる必要があるが、(i) 最長前方一致により src は依然
他 3 unit 側に残るため「宣言は package 全体・機械解釈は dist だけ」という乖離が生じ、
(ii) 広げる先が既存 ECO の宣言影響集合に含まれる unit(RULES-003 等)である場合、
76 ファイルが「予測済み」として吸収され `real_under_files` が 111 を下回る。
これは order §4 V1 の主旨(**見出しの付け替えでない証明**)を破る。設計根拠は 1〜3 が本体で、
これは独立な確認である。

**既存の非対称の扱い**: `packages/cli/dist` と `packages/cli/tsconfig.tsbuildinfo` は
M-CLI-005 の `artifact.path: packages/cli/`(package ルート)に既に含まれ、写像ギャップではない。
これは上記一般規則の「1 package = 1 unit」枝に**既に適合している**(偶然でなく規則の帰結)ため、
本 ECO では変更しない。order §1 スコープ外「既存 unit と同水準の宣言まで」にも合致する。

### 裁定 2 — 新 unit の粒度と命名: **M-HARNESS-008 の前例に整合させる(名称は対象物基準)**

- **前例の何を継ぐか**: M-HARNESS-008 が確立したのは「治具・非製品成果物も製品と同格の
  manufacturing unit として立て、`ebom_refs: []` / `acceptance_refs: []` を許し、
  再製造手順を `notes` に書く」という様式。新 4 系統はいずれも E-BOM 品目を実現しない
  (要求→設計部品の系譜を持たない)ため、この様式をそのまま踏襲する。
- **命名**: 既存は対象物基準(CORE / CLI / VIEWER / HARNESS)+ 通番。
  よって `M-<対象物>-<通番>` を継ぎ、通番は既存 008 の続き **009〜016**(採番の連続性を保つ。
  rev1 は 009〜013 の 5 件・rev2 で 014〜016 の 3 件を追加)。
  `M-HARNESS-*` への改名・既存 ID の変更はしない(60-change-register・34-routing からの
  参照が張られており、ID の再割当は R-002/R-003 の観点で不要なリスク)。
  rev2 でも **rev1 で採番済みの 009〜013 は改名・削除しない**(register 追随を加算のみに留めるため)。
- **`oracle/` を M-HARNESS-008(`test/`)に併合しない理由 — 製造帰属が違う**
  (**rev2 で論拠を訂正・IA-ECO006-04**):
  - `test/` は**工場が製造して納品する成果物**である。40-work-order「製造対象」表に
    `| M-HARNESS-008 | (治具) | test/ | 自己受入(下記) |` の行があり、
    34-routing `ROUTE-DELIVER` の output にも `test/` が入る。
  - `oracle/` は 34-routing `factory_isolation` が「製造パッケージ(20/30-35/40+ ref-v0
    スナップショット+UI-CAD 一式)**のみ**供与。設計対話・41/42・**oracle/ 配下**・他工場成果は非開示」
    と宣言する、**設計者が保持する受入判定器**である。工場は作りも見もしない。
  - すなわち**工場が作るもの**と**工場に見せずに工場を採点するもの**であり、同一 unit に入れると
    「工場が自分の採点器を作る」ことになって受入の独立性が壊れる。したがって別 unit とする。
  - **rev1 の記述「`test/` は工場へ渡り工場が自己受入に使う」は誤り**だった。34-routing の
    供与物リストに `test/` は無い。結論(別 unit)は変わらないが、根拠の事実記述を上記へ差し替える。
- **粒度原則との整合(order CH-1 の要求事項)**: 各 unit を
  「独立に再製造・交換でき単独で自己受入できる単位(fresh factory に単体で渡せるか)」で検証した。

| 新 unit(rev2) | artifact.path | provenance | 再製造手順 | 自己受入 | 交換単位として成立するか |
|---|---|---|---|---|---|
| M-ORACLE-009 | `oracle/` | 著述(設計者) | 41-fixed-oracle の凍結ケースから fixtures/expected/harness を組む | `harness/selftest.mjs`(比較器の合成データ検証) | 成立(界面= `run-oracle.mjs --cli "<CLI 起動コマンド>"`)。ただし**工場が作る単位ではない** |
| M-BUILD-CORE-010 | `packages/core/dist/` | 鋳造 | `tsc -b packages/core`(決定的・人手編集禁止) | build 0 エラー + 生成 dist 経由の L1 スモーク | 成立(「この src と構成から鋳造せよ」を単体で渡せる。tsc 版の差替が交換) |
| M-BUILD-VIEWER-011 | `packages/viewer/dist/` | 鋳造 | `tsc -b packages/viewer` | 同上 | 成立(同上) |
| M-CI-012 | `.github/` | 著述 | 34-routing の受入手順を CI 記述へ写す | ワークフロー実行が両 OS で緑 | 成立(別 CI プロバイダへの移植が交換) |
| M-SCHEMA-013 | `schemas/ref-v0/` | **供与** | K-REFV0 の版指定で method 側 draft から同期(製品内で著述しない) | S-13(`--schema` 差替の固定オラクル) | 成立(スキーマ版の差替が交換そのもの) |
| M-SCHEMA-CONTRACT-014 | `schemas/` | 著述 | §2.9 正規形の出力契約として版管理 | CP-OUTPUT-010(出力の契約適合) | 成立(契約版の差替が交換) |
| M-PKGDEF-CORE-015 | `packages/core/` | 著述(+混載 1) | package.json / tsconfig.json を書く | `npm ci` が解決し `tsc -b` が起動する | 成立(パッケージ境界の定義そのものが交換単位) |
| M-PKGDEF-VIEWER-016 | `packages/viewer/` | 著述(+混載 1) | 同上 | 同上 | 成立(同上) |

- **M-SCHEMA-013 の分割(rev2・IA-ECO006-02)**: rev1 は `schemas/` 全体を 1 unit とし、
  **供与入力**(`schemas/ref-v0/` = K-REFV0 のスナップショット。上流が正本で製品内では書かない)と
  **製造出力**(`schemas/plm-*.schema.json` = M-CORE-OUTPUT-004 の成果物)を混載していた。
  両者は provenance も再製造手順も交換の意味も違う(片方は「版を持ってくる」、もう片方は
  「製品が公開する契約を書く」)ため、粒度原則に適合しない。rev2 で
  `M-SCHEMA-013`(`schemas/ref-v0/`・供与)と `M-SCHEMA-CONTRACT-014`(`schemas/`・著述)へ分離した。
  出力契約が M-CORE-OUTPUT-004 と別 unit になるのは **1 unit = 1 artifact.path の制約**によるもので、
  `depends_on: [M-CORE-OUTPUT-004]` で意味的な帰属を残す(複数 path 宣言の可否は §5-3)。

### 裁定 3 — `depends_on` の意味論(rev2 新設・IA-ECO006-03)

ref-v0 は `mbom.manufacturing_units[].depends_on[]` を「family M の参照エッジ(severity: error)」と
規定するだけで**意味論を規定していない**(rev1 の 51 CHEAT-ECO-006-F001 で「未裁定のまま用例を作った」と
自己申告した箇所)。rev2 で本製品の用法を明示的に宣言する:

> **`depends_on` = 「この unit を**再製造する前に成立していなければならない** unit」(製造順序の前提)。**
> 実行時依存ではない(実行時の調達は `procurement` / K-BOM が持つ)。
> 由来(鋳造元)はこの意味論の部分集合 — dist は src と構成が成立していなければ鋳造できない。

この意味論で rev1 の宣言を検算し、**2 件の取りこぼしを是正**した:

| unit | rev1 | rev2 | 是正の根拠(実ファイルの値) |
|---|---|---|---|
| M-BUILD-VIEWER-011 | viewer の 2 ソース unit のみ | + **M-BUILD-CORE-010** + M-PKGDEF-VIEWER-016 | `packages/viewer/tsconfig.json` の `references: [{ "path": "../core" }]` と `package.json` の `dependencies: { "@bomdd/core": "0.0.0" }` — viewer の鋳造は **core の鋳造出力(.d.ts)** の成立を前提とする |
| M-CI-012 | HARNESS/ORACLE/CLI | + **鋳造 2 件** + **PKGDEF 2 件** | `ci.yml` の steps: `npm ci`(パッケージ定義)→ `npm run build`(鋳造)→ `node --test`(HARNESS)→ oracle 実行(ORACLE/CLI)→ self-hosting lint(CLI) |

> スキーマ側への昇格(ref-v0 に `depends_on` の意味論を書く)は**設計者裁定**として残す
> — 51 CHEAT-ECO-006-F005。本 ECO は製品 M-BOM の用法宣言までとする(order のスコープ内)。

## 2. 影響あり(トレース逆引き)

| 段 | 影響 ID / 対象 | 何が変わるか |
|---|---|---|
| M-BOM | **rev2: M-ORACLE-009 / M-BUILD-CORE-010 / M-BUILD-VIEWER-011 / M-CI-012 / M-SCHEMA-013 / M-SCHEMA-CONTRACT-014 / M-PKGDEF-CORE-015 / M-PKGDEF-VIEWER-016 の 8 unit 新設** | `mbom.manufacturing_units` に 8 unit 追加(rev1 は 5)。既存 8 unit の**全フィールドは不変**(1 文字も変えない) |
| 台帳 | 61-impact-analysis-eco-006.md 新設(本書) | 影響分析+裁定 2 点の設計根拠 |
| 台帳 | 51-cheat-log.md | BOM/order から導けなかった判断の追記(§6 で確定) |
| 仕様・E-BOM・K-BOM・CP・固定オラクル・routing | **変更なし** | 本 ECO は所有宣言のみ。要求も部品も検査も増えない |
| src / test / oracle / schemas / .github の**実体** | **変更なし** | order §1 スコープ外の明示どおり |

## 3. 影響なし予測(反証可能 — 製造前に凍結)

> 検証方法: 変更は「YAML の list へ 5 要素を追記する」だけであり、既存要素の再配置・改名・
> path 変更を一切伴わない。以下は「その追記が何に触れないか」の値レベルの根拠。

| 対象 | 予測 | 根拠 |
|---|---|---|
| `npm run build` | 不変(0 エラー) | ビルド入力は `packages/*/src` と tsconfig。bomdd/ は tsc の入力でない |
| `node --test`(118 件) | 全通過・**件数も 118 のまま** | test/ は同梱ミニ fixture と合成データで動く。自リポ bomdd/ を読むテストは無い(自リポ lint は CI 側の別ステップ) |
| 固定オラクル 34 ケース | 不変 | oracle/fixtures は合成リポ。自リポ 32-mbom を読むケースは無い |
| self-hosting lint の **error / warn** | **0 のまま** | 追加する参照エッジは (a) `artifact.path`(kind: path・warn)= 5 パスとも実在ディレクトリ、(b) `depends_on[]`(family M・error)= 参照先は既存 unit ID と本追記内の ID のみ、(c) `kbom_refs[]`(family K・error)= K-REFV0(実在)。R-001 は M family の tail 文法 `[A-Za-z0-9._-]+` に適合 |
| self-hosting lint の **info** | **176 → 180**(+4) | R-005(孤立定義・info)が新 unit のうち**どこからも参照されない 4 件**に出る: M-BUILD-CORE-010 / M-BUILD-VIEWER-011 / M-CI-012 / M-SCHEMA-013。**M-ORACLE-009 は出ない**(M-CI-012 の `depends_on` から参照されるため)。既存 176 件は不変 |
| R-051(register affected_refs 解決) | green | ECO-006 の affected_refs = `M-HARNESS-008`(既存・解決可)。本 ECO では register を変更しない |
| R-052 / diff_audit | 所見 0 | 宣言 `{ baseline: eco-006-input, allowed_paths: [bomdd/] }`。実 diff は bomdd/ 3 ファイルのみ(常時許容の内側) |
| ViewPrism2 workspace 回帰 | 対象外(未実施) | 本 workspace に ViewPrism2 リポが同梱されていない。§5 に未実施として記録 |
| 既存 8 unit の採点上の帰属 | 不変 | 新 path はいずれも既存 path の**より短い前置**または非交差。最長前方一致により `packages/core/src` / `packages/viewer/src` / `packages/cli/` / `test/` の帰属は動かない |
| `over`(過剰宣言)集合 | 全 ECO で不変 | `over` は「宣言 unit のうち実変更に現れなかったもの」。新 unit は 5 件とも既存 ECO の affected_refs に現れないため pred に入らない |

## 4. 受入指標の予測(V1 の内訳を製造前に凍結)

> V1 の本質は「76 が mapped へ**移るだけ**」。合計だけでなく**移動先の内訳**を凍結して反証可能にする。

| 指標 | 変更前 | **予測(変更後)** |
|---|---|---|
| `decomposition.unmapped_files` | 76 | **0** |
| `decomposition.mapped_under_files` | 35 | **111** |
| `real_under_files`(見出し) | 111 | **111(不変)** |
| `ecos_with_real_under` | 5 | 5 |
| `code_ecos` / `multi_unit_ecos` | 5 / 3 | 5 / **5**(全 ECO が 2 unit 以上に触れることが可視化される) |

> ※ `multi_unit_ecos` の予測 5 は**外れた**(実測 4)。採点後の訂正は §6 に記載する — 予測値は凍結のため書き換えない。

ECO 別 `under` 件数の予測(= 変更前 under + 変更前 unmapped):

| ECO | 変更前 under | **予測 under** | 内訳(新 unit への配分) |
|---|---|---|---|
| ECO-001 | 13 | **35** | M-ORACLE-009:11 / M-BUILD-CORE-010:10 / M-SCHEMA-013:1 |
| ECO-002 | 14 | **48** | M-BUILD-CORE-010:22 / M-ORACLE-009:9 / M-CI-012:2 / M-SCHEMA-013:1 |
| ECO-003 | 0 | **3** | M-ORACLE-009:3 |
| ECO-004 | 3 | **8** | M-BUILD-CORE-010:4 / M-ORACLE-009:1 |
| ECO-005 | 5 | **17** | M-BUILD-CORE-010:7 / M-ORACLE-009:3 / M-CI-012:1 / M-SCHEMA-013:1 |

`hub_concentration` の予測:
`M-BUILD-CORE-010:43 / M-ORACLE-009:27 / M-CORE-INGEST-001:18 / M-HARNESS-008:15 / M-SCHEMA-013:3 / M-CI-012:3 / M-CLI-005:2`
(既存 3 unit の値は不変)。

> ※ 本節は **rev1 の凍結予測**であり書き換えない。rev2(差戻是正)で unit を分割したため
> `hub_concentration` の配分だけが変わる(M-BUILD-CORE-010:43 → 39 + M-PKGDEF-CORE-015:4)。
> **V1 の受入条件(unmapped 0 / real_under 111)と ECO 別 under(35/48/3/8/17)は rev2 でも不変。**
> rev2 の予測と実測は §7。

**M-BUILD-VIEWER-011 の予測は 0 件**である。viewer の生成物は ECO-001〜005 の実 diff に一度も現れていない。
本 unit は測定された 76 の解消でなく、order §1 系統 2 の記述(`packages/*/dist/`)に対する
**被覆の完全性**のために立てる(fail-closed: 次に viewer を再ビルドした ECO で unmapped を出さない)。
この 1 unit だけは「実測された赤に対する是正」ではないことを明示しておく。

## 5. 残余ギャップと観察(本 ECO のスコープ外・記録のみ)

1. **採点器が構造的に写像できない領域**: `attribute()` は unit の `artifact.path` の
   最長前方一致で帰属するため、**リポ直下のファイル**(`package.json` / `package-lock.json` /
   `tsconfig.base.json` / `.gitignore` / `.gitattributes`)は、どの unit を立てても帰属できない
   (空パスの unit は採点器が無視する)。本個体では ECO-001〜005 の実 diff に現れなかったため
   76 に含まれず、本 ECO の受入には影響しない。将来これらが変わる ECO では unmapped が再発する。
2. **`examples/`(2 ファイル)は未写像のまま**。order §1 の 4 系統に含まれず、実 diff にも
   現れていない。上記 1 と同じく将来の再発点。
3. **1 unit = 1 artifact path の制約**(裁定 1 の tsbuildinfo 混載・裁定 2 の M-SCHEMA-CONTRACT-014 の項)。
   **rev2 で残る唯一の provenance 混載**は `packages/<pkg>/tsconfig.tsbuildinfo`(鋳造物)が
   M-PKGDEF-*(著述)に同居する 1 件。解消には次のいずれかが要り、いずれも本 ECO のスコープ外:
   - (a) ref-v0 に `artifact.paths[]`(複数パス宣言)を入れる — スキーマ改訂。
     出力契約スキーマを M-CORE-OUTPUT-004 に戻せる利点もある
   - (b) 採点器に生成物パターン(除外/分離集計)を入れる — order §1 で明示的にスコープ外(別リポ裁定)
   - (c) `tsconfig.tsbuildinfo` を版管理から外す — `.gitignore` は bomdd/ 外につき本 ECO では触れない。
     ただし「ビルドキャッシュを版管理する必要があるか」は ECO-005 の under-inclusion の
     根本原因でもあり、単独 ECO の候補として記録する
4. **ViewPrism2 workspace 回帰(order §4 V3 の末項)は本 workspace で実施不能**
   (対象リポが同梱されていない)。設計者側で実施を要する。
5. `--test-unit` 分離(採点規約 v1 #4)は本測定では未使用。M-HARNESS-008 / M-ORACLE-009 を
   test-only として分離するかは採点の見せ方の裁定であり、本 ECO では**変更しない**
   (V1 の 111 不変条件と直交させるため)。
6. ~~**既存 unit への `depends_on` 追記はしていない**(rev2)~~ → **rev3 で解消(§8)**。
   差戻 2 回目(IA-03 = PARTIAL)で「既存 unit への変更を `depends_on` の追加行のみに限定して許可」
   の裁定が出たため、裁定 3 の基準を既存 8 unit へ**一貫適用**し 5 unit・9 エッジを追記した。
   検算根拠と、基準を満たさず**張らなかった**エッジの一覧は §8。

## 6. 採点(rev1 個体・製造後記入 — 2026-08-02・工場自己受入の実測)

> 本節は **rev1 個体**の採点記録であり、差戻後も書き換えない(測定の記録)。
> rev2 個体の実測は §7。V1 の受入値(unmapped 0 / real_under 111)は rev1・rev2 とも同一。

実測値(凍結採点器・変更後個体):

| 指標 | 予測(§4) | **実測** | 判定 |
|---|---|---|---|
| `decomposition.unmapped_files` | 0 | **0** | 的中 |
| `decomposition.mapped_under_files` | 111 | **111** | 的中 |
| `real_under_files` | 111(不変) | **111** | 的中 |
| `ecos_with_real_under` | 5 | **5** | 的中 |
| ECO 別 under(001/002/003/004/005) | 35/48/3/8/17 | **35/48/3/8/17** | 的中 |
| `hub_concentration` | BUILD-CORE 43 / ORACLE 27 / INGEST 18 / HARNESS 15 / SCHEMA 3 / CI 3 / CLI 2 | **同一** | 的中 |
| `over` 集合(全 ECO) | 不変 | **不変** | 的中 |
| `multi_unit_ecos` | 5 | **4** | **外れ** |
| lint(`--eco`)error / warn | 0 / 0 | **0 / 0** | 的中 |
| lint info | 180(+4) | **180**(追加は R-005 × M-BUILD-CORE-010 / M-BUILD-VIEWER-011 / M-CI-012 / M-SCHEMA-013 の 4 件のみ・既存 176 件は差分ゼロ) | 的中 |
| M-ORACLE-009 の R-005 孤立所見 | 出ない | **出ない**(M-CI-012 の depends_on が被参照を作る) | 的中 |
| `npm run build` | 0 エラー | **0 エラー** | 的中 |
| `node --test` | 118 pass(件数も不変) | **118 pass / 0 fail** | 的中 |
| `git status --porcelain` | bomdd/ のみ | **bomdd/ のみ**(32-mbom 変更・61 新設・51 追記) | 的中 |

- **under-inclusion: 0** — §2 で挙げなかった対象で変わったものは無い。
- **over-inclusion: 0** — §2 で「影響あり」に挙げた 3 ファイル(32-mbom / 61 新設 / 51 追記)が
  実際に変わった全てであり、挙げて変わらなかったものは無い。
- **影響なし予測の外れ 1 件(正直記載)**: `multi_unit_ecos` を **5 と予測したが実測 4**。
  原因は起草時の推論の誤り — ECO-003 の実変更 3 ファイルは**全て `oracle/`** であり、
  写像が付いた結果 `actual_units` は M-ORACLE-009 **1 件**にしかならない
  (「未写像が解消されれば必ず 2 unit 以上になる」と短絡した)。unmapped の解消は
  「unit 数を増やす」のではなく「unit を与える」操作であり、元から 0 unit だった ECO は 1 unit になる。
  受入条件(V1)には無関係な観察指標だが、予測を外した事実として記録する。
- **粒度の観察**: M unit は 8 → 13。`multi_unit_ecos` は 3 → 4 で、増分は **ECO-004**
  (従来は写像可能な 3 ファイルが全て 1 unit に寄っていたが、生成物 4 ファイルが
  M-BUILD-CORE-010 に付いて 2 unit になった)。従来「unit を跨がない ECO」に見えていたものは、
  実際には生成物・治具に触れていたのに写像不能だったために単一 unit に見えていた。
  影響分析の粒度統制(ハブ台帳)を使う前提として、**写像被覆が先に立つ**ことの実測。
- **ハブの入替わり**: 是正後の under 集中先 1 位は M-BUILD-CORE-010(43)・2 位 M-ORACLE-009(27)で、
  従来 1 位の M-CORE-INGEST-001(18)を上回る。ただしこれは「影響分析が生成物・治具を
  宣言に書いてこなかった」ことの写像であり、ソース unit のハブ性(写像の集中先)とは**別種**の指標である。
  生成物 unit・治具 unit を hub_concentration に混ぜたまま読むと「ハブ= core の入口」という
  従来の読みが機械的に上書きされ、誤読しうる。採点器側で生成物クラスを分離集計するか
  (`--test-unit` と同型の `--derived-unit`)は**別リポの裁定事項**(order §1 スコープ外)。
- **是正後に残る赤**: `real_under_files` は 111 のまま(本 ECO は 0 にしない)。
  これは正しい — 111 は「過去 5 ECO の影響分析が生成物・治具・CI・スキーマを宣言に書かなかった」
  という**過去の記録の事実**であり、台帳の写像を直しても過去の宣言は変わらない。
  本 ECO が消したのは「未知の変更先があるのに under 0 に見える」という**見出しの嘘**(unmapped)である。
- ずる報告: 4 件(51-cheat-log.md の CHEAT-ECO-006-F001〜F004)。実装は止めていない。

## 7. rev2 — 差戻 1 回目(独立検査 IA-ECO006-01〜04)の是正

> 別ベンダー独立検査(Codex fresh・read-only)が所見 5 件(high 0 / medium 4 / low 1)を提起し、
> 設計者側の突合で全件 CONFIRMED。うち工場帰属の 4 件を本 rev2 で是正した
> (IA-ECO006-05= 受入記録の revision 未固定は設計者側帰属・当方対象外)。

### 7.1 所見ごとの処置

| 所見 | 等級 | 指摘の要旨 | 処置 | 反映先 |
|---|---|---|---|---|
| **IA-ECO006-01** | medium | 鋳造 unit の path(`packages/core/` `packages/viewer/`)が過広。著述されたビルド入力まで吸収し「人手編集禁止」契約と矛盾・catch-all 化 | **受諾**。鋳造 unit を `packages/<pkg>/dist/` に限定し、著述側を M-PKGDEF-CORE-015 / M-PKGDEF-VIEWER-016 へ分離。provenance で切る規則 (A) を裁定 1 に明文化。残る混載 1 件(tsbuildinfo)はパス機構の限界として契約文に明示+§5-3 に解消 3 案 | 32-mbom(010/011 の path・015/016 新設)/ 61 §1 裁定 1 / §5-3 |
| **IA-ECO006-02** | medium | M-SCHEMA-013 が供与入力(ref-v0 スナップショット)と製造出力(plm-*.schema.json)を混載 | **受諾**。M-SCHEMA-013 を `schemas/ref-v0/`(供与)に縮小し、出力契約を M-SCHEMA-CONTRACT-014(`schemas/`・著述)へ分離 | 32-mbom(013 の path/name・014 新設)/ 61 §1 裁定 2 |
| **IA-ECO006-03** | medium | `depends_on` が不完全(viewer→core の実ビルド参照・CI→build unit)。かつ意味論が未裁定 | **受諾**。裁定 3 を新設し `depends_on` = 「再製造前に成立していなければならない unit」と宣言。実ファイル(`packages/viewer/tsconfig.json` の references / `package.json` の @bomdd/core / `ci.yml` の steps)で検算し 2 unit の宣言を補完 | 32-mbom(011/012 の depends_on・ヘッダ裁定 3)/ 61 §1 裁定 3 |
| **IA-ECO006-04** | low | oracle/ 非併合の結論は妥当だが根拠の事実記述「test/ は工場へ渡る」が 34-routing・40-work-order と不一致 | **受諾**。`test/` は供与物ではなく**工場が製造して納品する成果物**(40-work-order「製造対象」表・ROUTE-DELIVER output)。論拠を「供与境界が逆」→「**製造帰属が違う**(工場が作るもの vs 工場に見せずに工場を採点するもの)」へ差し替え。結論は不変 | 32-mbom(009 の notes)/ 61 §1 裁定 2 |

所見はいずれも**製造物の欠陥**であり、指摘は 4 件とも正確だった。反論・部分不受諾はない。

### 7.2 rev2 の予測と実測(是正設計時に導出 → 実行)

| 指標 | rev1 実測 | **rev2 予測** | **rev2 実測** | 判定 |
|---|---|---|---|---|
| `decomposition.unmapped_files` | 0 | 0(不変) | **0** | 的中 |
| `real_under_files` | 111 | 111(不変) | **111** | 的中 |
| ECO 別 under(001〜005) | 35/48/3/8/17 | 同一(unit の切り方は写像先を変えるだけ) | **35/48/3/8/17** | 的中 |
| `hub_concentration` の変化 | BUILD-CORE 43 | BUILD-CORE **39** + PKGDEF-CORE **4**(= tsbuildinfo の 4 ECO 分が分離) | **39 / 4** | 的中 |
| `over` 集合(全 ECO) | 不変 | 不変(新 unit は既存 ECO の pred に入らない) | **不変** | 的中 |
| lint error / warn | 0 / 0 | 0 / 0 | **0 / 0** | 的中 |
| lint info | 180 | **179**(孤立は M-CI-012 / M-SCHEMA-013 / M-SCHEMA-CONTRACT-014 の 3 件。010/011 は M-CI-012 の depends_on で、015/016 は 010/011 の depends_on で被参照になり孤立が解ける) | **179**(追加は上記 3 件のみ・既存 176 件は差分ゼロ) | 的中 |
| `npm run build` / `node --test` | 0 / 118 pass | 不変 | **0 / 118 pass・0 fail** | 的中 |
| `git status --porcelain` | bomdd/ のみ | bomdd/ のみ | **bomdd/ のみ**(32-mbom / 51 / 61) | 的中 |

rev2 実測の全文: `hub_concentration` = `M-BUILD-CORE-010:39 / M-ORACLE-009:27 /
M-CORE-INGEST-001:18 / M-HARNESS-008:15 / M-PKGDEF-CORE-015:4 / M-SCHEMA-013:3 /
M-CI-012:3 / M-CLI-005:2`(合計 111)。`multi_unit_ecos` = 4(rev1 と同じ)。

> **孤立(R-005 info)の減少は副作用であって目的ではない。** 追加した `depends_on` は
> IA-03 の是正として**実ファイルの値から検算した真の前提**であり、
> 検査を黙らせるために張った参照ではない(rev1 の 51 CHEAT-ECO-006-F004 で宣言した規律を維持)。
> 残る 3 件の孤立は「台帳上の消費者を持たない葉」であり、消すには既存 unit の改変(§5-6)が要る。

### 7.3 register(60-change-register.yaml)側で必要になる追随

本 workspace の register は起票時のままだが、実リポでは ECO-006 の `affected_refs` に
rev1 の新 unit 5 件が追記済みと聞いている。rev2 では **改名 0・削除 0・追加 3** なので、
追随は**加算のみ**で足りる:

| 項目 | 内容 |
|---|---|
| 追加が必要 | `M-SCHEMA-CONTRACT-014` / `M-PKGDEF-CORE-015` / `M-PKGDEF-VIEWER-016` |
| 不要 | 既存 5 件(M-ORACLE-009 / M-BUILD-CORE-010 / M-BUILD-VIEWER-011 / M-CI-012 / M-SCHEMA-013)は **ID 不変**。`artifact.path` と `name` は変わったが ID は変えていない |
| 採点への影響 | なし。ECO-006 のコミットは bomdd/ のみ = 採点器は `doc_only` として skip する(`actual` が空)。他 ECO の `pred` は各自の affected_refs から作られるため影響しない |
| R-051 | 追記する 3 件は 32-mbom に定義済みにつき解決可(未追記でも R-051 は green — 追記漏れは検出されない。これは R-051 が「書いた ID が解決するか」だけを見て「書くべき ID を書いたか」を見ないため。観察として記録) |

> **rev3 での更新なし** — rev3 は既存 unit への `depends_on` 追記のみで unit の増減・改名が無いため、
> register 追随は §7.3 の 3 件(rev2 由来)から**変わらない**。

## 8. rev3 — 差戻 2 回目(IA-ECO006-03 = PARTIAL)の是正: 裁定 3 の既存 unit への一貫適用

> 再検査(Codex fresh・対象 e876e81)で IA-01/02/04/05 は CLOSED、宣言済み残余(tsbuildinfo)は
> 現物一致で受理。**IA-03 のみ PARTIAL** — 裁定 3 の意味論を既存 unit へ適用した場合に必要な
> エッジが未追記だったため(rev2 の §5-6 で工場自身が「後続 ECO の候補」として先送りしていた箇所)。
> 差戻 2 回目で「既存 unit への変更を `depends_on` の**追加行のみ**に限定して許可」の裁定が出たので、
> 基準を一貫適用して補完した。**他のフィールド・文言は 1 文字も変えていない**
> (`git diff --numstat` = `176 0` — **削除 0** が機械証明)。

### 8.1 適用した基準(裁定 3 の運用形)

> `depends_on` = 「この unit を**再製造する前に成立していなければならない** unit」。
> **推移閉包は取らない**(A→B→C のとき A→C は書かない)。
> 張ってよいのは**検算できるものだけ**。証拠は 2 等級に分けて明示する:
>
> - **根拠 A(直接)**: その unit **自身の artifact 配下のファイル**が、相手 unit の artifact を
>   実参照している(import / tsconfig references / package.json dependencies / パス解決)。
> - **根拠 B(受入経由)**: その unit の宣言済み `acceptance_refs`(CP)の test vector が、
>   相手 unit の artifact を読む。**A が原理的に取れない場合の代替**であり、A があるなら A を使う。
> - **(C) 妥当性条件 — 非循環(rev4 で追加)**: `depends_on` は製造順序の前提であるから、
>   グラフは**非循環**でなければならない(循環があれば「先に成立しているべき順序」自体が
>   定義できず、宣言が意味を失う)。**A/B のいずれで候補が立っても、相手 unit から自 unit への
>   既存経路がある場合は張らない。** 自己ループ(U→U)も同様。
>   等級 A/B は**証拠の強さの表示**であって、エッジの採否は (C) が決める。

**(C) の根拠(なぜ棄却が正当か)**: 受入 vector が「自 unit の成果物を焼いたもの」やその下流
(鋳造物 → CLI → 治具)を読むのは、**自己受入の構造**そのものである — 自分を焼き、焼いたもので
自分を検査する。これは「再製造の前に**別の unit** が成立していること」ではなく、同じ unit の
製造・検査サイクルの内側の話であり、製造順序の前提ではない。実際 M-BUILD-CORE-010 は
rev2 から M-CORE-INGEST-001/GRAPH-002/RULES-003/OUTPUT-004 に `depends_on` しており、
逆向きを足せば 2-循環になって「どちらを先に作るか」が決まらなくなる。
(C) を置くことで基準は**閉じる** — 検算は §8.4。

### 8.2 追記した depends_on 全 11 エッジ(検算根拠つき)

> rev4(第 3 回検査の指摘 1)で **#10・#11 を追加**した。指摘は正確である —
> §8.1 の根拠 A の定義(自 artifact から相手 artifact への実参照)に照らすと、
> `packages/cli/tsconfig.json` の `references` が指すのは参照先の **tsconfig.json 実体**であり、
> `package.json` の `dependencies` が要求する name+version を宣言しているのは参照先の
> **package.json 実体**である。いずれも M-PKGDEF-* の所有物であって、鋳造物(dist)ではない。
> 「推移閉包を取らない」では棄却できない(**同一の直接参照が 2 unit の artifact に跨っている**だけで、
> 経路の圧縮ではないため)。M-CI-012 が BUILD と PKGDEF の両方を直接宣言している前例とも整合する。

| # | from(既存 unit) | to | 等級 | 検算根拠(ファイル:行) |
|---|---|---|---|---|
| 1 | **M-CLI-005** | M-BUILD-CORE-010 | A | `packages/cli/tsconfig.json` の `references: [{ "path": "../core" }, …]` / `packages/cli/package.json` の `dependencies: { "@bomdd/core": "0.0.0" }` / `packages/cli/src/main.ts:16-17`・`src/text.ts:4-6` の `import … from "@bomdd/core"`。`packages/core/package.json` の `"main": "./dist/index.js"` により、この import が解決する実体は**鋳造出力**である |
| 2 | **M-CLI-005** | M-BUILD-VIEWER-011 | A | `packages/cli/tsconfig.json` の `references: [… , { "path": "../viewer" }]` / `package.json` の `dependencies: { "@bomdd/viewer": "0.0.0" }` / `src/main.ts:18` `import { generateView } from "@bomdd/viewer"`。`packages/viewer/package.json` も `"main": "./dist/index.js"` |
| 3 | **M-CLI-005** | M-SCHEMA-013 | A | `packages/cli/src/main.ts:22-27` `defaultSchemaDir()` が `<repo-root>/schemas/ref-v0` を解決(`join(here, "..","..","..","schemas","ref-v0")`)。`main.ts:51` の --help に「`--schema <DIR>` ref-v0 スキーマの場所 (既定: 同梱)」 |
| 4 | **M-HARNESS-008** | M-CLI-005 | A | `test/helpers/run-cli.js:10` `CLI_MAIN = join(REPO_ROOT,"packages","cli","dist","main.js")`。この helper は 23 テストが `from "./helpers/run-cli.js"` で参照する(test/ 内の import 集計) |
| 5 | **M-HARNESS-008** | M-BUILD-CORE-010 | A | `test/discover.test.js:5` / `gate.test.js:5` / `messages.test.js:6` / `resolve.test.js:5` / `schema-load.test.js:6` の `import … from "@bomdd/core"`(= `packages/core/dist/index.js`) |
| 6 | **M-HARNESS-008** | M-SCHEMA-013 | A | `test/discover.test.js:9` / `gate.test.js:10` / `resolve.test.js:9` の `SCHEMA_DIR = join(REPO_ROOT,"schemas","ref-v0")`・`schema-load.test.js:11` の `loadSchema(join(REPO_ROOT,"schemas","ref-v0"))` |
| 7 | **M-CORE-INGEST-001** | M-SCHEMA-013 | B | 受入 `CP-DISCOVER-002` の test vector = `test/discover.test.js:9` が `schemas/ref-v0` を読む |
| 8 | **M-CORE-GRAPH-002** | M-SCHEMA-013 | B | 受入 `CP-SCHEMA-004` / `CP-RESOLVE-005` の vector = `test/schema-load.test.js:11`・`test/resolve.test.js:9` が `schemas/ref-v0` を読む |
| 9 | **M-CORE-RULES-003** | M-SCHEMA-013 | B | 受入 `CP-GATE-008` の vector = `test/gate.test.js:10` が `schemas/ref-v0` を読む |
| **10** | **M-CLI-005** | **M-PKGDEF-CORE-015** | A | `packages/cli/tsconfig.json` の `references[0] = { "path": "../core" }` — TS プロジェクト参照はディレクトリ指定時に参照先の **`tsconfig.json`** を解決する(= `packages/core/tsconfig.json`)。加えて `packages/cli/package.json` の `dependencies["@bomdd/core"] = "0.0.0"` が要求する **name と version を宣言している実体**は `packages/core/package.json`。いずれも M-PKGDEF-CORE-015 の artifact(`packages/core/` のうち src/・dist/ を除く部分) |
| **11** | **M-CLI-005** | **M-PKGDEF-VIEWER-016** | A | 同型 — `packages/cli/tsconfig.json` の `references[1] = { "path": "../viewer" }` → `packages/viewer/tsconfig.json` / `dependencies["@bomdd/viewer"] = "0.0.0"` → `packages/viewer/package.json` |

**#7〜#9 が根拠 B になる理由(重要)**: core の実装は `schemas/ref-v0` への**パスを持たない**。
`packages/core/src/schema/types.ts:1` が「Parsed ref-v0 schema shapes (§2.3). **Loaded at runtime;
never baked into code (INV-007)**」と宣言するとおり、パスを焼き込まないことが不変条件だからである
(実装が読むのは ref-v0 が定めた**キー名** — `schema/load.ts:229-230` の `grammar_version` /
`edges_version`、`load.ts:138` の `uniqueness_scope`)。
したがって根拠 A は**原理的に取得できず**、「その unit が自己受入を通るために ref-v0 スナップショットの
実在を要する」という受入経由の根拠で張る。この等級差を隠さず宣言することが本節の主旨である。

### 8.3 基準を満たさず**張らなかった**エッジ(一貫適用の反証側)

**(i) 証拠が取れないので張らない**(A も B も成立しない)

| 張らなかったエッジ | 理由(検算結果) |
|---|---|
| M-CORE-OUTPUT-004 → M-SCHEMA-013 | 受入 `CP-OUTPUT-010` の vector(`output-determinism` / `ledger` / `sarif`)に `schemas/ref-v0` を読むものが無い(参照 test は 4 ファイルのみ・全数 grep) |
| M-CORE-OUTPUT-004 → M-SCHEMA-CONTRACT-014 | `packages/core/src` は `schemas/plm-*.schema.json` を読まない(`output/build.ts:79/134/153` は `schemaVersion` 文字列リテラルを**書く**だけ)。※ 仮に候補が立っても rev2 の逆向き宣言により (C) で棄却される |
| M-VIEWER-GEN-006 / M-VIEWER-UI-007 → M-BUILD-CORE-010 | `packages/viewer/src` に `@bomdd/` の import が**無い**(`index.ts:1` のコメント 1 行のみ)。受入 vector(`viewer` / `l1-smoke` / `trace-datasource`)も `@bomdd/core` を import しない = **A も B も不成立**(この 2 エッジは (C) では棄却できないので、証拠不在で落ちることが効いている) |
| M-HARNESS-008 → M-BUILD-VIEWER-011 | `test/` に `@bomdd/viewer` も `viewer/dist` の参照も無い(全数 grep)。viewer には CLI 経由でしか到達しない |
| M-CORE-* → M-PKGDEF-CORE-015 | ソース unit の artifact(`packages/core/src`)は `package.json` / `tsconfig.json` を参照しない。構成を要求するのは**鋳造手順**であり M-BUILD-CORE-010 の前提として宣言済み |

**(ii) 証拠は立つが (C) 非循環条件で棄却**(rev4 で明文化。§8.4 の機械検査で全数確認)

| 張らなかったエッジ | 既存の逆経路 |
|---|---|
| M-CORE-INGEST-001 / GRAPH-002 / RULES-003 → M-BUILD-CORE-010 | `M-BUILD-CORE-010 → M-CORE-*`(rev2 で宣言済み) |
| M-CORE-INGEST-001 / GRAPH-002 / RULES-003 / OUTPUT-004 → M-CLI-005 | `M-CLI-005 → M-BUILD-CORE-010 → M-CORE-*` |
| M-VIEWER-GEN-006 / M-VIEWER-UI-007 → M-CLI-005 | `M-CLI-005 → M-BUILD-VIEWER-011 → M-VIEWER-*` |
| M-CLI-005 → M-CLI-005 | 自己ループ |

> これらはいずれも「受入 vector が `@bomdd/core`(= 自分たちを焼いた dist)や CLI・治具を読む」形であり、
> **自己受入の構造**であって製造の前提ではない(§8.1 (C) の根拠)。

### 8.4 基準が閉じていることの機械検査(rev4)

第 3 回検査の指摘 2「**基準が自分の規則の下で閉じていること**が受理条件」に対する検算。
作業用治具 `<workspace>/out/closure-check.py`(**リポ外・納品物ではない**)で 2 点を機械検査した:

1. **DAG 検査** — 32-mbom の `depends_on` グラフに循環が無いこと(深さ優先の灰色検出)。
   → **PASS(循環なし)**。(C) が満たされている = 製造順序が定義できる。
2. **根拠 B 候補の全数処理** — `acceptance_refs` を持つ 7 unit について、受入 vector ファイル
   (unit ごとに名前で明示割当)の中身を実測して相手 artifact への実参照を検出し、
   立った候補が **「宣言済み」/「自己」/「(C) で棄却」のいずれかに必ず分類され、
   規則で処理されない残余がゼロ**であることを検査。
   → **PASS(残余ゼロ)**。内訳= 宣言済み 3(core 3 unit → M-SCHEMA-013)・
   自己 1(M-CLI-005)・(C) 棄却 9。

検出シグネチャ(実参照 → 所有 unit): `from "@bomdd/core"` → M-BUILD-CORE-010
(`packages/core/package.json` の `"main": "./dist/index.js"` による)/ `from "@bomdd/viewer"` →
M-BUILD-VIEWER-011 / `helpers/run-cli`・`cli/dist` → M-CLI-005(`run-cli.js:10`)/
`schemas/ref-v0` → M-SCHEMA-013。

> **限界の明示**: CP → test vector ファイルの写像は 33-control-plan が散文(`test_vectors:` が
> シナリオ名の列)のため機械可読でなく、治具では **unit ごとにファイル名で明示割当**している
> (割当表は治具のソースに記載)。この割当が誤っていれば検査も誤る。
> `test_vectors` の機械可読化(ファイル参照化)は本 ECO のスコープ外 — §5 に準じる観察として記録し、
> ずる CHEAT-ECO-006-F010 に挙げる。

### 8.5 rev3 / rev4 の実測(自己受入)

| 指標 | rev2 | **rev3 予測** | **rev3 実測** | 判定 |
|---|---|---|---|---|
| `decomposition.unmapped_files` | 0 | 0(`depends_on` は写像に無関係) | **0** | 的中 |
| `real_under_files` | 111 | 111 | **111** | 的中 |
| `hub_concentration` | 8 unit・合計 111 | 完全不変 | **完全不変**(BUILD-CORE 39 / ORACLE 27 / INGEST 18 / HARNESS 15 / PKGDEF-CORE 4 / SCHEMA-013 3 / CI 3 / CLI 2) | 的中 |
| lint error / warn | 0 / 0 | 0 / 0(追加先 9 件は全て定義済み ID) | **0 / 0** | 的中 |
| lint info | 179 | **178**(M-SCHEMA-013 が 4 unit から被参照になり孤立が解ける。M-CI-012 / M-SCHEMA-CONTRACT-014 は孤立のまま) | **178**(M-* 孤立は `M-CI-012` / `M-SCHEMA-CONTRACT-014` の 2 件) | 的中 |
| build / test | 0 / 118 pass | 不変 | **0 / 118 pass・0 fail** | 的中 |
| `git diff --numstat`(32-mbom) | 158 追加 / **0 削除** | 追加のみ | **176 追加 / 0 削除** | 的中 |

**rev4(第 3 回検査の是正後)の実測** — 追加は A エッジ 2 本と裁定 3 の (C) 明文化のみ:

| 指標 | rev3 | **rev4 予測** | **rev4 実測** | 判定 |
|---|---|---|---|---|
| `decomposition.unmapped_files` / `real_under_files` | 0 / 111 | 0 / 111(`depends_on` は写像に無関係) | **0 / 111** | 的中 |
| `hub_concentration` | 8 unit・合計 111 | 完全不変 | **完全不変**(BUILD-CORE 39 / ORACLE 27 / INGEST 18 / HARNESS 15 / PKGDEF-CORE 4 / SCHEMA-013 3 / CI 3 / CLI 2) | 的中 |
| lint error / warn | 0 / 0 | 0 / 0(追加先 2 件は定義済み ID) | **0 / 0** | 的中 |
| lint info | 178 | **178**(M-PKGDEF-* は既に M-BUILD-*/M-CI-012 から被参照= 孤立でない。孤立の増減なし) | **178**(M-* 孤立は `M-CI-012` / `M-SCHEMA-CONTRACT-014` の 2 件で不変) | 的中 |
| build / test | 0 / 118 pass | 不変 | **0 / 118 pass・0 fail** | 的中 |
| `git diff --numstat`(32-mbom) | 176 追加 / **0 削除** | 追加のみ | **194 追加 / 0 削除** | 的中 |
| DAG 検査 / 閉性検査(§8.4) | (未実施) | PASS / PASS | **PASS(循環なし)/ PASS(残余ゼロ)** | 的中 |

`git status --porcelain` は `M bomdd/32-mbom.yaml` / `M bomdd/51-cheat-log.md` /
`?? bomdd/61-impact-analysis-eco-006.md` の 3 行(bomdd/ のみ)。

> **設計者追記(2026-08-02・第 4 回独立検査 NEW-IA03-01 の是正 — 追記のみ・上表は工場記録として
> 非改竄)**: 上表 §8.5 の lint info 値(178・M-* 孤立 2)は**工場 workspace 段階**(register が
> 起票時のまま= 新 unit 追随前)の実測である。**最終統合個体(register 追随済み・fix4= 6ef20f7)の
> 実測は info 176・M-* 孤立 0**(order §5 追記 3 と一致・検査官の書込みなし API 再測定でも 176)。
> 段階ラベルの欠落は IA-05/NEW-01 と同族(3 例目)の記録不整合であり、本追記で固定する。

> **削除 0** は「既存 unit の他フィールド・文言を 1 文字も変えていない」ことの機械証明である
> (追記は既存行の間への挿入のみで、既存行の書き換えを含まない)。
> rev4 で M-CLI-005 の `depends_on` 行を書き換えているが、この行自体が rev3 で新規追加した行であり
> HEAD には存在しない — したがって HEAD 比較では依然として削除 0 が成立する。
