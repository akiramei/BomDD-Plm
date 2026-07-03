// Core shared types for bomdd-lint (§2.9 output contract shapes + internal model).

export type Severity = "error" | "warn" | "info";

/** A discovered, typed artifact file. */
export interface Artifact {
  /** logical repo name */
  repo: string;
  /** canonical path: `<repo.name>/<repo-relative>` with `/` separators (INV-004) */
  canonicalPath: string;
  /** absolute filesystem path (never emitted; used only for reads) */
  absPath: string;
  /** artifact type = the ref-edges artifacts[].file glob that matched */
  type: string;
  /** repo-relative path (posix separators) */
  relPath: string;
}

/** A finding as emitted into diagnostics.json (§2.9). */
export interface Finding {
  rule: string;
  severity: Severity;
  gate: string;
  file: string;
  line?: number;
  column?: number;
  targetId?: string;
  message: string;
  fixTarget: string;
  suppressed?: boolean;
  suppressReason?: string;
  suppressRef?: string;
}

/** A graph node = a definition site ID (§2.9). */
export interface GraphNode {
  id: string;
  family: string;
  name?: string;
  lifecycle?: string;
  file: string;
  line?: number;
}

/** A graph edge = an ID reference edge (§2.9). */
export interface GraphEdge {
  from: string;
  to: string;
  kind: string;
  file: string;
  resolved: boolean;
}

export interface LedgerEntry {
  id: string;
  title: string;
  source: string;
  status?: string;
  affectedCount?: number;
  binds?: string[];
  approver?: string;
}

export interface Ledgers {
  eco: LedgerEntry[];
  cheat: LedgerEntry[];
  decision: LedgerEntry[];
}

export interface Stats {
  files: number;
  ids: number;
  refs: number;
}

export interface RepoInfo {
  name: string;
  role?: string;
}

export interface RunInfo {
  gate: string;
  eco: boolean;
}

export interface Diagnostics {
  schemaVersion: string;
  refSchema: { version: string };
  run: RunInfo;
  workspace: { repos: RepoInfo[] };
  stats: Stats;
  findings: Finding[];
}

export interface Graph {
  schemaVersion: string;
  nodes: GraphNode[];
  edges: GraphEdge[];
}

export interface Ledger {
  schemaVersion: string;
  ledgers: Ledgers;
}
