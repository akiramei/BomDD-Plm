import type { Artifact, Finding, GraphNode } from "../types.js";
import type { RefSchema } from "../schema/types.js";
import type { RepoSpec } from "../discover/discover.js";
import type { LineLookup } from "../parse/parse.js";
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
    stats: {
        files: number;
        ids: number;
        refs: number;
    };
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
declare const RECORD_FAMILIES: Set<string>;
export declare function buildModel(parsedArtifacts: ParsedArtifact[], schema: RefSchema, repos: RepoSpec[]): Model;
export { RECORD_FAMILIES };
//# sourceMappingURL=model.d.ts.map