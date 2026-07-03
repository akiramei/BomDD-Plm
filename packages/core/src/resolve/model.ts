// Model builder (§2.4). Collects definition sites, builds the ID index, resolves reference edges.
// Produces: definitions (for graph nodes + R-001/R-002/R-005), reference results (for R-003/R-004/R-041),
// and X-ID-001 / X-XREPO-001 findings.

import { existsSync } from "node:fs";
import { join } from "node:path";
import type { Artifact, Finding, GraphNode } from "../types.js";
import type { RefEdge, RefSchema } from "../schema/types.js";
import type { RepoSpec } from "../discover/discover.js";
import type { LineLookup } from "../parse/parse.js";
import { determineFamily, looksLikeKnownId, ID_TOKEN_RE } from "./family.js";
import { select } from "./selector.js";
import { extractHeadings } from "./headings.js";
import { getMessage } from "../rules/messages.js";

export interface ParsedArtifact {
  artifact: Artifact;
  doc: unknown;
  lineOf?: LineLookup;
}

export interface Definition {
  id: string;
  family: string;
  canonicalPath: string;
  line?: number;
  candidate: boolean;
  /** node attributes */
  name?: string;
  lifecycle?: string;
  supersededByNonEmpty?: boolean;
  /**
   * R-002 uniqueness scope of the originating define site (ref-v0.4).
   * "per-file" => R-002 duplicate detection is scoped to canonicalPath; unset => workspace-global.
   * Does NOT affect ID index registration / reference resolution (always workspace-global).
   */
  uniquenessScope?: "per-file";
  /** true if this definition ID (its family) is a record-only family (R-005 exempt) */
}

export interface RefResult {
  /** the reference edge's declared family list */
  families: string[];
  /** raw referenced value */
  value: string;
  /** resolved token used for ID lookup (the ID form) */
  targetId?: string;
  canonicalPath: string;
  line?: number;
  kind: string;
  resolved: boolean;
  /** the rule to emit if unresolved (default R-003 / R-004) */
  ruleOverride?: string;
  gateOverride?: string;
  crossRepo?: boolean;
  /** severity resolution basis */
  edgeSeverity: string;
  /** for graph edges: the source item ID (owner of the reference), if determinable */
  fromId?: string;
  /** true if this ref should become a graph edge (ID reference, not pure path) */
  isIdEdge: boolean;
  /** true if the edge selector is a lineage.* edge (excluded from R-040 active refs) */
  isLineage?: boolean;
  /** the edge selector (for graph kind labelling + lineage detection) */
  selector: string;
}

export interface Model {
  repos: RepoSpec[];
  schema: RefSchema;
  /** all definitions across the workspace (includes candidate) */
  definitions: Definition[];
  /** index: family -> id -> definitions (may be >1 for duplicates) */
  index: Map<string, Map<string, Definition[]>>;
  /** reference results */
  refs: RefResult[];
  /** trace_link endpoint results (R-041): from/to id-or-path */
  traceLinks: TraceLinkResult[];
  /** X-ID-001 / X-XREPO-001 findings gathered during build */
  findings: Finding[];
  /** parsed artifacts by canonical path (for ledger + trace views) */
  parsed: ParsedArtifact[];
  /** stats */
  stats: { files: number; ids: number; refs: number };
  /** graph nodes derived from definitions (non-candidate + candidate-fallback) */
  nodes: GraphNode[];
}

export interface TraceLinkResult {
  traceId: string;
  endpointField: "from" | "to";
  value: string;
  canonicalPath: string;
  line?: number;
  resolved: boolean;
}

const RECORD_FAMILIES = new Set(["TL", "UQ", "DEC", "CHEAT", "GF"]);

function asStr(v: unknown): string | undefined {
  if (typeof v === "string") return v;
  if (typeof v === "number") return String(v);
  return undefined;
}

/** Extract the artifact type record for a given artifact. */
function artifactTypeFor(art: Artifact, schema: RefSchema) {
  return schema.artifacts.find((a) => a.file === art.type);
}

/** Uppercase-derive ECO id from a `60-change-order-*.md` filename (§2.4). */
function ecoIdFromFilename(relPath: string, families: string[], schema: RefSchema): string | undefined {
  const base = relPath.replace(/^.*\//, "").replace(/\.md$/i, "");
  // right-end family ID pattern: uppercase tokens matching family from the right
  const upper = base.toUpperCase();
  // Try to find the rightmost family-matching token span. Split on non-token chars.
  ID_TOKEN_RE.lastIndex = 0;
  const tokens: { tok: string; start: number }[] = [];
  let m: RegExpExecArray | null;
  while ((m = ID_TOKEN_RE.exec(upper)) !== null) {
    tokens.push({ tok: m[0], start: m.index });
  }
  // Look from the right for a token that (uppercased) matches one of the target families.
  for (let i = tokens.length - 1; i >= 0; i--) {
    const t = tokens[i].tok;
    const fam = determineFamily(t, schema);
    if (fam && families.includes(fam.prefix)) {
      return t;
    }
  }
  return undefined;
}

export function buildModel(parsedArtifacts: ParsedArtifact[], schema: RefSchema, repos: RepoSpec[]): Model {
  const findings: Finding[] = [];
  const definitions: Definition[] = [];

  // ---- 1. Collect definitions from artifact `defines` selectors ----
  for (const pa of parsedArtifacts) {
    const at = artifactTypeFor(pa.artifact, schema);
    if (!at) continue;

    for (const def of at.defines) {
      // Special prose selectors:
      if (def.selector === "filename") {
        const id = ecoIdFromFilename(pa.artifact.relPath, def.families, schema);
        if (id) {
          const fam = determineFamily(id, schema);
          definitions.push({
            id,
            family: fam ? fam.prefix : def.families[0] ?? "?",
            canonicalPath: pa.artifact.canonicalPath,
            candidate: def.candidate === true,
          });
        }
        continue;
      }
      if (def.selector === "headings") {
        if (typeof pa.doc === "string") {
          const scan = extractHeadings(pa.doc, schema, def.families);
          for (const e of scan.entries) {
            definitions.push({
              id: e.id,
              family: determineFamily(e.id, schema)?.prefix ?? def.families[0] ?? "?",
              canonicalPath: pa.artifact.canonicalPath,
              line: e.line,
              candidate: def.candidate === true,
            });
          }
        }
        continue;
      }

      // Structured selector.
      const selected = select(pa.doc, def.selector);
      for (const s of selected) {
        const id = asStr(s.value);
        if (id === undefined) continue;
        const fam = determineFamily(id, schema);
        const line = pa.lineOf?.(s.concretePath);
        // node attributes: from the item object (parent of the id field).
        const parent = s.concretePath.length >= 1 ? parentOf(pa.doc, s.concretePath) : undefined;
        const dfn: Definition = {
          id,
          family: fam ? fam.prefix : def.families[0] ?? "?",
          canonicalPath: pa.artifact.canonicalPath,
          candidate: def.candidate === true,
        };
        if (line !== undefined) dfn.line = line;
        if (def.uniquenessScope === "per-file") dfn.uniquenessScope = "per-file";
        applyNodeAttrs(dfn, parent);
        definitions.push(dfn);

        // X-ID-001 for definition values that match no family (only for non-candidate structured defs).
        if (!fam) {
          findings.push(mkFinding("X-ID-001", pa.artifact.canonicalPath, id, { targetId: id, line }));
        }
      }
    }
  }

  // ---- 2. distributed_defines (TL trace_ids) ----
  for (const pa of parsedArtifacts) {
    if (typeof pa.doc !== "object" || pa.doc === null) continue;
    for (const dd of schema.distributedDefines) {
      const selected = select(pa.doc, stripLeadingGlob(dd.selector));
      for (const s of selected) {
        const id = asStr(s.value);
        if (id === undefined) continue;
        const line = pa.lineOf?.(s.concretePath);
        const dfn: Definition = {
          id,
          family: dd.family,
          canonicalPath: pa.artifact.canonicalPath,
          candidate: false,
        };
        if (line !== undefined) dfn.line = line;
        definitions.push(dfn);
      }
    }
  }

  // ---- 3. Build index (family -> id -> defs). Candidate defs only registered as fallback. ----
  const index = new Map<string, Map<string, Definition[]>>();
  // First pass: non-candidate.
  for (const d of definitions) {
    if (d.candidate) continue;
    addToIndex(index, d);
  }
  // Second pass: candidate fallback — only if no primary def exists for that id in that family.
  for (const d of definitions) {
    if (!d.candidate) continue;
    const fam = index.get(d.family);
    const existing = fam?.get(d.id);
    if (!existing || existing.length === 0) {
      addToIndex(index, d);
    }
  }

  // ---- 4. Resolve references ----
  const refs: RefResult[] = [];
  const traceLinks: TraceLinkResult[] = [];
  for (const pa of parsedArtifacts) {
    const at = artifactTypeFor(pa.artifact, schema);
    if (!at) continue;
    if (typeof pa.doc !== "object" || pa.doc === null) continue;

    for (const edge of at.refs) {
      resolveEdge(edge, pa, index, schema, repos, refs);
    }

    // trace_links endpoints (R-041) — from/to via id-or-path across all artifacts that have them.
    collectTraceLinks(pa, index, schema, repos, traceLinks);
  }

  // ---- 5. Stats + nodes ----
  const idCount = definitions.filter((d) => !d.candidate || isCandidateInIndex(index, d)).length;
  const stats = {
    files: parsedArtifacts.length,
    ids: idCount,
    refs: refs.length,
  };

  const nodes = buildNodes(definitions, index);

  return {
    repos,
    schema,
    definitions,
    index,
    refs,
    traceLinks,
    findings,
    parsed: parsedArtifacts,
    stats,
    nodes,
  };
}

function isCandidateInIndex(index: Map<string, Map<string, Definition[]>>, d: Definition): boolean {
  const list = index.get(d.family)?.get(d.id);
  return !!list && list.includes(d);
}

function stripLeadingGlob(sel: string): string {
  // "**.trace_links[].trace_id" -> "trace_links[].trace_id"
  return sel.replace(/^\*\*\./, "");
}

function addToIndex(index: Map<string, Map<string, Definition[]>>, d: Definition): void {
  let fam = index.get(d.family);
  if (!fam) {
    fam = new Map();
    index.set(d.family, fam);
  }
  let list = fam.get(d.id);
  if (!list) {
    list = [];
    fam.set(d.id, list);
  }
  list.push(d);
}

function parentOf(root: unknown, path: (string | number)[]): unknown {
  // parent = object containing the id field (path minus last segment)
  let node: unknown = root;
  for (let i = 0; i < path.length - 1; i++) {
    const key = path[i];
    if (Array.isArray(node) && typeof key === "number") node = node[key];
    else if (node && typeof node === "object") node = (node as Record<string, unknown>)[key as string];
    else return undefined;
  }
  return node;
}

function applyNodeAttrs(dfn: Definition, parent: unknown): void {
  if (!parent || typeof parent !== "object" || Array.isArray(parent)) return;
  const obj = parent as Record<string, unknown>;
  const name = asStr(obj["name"]) ?? asStr(obj["subject"]);
  if (name !== undefined) dfn.name = name;
  const lifecycle = asStr(obj["lifecycle_state"]) ?? asStr(obj["lifecycle"]);
  if (lifecycle !== undefined) dfn.lifecycle = lifecycle;
  const lineage = obj["lineage"];
  if (lineage && typeof lineage === "object" && !Array.isArray(lineage)) {
    const sb = (lineage as Record<string, unknown>)["superseded_by"];
    if (Array.isArray(sb) && sb.length > 0) dfn.supersededByNonEmpty = true;
  }
}

function mkFinding(
  rule: string,
  file: string,
  ref: string,
  extra: Partial<Finding> & { line?: number } = {}
): Finding {
  const m = getMessage(rule, { ref, targetId: extra.targetId });
  const f: Finding = {
    rule,
    severity: rule === "X-ID-001" ? "warn" : "info",
    gate: "always",
    file,
    message: m.message,
    fixTarget: m.fixTarget,
  };
  if (extra.line !== undefined) f.line = extra.line;
  if (extra.targetId !== undefined) f.targetId = extra.targetId;
  return f;
}

/** Resolve a single reference edge across all its selected values. */
function resolveEdge(
  edge: RefEdge,
  pa: ParsedArtifact,
  index: Map<string, Map<string, Definition[]>>,
  schema: RefSchema,
  repos: RepoSpec[],
  out: RefResult[]
): void {
  const selected = select(pa.doc, edge.selector);
  for (const s of selected) {
    const value = asStr(s.value);
    if (value === undefined) continue;
    const line = pa.lineOf?.(s.concretePath);
    const fromId = ownerIdOf(pa.doc, s.concretePath);

    if (edge.kind === "none") {
      // recorded, not resolution-checked; still emit as graph edge if it's an id? No — none = display/record.
      continue;
    }

    if (edge.kind === "path") {
      const chk = checkPath(value, repos);
      if (chk === "xrepo-skip") {
        out.push(mkPathXrepo(edge, value, pa, line, fromId));
        continue;
      }
      out.push(mkRef(edge, [], value, undefined, pa, line, chk === "resolved", false, fromId));
      continue;
    }

    if (edge.kind === "path-at-rev") {
      const pathPart = value.split("@")[0];
      const chk = checkPath(pathPart, repos);
      if (chk === "xrepo-skip") {
        out.push(mkPathXrepo(edge, value, pa, line, fromId));
        continue;
      }
      out.push(mkRef(edge, [], value, undefined, pa, line, chk === "resolved", false, fromId));
      continue;
    }

    if (edge.kind === "id-or-path") {
      // ① ID: any family_pattern/prefix match → index lookup
      const fam = looksLikeKnownId(value, schema);
      let resolved = false;
      let targetId: string | undefined;
      let isIdEdge = false;
      if (fam) {
        const inIndex = lookupIndex(index, fam.prefix, value);
        if (inIndex) {
          resolved = true;
          targetId = value;
          isIdEdge = true;
        }
      }
      if (!resolved) {
        // ② path fallback (strip #fragment)
        const pathPart = value.split("#")[0];
        const chk = checkPath(pathPart, repos);
        if (chk === "xrepo-skip") {
          out.push(mkPathXrepo(edge, value, pa, line, fromId));
          continue;
        }
        if (chk === "resolved") {
          resolved = true;
        } else if (fam) {
          // family-shaped but unresolved: it's an unresolved ID reference (R-003)
          targetId = value;
          isIdEdge = true;
        }
      }
      out.push(mkRef(edge, edge.families, value, targetId, pa, line, resolved, isIdEdge, fromId));
      continue;
    }

    // kind === "id": ID reference against target family index.
    const crossRepo = edge.crossRepo === true;
    if (crossRepo && !hasCandidateRepo(edge.families, index, schema)) {
      // No candidate repo for this family in workspace => X-XREPO-001 (skip/info).
      pushXrepo(edge, value, pa, line, out, schema);
      continue;
    }
    const targetFam = determineFamily(value, schema);
    let resolved = false;
    if (targetFam && edge.families.includes(targetFam.prefix)) {
      resolved = lookupIndex(index, targetFam.prefix, value);
    } else if (targetFam) {
      // token matches a family not in edge.families — check all listed families anyway.
      resolved = edge.families.some((f) => lookupIndex(index, f, value));
    } else {
      resolved = edge.families.some((f) => lookupIndex(index, f, value));
    }
    out.push(mkRef(edge, edge.families, value, value, pa, line, resolved, true, fromId));
  }
}

function pushXrepo(
  edge: RefEdge,
  value: string,
  pa: ParsedArtifact,
  line: number | undefined,
  out: RefResult[],
  _schema: RefSchema
): void {
  const r = mkRef(edge, edge.families, value, value, pa, line, true, true, ownerIdOf(pa.doc, []));
  r.crossRepo = true;
  // mark as resolved=true so no R-003; the X-XREPO info finding is emitted in rules stage.
  r.kind = "xrepo-skip";
  out.push(r);
}

/**
 * rev3/ECO-002 CH-3: `repo:相対` path reference whose repo name is absent from the workspace.
 * Same skip semantics as the ID cross_repo skip (X-XREPO-001 info) — the emitted RefResult
 * is marked resolved (no R-004) with kind "xrepo-skip" so the rules stage emits X-XREPO-001 once.
 */
function mkPathXrepo(
  edge: RefEdge,
  value: string,
  pa: ParsedArtifact,
  line: number | undefined,
  fromId: string | undefined
): RefResult {
  const r = mkRef(edge, [], value, undefined, pa, line, true, false, fromId);
  r.kind = "xrepo-skip";
  return r;
}

function hasCandidateRepo(
  families: string[],
  index: Map<string, Map<string, Definition[]>>,
  _schema: RefSchema
): boolean {
  // A candidate repo exists if any definition site of the target family exists anywhere in the workspace.
  return families.some((f) => {
    const fam = index.get(f);
    return !!fam && fam.size > 0;
  });
}

function mkRef(
  edge: RefEdge,
  families: string[],
  value: string,
  targetId: string | undefined,
  pa: ParsedArtifact,
  line: number | undefined,
  resolved: boolean,
  isIdEdge: boolean,
  fromId: string | undefined
): RefResult {
  const r: RefResult = {
    families,
    value,
    canonicalPath: pa.artifact.canonicalPath,
    kind: edge.kind,
    resolved,
    edgeSeverity: edge.severity,
    isIdEdge,
    selector: edge.selector,
  };
  if (/\.lineage\./.test(edge.selector)) r.isLineage = true;
  if (targetId !== undefined) r.targetId = targetId;
  if (line !== undefined) r.line = line;
  if (edge.ruleOverride) r.ruleOverride = edge.ruleOverride;
  if (edge.gateOverride) r.gateOverride = edge.gateOverride;
  if (edge.crossRepo) r.crossRepo = true;
  if (fromId !== undefined) r.fromId = fromId;
  return r;
}

/** Find the owner item's `id` for a reference path (nearest ancestor object with an `id`). */
function ownerIdOf(root: unknown, path: (string | number)[]): string | undefined {
  let node: unknown = root;
  let ownerId: string | undefined;
  for (let i = 0; i < path.length; i++) {
    if (node && typeof node === "object" && !Array.isArray(node)) {
      const id = (node as Record<string, unknown>)["id"];
      if (typeof id === "string") ownerId = id;
      const cid = (node as Record<string, unknown>)["contract_id"];
      if (typeof cid === "string") ownerId = cid;
    }
    const key = path[i];
    if (Array.isArray(node) && typeof key === "number") node = node[key];
    else if (node && typeof node === "object") node = (node as Record<string, unknown>)[key as string];
    else break;
  }
  if (node && typeof node === "object" && !Array.isArray(node)) {
    const id = (node as Record<string, unknown>)["id"];
    if (typeof id === "string") ownerId = id;
  }
  return ownerId;
}

function lookupIndex(
  index: Map<string, Map<string, Definition[]>>,
  family: string,
  id: string
): boolean {
  const fam = index.get(family);
  if (!fam) return false;
  const list = fam.get(id);
  return !!list && list.length > 0;
}

/**
 * Path existence check with the three acceptance forms of §2.4 (rev2/rev3, ref-v0.4/.7).
 *   1. Canonical `<repo>/<rel>` — if the leading segment is a workspace repo name, check
 *      relative to that repo.
 *   2. repo-relative `<rel>` (no repo prefix) — resolve against ANY repo. Segment count is
 *      irrelevant (single segment `test` / `single.md` accepted); file or dir both accepted.
 *   3. `repo:rel` — equivalent to canonical (`:` read as `/`). If the repo name is absent
 *      from the workspace, **X-XREPO-001-skip** (rev3/ECO-002 CH-3) — no fallback to form 2
 *      (the explicit repo name is intent; same semantics as the ID cross_repo skip).
 *      If the repo name IS present but the path itself is absent, this stays a normal
 *      R-004 unresolved (§2.4 rev3: "repo 名が実在しパスが不在の場合は従来どおり R-004").
 * Forms 1 and 2 combine: a leading segment that is NOT a repo name is tried as form 2
 * (§2.4: "正準形の先頭セグメントが repo 名に一致しない場合は形式2 として扱う").
 * `existsSync` is used for both files and directories (存在検査).
 */
type PathCheck = "resolved" | "unresolved" | "xrepo-skip";

function checkPath(value: string, repos: RepoSpec[]): PathCheck {
  // Form 3: `repo名:相対` — strict, no fallback to form 2.
  const colon = value.indexOf(":");
  // Guard against Windows drive-letter / bare `:`: only treat as form 3 when there is a
  // repo-name segment before the colon and a relative part after it.
  if (colon > 0 && colon < value.length - 1) {
    const repoName = value.slice(0, colon);
    const rel = value.slice(colon + 1);
    const repo = repos.find((r) => r.name === repoName);
    if (repo) {
      return existsSync(join(repo.absPath, ...splitPath(rel))) ? "resolved" : "unresolved";
    }
    // repo name not in workspace => X-XREPO-001 skip (rev3/CH-3; do NOT fall back to form 2).
    return "xrepo-skip";
  }

  const segs = splitPath(value);

  // Form 1: canonical `<repo>/<rel>` — leading segment matches a repo name.
  if (segs.length >= 2) {
    const repo = repos.find((r) => r.name === segs[0]);
    if (repo && existsSync(join(repo.absPath, ...segs.slice(1)))) {
      return "resolved";
    }
    // leading segment is not a repo name (or that repo path did not exist):
    // fall through to form 2 (repo-relative against all repos).
  }

  // Form 2: repo-relative — try the whole value relative to any repo. Any segment count.
  return repos.some((r) => existsSync(join(r.absPath, ...segs))) ? "resolved" : "unresolved";
}

/** Split a `/`-separated relative path into segments (drops empty segments from `//`). */
function splitPath(rel: string): string[] {
  return rel.split("/").filter((s) => s.length > 0);
}

function collectTraceLinks(
  pa: ParsedArtifact,
  index: Map<string, Map<string, Definition[]>>,
  schema: RefSchema,
  repos: RepoSpec[],
  out: TraceLinkResult[]
): void {
  // trace_links appear at various selectors; find any `trace_links` arrays with from/to.
  const found = findAllTraceLinks(pa.doc, []);
  for (const tl of found) {
    const obj = tl.value as Record<string, unknown>;
    const traceId = asStr(obj["trace_id"]) ?? "";
    for (const field of ["from", "to"] as const) {
      const v = asStr(obj[field]);
      if (v === undefined) continue;
      const line = pa.lineOf?.([...tl.path, field]);
      const resolved = resolveIdOrPath(v, index, schema, repos);
      const r: TraceLinkResult = {
        traceId,
        endpointField: field,
        value: v,
        canonicalPath: pa.artifact.canonicalPath,
        resolved,
      };
      if (line !== undefined) r.line = line;
      out.push(r);
    }
  }
}

function findAllTraceLinks(
  node: unknown,
  path: (string | number)[]
): { value: unknown; path: (string | number)[] }[] {
  const out: { value: unknown; path: (string | number)[] }[] = [];
  if (Array.isArray(node)) {
    node.forEach((item, i) => out.push(...findAllTraceLinks(item, [...path, i])));
  } else if (node && typeof node === "object") {
    for (const [k, v] of Object.entries(node)) {
      if (k === "trace_links" && Array.isArray(v)) {
        v.forEach((item, i) => {
          if (item && typeof item === "object") out.push({ value: item, path: [...path, k, i] });
        });
      } else {
        out.push(...findAllTraceLinks(v, [...path, k]));
      }
    }
  }
  return out;
}

function resolveIdOrPath(
  value: string,
  index: Map<string, Map<string, Definition[]>>,
  schema: RefSchema,
  repos: RepoSpec[]
): boolean {
  const fam = looksLikeKnownId(value, schema);
  if (fam && lookupIndex(index, fam.prefix, value)) return true;
  const pathPart = value.split("#")[0];
  const chk = checkPath(pathPart, repos);
  // rev3/CH-3: a `repo:相対` endpoint whose repo is absent from the workspace is a skip, not an
  // unresolved trace_link endpoint — the same value/selector already yields one X-XREPO-001 via
  // the parallel ref-edge (kind: id-or-path) resolution path; R-041 must not double-report it.
  return chk === "resolved" || chk === "xrepo-skip";
}

/** Build graph nodes from definitions actually present in the index (non-candidate + candidate-fallback). */
function buildNodes(
  definitions: Definition[],
  index: Map<string, Map<string, Definition[]>>
): GraphNode[] {
  const nodes: GraphNode[] = [];
  const seen = new Set<string>();
  for (const d of definitions) {
    if (!isCandidateInIndex(index, d) && d.candidate) continue;
    const key = d.family + "\u0000" + d.id;
    if (seen.has(key)) continue;
    seen.add(key);
    const n: GraphNode = { id: d.id, family: d.family, file: d.canonicalPath };
    if (d.name !== undefined) n.name = d.name;
    if (d.lifecycle !== undefined) n.lifecycle = d.lifecycle;
    if (d.line !== undefined) n.line = d.line;
    nodes.push(n);
  }
  return nodes;
}

export { RECORD_FAMILIES };
