// Text stdout formatter (K-NODE-CLI). Summary + applied-gate finding list.
// Line: `<severity> <rule> <file>:<line> <targetId> <message>` + next line `  → 是正先: <fixTarget>`.
import { appliedRules } from "@bomdd/core";
export function formatText(diag, schema) {
    const applied = appliedRules(diag.run.gate, diag.run.eco, schema);
    const all = diag.findings;
    const inGate = all.filter((f) => applied.has(f.rule));
    const lines = [];
    // summary counts over in-gate, non-suppressed for error/warn/info; suppressed exclusive.
    let err = 0;
    let warn = 0;
    let info = 0;
    let sup = 0;
    for (const f of inGate) {
        if (f.suppressed)
            sup++;
        else if (f.severity === "error")
            err++;
        else if (f.severity === "warn")
            warn++;
        else
            info++;
    }
    lines.push(`所見: error ${err} / warn ${warn} / info ${info} / suppressed ${sup}` +
        `(全所見 ${all.length} / 適用ゲート内 ${inGate.length})`);
    if (inGate.length === 0) {
        lines.push("現ゲートで所見なし");
        lines.push(`検査済み: ${diag.stats.files} ファイル / ${diag.stats.ids} ID / ${diag.stats.refs} 参照`);
        return lines.join("\n") + "\n";
    }
    for (const f of inGate) {
        lines.push(findingLine(f));
        lines.push(`  → 是正先: ${f.fixTarget}`);
    }
    return lines.join("\n") + "\n";
}
function findingLine(f) {
    const loc = f.line !== undefined ? `${f.file}:${f.line}` : f.file;
    const target = f.targetId ?? "";
    const sev = f.suppressed ? "suppressed" : f.severity;
    return `${sev} ${f.rule} ${loc} ${target} ${f.message}`.replace(/\s+$/g, "");
}
