// Runtime schema loading (§2.3). Reads id-grammar + ref-edges from a directory.
// exit 2 when: unreadable / invalid YAML / missing required top keys.
// X-SCHEMA-001 (via schemaFindings) when: individual entry selector/pattern unsupported.

import { readFileSync } from "node:fs";
import { join } from "node:path";
import { parse as yamlParse } from "yaml";
import type {
  ArtifactType,
  DefineSite,
  DistributedDefine,
  EdgeKind,
  Family,
  LintRule,
  RefEdge,
  RefSchema,
  SchemaLoadFinding,
  Strictness,
} from "./types.js";

/** Thrown to signal CLI exit code 2 (schema unusable). Caught only at the CLI boundary. */
export class SchemaExitError extends Error {
  readonly code = 2;
  constructor(message: string) {
    super(message);
    this.name = "SchemaExitError";
  }
}

function readYaml(path: string): unknown {
  let text: string;
  try {
    text = readFileSync(path, "utf8");
  } catch {
    throw new SchemaExitError(`スキーマファイルが読めません: ${path}`);
  }
  try {
    return yamlParse(text);
  } catch (e) {
    throw new SchemaExitError(`スキーマが YAML として不正です: ${path} (${(e as Error).message})`);
  }
}

function asArray(v: unknown): unknown[] {
  return Array.isArray(v) ? v : [];
}

function asString(v: unknown): string | undefined {
  return typeof v === "string" ? v : undefined;
}

/** Compile a family_pattern as an ECMAScript RegExp (no u/v flag; K-TS-DETERMINISM). */
function compilePattern(src: string): RegExp | undefined {
  try {
    return new RegExp(src);
  } catch {
    return undefined;
  }
}

function parseFamilies(grammar: Record<string, unknown>, findings: SchemaLoadFinding[]): Family[] {
  const out: Family[] = [];
  for (const raw of asArray(grammar["families"])) {
    if (typeof raw !== "object" || raw === null) continue;
    const f = raw as Record<string, unknown>;
    const prefix = asString(f["prefix"]);
    if (!prefix) continue;
    const strictness = (asString(f["strictness"]) ?? "advisory") as Strictness;
    const fam: Family = { prefix, strictness };
    const name = asString(f["name"]);
    if (name) fam.name = name;
    const pat = asString(f["family_pattern"]);
    if (pat) {
      const rx = compilePattern(pat);
      if (!rx) {
        findings.push({ ref: `families[${prefix}].family_pattern: ${pat}` });
      } else {
        fam.familyPattern = pat;
        fam.regex = rx;
      }
    }
    out.push(fam);
  }
  return out;
}

/** Normalize a `family:` value (string | array) to string[]. */
function familyList(v: unknown): string[] {
  if (typeof v === "string") return [v];
  if (Array.isArray(v)) return v.filter((x): x is string => typeof x === "string");
  return [];
}

/**
 * Determine edge kind + family list from a raw refs entry.
 * kind field explicit: path | id-or-path | path-at-rev. severity:none => kind none.
 * Otherwise ID reference (kind "id").
 */
function parseRefEdge(raw: Record<string, unknown>, findings: SchemaLoadFinding[]): RefEdge | undefined {
  const selector = asString(raw["selector"]);
  if (!selector) {
    findings.push({ ref: `refs entry without selector` });
    return undefined;
  }
  const kindStr = asString(raw["kind"]);
  const severity = asString(raw["severity"]) ?? "per-family";
  let kind: EdgeKind;
  if (kindStr === "path") kind = "path";
  else if (kindStr === "id-or-path") kind = "id-or-path";
  else if (kindStr === "path-at-rev") kind = "path-at-rev";
  else if (kindStr === undefined) kind = "id";
  else {
    findings.push({ ref: `${selector}: 未対応の kind '${kindStr}'` });
    return undefined;
  }
  // severity:none => "解決検査しない(表示・記録用)" (§2.4) regardless of the declared kind —
  // an explicit kind (e.g. id-or-path) must not defeat the none-severity opt-out.
  if (severity === "none") kind = "none";
  const edge: RefEdge = {
    selector,
    families: familyList(raw["family"]),
    kind,
    severity,
  };
  const rule = asString(raw["rule"]);
  if (rule) edge.ruleOverride = rule;
  const gate = asString(raw["gate"]);
  if (gate) edge.gateOverride = gate;
  if (raw["cross_repo"] === true) edge.crossRepo = true;
  return edge;
}

function parseDefine(raw: Record<string, unknown>): DefineSite | undefined {
  const selector = asString(raw["selector"]);
  if (!selector) return undefined;
  const d: DefineSite = { selector, families: familyList(raw["family"]) };
  if (raw["candidate"] === true) d.candidate = true;
  return d;
}

function parseArtifacts(edges: Record<string, unknown>, findings: SchemaLoadFinding[]): ArtifactType[] {
  const out: ArtifactType[] = [];
  for (const raw of asArray(edges["artifacts"])) {
    if (typeof raw !== "object" || raw === null) continue;
    const a = raw as Record<string, unknown>;
    const file = asString(a["file"]);
    if (!file) continue;
    const defines: DefineSite[] = [];
    for (const d of asArray(a["defines"])) {
      if (typeof d === "object" && d !== null) {
        const parsed = parseDefine(d as Record<string, unknown>);
        if (parsed) defines.push(parsed);
      }
    }
    const refs: RefEdge[] = [];
    for (const r of asArray(a["refs"])) {
      if (typeof r === "object" && r !== null) {
        const parsed = parseRefEdge(r as Record<string, unknown>, findings);
        if (parsed) refs.push(parsed);
      }
    }
    out.push({ file, defines, refs });
  }
  return out;
}

function parseLintRules(edges: Record<string, unknown>): LintRule[] {
  const out: LintRule[] = [];
  for (const raw of asArray(edges["lint_rules"])) {
    if (typeof raw !== "object" || raw === null) continue;
    const r = raw as Record<string, unknown>;
    const id = asString(r["id"]);
    if (!id) continue;
    out.push({
      id,
      name: asString(r["name"]),
      gate: asString(r["gate"]) ?? "always",
      severity: asString(r["severity"]) ?? "error",
    });
  }
  return out;
}

function parseDistributed(edges: Record<string, unknown>): DistributedDefine[] {
  const out: DistributedDefine[] = [];
  for (const raw of asArray(edges["distributed_defines"])) {
    if (typeof raw !== "object" || raw === null) continue;
    const d = raw as Record<string, unknown>;
    const selector = asString(d["selector"]);
    const family = asString(d["family"]);
    if (selector && family) out.push({ selector, family });
  }
  return out;
}

export function loadSchema(dir: string): RefSchema {
  const grammarRaw = readYaml(join(dir, "id-grammar.draft.yaml"));
  const edgesRaw = readYaml(join(dir, "ref-edges.draft.yaml"));
  if (typeof grammarRaw !== "object" || grammarRaw === null) {
    throw new SchemaExitError("id-grammar.draft.yaml が空か不正です");
  }
  if (typeof edgesRaw !== "object" || edgesRaw === null) {
    throw new SchemaExitError("ref-edges.draft.yaml が空か不正です");
  }
  const grammar = grammarRaw as Record<string, unknown>;
  const edges = edgesRaw as Record<string, unknown>;

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

  const schemaFindings: SchemaLoadFinding[] = [];
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
