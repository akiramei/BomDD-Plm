// Item-level accessors over parsed artifacts, for item-origin rules (R-010..R-051).
// Reads plain JS values produced by the parser.

import type { ParsedArtifact } from "../resolve/model.js";

export interface EbomItem {
  id: string;
  classification?: string;
  lifecycleState?: string;
  requirementRefs: string[];
  acceptanceRefs: string[];
  kbomRefs: string[];
  externalSourceRef?: string;
  displayContractRefs: string[];
  designSystemRefs: string[];
  file: string;
  line?: number;
}

export interface MbomUnit {
  id: string;
  ebomRefs: string[];
  file: string;
}

export interface CpChar {
  id: string;
  depth?: string;
  testVectors: unknown[];
  file: string;
  line?: number;
}

function arrStr(v: unknown): string[] {
  if (!Array.isArray(v)) return [];
  return v.filter((x): x is string => typeof x === "string");
}

function str(v: unknown): string | undefined {
  return typeof v === "string" ? v : undefined;
}

export function ebomItems(parsed: ParsedArtifact[]): EbomItem[] {
  const out: EbomItem[] = [];
  for (const pa of parsed) {
    const doc = pa.doc as Record<string, unknown> | undefined;
    const ebom = doc?.["ebom"] as Record<string, unknown> | undefined;
    const items = ebom?.["items"];
    if (!Array.isArray(items)) continue;
    items.forEach((raw, i) => {
      if (!raw || typeof raw !== "object") return;
      const it = raw as Record<string, unknown>;
      const id = str(it["id"]);
      if (!id) return;
      const item: EbomItem = {
        id,
        requirementRefs: arrStr(it["requirement_refs"]),
        acceptanceRefs: arrStr(it["acceptance_refs"]),
        kbomRefs: arrStr(it["kbom_refs"]),
        displayContractRefs: arrStr(it["display_contract_refs"]),
        designSystemRefs: arrStr(it["design_system_refs"]),
        file: pa.artifact.canonicalPath,
      };
      const cls = str(it["classification"]);
      if (cls) item.classification = cls;
      const lc = str(it["lifecycle_state"]) ?? str(it["lifecycle"]);
      if (lc) item.lifecycleState = lc;
      const ext = str(it["external_source_ref"]);
      if (ext) item.externalSourceRef = ext;
      const line = pa.lineOf?.(["ebom", "items", i, "id"]);
      if (line !== undefined) item.line = line;
      out.push(item);
    });
  }
  return out;
}

export function mbomUnits(parsed: ParsedArtifact[]): MbomUnit[] {
  const out: MbomUnit[] = [];
  for (const pa of parsed) {
    const doc = pa.doc as Record<string, unknown> | undefined;
    const mbom = doc?.["mbom"] as Record<string, unknown> | undefined;
    const units = mbom?.["manufacturing_units"];
    if (!Array.isArray(units)) continue;
    for (const raw of units) {
      if (!raw || typeof raw !== "object") continue;
      const u = raw as Record<string, unknown>;
      const id = str(u["id"]);
      if (!id) continue;
      out.push({ id, ebomRefs: arrStr(u["ebom_refs"]), file: pa.artifact.canonicalPath });
    }
  }
  return out;
}

export function cpChars(parsed: ParsedArtifact[]): CpChar[] {
  const out: CpChar[] = [];
  for (const pa of parsed) {
    const doc = pa.doc as Record<string, unknown> | undefined;
    const cp = doc?.["control_plan"] as Record<string, unknown> | undefined;
    const chars = cp?.["characteristics"];
    if (!Array.isArray(chars)) continue;
    chars.forEach((raw, i) => {
      if (!raw || typeof raw !== "object") return;
      const c = raw as Record<string, unknown>;
      const id = str(c["id"]);
      if (!id) return;
      const tv = c["test_vectors"];
      const ch: CpChar = {
        id,
        testVectors: Array.isArray(tv) ? tv : [],
        file: pa.artifact.canonicalPath,
      };
      const depth = str(c["depth"]);
      if (depth) ch.depth = depth;
      const line = pa.lineOf?.(["control_plan", "characteristics", i, "id"]);
      if (line !== undefined) ch.line = line;
      out.push(ch);
    });
  }
  return out;
}

/** All ui-trace-map ebomItemRef values across the workspace (for R-020). */
export function traceMapEbomRefs(parsed: ParsedArtifact[]): Set<string> {
  const refs = new Set<string>();
  for (const pa of parsed) {
    if (!pa.artifact.relPath.toLowerCase().endsWith("ui-trace-map.json")) continue;
    const doc = pa.doc as Record<string, unknown> | undefined;
    const entries = doc?.["entries"];
    if (!Array.isArray(entries)) continue;
    for (const raw of entries) {
      if (!raw || typeof raw !== "object") continue;
      const e = raw as Record<string, unknown>;
      for (const r of arrStr(e["ebomItemRef"])) refs.add(r);
    }
  }
  return refs;
}

/** Design-system-bom surface parts (for R-021). */
export function designSurfaceParts(
  parsed: ParsedArtifact[]
): { id: string; file: string; line?: number; coverageStatus?: string }[] {
  const out: { id: string; file: string; line?: number; coverageStatus?: string }[] = [];
  for (const pa of parsed) {
    const doc = pa.doc as Record<string, unknown> | undefined;
    const dsb = doc?.["design_system_bom"] as Record<string, unknown> | undefined;
    const parts = dsb?.["ebom_surface_parts"];
    if (!Array.isArray(parts)) continue;
    const cov = Array.isArray(dsb?.["coverage_matrix"]) ? (dsb!["coverage_matrix"] as unknown[]) : [];
    parts.forEach((raw, i) => {
      if (!raw || typeof raw !== "object") return;
      const p = raw as Record<string, unknown>;
      const id = str(p["id"]);
      if (!id) return;
      const entry: { id: string; file: string; line?: number; coverageStatus?: string } = {
        id,
        file: pa.artifact.canonicalPath,
      };
      const line = pa.lineOf?.(["design_system_bom", "ebom_surface_parts", i, "id"]);
      if (line !== undefined) entry.line = line;
      // coverage status: look for a matrix row referencing this part with out-of-scope
      for (const cRaw of cov) {
        if (cRaw && typeof cRaw === "object") {
          const c = cRaw as Record<string, unknown>;
          if (arrStr(c["parts"]).includes(id)) {
            const cs = str(c["coverage_status"]);
            if (cs) entry.coverageStatus = cs;
          }
        }
      }
      out.push(entry);
    });
  }
  return out;
}

/** change-register presence + entries (for R-051). */
export function changeRegisterExists(parsed: ParsedArtifact[]): boolean {
  return parsed.some((pa) => pa.artifact.relPath.toLowerCase().endsWith("60-change-register.yaml"));
}
