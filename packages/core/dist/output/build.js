// Build diagnostics.json / graph.json / ledger.json objects in canonical (schema-order) shape (§2.9).
// Sorting per §2.9 comparators. Objects constructed with keys in schema property order.
import { cmpStr, cmpNum } from "../util/determinism.js";
import { extractHeadings } from "../resolve/headings.js";
// ---- findings sort: (file, line, column, rule, targetId) ----
function cmpFinding(a, b) {
    return (cmpStr(a.file, b.file) ||
        cmpNum(a.line, b.line) ||
        cmpNum(a.column, b.column) ||
        cmpStr(a.rule, b.rule) ||
        cmpStr(a.targetId, b.targetId));
}
/** Construct a finding object with keys in schema property order. */
function orderFinding(f) {
    const o = {
        rule: f.rule,
        severity: f.severity,
        gate: f.gate,
        file: f.file,
        message: f.message,
        fixTarget: f.fixTarget,
    };
    // insert optional keys in schema order: line, column, targetId before message? Schema order is
    // rule, severity, gate, file, line, column, targetId, message, fixTarget, suppressed, ...
    // Rebuild strictly in that order:
    const ordered = {
        rule: f.rule,
        severity: f.severity,
        gate: f.gate,
        file: f.file,
    };
    if (f.line !== undefined)
        ordered["line"] = f.line;
    if (f.column !== undefined)
        ordered["column"] = f.column;
    if (f.targetId !== undefined)
        ordered["targetId"] = f.targetId;
    ordered["message"] = f.message;
    ordered["fixTarget"] = f.fixTarget;
    if (f.suppressed !== undefined)
        ordered["suppressed"] = f.suppressed;
    if (f.suppressReason !== undefined)
        ordered["suppressReason"] = f.suppressReason;
    if (f.suppressRef !== undefined)
        ordered["suppressRef"] = f.suppressRef;
    void o;
    return ordered;
}
export function buildDiagnostics(input) {
    const findings = input.findings.slice().sort(cmpFinding).map(orderFinding);
    const repos = input.repos.map((r) => {
        const o = { name: r.name };
        if (r.role !== undefined)
            o.role = r.role;
        return o;
    });
    return {
        schemaVersion: "plm-diag/1",
        refSchema: { version: input.refSchemaVersion },
        run: { gate: input.gate, eco: input.eco },
        workspace: { repos },
        stats: {
            files: input.model.stats.files,
            ids: input.model.stats.ids,
            refs: input.model.stats.refs,
        },
        findings,
    };
}
// ---- graph ----
function cmpNode(a, b) {
    return cmpStr(a.family, b.family) || cmpStr(a.id, b.id);
}
function cmpEdge(a, b) {
    return cmpStr(a.from, b.from) || cmpStr(a.kind, b.kind) || cmpStr(a.to, b.to);
}
function orderNode(n) {
    const o = { id: n.id, family: n.family };
    if (n.name !== undefined)
        o["name"] = n.name;
    if (n.lifecycle !== undefined)
        o["lifecycle"] = n.lifecycle;
    o["file"] = n.file;
    if (n.line !== undefined)
        o["line"] = n.line;
    return o;
}
export function buildGraph(model) {
    const nodes = model.nodes.slice().sort(cmpNode).map(orderNode);
    // Edges = ID reference edges only (kind:path excluded). Include unresolved (resolved:false).
    const edges = [];
    for (const ref of model.refs) {
        if (ref.kind === "xrepo-skip")
            continue;
        if (!ref.isIdEdge)
            continue;
        if (ref.fromId === undefined || ref.targetId === undefined)
            continue;
        const kind = edgeKind(ref.selector);
        edges.push({
            from: ref.fromId,
            to: ref.targetId,
            kind,
            file: ref.canonicalPath,
            resolved: ref.resolved,
        });
    }
    edges.sort(cmpEdge);
    const orderedEdges = edges.map((e) => ({
        from: e.from,
        to: e.to,
        kind: e.kind,
        file: e.file,
        resolved: e.resolved,
    }));
    return { schemaVersion: "plm-graph/1", nodes, edges: orderedEdges };
}
/** Derive edge kind label. lineage.<field> for lineage edges; else last selector segment key. */
function edgeKind(selector) {
    const lin = /\.lineage\.([A-Za-z_]+)/.exec(selector);
    if (lin)
        return `lineage.${lin[1]}`;
    // last field name (strip [] and array indices)
    const parts = selector.split(".");
    const last = parts[parts.length - 1].replace(/\[\]$/, "");
    return last;
}
// ---- ledger (§2.15) ----
export function buildLedger(model, schema) {
    const eco = buildEcoLedger(model, schema);
    const cheat = buildCheatLedger(model, schema);
    const decision = buildDecisionLedger(model);
    const ledgers = { eco, cheat, decision };
    return { schemaVersion: "plm-ledger/1", ledgers };
}
function cmpEntry(a, b) {
    return cmpStr(a.id, b.id);
}
function orderEntry(e) {
    const o = { id: e.id, title: e.title, source: e.source };
    if (e.status !== undefined)
        o["status"] = e.status;
    if (e.affectedCount !== undefined)
        o["affectedCount"] = e.affectedCount;
    if (e.binds !== undefined)
        o["binds"] = e.binds;
    if (e.approver !== undefined)
        o["approver"] = e.approver;
    return o;
}
function buildEcoLedger(model, schema) {
    const entries = new Map();
    // .md ECO files: filename-derived id/title (heading extraction of the doc? spec: id+title from headings).
    for (const pa of model.parsed) {
        const rel = pa.artifact.relPath.toLowerCase();
        if (/60-change-order-.*\.md$/.test(rel)) {
            // heading extraction for title; filename for id fallback.
            if (typeof pa.doc === "string") {
                const scan = extractHeadings(pa.doc, schema, ["ECO", "CAPA"]);
                for (const e of scan.entries) {
                    if (!entries.has(e.id)) {
                        entries.set(e.id, { id: e.id, title: e.title, source: pa.artifact.canonicalPath });
                    }
                }
            }
        }
    }
    // structured register overrides/augments.
    for (const pa of model.parsed) {
        if (!pa.artifact.relPath.toLowerCase().endsWith("60-change-register.yaml"))
            continue;
        const doc = pa.doc;
        const changes = doc?.["changes"];
        if (!Array.isArray(changes))
            continue;
        for (const raw of changes) {
            if (!raw || typeof raw !== "object")
                continue;
            const c = raw;
            const id = typeof c["id"] === "string" ? c["id"] : undefined;
            if (!id)
                continue;
            const entry = {
                id,
                title: typeof c["title"] === "string" ? c["title"] : (entries.get(id)?.title ?? ""),
                source: pa.artifact.canonicalPath,
            };
            if (typeof c["status"] === "string")
                entry.status = c["status"];
            const affected = c["affected_refs"];
            if (Array.isArray(affected))
                entry.affectedCount = affected.length;
            entries.set(id, entry);
        }
    }
    return [...entries.values()].sort(cmpEntry).map(orderEntry);
}
function buildCheatLedger(model, schema) {
    const entries = [];
    const seen = new Set();
    for (const pa of model.parsed) {
        if (!pa.artifact.relPath.toLowerCase().endsWith("51-cheat-log.md"))
            continue;
        if (typeof pa.doc !== "string")
            continue;
        const scan = extractHeadings(pa.doc, schema, ["CHEAT"]);
        for (const e of scan.entries) {
            if (seen.has(e.id))
                continue;
            seen.add(e.id);
            entries.push({ id: e.id, title: e.title, source: pa.artifact.canonicalPath });
        }
    }
    return entries.sort(cmpEntry).map(orderEntry);
}
function buildDecisionLedger(model) {
    const entries = [];
    for (const pa of model.parsed) {
        if (!pa.artifact.relPath.toLowerCase().endsWith("65-decision-register.yaml"))
            continue;
        const doc = pa.doc;
        const decisions = doc?.["decisions"];
        if (!Array.isArray(decisions))
            continue;
        for (const raw of decisions) {
            if (!raw || typeof raw !== "object")
                continue;
            const d = raw;
            const id = typeof d["id"] === "string" ? d["id"] : undefined;
            if (!id)
                continue;
            const entry = {
                id,
                title: typeof d["title"] === "string" ? d["title"] : "",
                source: pa.artifact.canonicalPath,
            };
            if (typeof d["status"] === "string")
                entry.status = d["status"];
            const binds = d["binds"];
            if (Array.isArray(binds))
                entry.binds = binds.filter((x) => typeof x === "string");
            if (typeof d["approver"] === "string")
                entry.approver = d["approver"];
            entries.push(entry);
        }
    }
    return entries.sort(cmpEntry).map(orderEntry);
}
