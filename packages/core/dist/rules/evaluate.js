// Lint rule engine (§2.6). Evaluates all ref-v0 rules except R-052, plus X-* diagnostics.
// Each finding carries the rule's gate. Gate does NOT skip evaluation (that is an output-side filter §2.7).
import { getMessage } from "./messages.js";
import { gateOfRule } from "../gate/gate.js";
import { determineFamily } from "../resolve/family.js";
import { cpChars, changeRegisterExists, designSurfaceParts, ebomItems, mbomUnits, traceMapEbomRefs, } from "./context.js";
const RECORD_FAMILIES = new Set(["TL", "UQ", "DEC", "CHEAT", "GF"]);
function strictnessSeverity(s) {
    return s === "strict" ? "error" : s === "advisory" ? "warn" : "info";
}
/** Resolve an edge severity string to a concrete severity given the target family. */
function resolveEdgeSeverity(edgeSeverity, targetFamilyPrefix, schema) {
    if (edgeSeverity === "error" || edgeSeverity === "warn" || edgeSeverity === "info")
        return edgeSeverity;
    if (edgeSeverity === "per-edge")
        return "error";
    // per-family: use the target family strictness; default error.
    if (targetFamilyPrefix) {
        const fam = schema.families.find((f) => f.prefix === targetFamilyPrefix);
        if (fam)
            return strictnessSeverity(fam.strictness);
    }
    return "error";
}
function mk(rule, severity, gate, file, vars, line, column, targetId) {
    const m = getMessage(rule, vars);
    const f = { rule, severity, gate, file, message: m.message, fixTarget: m.fixTarget };
    if (line !== undefined)
        f.line = line;
    if (column !== undefined)
        f.column = column;
    if (targetId !== undefined)
        f.targetId = targetId;
    return f;
}
export function evaluate(model) {
    const schema = model.schema;
    const out = [];
    // ---- X-ID-001 (already produced in model.findings) + X-SCHEMA (schema load) ----
    out.push(...model.findings);
    for (const sf of schema.schemaFindings) {
        out.push(mk("X-SCHEMA-001", "error", "always", "(schema)", { ref: sf.ref }));
    }
    // ---- R-001: id-well-formed. For pattern families, def ID must match the pattern. ----
    const r001Gate = gateOfRule("R-001", schema);
    for (const d of model.definitions) {
        if (d.candidate && !inIndex(model, d))
            continue;
        const fam = schema.families.find((f) => f.prefix === d.family);
        if (fam?.regex && !fam.regex.test(d.id)) {
            out.push(mk("R-001", "error", r001Gate, d.canonicalPath, { targetId: d.id, family: d.family }, d.line, undefined, d.id));
        }
    }
    // ---- R-002: id-unique (per family, all def sites, non-candidate). n defs => n findings. ----
    // Scope (§2.5 rev2 / ref-v0.4): definitions from a per-file define site are checked for
    // duplicates within their extracting file only (別ファイル間の同名は合法). Definitions with no
    // uniqueness_scope declaration use workspace-global scope (従来どおり). Registration into the ID
    // index / reference resolution is unaffected — that stays workspace-global.
    const r002Gate = gateOfRule("R-002", schema);
    for (const [family, byId] of model.index) {
        for (const [id, defs] of byId) {
            const primary = defs.filter((d) => !d.candidate);
            if (primary.length < 2)
                continue;
            // Partition per-file-scoped defs by file; global-scoped defs share one bucket.
            const buckets = new Map();
            const GLOBAL = "\u0000global";
            for (const d of primary) {
                const key = d.uniquenessScope === "per-file" ? d.canonicalPath : GLOBAL;
                let bucket = buckets.get(key);
                if (!bucket) {
                    bucket = [];
                    buckets.set(key, bucket);
                }
                bucket.push(d);
            }
            for (const bucket of buckets.values()) {
                if (bucket.length > 1) {
                    for (const d of bucket) {
                        out.push(mk("R-002", "error", r002Gate, d.canonicalPath, { targetId: id, family }, d.line, undefined, id));
                    }
                }
            }
        }
    }
    // ---- R-003 / R-004 / R-051 / X-XREPO: reference resolution ----
    for (const ref of model.refs) {
        emitRefFinding(ref, model, out);
    }
    // ---- R-041: trace_link endpoints ----
    const r041Gate = gateOfRule("R-041", schema);
    for (const tl of model.traceLinks) {
        if (!tl.resolved) {
            out.push(mk("R-041", "warn", r041Gate, tl.canonicalPath, { targetId: tl.traceId, ref: tl.value }, tl.line, undefined, tl.traceId));
        }
    }
    // ---- R-005: no-orphan-definition ----
    emitOrphans(model, out);
    // ---- Item-origin rules ----
    emitItemRules(model, out);
    return out;
}
function inIndex(model, d) {
    const list = model.index.get(d.family)?.get(d.id);
    return !!list && list.includes(d);
}
function emitRefFinding(ref, model, out) {
    const schema = model.schema;
    // cross-repo skip
    if (ref.kind === "xrepo-skip") {
        out.push(mk("X-XREPO-001", "info", "always", ref.canonicalPath, { ref: ref.value }, ref.line));
        return;
    }
    if (ref.resolved)
        return;
    // dedicated rule edge (e.g. R-051/eco). Unresolved handled only by that rule.
    if (ref.ruleOverride) {
        const rule = ref.ruleOverride;
        const gate = ref.gateOverride ?? gateOfRule(rule, schema);
        // R-051 targetId = the ECO id (owner), ref = unresolved value.
        const sev = "error";
        out.push(mk(rule, sev, gate, ref.canonicalPath, { targetId: ref.fromId, ref: ref.value }, ref.line, undefined, ref.fromId));
        return;
    }
    if (ref.isIdEdge) {
        // R-003. Family label for message = first target family (or determined family).
        const targetFam = determineFamily(ref.value, schema)?.prefix;
        const famLabel = ref.families.join("/") || targetFam || "?";
        const sev = resolveEdgeSeverity(ref.edgeSeverity, targetFam ?? ref.families[0], schema);
        const gate = gateOfRule("R-003", schema);
        out.push(mk("R-003", sev, gate, ref.canonicalPath, { ref: ref.value, family: famLabel, targetId: ref.value }, ref.line, undefined, ref.targetId));
    }
    else {
        // R-004 path. targetId omitted (value in message).
        const sev = resolveEdgeSeverity(ref.edgeSeverity, undefined, schema);
        const gate = gateOfRule("R-004", schema);
        out.push(mk("R-004", sev, gate, ref.canonicalPath, { ref: ref.value }, ref.line));
    }
}
function emitOrphans(model, out) {
    const schema = model.schema;
    const gate = gateOfRule("R-005", schema);
    // Build a set of referenced IDs (ID edges that are resolved OR point at a family/id).
    const referenced = new Set();
    for (const ref of model.refs) {
        if (ref.isIdEdge && ref.targetId)
            referenced.add(ref.targetId);
    }
    for (const tl of model.traceLinks) {
        referenced.add(tl.value);
    }
    // Iterate definitions actually in the index; skip record families.
    const seen = new Set();
    for (const [family, byId] of model.index) {
        if (RECORD_FAMILIES.has(family))
            continue;
        for (const [id, defs] of byId) {
            const key = family + " " + id;
            if (seen.has(key))
                continue;
            seen.add(key);
            if (!referenced.has(id)) {
                const d = defs[0];
                out.push(mk("R-005", "info", gate, d.canonicalPath, { targetId: id }, d.line, undefined, id));
            }
        }
    }
}
function emitItemRules(model, out) {
    const schema = model.schema;
    const parsed = model.parsed;
    const items = ebomItems(parsed);
    const units = mbomUnits(parsed);
    const chars = cpChars(parsed);
    const tmRefs = traceMapEbomRefs(parsed);
    const g = (r) => gateOfRule(r, schema);
    // Requirement definitions (family REQ).
    const reqDefs = allDefsOfFamily(model, "REQ");
    // R-010: every REQ referenced by >=1 E item requirement_refs.
    const reqReferenced = new Set();
    for (const it of items)
        for (const r of it.requirementRefs)
            reqReferenced.add(r);
    for (const d of reqDefs) {
        if (!reqReferenced.has(d.id)) {
            out.push(mk("R-010", "error", g("R-010"), d.canonicalPath, { targetId: d.id }, d.line, undefined, d.id));
        }
    }
    // Realization maps for R-012.
    const realizedByMbom = new Set();
    for (const u of units)
        for (const e of u.ebomRefs)
            realizedByMbom.add(e);
    for (const it of items) {
        const isMR = it.lifecycleState === "manufacturing-ready";
        // R-011: manufacturing-ready item needs acceptance_refs >= 1.
        if (isMR && it.acceptanceRefs.length === 0) {
            out.push(mk("R-011", "error", g("R-011"), it.file, { targetId: it.id }, it.line, undefined, it.id));
        }
        // R-012: manufacturing-ready item realized by >=1 M unit.
        if (isMR && !realizedByMbom.has(it.id)) {
            out.push(mk("R-012", "error", g("R-012"), it.file, { targetId: it.id }, it.line, undefined, it.id));
        }
        // R-013: core => requirement_refs>=1 / surface => external_source_ref or kbom_refs>=1.
        if (it.classification === "core") {
            if (it.requirementRefs.length === 0) {
                out.push(mk("R-013", "error", g("R-013"), it.file, { targetId: it.id }, it.line, undefined, it.id));
            }
        }
        else if (it.classification === "surface") {
            if (!it.externalSourceRef && it.kbomRefs.length === 0) {
                out.push(mk("R-013", "error", g("R-013"), it.file, { targetId: it.id }, it.line, undefined, it.id));
            }
        }
        // R-020: UI surface item (has display_contract_refs or design_system_refs) must be referenced
        // by some ui-trace-map ebomItemRef.
        if (it.displayContractRefs.length > 0 || it.designSystemRefs.length > 0) {
            if (!tmRefs.has(it.id)) {
                out.push(mk("R-020", "error", g("R-020"), it.file, { targetId: it.id }, it.line, undefined, it.id));
            }
        }
    }
    // R-014: unit/L2/L3 CP chars need test_vectors >= 1.
    for (const c of chars) {
        if (c.depth && ["unit", "L2", "L3"].includes(c.depth) && c.testVectors.length === 0) {
            out.push(mk("R-014", "warn", g("R-014"), c.file, { targetId: c.id }, c.line, undefined, c.id));
        }
    }
    // R-021: design-system surface parts must exist in 30-ebom items (unless out-of-scope w/ rationale).
    const eIds = new Set(allDefsOfFamily(model, "E").filter((d) => !d.candidate).map((d) => d.id));
    for (const part of designSurfaceParts(parsed)) {
        const outOfScope = (part.coverageStatus ?? "").includes("out-of-scope");
        if (!eIds.has(part.id) && !outOfScope) {
            out.push(mk("R-021", "error", g("R-021"), part.file, { targetId: part.id }, part.line, undefined, part.id));
        }
    }
    // R-030 / R-031: fixed oracle rules.
    emitOracleRules(model, out);
    // R-040: active-graph-integrity — active refs pointing at superseded/retired items.
    emitR040(model, out);
    // R-050: acceptance-evidence-coverage (ref-v0.11: pass rows required, non-pass rows are violations).
    emitR050(model, out);
    // R-051 handled via dedicated-rule edge in emitRefFinding; if register absent, skip (info) — no finding.
    void changeRegisterExists;
}
function allDefsOfFamily(model, family) {
    const byId = model.index.get(family);
    if (!byId)
        return [];
    const out = [];
    for (const defs of byId.values()) {
        if (defs.length > 0)
            out.push(defs[0]);
    }
    return out;
}
function emitOracleRules(model, out) {
    const schema = model.schema;
    for (const pa of model.parsed) {
        const doc = pa.doc;
        const fo = doc?.["fixed_oracle"];
        if (!fo)
            continue;
        const cases = Array.isArray(fo["cases"]) ? fo["cases"] : [];
        cases.forEach((raw, i) => {
            if (!raw || typeof raw !== "object")
                return;
            const c = raw;
            const id = typeof c["id"] === "string" ? c["id"] : undefined;
            if (!id)
                return;
            if (!("spec_ref" in c) || c["spec_ref"] === undefined || c["spec_ref"] === null || c["spec_ref"] === "") {
                const line = pa.lineOf?.(["fixed_oracle", "cases", i, "id"]);
                out.push(mk("R-030", "error", gateOfRule("R-030", schema), pa.artifact.canonicalPath, { targetId: id }, line, undefined, id));
            }
        });
        // R-031: frozen_since + self_test present.
        const frozen = fo["frozen_since"];
        const selfTest = fo["self_test"];
        if (frozen === undefined || frozen === null || frozen === "" || selfTest === undefined || selfTest === null) {
            const line = pa.lineOf?.(["fixed_oracle"]);
            out.push(mk("R-031", "error", gateOfRule("R-031", schema), pa.artifact.canonicalPath, { targetId: "fixed_oracle" }, line));
        }
    }
}
function emitR040(model, out) {
    const schema = model.schema;
    const gate = gateOfRule("R-040", schema);
    // Superseded/retired items = lifecycle superseded/retired OR lineage.superseded_by non-empty.
    const superseded = new Set();
    for (const d of model.definitions) {
        if (d.lifecycle === "superseded" || d.lifecycle === "retired" || d.supersededByNonEmpty) {
            superseded.add(d.id);
        }
    }
    // Active reference edges = ID edges excluding lineage.* edges.
    for (const ref of model.refs) {
        if (!ref.isIdEdge || !ref.targetId)
            continue;
        if (ref.kind === "xrepo-skip")
            continue;
        // exclude lineage.* selectors — detect by presence of ".lineage." in nothing; we track via edge?
        // We approximate: lineage edges have families [E] and target is superseded; spec excludes lineage.*.
        // The edge selector is not carried on RefResult; use a marker set below.
        if (ref.isLineage)
            continue;
        if (superseded.has(ref.targetId) && ref.resolved) {
            out.push(mk("R-040", "error", gate, ref.canonicalPath, { targetId: ref.fromId, ref: ref.targetId }, ref.line, undefined, ref.fromId));
        }
    }
}
// R-050 (ref-v0.11 / ECO-008): the reason vocabulary is frozen in bomdd/rule-messages.yaml
// (comment block above the R-050 row). Transcribed verbatim — do not paraphrase.
const R050_REASON_NO_PASS = "合格の証跡行がない";
const R050_REASON_NON_PASS_NO_FIELD = "合格以外の証跡行がある(result 欄なし)";
const R050_REASON_NON_PASS_PREFIX = "合格以外の証跡行がある(result=";
const R050_REASON_NON_PASS_SUFFIX = ")";
const R050_REASON_UNMEASURABLE = "測定不能(製造記録をリスト形のエントリとして読めない)";
const R050_REASON_NOT_APPLICABLE = "適用外(受入対象の M unit が 0 件)";
const R050_NO_TARGET_LABEL = "(対象なし)";
const R050_NO_CP_LABEL = "(cp_ref なし)";
const R050_MBOM_ARTIFACT_TYPE = "bomdd/32-mbom.yaml";
function r050ReasonNonPass(row) {
    const has = row !== undefined && Object.prototype.hasOwnProperty.call(row, "result");
    if (!has)
        return R050_REASON_NON_PASS_NO_FIELD;
    return R050_REASON_NON_PASS_PREFIX + String(row["result"]) + R050_REASON_NON_PASS_SUFFIX;
}
/**
 * R-050 acceptance-evidence-coverage (ref-v0.11):
 *  (a) every acceptance CP of every M unit has >=1 evidence row with result === "pass" in the latest AB entry
 *  (b) the latest AB entry has no evidence row whose result is anything other than "pass"
 *      (applies regardless of the number of targets, and to rows whose cp_ref is not a target)
 *  (c) targets exist but no as_built is readable as a list entry => unmeasurable (error), one per target
 *  (d) no targets => (a)(c) not applicable, stated explicitly as one info finding
 * All findings carry the rule's gate; the gate is an output-side filter (§2.7), never a reason to skip.
 * Unchanged on purpose (declared boundary): "latest" = last entry of the last parsed list-form as_built;
 * no per-repo scoping; retired M units are counted.
 */
function emitR050(model, out) {
    const schema = model.schema;
    const gate = gateOfRule("R-050", schema);
    // Targets: (M unit, CP) pairs from acceptance_refs. The same CP listed twice by one M unit is one pair.
    const targets = [];
    // (d) file anchor: the first artifact typed as 32-mbom, whatever its content (§2.6 rev5).
    let firstMbomFile;
    for (const pa of model.parsed) {
        if (firstMbomFile === undefined && pa.artifact.type === R050_MBOM_ARTIFACT_TYPE) {
            firstMbomFile = pa.artifact.canonicalPath;
        }
        const doc = pa.doc;
        const mbom = doc?.["mbom"];
        if (!mbom || typeof mbom !== "object" || Array.isArray(mbom))
            continue;
        const units = mbom["manufacturing_units"];
        if (!Array.isArray(units))
            continue;
        for (const raw of units) {
            if (!raw || typeof raw !== "object")
                continue;
            const accs = raw["acceptance_refs"];
            if (!Array.isArray(accs))
                continue;
            const seen = new Set();
            for (const cp of accs) {
                if (typeof cp !== "string" || seen.has(cp))
                    continue;
                seen.add(cp);
                targets.push({ cp, file: pa.artifact.canonicalPath });
            }
        }
    }
    // Latest AB entry: last element of the last parsed as_built that is a non-empty list whose
    // last element is a mapping. Anything else (absent / mapping dialect / empty list) is unreadable.
    let latest;
    for (const pa of model.parsed) {
        const doc = pa.doc;
        const ab = doc?.["as_built"];
        if (!Array.isArray(ab) || ab.length === 0)
            continue;
        const last = ab[ab.length - 1];
        if (!last || typeof last !== "object" || Array.isArray(last))
            continue;
        latest = {
            file: pa.artifact.canonicalPath,
            lineOf: pa.lineOf,
            index: ab.length - 1,
            entry: last,
        };
    }
    // (d) no targets: state it explicitly (info). (b) still applies below.
    if (targets.length === 0) {
        // file: first 32-mbom artifact; else first artifact; else (no artifact at all) the place where the
        // first repo's 32-mbom would be — (d) must be stated once per run even for an empty repo.
        const firstRepo = model.repos[0];
        const file = firstMbomFile ??
            model.parsed[0]?.artifact.canonicalPath ??
            (firstRepo !== undefined ? firstRepo.name + "/" + R050_MBOM_ARTIFACT_TYPE : undefined);
        if (file !== undefined) {
            out.push(mk("R-050", "info", gate, file, { targetId: R050_NO_TARGET_LABEL, ref: R050_REASON_NOT_APPLICABLE }));
        }
    }
    // (c) targets exist but nothing readable: unmeasurable, one per target.
    if (!latest) {
        for (const t of targets) {
            out.push(mk("R-050", "error", gate, t.file, { targetId: t.cp, ref: R050_REASON_UNMEASURABLE }, undefined, undefined, t.cp));
        }
        return;
    }
    const abFile = latest.file;
    const ev = latest.entry["test_evidence_refs"];
    const rows = Array.isArray(ev) ? ev : [];
    // (a) every target CP needs >=1 pass row.
    const passed = new Set();
    for (const e of rows) {
        if (!e || typeof e !== "object" || Array.isArray(e))
            continue;
        const r = e;
        const cp = r["cp_ref"];
        if (typeof cp === "string" && r["result"] === "pass")
            passed.add(cp);
    }
    for (const t of targets) {
        if (!passed.has(t.cp)) {
            out.push(mk("R-050", "error", gate, abFile, { targetId: t.cp, ref: R050_REASON_NO_PASS }, undefined, undefined, t.cp));
        }
    }
    // (b) no row other than pass — including rows whose cp_ref is not a target.
    for (let j = 0; j < rows.length; j++) {
        const e = rows[j];
        const r = e && typeof e === "object" && !Array.isArray(e) ? e : undefined;
        if (r !== undefined && r["result"] === "pass")
            continue;
        const cpRaw = r !== undefined ? r["cp_ref"] : undefined;
        const cp = typeof cpRaw === "string" ? cpRaw : undefined;
        // line: the cp_ref of the row; a row without cp_ref (or not a mapping) falls back to the row itself.
        const rowPath = ["as_built", latest.index, "test_evidence_refs", j];
        const line = (cpRaw !== undefined ? latest.lineOf?.([...rowPath, "cp_ref"]) : undefined) ?? latest.lineOf?.(rowPath);
        out.push(mk("R-050", "error", gate, abFile, { targetId: cp ?? R050_NO_CP_LABEL, ref: r050ReasonNonPass(r) }, line, undefined, cp));
    }
}
