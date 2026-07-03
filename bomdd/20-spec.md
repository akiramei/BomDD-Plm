# 仕様書 — BomDD-Plm v0(bomdd-lint + read-only viewer)

> 製造パッケージに含まれる(製造装置が読む)。REQ への双方向トレースは §5。
> **併読規約**: 本書は入力仕様 **ref-v0**(`BomDD/method/schemas/draft/` — id-grammar / ref-edges /
> bomdd-ref.draft.schema.json)と併読する。R-* 規則の正体・severity・gate・note、family 37種と
> strictness、defines/refs セレクタの定義は **ref-v0 が正**であり、二重管理を避けるため本書へ転記しない。
> 併読対象は他に: UI-CAD 一式(`bomdd/ui/mock/bomdd-plm-viewer.html`=モック M1・`bomdd/ui/viewer/*`)と
> 正準文言表(`bomdd/rule-messages.yaml`)。基準 workspace の規模数値は §2.16 に転記済み(出典は設計者側資料)。
> 製造パッケージには ref-v0 スナップショット・UI-CAD 一式・rule-messages.yaml を同梱する。
> rev: **rev3**(2026-07-03 — ECO-002: §2.17 新設 R-052 diff-audit(git 連携・diff_audit opt-in)+
> §2.9/§2.10 SARIF 追加出力(--sarif)+§2.4 受理形3の repo 不在= X-XREPO skip へ改訂。ref-v0.7 に追随)
> rev2(2026-07-03 — ECO-001: §2.4 パス受理形3種の明文化(PD-7/PD-8)+§2.5 per-file 一意性スコープ。
> ref-v0.4 に追随)
> rev1(2026-07-03 — 初回製造2工場の差分帰属による補正: targetId 意味論・R-002 カウント規約・
> ref-v0.2 の専用規則エッジ/candidate fallback に追随)

## 1. 概要と用語

BomDD 成果物リポジトリを直読し、参照整合を検査(lint)して人間向け読み取り専用ビューを生成する工具。
パッケージ構成は core(判定+JSON生成)/ cli / viewer(DEC-0002)。

| 用語 | 定義 |
|---|---|
| workspace | `bomdd-workspace.yaml` で束ねた複数リポの集合。**単一リポ実行は「repos 1件・suppress なしの暗黙 workspace」と等価**(cross_repo 参照の扱いは §2.5) |
| family | ID の品番ファミリー(id-grammar の 37 families)。strictness = strict / advisory / reserved |
| 定義サイト | ref-edges `defines` セレクタが指す、ID が生まれる場所 |
| 参照エッジ | ref-edges `refs` セレクタが指す、ID・パスを参照するフィールド |
| 所見(finding) | 1件の検査結果。rule・severity・gate・位置・対象・メッセージ・是正先を持つ |
| ゲート | 規則の適用段階。**梯子 always→G1→G3→freeze→acceptance(後段は前段を含む)+直交フラグ eco** |
| 抑制(suppress) | 理由付きで所見を info へ降格する宣言。削除ではない |
| 正準パス | **`<repo.name>/<リポ内相対パス>`**・`/` 区切り・原表記(INV-004)。単一リポ実行時の repo.name= 対象ディレクトリ名。出力・ソート・suppress 照合は全て正準パスで行う(例 `ViewPrism2/bomdd/30-ebom.yaml`) |

## 2. 機能仕様

### 2.0 正本直読・read-only 原則 (REQ-001, REQ-002)
- 仕様節ID: SPEC-READONLY-001
- 振る舞い:
  - 実行のたびに対象リポを直読する。永続キャッシュ・DB・ミラーを一切持たない。
  - 対象リポ配下へはいかなるファイルも作成・変更・削除しない。
  - 出力先: `--out DIR`(カレントディレクトリ基準の相対または絶対)。省略時は `./plm-out/`。
    **明示・省略を問わず**、出力先が workspace 内いずれかのリポ配下を指す場合は exit 2 で拒否する。
  - 一時ファイルが必要な場合は OS 標準 temp を使い正常・異常終了とも削除する。
- 核/表面: core
- 受入観点: L3 — 実行前後で対象リポ全ファイルの **SHA-256** 不変+終了後の残留物が出力先配下のみ。
- E-BOM 候補: E-CORE-READONLY-001 / M-BOM 候補: M-CORE-001 / Control Plan 候補: CP-READONLY-001

### 2.1 成果物の発見 (REQ-003)
- 仕様節ID: SPEC-DISCOVER-001
- 振る舞い:
  - 各リポの `bomdd/` 配下を ref-edges `artifacts[].file` の glob で走査し型付けする。
    **1ファイル=1型**。複数パターンに一致する場合は `artifacts[]` **配列の記載順で最初**の型に確定する。
  - glob は `**`(ディレクトリ再帰)と `*`(1セグメント内)のみをメタ文字とし、
    その他の文字(`?` `[` 等)は**リテラル**として扱う。パターン照合は case-sensitive。
  - パターン外のファイルは対象外(所見なし・stats.files に数えない)。
- 核/表面: surface(出所: ref-v0 ref-edges)
- 受入観点: unit — 既知構成 fixture で「発見ファイル→型」の写像が完全一致(exact)。
- E-BOM 候補: E-CORE-DISCOVER-002 / CP 候補: CP-DISCOVER-002

### 2.2 頑健パースと寛容受理 (REQ-004, REQ-005)
- 仕様節ID: SPEC-PARSE-001
- 振る舞い:
  - YAML/JSON 構文エラー・**UTF-8 として不正なバイト列**は、いずれも **rule `X-PARSE-001`・
    severity error** の所見(行・列・原因)として報告し、当該ファイルをスキップして継続する。
    プロセスはクラッシュしない(未捕捉例外で exit 2 になったら欠陥)。
  - 既知の記述罠は X-PARSE-001 の message 末尾に `hint: <回避策>` の1行を付ける。対象3型(規範として本書に転記。出所: plm-intake/yaml-authoring-traps.md):
    | 罠 | ヒント文言(正準) |
    |---|---|
    | リスト項目が `*` で始まる | hint: `*` 始まりの項目は引用符で囲む |
    | 複数行 plain scalar 中の行末コロン | hint: 行末の `:` を含む文は `>-` ブロックにするか引用符で囲む |
    | 引用符で始まり後続テキストが続く項目 | hint: 項目全体を引用符で囲むか、引用符を先頭から外す |
    パターン非該当の構文エラーは hint なしで報告する(ヒントは付加情報であり必須要素ではない)。
  - 未知フィールドは無視(所見なし)。ref-v0 が型を規定するフィールドの型不一致は
    **rule `X-TYPE-001`・severity warn**(型の正= ref-edges のセレクタ/kind 注記による簡易型検査。
    bomdd-ref.draft.schema.json による厳密検証は設計者側治具の責務であり製品の実装対象外)。
  - 入力: UTF-8(BOM 許容)・CRLF/LF 混在可。行番号=1起点・改行形式非依存。列=1起点・code point 単位。
- 核/表面: core(罠ヒント文言のみ K-BOM 転記=surface)
- 受入観点: unit — 壊れ入力コーパス全件で「クラッシュ0・X-PARSE 所見1件以上・行列位置あり・
  他ファイル処理継続」。罠3型は hint 文言まで期待値固定。
- E-BOM 候補: E-CORE-PARSE-003 / CP 候補: CP-PARSE-003

### 2.3 スキーマの実行時読込 (REQ-006)
- 仕様節ID: SPEC-SCHEMA-001
- 振る舞い:
  - id-grammar / ref-edges を実行時に `--schema <dir>` から読み込む(既定: 同梱スナップショット。
    S-BOM が版を追跡)。family・pattern・エッジ・規則パラメータをコードに焼き込まない。
  - **exit 2 とする境界**: スキーマファイルが読めない/YAML として不正/必須トップキー
    (`families` / `artifacts` / `lint_rules`)が欠落 — 検査せず終了。
  - **X-SCHEMA-001(error)で続行する境界**: スキーマは読めるが、個別エントリの selector 記法・
    family_pattern 正規表現が本実装で未対応 — 当該エントリのみ無効化し、黙って無視しない。
  - family_pattern は **JS RegExp(ECMAScript)方言**で解釈する(ref-v0 側の前提として記録済み)。
- 核/表面: core
- 受入観点: unit — family 追加・pattern 変更・未対応記法の3 fixture で「再ビルドなしの追随・
  X-SCHEMA-001・exit 2」の3分岐が期待どおり(exact)。
- E-BOM 候補: E-CORE-SCHEMA-004 / CP 候補: CP-SCHEMA-004

### 2.4 ID 索引と参照解決 (REQ-007)
- 仕様節ID: SPEC-RESOLVE-001
- 振る舞い:
  - **family 判定**: id-grammar 定義順に ①family_pattern を持つ family の pattern 一致 →
    ②prefix 最長一致。同長 tie は id-grammar 定義順の先勝ち。どの family にも一致しない定義値は `X-ID-001`(warn)。
  - **参照解決**(kind 語彙は ref-v0.1 凡例と一致):
    - `kind: path` — パス値の実在を検査。不解決=当該エッジの severity で **R-004** 所見。
    - **パス値の受理形(rev2・ref-v0.4。kind: path / id-or-path の② / path-at-rev のパス部に共通)**:
      1. 正準形 `<repo名>/<リポ内相対>` — 先頭セグメントが workspace 内 repo 名に一致する場合、当該 repo からの相対で実在検査。
      2. repo 相対形 `<リポ内相対>`(repo 名なし)— workspace 内の**いずれかの** repo からの相対で実在すれば解決。
         **セグメント数を問わない**(単一セグメント値 `test`・`single.md` も対象)。**file / dir を問わない**(存在検査)。
      3. repo: 形 `<repo名>:<リポ内相対>` — 正準形と**等価**(`:` を `/` に読み替える)。repo 名が workspace に不在なら
         **X-XREPO-001(info)で skip**(rev3・ECO-002: ID 参照の cross_repo と同じ意味論 — repo: 前置は書き手による
         cross-repo の明示であり、対象リポ不在の環境では検査不能= 単一リポ実行を error で汚さない)。
         この skip は**パス解決を行う全経路に共通**: kind: path / path-at-rev / id-or-path の② /
         trace_links エンドポイント(R-041)のパス fallback(受入時明記 — 工場2体がここで分岐した未規定次元。採用実装は全経路適用)。
         形式2 へはフォールバックしない(repo 名の明示は書き手の意図)。repo 名が実在しパスが不在の場合は従来どおり R-004。
      正準形の先頭セグメントが repo 名に一致しない場合は形式2 として扱う(全リポ相対で試行)。
      受理形は**解決(受理)の規定**であり、出力・ソート・suppress 照合の正準化(INV-004 の形式1)は変えない。
    - ID 参照(kind 無指定)— 対象 family の索引で解決。不解決=エッジ severity で **R-003** 所見。
    - `kind: id-or-path` — ①いずれかの family_pattern/prefix に一致すれば ID として索引を引く。
      **索引に無ければ ②へフォールバック**。②値をパスとして実在検査(受理形は上記3種)。**①②両方失敗のとき初めて不解決**
      (R-003 所見)。family 一致かつ実在パスの場合は ID 解決を優先する。
    - **ID 形は skip しない(ECO-003 文書化・2026-07-03)**: X-XREPO-001 skip は書き手による
      cross-repo 意図の明示 — `repo:` 前置(受理形3)またはエッジ宣言 `cross_repo: true`(§2.5)—
      がある場合に限る。意図の明示を持たない ID 形(id-or-path の①分岐・trace_links[].from/to の
      ID 形エンドポイント= R-041)は、対象 family が workspace に不在でも skip せず従来どおり
      R-003 / R-041 で所見化する(過剰受理の回避。是非の裁定= ECO-003 CH-B・akira 2026-07-03)。
      なお 10-requirements の trace_links[].from/to は id-or-path エッジ宣言と R-041 スキャンの
      両方に載るため、不解決 ID は R-003+R-041 の両所見になる(現行挙動として S-25 が固定)。
    - `kind: path-at-rev` — `パス@rev` の パス部のみ存在検査(@rev は無視)。
    - `severity: none` のエッジ — 解決検査しない(表示・記録用)。
    - `パス#断片` は断片を無視しパス部のみ検査。
  - **trace_id の分散定義**: ref-v0.1 `distributed_defines` に従い、全成果物の trace_links[].trace_id を
    TL family の定義として収集する(R-002 の一意性検査対象)。
  - **candidate 定義**(ref-v0.2): `candidate: true` の定義サイト(例 35 の ebom_surface_parts・
    60-*.md ファイル名)は R-002 の対象外。**正定義が存在しない ID に限り fallback として索引に登録する**
    (register の無いリポでも ECO 参照が解決できる)。R-021 が 35↔30 の同期を検査する。
  - **専用規則エッジ**(ref-v0.2): エッジに `rule`/`gate` の上書きがある場合(例 change-register の
    affected_refs = R-051/eco)、当該エッジの不解決は汎用 R-003 でなく指定規則・指定ゲートでのみ所見化する。
  - **ID トークンの切り出し**: 文字列中の ID 照合は `[A-Za-z0-9._-]+` の連続を1トークンとし、
    family_pattern / prefix はトークン全体に対する**最長(貪欲)一致**で判定する
    (`ECO-001-child` は1トークン=1 ID であり `ECO-001` と `child` に分割しない)。
  - **散文(.md)の扱い**: 定義サイトとしての抽出は (a) ECO ファイル名 — 拡張子を除いたファイル名の
    **右端で family ID パターンに一致するトークン列を大文字化**して ID とする(`60-change-order-eco-025.md` → `ECO-025`)、
    (b) cheat-log 見出し — §2.15 と同一の見出し抽出機構(共通実装)による。
    **散文の本文(非見出し)からは ID を抽出しない**(定義にも参照にも表示にも使わない。
    id-inventory の誤検出 132 件の対策)。R-003 の検査対象は ref-edges に定義された参照エッジのみ。
- 核/表面: surface(出所: ref-v0)
- 受入観点: unit — fixture で定義数・解決数・不解決数・各所見(rule 込み)の完全一致(exact)。
  id-or-path は「ID解決/ paス解決/ フォールバック/ 両失敗」の4分岐を fixture 化。
- E-BOM 候補: E-CORE-RESOLVE-005 / CP 候補: CP-RESOLVE-005

### 2.5 workspace 解決 (REQ-009)
- 仕様節ID: SPEC-WORKSPACE-001
- 振る舞い:
  - `bomdd-workspace.yaml` 書式: `repos: [{name, path, role: ui-cad|manufacturing|method}]` +
    `suppress:`(§2.8)。`path` は **workspace ファイル位置基準**の相対または絶対。
  - `cross_repo: true` のエッジは workspace 内全リポの索引で解決する。
    **解決先候補リポ(エッジの対象 family の定義サイトを持つ他リポ)が workspace に存在しない場合**
    (単一リポ実行を含む)、当該エッジは **info `X-XREPO-001`(skip)**。これは用語表の
    「単一リポ=暗黙 workspace」と整合する(暗黙 workspace には他リポが無いから skip になる)。
  - 単一リポで suppress を使いたい場合は repos 1件の workspace ファイルを書く(専用機構は設けない)。
  - **ID 一意性(R-002)は workspace 全体で family ごとに適用**。別リポ間の同 family 同 ID も R-002(error)。
  - **per-file 一意性スコープ(rev2・ref-v0.4)**: 定義サイト宣言に `uniqueness_scope: per-file` がある場合
    (ref-v0.4 では ui-ir.json の tempPartNo / uiId)、その定義サイト由来 ID の R-002 は**抽出ファイル単位**で判定する —
    同一ファイル内の重複のみ R-002(error)、**別ファイル間の同名は合法**(画面別 IR の独立採番)。
    ID 索引(参照解決)への登録は従来どおり workspace 全域=索引に存在すれば解決
    (per-file が変えるのは R-002 の重複判定スコープのみ)。宣言のない定義サイトは従来どおり全域。
- 核/表面: surface(出所: ref-v0 workspace 節)
- 受入観点: unit — 2リポ fixture で解決/skip/R-002 衝突の3分岐(exact)。
- E-BOM 候補: E-CORE-WORKSPACE-006 / CP 候補: CP-WORKSPACE-006

### 2.6 リント規則の実行 (REQ-010, REQ-011, REQ-026)
- 仕様節ID: SPEC-LINT-001
- 振る舞い:
  - 実装対象: ref-v0 `lint_rules` のうち R-052(git 履歴要)を除く全規則。**規則の総数・ID 列挙は
    ref-v0 が正**(実行時読込 §2.3 の対象。仕様書へ転記しない)。全規則を毎回評価し、
    各所見に規則の gate を付与する。ゲートは評価をスキップする根拠にならない(§2.7 は出力・判定側のフィルタ)。
  - severity: 規則定義の severity。`per-family` は対象 ID の family strictness
    (strict=error / advisory=warn / reserved=info)。`per-edge` はエッジ定義値。実装側で上書きしない。
  - **実装診断 `X-*`**(本仕様が定義する規則)は X-PARSE-001 / X-TYPE-001 / X-SCHEMA-001 / X-ID-001 /
    X-XREPO-001 / **X-SUPPRESS-001 / X-SUPPRESS-002**+**X-GIT-001**(rev3/ECO-002・§2.17)の**8種**で全て。
    X-GIT-001 のみ gate=eco(検査自体が --eco 時のみ起動)、他は **gate=always**
    (「7種」は rev3 の §2.17 新設に伴う本文整合漏れ — 工場指摘 CHEAT-ECO02-F02-003 により受入時補正)。
  - **所見カウント規約(rev1)**: R-002(重複定義)は**全定義サイトに1所見ずつ**出す(n 定義 → n 所見。
    初回製造で2工場が一致して選んだ解釈を採用 — 「後発のみ」はクロスリポで順序が恣意的になるため不採用)。
  - 所見メッセージ4要素 — 何が / どこで / なぜ / **どの成果物を直すか**(fixTarget フィールド)。
    **正準文言は製造パッケージ同梱の `bomdd/rule-messages.yaml`(rule→message/fixTarget 表)が正**。
    設計者が ref-v0 rule note から起草・凍結し、工場はこの表を転記する(文言の創作をしない)。
    表に無い規則の文言は blocker(仕様の穴)。固定オラクルは同じ表を期待値に使う。
    unit 検査は (a) fixTarget 非空 (b) message 非空 (c) rule-messages.yaml との一致、で機械判定する。
- 核/表面: surface(出所: ref-v0 lint_rules。判定ロジックは core)
- 受入観点: unit — 規則ごとに違反 fixture+クリーン fixture の対で期待所見プロファイル完全一致
  (過検出も過少検出も FAIL)。これが charter の固定オラクルの実体。
- E-BOM 候補: E-CORE-LINT-007 / CP 候補: CP-LINT-007(規則別行)

### 2.7 ゲート (REQ-012)
- 仕様節ID: SPEC-GATE-001
- 振る舞い:
  - `--gate <always|G1|G3|freeze|acceptance>`(5値のみ受理。その他は exit 2)。無指定= always。
  - 適用規則集合(式): `applied = { r | ladder(gate(r)) ≤ ladder(指定ゲート) } ∪ ( --eco 指定時 { r | gate(r)=eco } )`。
    ladder は always=0, G1=1, G3=2, freeze=3, acceptance=4。eco は梯子に乗らない直交フラグ。
  - フィルタの適用先: **exit code 判定(§2.10)と text 出力の所見一覧**。
    **diagnostics.json には常に全所見(gate 付き)を含める**(viewer のゲート切替=クライアント側フィルタの前提)。
    text 出力のサマリには「全所見数」と「適用ゲート内所見数」を併記し、非対称による混乱を避ける。
- 核/表面: core
- 受入観点: unit — ゲート×規則の適用マトリクス+eco 合成+不正値 exit 2(exact)。
- E-BOM 候補: E-CORE-GATE-008 / CP 候補: CP-GATE-008

### 2.8 抑制 (REQ-015)
- 仕様節ID: SPEC-SUPPRESS-001
- 振る舞い:
  - workspace ファイルの `suppress: [{rule, target, reason}]`。**rule・target・reason の3フィールド全て必須**。
  - 照合: **rule 完全一致 AND target 一致**。target が ID の場合= targetId と **case-sensitive** 完全一致。
    target がパスの場合= 所見 file(正準パス)と **INV-004 の同定規則(case-insensitive)** で完全一致。
    ワイルドカード不許可。
  - 一致した所見: severity=**info** へ降格・`suppressed: true`・reason 転記。**exit code 判定は降格後の
    severity で行う**(= error が抑制されれば exit 0 になり得る。これが抑制の目的)。
  - **reason が空・欠落の suppress 行は無効**(降格しない)+ **error `X-SUPPRESS-001`**。
  - どの所見にも一致しなかった suppress 行= **warn `X-SUPPRESS-002`(死んだ抑制)**。
- 核/表面: core
- 受入観点: unit — 降格(+exit 変化)・reason 転記・無効行・死抑制の4ケース(exact)。
- E-BOM 候補: E-CORE-SUPPRESS-009 / CP 候補: CP-SUPPRESS-009

### 2.9 出力と決定性 (REQ-008, REQ-013, REQ-017)
- 仕様節ID: SPEC-OUTPUT-001
- 振る舞い:
  - 出力は**3ファイル**: `diagnostics.json`(`plm-diag/1`)・`graph.json`(`plm-graph/1`)・
    `ledger.json`(`plm-ledger/1`)。各スキーマは本リポ `schemas/` の JSON Schema として管理し、
    出力は自スキーマに適合。非互換変更はメジャー版上げ。SARIF は v0 対象外(UQ-SPEC-001 / DEC-0004)。
  - `diagnostics.json`:
    `{schemaVersion, refSchema: {version}, run: {gate, eco},
    workspace: {repos: [{name, role}]}, stats,
    findings: [{rule, severity, gate, file, line?, column?, targetId?, message, fixTarget,
    suppressed?, suppressReason?, suppressRef?}]}`。
    `run` = lint 実行時の `--gate`/`--eco`(viewer の初期ゲートの供給源。入力由来なので INV-003 と両立)。
    `suppressRef` = 一致した suppress 行の位置(`<workspaceファイル正準パス>#suppress[<index>]`)。
    **targetId の意味論(rev1 — 初回製造で2工場が別解釈に分散した未規定次元)**:
    参照系規則(R-003/R-004/R-041/X-XREPO)= **不解決の参照値**(ID 参照の場合。パス参照は targetId 省略し
    値は message 内)。定義系(R-001/R-002/X-ID)= 当該定義 ID。品目起点規則(R-005/R-010〜R-051)= 当該品目/
    要求/特性の ID。X-PARSE/X-TYPE/X-SCHEMA= 省略可。suppress の ID target 照合は本 targetId に対して行う。
    **repos に path は含めない**(絶対パス禁止 INV-003 のため。name/role のみ)。
    `stats = {files: 型付けされた成果物数, ids: 定義サイトから抽出した定義 ID 数, refs: 解決を試行した参照数}`
    — いずれも**ゲート・lifecycle・抑制によるフィルタなしの全数**。
  - `graph.json`: `{schemaVersion, nodes, edges}`。
    **nodes = 定義サイトから抽出された全 ID**(`{id, family, name?, lifecycle?, file, line?}`)。
    **ノード属性の抽出規則**: `name` = 定義 item の `name` フィールド(無ければ `subject`、それも無ければ省略)。
    `lifecycle` = 定義 item の `lifecycle_state`(無ければ `lifecycle`、それも無ければ省略)。
    **superseded 扱い**(R-040・表示)= lifecycle が superseded/retired **または** `lineage.superseded_by` 非空。
    **edges = ID 参照エッジのみ**(`kind: path` 参照はグラフに含めない)。
    `{from, to, kind, file, resolved: bool}`。**不解決参照はエッジに含める(resolved:false)が、
    to に対応するノードは作らない**。lineage は kind=`lineage.<field>`。
  - `ledger.json`: `{schemaVersion, ledgers: {eco: [...], cheat: [...], decision: [...]}}`。
    各エントリ= `{id, title, source(正準パス), status?, affectedCount?, binds?, approver?}`
    (status 以下は構造化ソース= 60-change-register / 65-decision-register がある場合のみ。
    .md 由来は id/title/source のみ。§2.15 の抽出機構で生成)。台帳ビューの唯一のデータ源。
  - **正規シリアライズ(決定性)**: UTF-8・LF・2スペース・キー順=スキーマ定義順
    (定義順の正= 本リポ `schemas/` の各 JSON Schema の properties 記載順)。
    **ソート比較器(キーごとに型を固定)**: 文字列キー(file/rule/targetId/family/id/from/kind/to)=
    正準パス/ID の **UTF-8 バイト列昇順**(case-sensitive。INV-004 の case-insensitive は同定=解決用)、
    欠落= 空文字列。数値キー(line/column)= **数値昇順**、欠落= -1(すなわち欠落が先頭側)。
    findings=(file, line, column, rule, targetId) / nodes=(family, id) / edges=(from, kind, to) 昇順。
    出力に時刻・絶対パス・ホスト名・乱数を含めない。
  - **決定性の適用範囲**: diagnostics.json・graph.json・plm-view.html(§2.11)・stdout の
    `--format json`/`--format text` 本文。stderr(ログ・進捗)は対象外。
  - **SARIF 追加出力(rev3・ECO-002・DEC-0004 後段)**: `--sarif` 指定時のみ `--out` に **sarif.json** を追加生成
    (既定は生成しない= 既存出力は不変)。plm-diag/1 が一次契約のまま — SARIF は派生ビューであり情報の追加源泉にしない。
    - top-level **`version: "2.1.0"`**(SARIF 標準のキー名。rev3 当初の「schemaVersion」表記は本製品独自 JSON の
      キー名の流用による記述誤り — 工場2体の一致指摘(CHEAT-ECO02-F01-001/F02-001)により受入時補正)・runs は1件。
      `runs[0].tool.driver = { name: "bomdd-lint", version: <製品版>, informationUri: "https://github.com/akiramei/BomDD-Plm" }`(informationUri は設計者供給値)。
    - findings→`results[]`(diagnostics と同一ソート順): `ruleId`= rule / `level`= error→error・warn→warning・info→note /
      `message.text`= message(凍結文言・展開済み)/ `locations[0].physicalLocation` =
      `{ artifactLocation: { uri: <正準パス> }, region: { startLine: <line> } }`(line 欠落時は region 省略)。
    - 抑制済み所見(§2.8)は results に含め `suppressions: [{ kind: "external" }]` を付す(SARIF 標準表現)。
    - `runs[0].tool.driver.rules[]` は**発火した規則のみ**を rule id の UTF-8 バイト列昇順で列挙:
      `{ id, shortDescription.text: <正準 message テンプレート> }`。
    - 決定性: 本ファイルも §2.9 正規シリアライズ規約(UTF-8・LF・2スペース・キー順= 本節記載順・時刻/絶対パス/乱数なし)の対象。
- 核/表面: core
- 受入観点: REQ-013= L3 — 同一入力2回実行+ファイル列挙順撹乱で全対象出力 byte-diff 0。
  REQ-008/017= L2 — 自スキーマ適合。
  (深さは L3=実行観測。**判定が byte-exact なのは「仕様化された正規形」であり、method-v1 §5 の
  L0 禁止の例外条項に該当する** — L0 という深さを採るのではない)
- E-BOM 候補: E-CORE-OUTPUT-010 / CP 候補: CP-OUTPUT-010

### 2.10 CLI (REQ-014, REQ-016)
- 仕様節ID: SPEC-CLI-001
- 振る舞い:
  - 形式: `bomdd-lint <repo-path | workspace.yaml> [--gate G3] [--eco] [--format json|text]
    [--out DIR] [--fail-on error|warn] [--schema DIR] [--view] [--sarif]`
  - ファイル出力(diagnostics/graph)は **--format に関わらず常に `--out` へ書く**。
    `--view` 指定時のみ plm-view.html を追加生成。**`--sarif` 指定時のみ sarif.json を追加生成**(rev3・§2.9)。
    stdout: `--format text`(既定)=サマリ+適用ゲート内の所見一覧 / `--format json`= diagnostics.json と同内容。
    ログ・進捗は stderr。`--help`・`--version` あり。
  - exit code: **0**=適用ゲート内(§2.7)の error 所見なし / **1**= error 所見あり(gate=always の
    X-PARSE 等を常に含む。抑制で info 化したものは含まない §2.8) / **2**=実行障害 —
    引数不正(未知のオプション・`--gate`/`--format`/`--fail-on` の不正値)・対象パス不存在・
    出力先がリポ内(§2.0)・出力先へ書込不能・スキーマ読込不能(§2.3)・未捕捉例外。
    `--fail-on warn` で warn(降格後 severity)も exit 1 に昇格。
- 核/表面: surface(出所: POSIX/Node CLI 慣習 → K-BOM 候補 K-NODE-CLI)
- 受入観点: L2 — 引数×挙動マトリクス(正常系・異常系とも列挙表を fixture 化)全行 pass。
- E-BOM 候補: E-CLI-011 / CP 候補: CP-CLI-011

### 2.11 viewer 生成方式 (REQ-018, REQ-023)
- 仕様節ID: SPEC-VIEWER-001
- 振る舞い: **静的生成**(DEC-0003)。`--view` で自己完結の単一 `plm-view.html` を生成。
  diagnostics/graph JSON を `<script type="application/json">` で埋め込み、外部リソース参照ゼロ
  (CDN・fetch・画像ファイルなし)。`file://` で開ける。
  **閲覧操作はファイル書込・localStorage 等いかなる永続状態も作らない**(リロード=埋込データへ全リセット)。
  ビュー内のゲート選択は埋込済み全所見のクライアント側フィルタであり再実行ではない。
- 核/表面: core(生成機構)+surface(UI は §2.12〜2.15)
- 受入観点: L2 — 生成 HTML の外部参照ゼロ(静的検査)+リポ不在環境で全ビュー描画可。
- E-BOM 候補: E-VIEWER-SHELL-001 / CP 候補: CP-VIEWER-012
- UI-IR/UI-BOM 参照: `bomdd/ui/viewer/ui-ir.json` / `ui-bom.json` / `ui-trace-map.json`(モック M1)

### 2.12 所見ビュー (REQ-019)
- 仕様節ID: SPEC-VIEW-FINDINGS-001 / UI-IR: TMP-UI-SCR-0001
- 表示契約 DC-FINDINGS-001(原典=モック M1 `bomdd/ui/mock/bomdd-plm-viewer.html`):
  | DE | 提示要素 | 備考 |
  |---|---|---|
  | DE-F01 | サマリカード4種(error/warn/info/suppressed)。**排他計上** — suppressed は info カードに含めず独立カウント。error/warn/info は非抑制所見のみ | 固定幅・tabular-nums(LIV-0002) |
  | DE-F02 | severity フィルタチップ・rule セレクト・検索入力 | |
  | DE-F03 | 所見行: severityチップ / rule ID / 位置(正準パス:行。**表示は先頭側省略・完全パスは title 属性**。省略発火幅は実装裁量=G 判定) / 対象IDチップ / メッセージ | LIV-0004 |
  | DE-F04 | 是正先表示(「→ 是正先:」+ fixTarget) | REQ-026 の可視面 |
  | DE-F05 | 抑制済み行(灰+打消線+reason+suppress 定義位置) | 非表示にしない(INV-005) |
  | DE-F06 | 空状態=達成表示(✓+「現ゲートで所見なし」+**stats 3値: files/ids/refs**) | 空白ではない |
- 一覧は 200 行/ページのページング。
- 受入観点: L2 — DE 全行の存在+埋込データとの件数一致(排他計上込み) /
  G — golden(スクリーンショット+DOM。**pixel-exact 不採用**・表示契約要素の存在+意味一致)+承認者 akira。
  golden は境界状態(空・4桁件数・長大パス)を必ず含む。承認記録は 50-as-built の golden_process。
- E-BOM 候補: E-VIEWER-FINDINGS-002 / CP 候補: CP-VIEW-FINDINGS-013

### 2.13 品目グラフビュー (REQ-020)
- 仕様節ID: SPEC-VIEW-GRAPH-001 / UI-IR: TMP-UI-SCR-0002
- 表示契約 DC-GRAPH-001(原典=モック M1):
  | DE | 提示要素 | 備考 |
  |---|---|---|
  | DE-G01 | 品目ノード(family色+品番+短縮名) | 色言語は designIntent 準拠 |
  | DE-G02 | 参照エッジ(矢印)・lineage エッジ・**不解決エッジ(resolved:false)は破線赤** | |
  | DE-G03 | superseded ノード(灰+破線+supersede 先) | |
  | DE-G04 | **R-040(superseded/retired 品目への active 参照の検出規則)** の違反エッジ(赤)+コールアウト(当事者品番と是正先) | |
  | DE-G05 | 詳細パネル: 品番/lifecycle/名前/requirement_refs/逆引き参照/順参照/lineage/当該品目の所見 | 固定幅300px(LIV-0003) |
  | DE-G06 | 検索・family フィルタ・近傍深さ(1/2/3) | |
- **近傍の定義**: エッジを無向とみなした距離(lineage エッジも距離1)。初期表示は深さ≤2。
- **初期選択品目**: **ビューの現在ゲート(初期値= diagnostics.json の `run.gate`/`run.eco`)適用後**の
  error 所見を持つ品目のうち、(family, id) バイト列順の先頭。該当ゼロなら (family, id) 順の先頭ノード。
  ノードゼロなら空状態表示。ゲート切替時は初期選択を再計算しない(現在の選択を維持)。
- 受入観点: L2 — 表示ノード/エッジ集合が graph.json+上記近傍定義の計算結果と一致 / G — §2.12 と同方式。
- E-BOM 候補: E-VIEWER-GRAPH-003 / CP 候補: CP-VIEW-GRAPH-014

### 2.14 トレースマトリクスビュー (REQ-021)
- 仕様節ID: SPEC-VIEW-TRACE-001 / UI-IR: TMP-UI-SCR-0003
- **データ源(全て埋込 JSON から計算。追加入力なし)**:
  - 行= graph.json の family=REQ のノード(INV-009 順)。
  - **仕様節列**= REQ 定義サイトの trace_links のうち to が `20-spec.md#...` を指す行(graph.json の
    kind=`trace_links` エッジ)。無ければ「—」(未被覆扱いにはしない — R-系規則の対象外のため)。
  - 列の被覆判定= graph.json のエッジ: E 列= kind=`requirement_refs` の逆向き到達
    (**DE→REQ のエッジは数えない**。E 品目の requirement_refs のみ)/
    M 列= 当該 E への kind=`ebom_refs` / CP 列= kind=`acceptance_refs` または `verifies` /
    証跡列= kind=`cp_ref`(As-Built test_evidence)。
  - ✗(未被覆)= diagnostics.json の対応所見(R-010/011/012/050)が **1件以上**存在するセル。
    **所見→セルの写像**: R-011/012/050 のような E/M 起点の所見は、当該品目の requirement_refs が指す
    **全 REQ 行**の該当列セルに立てる(1所見が複数セルに対応してよい。INV-010 は「✗セル集合=
    所見から導出されるセル集合との完全一致」で検査する)。セルクリックで当該所見群へ遷移。
    —(灰)= 行 REQ または対象品目の lifecycle が draft/retired、もしくは当該規則が
    **ビューの現在ゲート**(§2.13 と同じ初期値・切替規則)の適用外。
- 表示契約 DC-TRACE-001(原典=モック M1): DE-T01 行×列マトリクス / DE-T02 セル3状態(✓品番・✗赤・—灰) /
  DE-T03 被覆率サマリ(REQ→E / E→CP / CP→証跡) / DE-T04 未被覆のみトグル+凡例。
- 受入観点: L2 — **✗セル集合= 対応 lint 所見集合と1対1(INV-010)** を fixture で検査 / G — §2.12 と同方式。
- E-BOM 候補: E-VIEWER-TRACE-004 / CP 候補: CP-VIEW-TRACE-015

### 2.15 台帳ビュー (REQ-022)
- 仕様節ID: SPEC-VIEW-LEDGER-001 / UI-IR: TMP-UI-SCR-0004
- **データ源= ledger.json(§2.9)のみ**。台帳の同定は ref-v0.1 の artifacts 型による —
  ECO 台帳= `60-change-order-*.md`(+`60-change-register.yaml` があれば構造化ソースとして優先)/
  ずる台帳= `51-cheat-log.md` / 裁定台帳= `65-decision-register.yaml`。
- **見出し抽出機構(§2.4 と共通実装)**: `#`〜`###` 見出し行(markdown の見出しは1物理行)のうち、
  **ID トークン(§2.4 の切り出し規則)として family ID に一致する部分文字列**を含む行を1エントリとする。
  **行内の最初の一致トークンをエントリ ID** とし、それ以外の ID は無視。
  **タイトル= 見出し行からエントリ ID トークンを除去し前後の空白・区切り記号(`—` `:` `-` `・`)を
  trim した残り**(それ以外の加工はしない。本文は読まない)。
  family ID を含む見出しが 0 件の .md 台帳= 「非構造(見出し n 件)」として件数のみ表示。
- 表示契約 DC-LEDGER-001(原典=モック M1):
  | DE | 提示要素 | 備考 |
  |---|---|---|
  | DE-L01 | サブタブ(ECO/ずる/裁定)+**全件数**(ゲート非依存) | |
  | DE-L02 | ECO 表: ID / タイトル。**状態・影響品目数は change-register.yaml がある場合のみ**の追加列 | |
  | DE-L03 | ずる表: ID / タイトル(見出し) | 分類列は取得できる場合のみ |
  | DE-L04 | 裁定表: ID / タイトル / 状態 / binds / 承認者(YAML 構造化ソース) | |
  | DE-L05 | 「見出し+ID のみ抽出」注記 | 散文の全文構造化はしない |
- 受入観点: L2 — fixture 台帳で抽出エントリ集合(ID+タイトル)一致 / G — §2.12 と同方式。
- E-BOM 候補: E-VIEWER-LEDGER-005 / CP 候補: CP-VIEW-LEDGER-016

### 2.16 性能・環境 (REQ-024, REQ-025)
- 仕様節ID: SPEC-NFR-001
- 性能目標(REQ-025・**L3**): 基準 workspace= ViewPrism2+ViewPrismUI
  (規模の実測: 約50ファイル・ID 数千・参照数万 — plm-intake/id-inventory 参照)。
  **基準機= akira 開発機(Windows・ローカル SSD・Node LTS)** で、新規プロセス起動(コールドスタート。
  OS キャッシュは制御しない)を3回連続実行した wall-clock の中央値が **lint ≤10s・viewer 生成込み ≤15s**。
  CI(Linux)では絶対値合否を取らず回帰傾向のみ観測する。
- 環境(REQ-024・**L2**): Node.js ≥22 LTS。Windows / Linux 両方で固定オラクル全通過。
  CRLF/LF・BOM 付き UTF-8・日本語/空白入りパス。
- E-BOM 候補: E-NFR-017 / CP 候補: CP-NFR-017

### 2.17 R-052 eco-diff-within-impact — diff 監査の機械化 (REQ-010 rev2・rev3/ECO-002)
- 仕様節ID: SPEC-DIFFAUDIT-001
- 位置づけ: method テンプレ 63-diff-audit(不要改変監査)の機械化。gate= **eco**・severity= error。
- 振る舞い:
  - **検査対象(opt-in)**: `--eco` 実行時、60-change-register の changes[] のうち **`diff_audit` フィールドを
    持つエントリのみ**。形: `diff_audit: { baseline: <git rev(タグ名/SHA)>, allowed_paths: [<リポ内相対プレフィックス>...] }`。
    allowed_paths は単純な文字列前方一致 — **ディレクトリを意図する場合は末尾 `/` を書く**(`src/` と書けば
    `src-evil/x` を許容しない。受入時明記 — CHEAT-ECO02-F02-004 の境界指摘)。
    diff_audit の無いエントリ(過去 ECO・closed 済み)は検査しない(発火ゼロ)。
  - **実 diff の取得**: 当該 register が属するリポで `git diff --name-only <baseline> HEAD` を実行する
    (読み取り専用サブコマンドのみ。working tree でなくコミット間 diff — 採点の再現性のため)。
  - **判定**: diff の各ファイル(リポ内相対・`/` 区切り)が次のいずれにも**前方一致しない**場合、
    R-052 を1ファイル1所見で発火(targetId= ECO id・{ref}= 当該ファイル): ① `bomdd/`(BOM 改訂は常に許容)
    ② allowed_paths の各プレフィックス。
  - **fail-open**: git 実行不能(コマンド不在・非 git リポ)または baseline 解決不能の場合は **X-GIT-001(info)** を
    ECO ごとに1件発し、当該 ECO の R-052 判定を skip する(検査不能でコミット/CI を wedge しない。X-XREPO と同型)。
  - **read-only**(INV-003/§2.0): git 呼び出しは diff 系読み取りのみ。書き込み系サブコマンドの発行は欠陥。
  - **決定性**(§2.9): baseline・HEAD が固定なら所見集合は一意。ソートは既存規約。
  - allowed_paths の**導出**(E-BOM planned_output_artifact_ref からの自動算出)は v0.5 対象外(将来候補 —
    実リポの artifact.path が注釈合成値で機械可読でないため)。
- 核/表面: surface(出所: ref-v0 R-052+git CLI 慣習= K-GIT)
- 受入観点: unit — git 履歴付き合成 fixture(治具が組み立てる)で「許容内 diff= 所見なし/はみ出し= R-052/
  baseline 不能= X-GIT-001 skip」の3分岐 exact。
- E-BOM: E-CORE-GITDIFF-030(git 読み取りアダプタ)+E-CORE-LINT-007(評価)/ CP: CP-GITDIFF-021

## 3. 不変条件(M-BOM へ前倒し)

| ID | 不変条件 | 関係する REQ |
|---|---|---|
| INV-001 | 対象リポ全ファイルの SHA-256 は実行前後で不変(read-only) | REQ-001, 002 |
| INV-002 | 実行間の永続状態ゼロ。終了後の残留物は出力先配下のみ | REQ-001 |
| INV-003 | 同一入力→対象出力(diagnostics/graph/plm-view/stdout 本文)byte 同一。時刻・絶対パス・ホスト名・乱数を含めない | REQ-013 |
| INV-004 | 正準パス= `<repo.name>/<リポ内相対>`・`/` 区切り・原表記。**同定(解決・suppress 照合)は case-insensitive、ソートはバイト列順** | REQ-007, 024 |
| INV-005 | 抑制は削除でなく info 降格。理由なし抑制・死んだ抑制は所見化 | REQ-015 |
| INV-006 | exit code 0/1/2 契約(§2.10)。判定は適用ゲート内・降格後 severity で行う | REQ-014 |
| INV-007 | family・pattern・エッジ・規則パラメータをコードに焼き込まない(スキーマ=データ) | REQ-006 |
| INV-008 | viewer は埋込 JSON のみを入力とし、外部リソース参照ゼロ・永続状態ゼロ・file:// で開ける | REQ-018 |
| INV-009 | 全出力コレクションに定義済みソート(比較器・欠損キー規則は §2.9) | REQ-013 |
| INV-010 | トレースマトリクスの ✗ セル集合 = 対応 lint 所見から導出されるセル集合と完全一致(§2.14 写像規則) | REQ-021 |

## 3.5 DB / 永続化意図
なし(DB を持たないことが製品要件 — charter「含まない」参照)。

## 4. 沈黙次元の第1回掃討(silence-checklist)

| 次元 | 宣言 | 内容/参照 |
|---|---|---|
| 表示要素集合(UI surface) | specified | §2.12〜2.15 表示契約 DC-*/DE-*。原典=モック M1 |
| 日時表現 | specified | 出力に時刻を含めない(INV-003)。入力中の日時は素通し |
| エラー語彙 | specified | R-*(ref-v0)+実装診断 X-* 8種(§2.6 で閉集合として列挙。rev3 で X-GIT-001 追加) |
| 文字コード・改行 | specified | §2.2(入力)・§2.9(出力)。不正 UTF-8= X-PARSE-001 |
| パス表現・照合 | specified | INV-004(同定 vs ソートの使い分け含む) |
| ソート・欠損キー | specified | §2.9 比較器 |
| 識別子(出力側) | specified | 入力 ID を原表記転記。独自採番なし |
| 並行性 | exploratory | 並列化自由。ただし INV-003 違反=受入 FAIL(CP-OUTPUT-010 が検出) |
| ログ(stderr) | exploratory | 書式自由。stdout 契約のみ固定 |
| i18n | out-of-scope | v0 は日本語のみ(利用者=akira) |
| セキュリティ・権限 | out-of-scope | ローカル工具・信頼済み入力(クラッシュ耐性は §2.2 で担保) |
| 永続化 | out-of-scope | DB なしが要件 |
| 調達部品(YAML パーサ・グラフ描画) | deferred-to-phase3 | M-BOM procurement。決定性(INV-003)・自己完結(INV-008)を満たすこと |
| アクセシビリティ(色覚) | deferred-to-phase3 | 色言語の色覚対応は 35 Design System BOM |
| 大規模時の viewer 挙動 | specified | 所見 200/ページ・グラフ近傍≤2・初期選択規則(§2.13) |

## 5. トレース表(REQ ⇄ 仕様節)

| REQ | 実現節 | E-BOM 候補 | CP 候補 | 受入深さ |
|---|---|---|---|---|
| REQ-001 | §2.0 | E-CORE-READONLY-001 | CP-READONLY-001 | L3 |
| REQ-002 | §2.0 | E-CORE-READONLY-001 | CP-READONLY-001 | L3 |
| REQ-003 | §2.1 | E-CORE-DISCOVER-002 | CP-DISCOVER-002 | unit |
| REQ-004 | §2.2 | E-CORE-PARSE-003 | CP-PARSE-003 | unit |
| REQ-005 | §2.2 | E-CORE-PARSE-003 | CP-PARSE-003 | unit |
| REQ-006 | §2.3 | E-CORE-SCHEMA-004 | CP-SCHEMA-004 | unit |
| REQ-007 | §2.4 | E-CORE-RESOLVE-005 | CP-RESOLVE-005 | unit |
| REQ-008 | §2.9 | E-CORE-OUTPUT-010 | CP-OUTPUT-010 | L2 |
| REQ-009 | §2.5 | E-CORE-WORKSPACE-006 | CP-WORKSPACE-006 | unit |
| REQ-010 | §2.6 | E-CORE-LINT-007 | CP-LINT-007 | unit |
| REQ-011 | §2.6 | E-CORE-LINT-007 | CP-LINT-007 | unit |
| REQ-012 | §2.7 | E-CORE-GATE-008 | CP-GATE-008 | unit |
| REQ-013 | §2.9 | E-CORE-OUTPUT-010 | CP-OUTPUT-010 | L3 |
| REQ-014 | §2.10 | E-CLI-011 | CP-CLI-011 | L2 |
| REQ-015 | §2.8 | E-CORE-SUPPRESS-009 | CP-SUPPRESS-009 | unit |
| REQ-016 | §2.10 | E-CLI-011 | CP-CLI-011 | L2 |
| REQ-017 | §2.9 | E-CORE-OUTPUT-010 | CP-OUTPUT-010 | L2 |
| REQ-018 | §2.11 | E-VIEWER-SHELL-001 | CP-VIEWER-012 | L2 |
| REQ-019 | §2.12 | E-VIEWER-FINDINGS-002 | CP-VIEW-FINDINGS-013 | L2+G |
| REQ-020 | §2.13 | E-VIEWER-GRAPH-003 | CP-VIEW-GRAPH-014 | L2+G |
| REQ-021 | §2.14 | E-VIEWER-TRACE-004 | CP-VIEW-TRACE-015 | L2+G |
| REQ-022 | §2.15 | E-VIEWER-LEDGER-005 | CP-VIEW-LEDGER-016 | L2+G |
| REQ-023 | §2.11〜2.15(UI-CAD 適合) | E-VIEWER-* 全品目 | CP-VISUAL-GAP-018(visual gap analysis: S1/S2/S3 ゼロ+akira 承認) | G |
| REQ-024 | §2.16 | E-NFR-017 | CP-NFR-017 | L2 |
| REQ-025 | §2.16 | E-NFR-017 | CP-NFR-017 | L3 |
| REQ-026 | §2.6 | E-CORE-LINT-007 | CP-LINT-007 | unit |

逆引き: 全仕様節(§2.0〜2.16)は上表のいずれかの REQ に到達する(宙に浮いた節なし)。

## 6. PLM-ready 契約
- 仕様節は `SPEC-*` で参照可能。全 REQ が ≥1 節へ到達(§5)。
- UI 表示要素は DC-FINDINGS/GRAPH/TRACE/LEDGER-001 の DE-* として E-BOM/Control Plan へ接続する。
- 未解決事項は §7。blocker は manufacturing-ready を止める。

## 7. Unresolved Questions

| ID | Question | Severity | Owner | Affected refs | Status |
|---|---|---|---|---|---|
| UQ-SPEC-001 | 診断 JSON: 独自 `plm-diag/1` 一次・SARIF v0 対象外の裁定(DEC-0004・open) | non-blocker | human | §2.9 | open |
| UQ-SPEC-002 | viewer 静的生成の裁定(DEC-0003・open)。承認で charter UQ-004 が閉じる | non-blocker | human | §2.11 | open |
| UQ-SPEC-003 | グラフ描画の調達(ライブラリ vs 自前 SVG)。INV-003/008 を満たすこと | non-blocker | AI | §2.13 / M-BOM | open(Phase 3) |
| UQ-SPEC-004 | 性能数値 10s/15s の体感確認(REQ-025 継承) | non-blocker | human | §2.16 | open |
| UQ-SPEC-005 | 51-cheat-log.md の見出し規約が題材間で揺れる場合の抽出仕様の追補(§2.15 の機構で吸収できない実例が出たら ECO) | non-blocker | AI | §2.15 | open |

---
## ゲート記録(G2/G2')

### マルチリーダー監査(G2) — 2026-07-03
**第1回(初版に対して)** — リーダー N=3(fable / sonnet / haiku。互いに非開示・仕様書のみ供与):
- **①REQ 一覧: 3体とも 26 件で完全一致。②不変条件: 3体とも 10 件で完全一致**(振る舞い骨格は一意)。
- ④一意に読めない箇所: 3体合計 40+ 件(重複統合後 26 論点)。うち**初版の**仕様内矛盾 3 件
  (REQ-024 深さの本文/表不一致・X-PARSE の column 欠落・X-SUPPRESS の gate 未列挙)。
- 補正: 全 26 論点を G2 補正版へ反映(初版の矛盾3件は解消済み — 以下の記述は履歴であり現行版の欠陥ではない)。
  外部参照依存(ref-v0・モック M1)は併読規約として冒頭に明示(欠陥でなく設計 — 二重管理回避)。

**第2回(補正版に対して・fresh 2体: sonnet=D / haiku=E)**:
- D 判定: **yes(条件付き)** — 第1回の矛盾3件が解消済みであることを本文照合で確認。残差4点
  (message 転記規則・数値/文字列混在ソート・初期選択のゲート依存・基準 workspace の出典)。
- E 判定: no — ただし挙げた「矛盾3件」は現行本文に存在する記述の見落としと裁定
  (X-* 7種列挙・column?・X-SUPPRESS gate=always・REQ-024=L2 はいずれも本文に明記)。実質残差5点。
- **最終補正(G2 補正2版=本版)**: D/E の実質残差 計8点を反映 — message/fixTarget 正準文言のオラクル凍結(§2.6)・
  ソートキーの型固定(§2.9)・stats 全数定義(§2.9)・初期選択と灰セルの現在ゲート基準(§2.13/2.14)・
  ID トークン切り出しの貪欲規則(§2.4)・見出しタイトル trim 規則(§2.15)・併読対象へ id-inventory と UI-CAD を追加(冒頭)。
- **残差(理由付きで容認)**: (a) 罠 hint はパターン非該当時なし=付加情報と宣言済み
  (b) DE-F03 省略発火幅は実装裁量=G 判定と宣言済み (c) UQ-SPEC-005 は宣言済みの未決。
- **G2 判定: pass**(差分ゼロではなく「残差に理由付き」での通過。詳細: `bomdd/plm-intake/g2-audit-2026-07-03.md`)

### MeasurementCapability(G2')
| REQ | 状態 | 備考 |
|---|---|---|
| REQ-001〜017, 024〜026 | **adequate** | unit/L2/L3 の機械オラクル。fixture+期待プロファイルで閉じる |
| REQ-019〜022(L2 部分) | **adequate** | DE 存在・件数・集合一致は DOM/データ突合で機械判定 |
| REQ-019〜023(G 部分) | **human-approval-required** | golden(スクリーンショット+DOM・pixel-exact 不採用)+承認者 akira。記録は 50-as-built |
| unmeasurable | **0 件** | — |

### 原典パリティサインオフ
- 原典= モック M1。**v0.1 を設計原器として akira 承認済み(2026-07-03・UQ-UI-001 decided)**。
- 機械突合: UI-IR の全 uiId ↔ モック data-ui-id(前方一致規約)= **PASS**。
- DC-*/DE-* ↔ UI-IR ↔ モック: §2.12〜2.15 の DE 全行がモックに実在。

### G3 ドライラン(BOM 自己完結性) — 2026-07-03
- 第1回(fresh 装置): 「条件付き yes」・設計者確認 10 問(うち blocker 5)+矛盾 7 件を検出。
  最重: 台帳のデータ経路不在(Q1)/ ref-v0 の未定義 kind と散文エッジの衝突(Q4)/ lifecycle 抽出規則(Q5)。
  → 補正: **ledger.json(plm-ledger/1)の追加**(§2.9/2.15)・diagnostics に run{gate,eco}/suppressRef 追加・
  ノード属性抽出規則(§2.9)・正準パス= repo.name 前置(§1/INV-004)・仕様節列のデータ源(§2.14)・
  INV-010 写像規則・**rule-messages.yaml 新設**(正準文言表)・**ref-v0.1 改訂**(kind 凡例・
  distributed_defines・台帳3成果物追加・散文エッジ廃止)。
- 第2回(fresh 装置): 「blocker 解消後 yes」・残 3 問 → 全て解消:
  Q1 モック承認の記述矛盾= 更新漏れを修正(本節+extraction-report) /
  Q2 E-DESIGN の 30/35 二重定義= **ref-v0.1 に candidate 定義の意味論を追加**(候補定義は索引・R-002 対象外) /
  Q3 workspace ファイル非同梱= 意図的(fixture は CP が規定)と 40 に明記。
- **G3 判定: pass**(exploratory 宣言済み以外の未回答質問ゼロ)。
