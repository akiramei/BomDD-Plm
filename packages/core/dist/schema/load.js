// Runtime schema loading (§2.3). Reads id-grammar + ref-edges from a directory.
// exit 2 when: unreadable / invalid YAML / missing required top keys.
// X-SCHEMA-001 (via schemaFindings) when: individual entry selector/pattern unsupported.
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { parse as yamlParse } from "yaml";
/** Thrown to signal CLI exit code 2 (schema unusable). Caught only at the CLI boundary. */
export class SchemaExitError extends Error {
    code = 2;
    constructor(message) {
        super(message);
        this.name = "SchemaExitError";
    }
}
function readYaml(path) {
    let text;
    try {
        text = readFileSync(path, "utf8");
    }
    catch {
        throw new SchemaExitError(`スキーマファイルが読めません: ${path}`);
    }
    try {
        return yamlParse(text);
    }
    catch (e) {
        throw new SchemaExitError(`スキーマが YAML として不正です: ${path} (${e.message})`);
    }
}
function asArray(v) {
    return Array.isArray(v) ? v : [];
}
function asString(v) {
    return typeof v === "string" ? v : undefined;
}
/** Compile a family_pattern as an ECMAScript RegExp (no u/v flag; K-TS-DETERMINISM). */
function compilePattern(src) {
    try {
        return new RegExp(src);
    }
    catch {
        return undefined;
    }
}
function parseFamilies(grammar, findings) {
    const out = [];
    for (const raw of asArray(grammar["families"])) {
        if (typeof raw !== "object" || raw === null)
            continue;
        const f = raw;
        const prefix = asString(f["prefix"]);
        if (!prefix)
            continue;
        const strictness = (asString(f["strictness"]) ?? "advisory");
        const fam = { prefix, strictness };
        const name = asString(f["name"]);
        if (name)
            fam.name = name;
        const pat = asString(f["family_pattern"]);
        if (pat) {
            const rx = compilePattern(pat);
            if (!rx) {
                findings.push({ ref: `families[${prefix}].family_pattern: ${pat}` });
            }
            else {
                fam.familyPattern = pat;
                fam.regex = rx;
            }
        }
        out.push(fam);
    }
    return out;
}
/** Normalize a `family:` value (string | array) to string[]. */
function familyList(v) {
    if (typeof v === "string")
        return [v];
    if (Array.isArray(v))
        return v.filter((x) => typeof x === "string");
    return [];
}
/**
 * Determine edge kind + family list from a raw refs entry.
 * kind field explicit: path | id-or-path | path-at-rev. severity:none => kind none.
 * Otherwise ID reference (kind "id").
 */
function parseRefEdge(raw, findings) {
    const selector = asString(raw["selector"]);
    if (!selector) {
        findings.push({ ref: `refs entry without selector` });
        return undefined;
    }
    const kindStr = asString(raw["kind"]);
    const severity = asString(raw["severity"]) ?? "per-family";
    let kind;
    if (kindStr === "path")
        kind = "path";
    else if (kindStr === "id-or-path")
        kind = "id-or-path";
    else if (kindStr === "path-at-rev")
        kind = "path-at-rev";
    else if (kindStr === undefined)
        kind = "id";
    else {
        findings.push({ ref: `${selector}: 未対応の kind '${kindStr}'` });
        return undefined;
    }
    // severity:none => "解決検査しない(表示・記録用)" (§2.4) regardless of the declared kind —
    // an explicit kind (e.g. id-or-path) must not defeat the none-severity opt-out.
    if (severity === "none")
        kind = "none";
    const edge = {
        selector,
        families: familyList(raw["family"]),
        kind,
        severity,
    };
    const rule = asString(raw["rule"]);
    if (rule)
        edge.ruleOverride = rule;
    const gate = asString(raw["gate"]);
    if (gate)
        edge.gateOverride = gate;
    if (raw["cross_repo"] === true)
        edge.crossRepo = true;
    return edge;
}
function parseDefine(raw) {
    const selector = asString(raw["selector"]);
    if (!selector)
        return undefined;
    const d = { selector, families: familyList(raw["family"]) };
    if (raw["candidate"] === true)
        d.candidate = true;
    return d;
}
function parseArtifacts(edges, findings) {
    const out = [];
    for (const raw of asArray(edges["artifacts"])) {
        if (typeof raw !== "object" || raw === null)
            continue;
        const a = raw;
        const file = asString(a["file"]);
        if (!file)
            continue;
        const defines = [];
        for (const d of asArray(a["defines"])) {
            if (typeof d === "object" && d !== null) {
                const parsed = parseDefine(d);
                if (parsed)
                    defines.push(parsed);
            }
        }
        const refs = [];
        for (const r of asArray(a["refs"])) {
            if (typeof r === "object" && r !== null) {
                const parsed = parseRefEdge(r, findings);
                if (parsed)
                    refs.push(parsed);
            }
        }
        out.push({ file, defines, refs });
    }
    return out;
}
function parseLintRules(edges) {
    const out = [];
    for (const raw of asArray(edges["lint_rules"])) {
        if (typeof raw !== "object" || raw === null)
            continue;
        const r = raw;
        const id = asString(r["id"]);
        if (!id)
            continue;
        out.push({
            id,
            name: asString(r["name"]),
            gate: asString(r["gate"]) ?? "always",
            severity: asString(r["severity"]) ?? "error",
        });
    }
    return out;
}
function parseDistributed(edges) {
    const out = [];
    for (const raw of asArray(edges["distributed_defines"])) {
        if (typeof raw !== "object" || raw === null)
            continue;
        const d = raw;
        const selector = asString(d["selector"]);
        const family = asString(d["family"]);
        if (selector && family)
            out.push({ selector, family });
    }
    return out;
}
export function loadSchema(dir) {
    const grammarRaw = readYaml(join(dir, "id-grammar.draft.yaml"));
    const edgesRaw = readYaml(join(dir, "ref-edges.draft.yaml"));
    if (typeof grammarRaw !== "object" || grammarRaw === null) {
        throw new SchemaExitError("id-grammar.draft.yaml が空か不正です");
    }
    if (typeof edgesRaw !== "object" || edgesRaw === null) {
        throw new SchemaExitError("ref-edges.draft.yaml が空か不正です");
    }
    const grammar = grammarRaw;
    const edges = edgesRaw;
    // Required top keys: families / artifacts / lint_rules (§2.3).
    if (!Array.isArray(grammar["families"])) {
        throw new SchemaExitError("必須トップキー 'families' が id-grammar に欠落しています");
    }
    if (!Array.isArray(edges["artifacts"])) {
        throw new SchemaExitError("必須トップキー 'artifacts' が ref-edges に欠落しています");
    }
    if (!Array.isArray(edges["lint_rules"])) {
        throw new SchemaExitError("必須トップキー 'lint_rules' が ref-edges に欠落しています");
    }
    const schemaFindings = [];
    const families = parseFamilies(grammar, schemaFindings);
    const artifacts = parseArtifacts(edges, schemaFindings);
    const lintRules = parseLintRules(edges);
    const distributedDefines = parseDistributed(edges);
    return {
        grammarVersion: asString(grammar["grammar_version"]) ?? "ref-v0",
        edgesVersion: asString(edges["edges_version"]) ?? "ref-v0",
        families,
        distributedDefines,
        artifacts,
        lintRules,
        schemaFindings,
    };
}
