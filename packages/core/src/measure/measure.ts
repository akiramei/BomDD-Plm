// Measurability classification (ECO-009 / ref-v0.12 `measurability`, BomDD ECO-089).
// The meaning of the four states and of the causes lives in the ref-edges `measurability` section;
// this module only maps the existing findings onto it and records the causes. It never changes a
// finding's rule, severity, gate or count (the fixed oracle compares the error/warn set exactly).
//
//   outcome on judged findings (error / warn, and the R-050 (d) info):
//     RED                 measured and violated
//     MEASUREMENT_FAILURE not measured (input unreadable, key missing, required source empty, tool failure)
//     NOT_APPLICABLE      zero targets, consistent with the upstream declaration, stated explicitly
//   measurement[]: the causes, outside the findings (one entry per family / rule), each with a gate.

import type { Finding, MeasurementEntry, MeasurementCause, Outcome } from "../types.js";
import type { Model, ParsedArtifact } from "../resolve/model.js";
import type { DefineSite } from "../schema/types.js";
import { select, parseSelector } from "../resolve/selector.js";
import { determineFamily } from "../resolve/family.js";
import { gateOfRule } from "../gate/gate.js";

/** Definition-site status of one family (ok = at least one definition was extracted). */
export type SiteStatus = "ok" | "absent" | "unreadable" | "selector-miss" | "empty";

export interface FamilySite {
  status: SiteStatus;
  /** the artifact the non-ok status was observed on (absent: none) */
  file?: string;
}

const CAUSE_OF: Record<Exclude<SiteStatus, "ok">, MeasurementCause> = {
  absent: "empty-required-source",
  unreadable: "unreadable-input",
  "selector-miss": "selector-miss",
  empty: "empty-required-source",
};

// Priority when a family has several non-ok sites: report the most specific cause.
const PRIORITY: SiteStatus[] = ["unreadable", "selector-miss", "empty", "absent"];

/** Structured, non-candidate define sites declared for a family (prose selectors excluded). */
function declaredSites(model: Model, family: string): { type: string; site: DefineSite }[] {
  const out: { type: string; site: DefineSite }[] = [];
  for (const at of model.schema.artifacts) {
    for (const d of at.defines) {
      if (d.candidate) continue;
      if (d.selector === "filename" || d.selector === "headings") continue;
      if (d.families.includes(family)) out.push({ type: at.file, site: d });
    }
  }
  return out;
}

/** The selector up to (and including) its first array segment = the container that must exist. */
function containerSelector(selector: string): string | undefined {
  const segs = parseSelector(selector);
  const idx = segs.findIndex((s) => s.isArray);
  if (idx < 0) return undefined;
  const parts = selector.split(".");
  // parseSelector splits on top-level dots; our schema selectors have no dots inside parentheses.
  const head = parts.slice(0, idx + 1).join(".");
  return head.endsWith("[]") ? head.slice(0, -2) : head;
}

function siteStatusOn(pa: ParsedArtifact, site: DefineSite): SiteStatus {
  if (pa.doc === undefined) return "unreadable";
  if (pa.doc === null || typeof pa.doc !== "object") return "empty";
  if (select(pa.doc, site.selector).length > 0) return "ok";
  const container = containerSelector(site.selector);
  if (container === undefined) return "selector-miss";
  const found = select(pa.doc, container);
  if (found.length === 0) return "selector-miss";
  const allEmpty = found.every((s) => Array.isArray(s.value) && s.value.length === 0);
  if (allEmpty) return "empty";
  return found.some((s) => !Array.isArray(s.value)) ? "selector-miss" : "empty";
}

/** Status of a family's declared definition sites. undefined = the family declares no structured site. */
export function familySite(model: Model, family: string): FamilySite | undefined {
  const sites = declaredSites(model, family);
  if (sites.length === 0) return undefined;
  const observed: FamilySite[] = [];
  for (const { type, site } of sites) {
    const arts = model.parsed.filter((pa) => pa.artifact.type === type);
    if (arts.length === 0) {
      observed.push({ status: "absent" });
      continue;
    }
    for (const pa of arts) {
      const st = siteStatusOn(pa, site);
      if (st === "ok") return { status: "ok" };
      observed.push({ status: st, file: pa.artifact.canonicalPath });
    }
  }
  for (const p of PRIORITY) {
    const hit = observed.find((o) => o.status === p);
    if (hit) return hit;
  }
  return { status: "absent" };
}

function nonCandidateDefs(model: Model, family: string): number {
  const byId = model.index.get(family);
  if (!byId) return 0;
  let n = 0;
  for (const defs of byId.values()) if (defs.some((d) => !d.candidate)) n++;
  return n;
}

const R050_UNMEASURABLE_PREFIX = "測定不能";
const R050_NOT_APPLICABLE_PREFIX = "適用外";

/**
 * Assign `outcome` to findings and collect the measurement causes. Mutates the findings in place
 * (outcome only) and returns the measurement entries.
 */
export function classify(model: Model, findings: Finding[]): MeasurementEntry[] {
  const schema = model.schema;
  const entries = new Map<string, MeasurementEntry>();
  const add = (e: MeasurementEntry) => {
    const key = [e.gate, e.rule ?? "", e.family ?? "", e.cause, e.file ?? ""].join("\u0000");
    if (!entries.has(key)) entries.set(key, e);
  };
  const siteCache = new Map<string, FamilySite | undefined>();
  const siteOf = (family: string) => {
    if (!siteCache.has(family)) siteCache.set(family, familySite(model, family));
    return siteCache.get(family);
  };
  const entryFor = (family: string, gate: string, rule?: string): MeasurementEntry | undefined => {
    const s = siteOf(family);
    if (!s || s.status === "ok") return undefined;
    const e: MeasurementEntry = { cause: CAUSE_OF[s.status], gate, family };
    if (rule !== undefined) e.rule = rule;
    if (s.file !== undefined) e.file = s.file;
    return e;
  };

  for (const f of findings) {
    let outcome: Outcome | undefined = f.severity === "info" ? undefined : "RED";
    switch (f.rule) {
      case "X-PARSE-001":
      case "X-SCHEMA-001":
        outcome = "MEASUREMENT_FAILURE";
        break;
      // X-GIT-001 (info): R-052 skipped because git / the baseline is unavailable. That fail-open is the
      // frozen ref-v0.7 decision; giving it MEASUREMENT_FAILURE would contradict "never exit 0" — declared
      // exception, left without an outcome in ECO-009.
      case "X-TYPE-001":
        if (f.message.includes("ドキュメントが空です")) outcome = "MEASUREMENT_FAILURE";
        break;
      case "R-050": {
        const reason = f.message;
        if (reason.includes(R050_UNMEASURABLE_PREFIX)) outcome = "MEASUREMENT_FAILURE";
        else if (f.severity === "info" && reason.includes(R050_NOT_APPLICABLE_PREFIX)) outcome = "NOT_APPLICABLE";
        break;
      }
      case "R-012": {
        const e = entryFor("M", f.gate, "R-012");
        if (e) {
          outcome = "MEASUREMENT_FAILURE";
          add(e);
        }
        break;
      }
      case "R-003": {
        // Cascade: the target family declares a structured definition site, and none of its sites
        // yields a definition. Undetermined families / families without a declared site stay RED.
        const fam = f.targetId !== undefined ? determineFamily(f.targetId, schema)?.prefix : undefined;
        if (fam !== undefined && nonCandidateDefs(model, fam) === 0) {
          const e = entryFor(fam, gateOfRule("R-003", schema));
          if (e) {
            outcome = "MEASUREMENT_FAILURE";
            add(e);
          }
        }
        break;
      }
      default:
        break;
    }
    if (outcome !== undefined) f.outcome = outcome;
  }

  // Rule-level causes that have no finding to carry them (upstream declarations, ref-v0.12).
  // R-011: E items unreadable or key missing (no upstream; absent / empty is the pre-design state).
  {
    const s = siteOf("E");
    if (s && (s.status === "unreadable" || s.status === "selector-miss")) {
      const e = entryFor("E", gateOfRule("R-011", schema), "R-011");
      if (e) add(e);
    }
  }
  // R-014: CP site not ok while M units' acceptance_refs name >= 1 CP.
  {
    let upstream = 0;
    for (const pa of model.parsed) {
      for (const s of select(pa.doc, "mbom.manufacturing_units[].acceptance_refs[]")) {
        if (typeof s.value === "string") upstream++;
      }
    }
    if (upstream > 0) {
      const e = entryFor("CP", gateOfRule("R-014", schema), "R-014");
      if (e) add(e);
    }
  }
  // R-050 (d): the finding already carries MEASUREMENT_FAILURE (evaluate decides); record the cause.
  if (findings.some((f) => f.rule === "R-050" && f.outcome === "MEASUREMENT_FAILURE" && f.message.includes("M unit の定義サイト"))) {
    const e = entryFor("M", gateOfRule("R-050", schema), "R-050");
    if (e) add(e);
  }

  return [...entries.values()];
}
