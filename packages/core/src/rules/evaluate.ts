// Lint rule engine (§2.6). Evaluates all ref-v0 rules except R-052, plus X-* diagnostics.
// Each finding carries the rule's gate. Gate does NOT skip evaluation (that is an output-side filter §2.7).

import type { Finding, Severity } from "../types.js";
import type { RefSchema, Strictness } from "../schema/types.js";
import type { Definition, Model, RefResult } from "../resolve/model.js";
import { getMessage } from "./messages.js";
import { gateOfRule } from "../gate/gate.js";
import { determineFamily } from "../resolve/family.js";
import {
  cpChars,
  changeRegisterExists,
  designSurfaceParts,
  ebomItems,
  mbomUnits,
  traceMapEbomRefs,
} from "./context.js";

const RECORD_FAMILIES = new Set(["TL", "UQ", "DEC", "CHEAT", "GF"]);

function strictnessSeverity(s: Strictness): Severity {
  return s === "strict" ? "error" : s === "advisory" ? "warn" : "info";
}

/** Resolve an edge severity string to a concrete severity given the target family. */
function resolveEdgeSeverity(edgeSeverity: string, targetFamilyPrefix: string | undefined, schema: RefSchema): Severity {
  if (edgeSeverity === "error" || edgeSeverity === "warn" || edgeSeverity === "info") return edgeSeverity;
  if (edgeSeverity === "per-edge") return "error";
  // per-family: use the target family strictness; default error.
  if (targetFamilyPrefix) {
    const fam = schema.families.find((f) => f.prefix === targetFamilyPrefix);
    if (fam) return strictnessSeverity(fam.strictness);
  }
  return "error";
}

function mk(
  rule: string,
  severity: Severity,
  gate: string,
  file: string,
  vars: { targetId?: string; ref?: string; family?: string; supIndex?: number },
  line?: number,
  column?: number,
  targetId?: string
): Finding {
  const m = getMessage(rule, vars);
  const f: Finding = { rule, severity, gate, file, message: m.message, fixTarget: m.fixTarget };
  if (line !== undefined) f.line = line;
  if (column !== undefined) f.column = column;
  if (targetId !== undefined) f.targetId = targetId;
  return f;
}

export function evaluate(model: Model): Finding[] {
  const schema = model.schema;
  const out: Finding[] = [];

  // ---- X-ID-001 (already produced in model.findings) + X-SCHEMA (schema load) ----
  out.push(...model.findings);
  for (const sf of schema.schemaFindings) {
    out.push(mk("X-SCHEMA-001", "error", "always", "(schema)", { ref: sf.ref }));
  }

  // ---- R-001: id-well-formed. For pattern families, def ID must match the pattern. ----
  const r001Gate = gateOfRule("R-001", schema);
  for (const d of model.definitions) {
    if (d.candidate && !inIndex(model, d)) continue;
    const fam = schema.families.find((f) => f.prefix === d.family);
    if (fam?.regex && !fam.regex.test(d.id)) {
      out.push(
        mk("R-001", "error", r001Gate, d.canonicalPath, { targetId: d.id, family: d.family }, d.line, undefined, d.id)
      );
    }
  }

  // ---- R-002: id-unique (per family, all def sites, non-candidate). n defs => n findings. ----
  const r002Gate = gateOfRule("R-002", schema);
  for (const [family, byId] of model.index) {
    for (const [id, defs] of byId) {
      const primary = defs.filter((d) => !d.candidate);
      if (primary.length > 1) {
        for (const d of primary) {
          out.push(
            mk("R-002", "error", r002Gate, d.canonicalPath, { targetId: id, family }, d.line, undefined, id)
          );
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
      out.push(
        mk("R-041", "warn", r041Gate, tl.canonicalPath, { targetId: tl.traceId, ref: tl.value }, tl.line, undefined, tl.traceId)
      );
    }
  }

  // ---- R-005: no-orphan-definition ----
  emitOrphans(model, out);

  // ---- Item-origin rules ----
  emitItemRules(model, out);

  return out;
}

function inIndex(model: Model, d: Definition): boolean {
  const list = model.index.get(d.family)?.get(d.id);
  return !!list && list.includes(d);
}

function emitRefFinding(ref: RefResult, model: Model, out: Finding[]): void {
  const schema = model.schema;
  // cross-repo skip
  if (ref.kind === "xrepo-skip") {
    out.push(mk("X-XREPO-001", "info", "always", ref.canonicalPath, { ref: ref.value }, ref.line));
    return;
  }
  if (ref.resolved) return;

  // dedicated rule edge (e.g. R-051/eco). Unresolved handled only by that rule.
  if (ref.ruleOverride) {
    const rule = ref.ruleOverride;
    const gate = ref.gateOverride ?? gateOfRule(rule, schema);
    // R-051 targetId = the ECO id (owner), ref = unresolved value.
    const sev: Severity = "error";
    out.push(mk(rule, sev, gate, ref.canonicalPath, { targetId: ref.fromId, ref: ref.value }, ref.line, undefined, ref.fromId));
    return;
  }

  if (ref.isIdEdge) {
    // R-003. Family label for message = first target family (or determined family).
    const targetFam = determineFamily(ref.value, schema)?.prefix;
    const famLabel = ref.families.join("/") || targetFam || "?";
    const sev = resolveEdgeSeverity(ref.edgeSeverity, targetFam ?? ref.families[0], schema);
    const gate = gateOfRule("R-003", schema);
    out.push(
      mk("R-003", sev, gate, ref.canonicalPath, { ref: ref.value, family: famLabel, targetId: ref.value }, ref.line, undefined, ref.targetId)
    );
  } else {
    // R-004 path. targetId omitted (value in message).
    const sev = resolveEdgeSeverity(ref.edgeSeverity, undefined, schema);
    const gate = gateOfRule("R-004", schema);
    out.push(mk("R-004", sev, gate, ref.canonicalPath, { ref: ref.value }, ref.line));
  }
}

function emitOrphans(model: Model, out: Finding[]): void {
  const schema = model.schema;
  const gate = gateOfRule("R-005", schema);
  // Build a set of referenced IDs (ID edges that are resolved OR point at a family/id).
  const referenced = new Set<string>();
  for (const ref of model.refs) {
    if (ref.isIdEdge && ref.targetId) referenced.add(ref.targetId);
  }
  for (const tl of model.traceLinks) {
    referenced.add(tl.value);
  }
  // Iterate definitions actually in the index; skip record families.
  const seen = new Set<string>();
  for (const [family, byId] of model.index) {
    if (RECORD_FAMILIES.has(family)) continue;
    for (const [id, defs] of byId) {
      const key = family + " " + id;
      if (seen.has(key)) continue;
      seen.add(key);
      if (!referenced.has(id)) {
        const d = defs[0];
        out.push(mk("R-005", "info", gate, d.canonicalPath, { targetId: id }, d.line, undefined, id));
      }
    }
  }
}

function emitItemRules(model: Model, out: Finding[]): void {
  const schema = model.schema;
  const parsed = model.parsed;
  const items = ebomItems(parsed);
  const units = mbomUnits(parsed);
  const chars = cpChars(parsed);
  const tmRefs = traceMapEbomRefs(parsed);

  const g = (r: string) => gateOfRule(r, schema);

  // Requirement definitions (family REQ).
  const reqDefs = allDefsOfFamily(model, "REQ");

  // R-010: every REQ referenced by >=1 E item requirement_refs.
  const reqReferenced = new Set<string>();
  for (const it of items) for (const r of it.requirementRefs) reqReferenced.add(r);
  for (const d of reqDefs) {
    if (!reqReferenced.has(d.id)) {
      out.push(mk("R-010", "error", g("R-010"), d.canonicalPath, { targetId: d.id }, d.line, undefined, d.id));
    }
  }

  // Realization maps for R-012.
  const realizedByMbom = new Set<string>();
  for (const u of units) for (const e of u.ebomRefs) realizedByMbom.add(e);

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
    } else if (it.classification === "surface") {
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

  // R-050: acceptance-evidence-coverage (latest AB covers M unit's acceptance CP rows).
  emitR050(model, out);

  // R-051 handled via dedicated-rule edge in emitRefFinding; if register absent, skip (info) — no finding.
  void changeRegisterExists;
}

function allDefsOfFamily(model: Model, family: string): Definition[] {
  const byId = model.index.get(family);
  if (!byId) return [];
  const out: Definition[] = [];
  for (const defs of byId.values()) {
    if (defs.length > 0) out.push(defs[0]);
  }
  return out;
}

function emitOracleRules(model: Model, out: Finding[]): void {
  const schema = model.schema;
  for (const pa of model.parsed) {
    const doc = pa.doc as Record<string, unknown> | undefined;
    const fo = doc?.["fixed_oracle"] as Record<string, unknown> | undefined;
    if (!fo) continue;
    const cases = Array.isArray(fo["cases"]) ? (fo["cases"] as unknown[]) : [];
    cases.forEach((raw, i) => {
      if (!raw || typeof raw !== "object") return;
      const c = raw as Record<string, unknown>;
      const id = typeof c["id"] === "string" ? (c["id"] as string) : undefined;
      if (!id) return;
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

function emitR040(model: Model, out: Finding[]): void {
  const schema = model.schema;
  const gate = gateOfRule("R-040", schema);
  // Superseded/retired items = lifecycle superseded/retired OR lineage.superseded_by non-empty.
  const superseded = new Set<string>();
  for (const d of model.definitions) {
    if (d.lifecycle === "superseded" || d.lifecycle === "retired" || d.supersededByNonEmpty) {
      superseded.add(d.id);
    }
  }
  // Active reference edges = ID edges excluding lineage.* edges.
  for (const ref of model.refs) {
    if (!ref.isIdEdge || !ref.targetId) continue;
    if (ref.kind === "xrepo-skip") continue;
    // exclude lineage.* selectors — detect by presence of ".lineage." in nothing; we track via edge?
    // We approximate: lineage edges have families [E] and target is superseded; spec excludes lineage.*.
    // The edge selector is not carried on RefResult; use a marker set below.
    if (ref.isLineage) continue;
    if (superseded.has(ref.targetId) && ref.resolved) {
      out.push(
        mk("R-040", "error", gate, ref.canonicalPath, { targetId: ref.fromId, ref: ref.targetId }, ref.line, undefined, ref.fromId)
      );
    }
  }
}

function emitR050(model: Model, out: Finding[]): void {
  const schema = model.schema;
  const gate = gateOfRule("R-050", schema);
  // Gather latest AB entry test_evidence cp_refs; M units acceptance CP rows.
  // v0: if no as-built present, nothing to check.
  let latestAb: { cpRefs: Set<string>; file: string } | undefined;
  for (const pa of model.parsed) {
    const doc = pa.doc as Record<string, unknown> | undefined;
    const ab = doc?.["as_built"];
    if (!Array.isArray(ab) || ab.length === 0) continue;
    const last = ab[ab.length - 1] as Record<string, unknown>;
    const cpRefs = new Set<string>();
    const ev = last["test_evidence_refs"];
    if (Array.isArray(ev)) {
      for (const e of ev) {
        if (e && typeof e === "object") {
          const cp = (e as Record<string, unknown>)["cp_ref"];
          if (typeof cp === "string") cpRefs.add(cp);
        }
      }
    }
    latestAb = { cpRefs, file: pa.artifact.canonicalPath };
  }
  if (!latestAb) return;
  // For each M unit acceptance_refs CP row not covered => R-050 on the CP char.
  for (const pa of model.parsed) {
    const doc = pa.doc as Record<string, unknown> | undefined;
    const mbom = doc?.["mbom"] as Record<string, unknown> | undefined;
    const units = mbom?.["manufacturing_units"];
    if (!Array.isArray(units)) continue;
    for (const raw of units) {
      if (!raw || typeof raw !== "object") continue;
      const accs = (raw as Record<string, unknown>)["acceptance_refs"];
      if (!Array.isArray(accs)) continue;
      for (const cp of accs) {
        if (typeof cp === "string" && !latestAb.cpRefs.has(cp)) {
          out.push(mk("R-050", "error", gate, latestAb.file, { targetId: cp }, undefined, undefined, cp));
        }
      }
    }
  }
}
