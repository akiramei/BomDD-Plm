// Canonical rule message table — TRANSCRIBED from bomdd/rule-messages.yaml (§2.6, 転記・創作禁止).
// Placeholders: {targetId} {file} {family} {ref} {rule} {supIndex}
// Transcribed verbatim from rule-messages.yaml. Do not paraphrase.
const TABLE = {
    "R-001": {
        message: "ID {targetId} が family {family} の文法に適合しません",
        fixTarget: "定義サイトの ID を id-grammar の文法に合わせて修正する",
    },
    "R-002": {
        message: "ID {targetId} が複数の定義サイトで重複定義されています",
        fixTarget: "片方を改番するか、lineage(supersede)で置換関係を宣言する",
    },
    "R-003": {
        message: "参照 {ref} が {family} の定義に解決できません",
        fixTarget: "参照先の台帳に定義を追加するか、参照を実在 ID へ修正する",
    },
    "R-004": {
        message: "パス参照 {ref} のファイルが存在しません",
        fixTarget: "参照先ファイルを作成するか、パスを修正する",
    },
    "R-005": {
        message: "ID {targetId} はどこからも参照されていません(孤立定義)",
        fixTarget: "参照を張るか、不要なら retire を検討する(削除でなく lineage で)",
    },
    "R-010": {
        message: "要求 {targetId} がどの E-BOM 品目からも参照されていません(未被覆)",
        fixTarget: "30-ebom.yaml に requirement_refs で本要求を引く品目を追加する",
    },
    "R-011": {
        message: "品目 {targetId} は manufacturing-ready ですが acceptance_refs がありません",
        fixTarget: "33-control-plan.yaml に受入特性を追加し acceptance_refs で接続する",
    },
    "R-012": {
        message: "品目 {targetId} は manufacturing-ready ですがどの M-BOM unit にも実現されていません",
        fixTarget: "32-mbom.yaml の unit の ebom_refs に本品目を追加する",
    },
    "R-013": {
        message: "品目 {targetId} の由来が不完全です(core は requirement_refs / surface は出所が必須)",
        fixTarget: "core なら requirement_refs、surface なら external_source_ref か kbom_refs を記入する",
    },
    "R-014": {
        message: "特性 {targetId} (unit/L2/L3) に test_vectors がありません",
        fixTarget: "境界値・中間値・反例を test_vectors に列挙する(CHEAT-005 型の予防)",
    },
    "R-020": {
        message: "UI surface 品目 {targetId} が workspace 内のどの ui-trace-map からも参照されていません(CAD なし製造の予防)",
        fixTarget: "実装ではなく bomdd/ui/ の UI-IR と trace map を先に作成する",
    },
    "R-021": {
        message: "Design System 部品 {targetId} が 30-ebom.yaml に同期されていません",
        fixTarget: "30-ebom.yaml に E-DESIGN 品目を追加するか、coverage_matrix で理由付き out-of-scope を宣言する",
    },
    "R-030": {
        message: "固定オラクル・ケース {targetId} に spec_ref がありません(期待値の典拠なき行=仕様の穴)",
        fixTarget: "期待値の典拠を仕様に書き、spec_ref で参照する(書けなければ Phase 2 へ差し戻し)",
    },
    "R-031": {
        message: "固定オラクルの frozen_since / self_test が未記入です",
        fixTarget: "治具セルフテスト+較正を実施し、凍結 commit/tag を記入する",
    },
    "R-040": {
        message: "{targetId} が superseded/retired 品目 {ref} を active 参照しています",
        fixTarget: "lineage の後継品目へ再帰属する(テンプレ 64 part-lineage-reattribution)",
    },
    "R-041": {
        message: "trace_link {targetId} の from/to が解決できません",
        fixTarget: "エンドポイントを実在 ID または実在パスへ修正する",
    },
    "R-050": {
        message: "特性 {targetId} が最新 As-Built の test_evidence に被覆されていません",
        fixTarget: "50-as-built.yaml の test_evidence_refs に本特性の証跡を追加する",
    },
    "R-051": {
        message: "ECO {targetId} の影響分析に解決できない ID {ref} があります",
        fixTarget: "60-change-register.yaml の affected_refs を実在 ID へ修正する",
    },
    "X-PARSE-001": {
        message: "構文エラー: {ref}",
        fixTarget: "当該ファイルの構文を修正する(hint がある場合はそれに従う)",
    },
    "X-TYPE-001": {
        message: "フィールド {ref} の型が ref-v0 の規定と一致しません",
        fixTarget: "当該フィールドの値を規定の型に修正する",
    },
    "X-SCHEMA-001": {
        message: "スキーマのエントリ {ref} は本実装が未対応の記法です(当該エントリを無効化)",
        fixTarget: "ref-v0 のエントリ記法を見直すか、実装の対応を ECO で追加する",
    },
    "X-ID-001": {
        message: "定義値 {targetId} がどの family にも一致しません",
        fixTarget: "ID を既存 family の文法に合わせるか、id-grammar への family 追加を裁定する",
    },
    "X-XREPO-001": {
        message: "cross-repo 参照 {ref} は解決先候補リポが workspace に無いため skip しました",
        fixTarget: "検査したい場合は bomdd-workspace.yaml に対象リポを追加する",
    },
    "X-SUPPRESS-001": {
        message: "suppress[{supIndex}] に reason がありません(この行は無効)",
        fixTarget: "suppress 行に理由を記入する(理由なき抑制は認めない)",
    },
    "X-SUPPRESS-002": {
        message: "suppress[{supIndex}] はどの所見にも一致しません(死んだ抑制)",
        fixTarget: "解消済みなら suppress 行を削除する",
    },
};
function substitute(tpl, vars) {
    return tpl.replace(/\{(targetId|file|family|ref|rule|supIndex)\}/g, (_m, key) => {
        const v = vars[key];
        return v === undefined || v === null ? "" : String(v);
    });
}
/** Look up + fill a rule message. Throws if the rule is absent (spec hole => blocker). */
export function getMessage(rule, vars = {}) {
    const tpl = TABLE[rule];
    if (!tpl) {
        throw new Error(`rule-messages.yaml に規則 ${rule} の文言がありません(仕様の穴 blocker)`);
    }
    return {
        message: substitute(tpl.message, vars),
        fixTarget: substitute(tpl.fixTarget, vars),
    };
}
export function hasMessage(rule) {
    return rule in TABLE;
}
export function allRuleIds() {
    return Object.keys(TABLE);
}
