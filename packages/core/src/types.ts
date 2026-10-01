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

/** Measurability outcome of a judged finding (ref-v0.12 measurability.states; ECO-009). */
export type Outcome = "RED" | "MEASUREMENT_FAILURE" | "NOT_APPLICABLE";

/** Closed cause vocabulary (ref-v0.12 measurability.failure_causes). */
export type MeasurementCause = "unreadable-input" | "selector-miss" | "empty-required-source" | "tool-failure";

/** A measurement cause, recorded outside the findings (plm-diag/2 `measurement[]`). */
export interface MeasurementEntry {
  cause: MeasurementCause;
  gate: string;
  family?: string;
  rule?: string;
  file?: string;
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
  outcome?: Outcome;
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

export interface OutcomeCounts {
  red: number;
  measurementFailure: number;
  notApplicable: number;
}

export interface DiagStats extends Stats {
  outcomes: OutcomeCounts;
}

export interface Diagnostics {
  schemaVersion: string;
  refSchema: { version: string };
  run: RunInfo;
  workspace: { repos: RepoInfo[] };
  stats: DiagStats;
  measurement: MeasurementEntry[];
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
