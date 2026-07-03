// SARIF 2.1.0 additional output (§2.9 rev3, ECO-002 CH-2 / DEC-0004 後段). Built ONLY when the CLI
// passes --sarif; plm-diag/1 (diagnostics.json) remains the primary contract — SARIF is a derived
// view over the SAME findings, using the SAME sort order as diagnostics.json.
import { getRawMessageTemplate } from "../rules/messages.js";
import { byteCompare } from "../util/determinism.js";
function levelOf(severity) {
    if (severity === "error")
        return "error";
    if (severity === "warn")
        return "warning";
    return "note";
}
function buildResult(f) {
    const physicalLocation = {
        artifactLocation: { uri: f.file },
    };
    if (f.line !== undefined)
        physicalLocation.region = { startLine: f.line };
    const r = {
        ruleId: f.rule,
        level: levelOf(f.severity),
        message: { text: f.message },
        locations: [{ physicalLocation }],
    };
    if (f.suppressed)
        r.suppressions = [{ kind: "external" }];
    return r;
}
/**
 * Build the SARIF log object in canonical (schema-order) key shape, ready for canonicalJson().
 * findings are consumed in diagnostics.json's already-sorted order (§2.9: "diagnostics と同一ソート順").
 */
export function buildSarif(input) {
    const { diagnostics, version, informationUri } = input;
    const results = diagnostics.findings.map(buildResult);
    // driver.rules[] = fired rules only, rule id UTF-8-byte-order ascending (dedup).
    const firedIds = new Set();
    for (const f of diagnostics.findings)
        firedIds.add(f.rule);
    const sortedIds = [...firedIds].sort(byteCompare);
    const rules = sortedIds.map((id) => ({
        id,
        shortDescription: { text: getRawMessageTemplate(id) },
    }));
    const driver = {
        name: "bomdd-lint",
        version,
        informationUri,
        rules,
    };
    return {
        $schema: "https://raw.githubusercontent.com/oasis-tcs/sarif-spec/master/Schemata/sarif-schema-2.1.0.json",
        version: "2.1.0",
        runs: [{ tool: { driver }, results }],
    };
}
