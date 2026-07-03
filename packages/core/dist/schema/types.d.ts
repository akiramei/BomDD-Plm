export type Strictness = "strict" | "advisory" | "reserved";
export interface Family {
    prefix: string;
    name?: string;
    strictness: Strictness;
    /** JS RegExp (ECMAScript) source, if the family uses a pattern instead of prefix match. */
    familyPattern?: string;
    /** compiled pattern, if familyPattern is present and valid */
    regex?: RegExp;
}
export type EdgeKind = "id" | "path" | "id-or-path" | "path-at-rev" | "none";
export interface RefEdge {
    /** selector string (dot + [] notation) */
    selector: string;
    /** family or families this edge references (for ID resolution). Empty for pure path edges. */
    families: string[];
    kind: EdgeKind;
    /** severity: "error" | "warn" | "info" | "none" | "per-family" | "per-edge" (resolved per §2.6) */
    severity: string;
    /** rule override (専用規則エッジ) — default R-003/R-004 depending on kind */
    ruleOverride?: string;
    /** gate override (専用規則エッジ) */
    gateOverride?: string;
    /** cross-repo resolution */
    crossRepo?: boolean;
}
export interface DefineSite {
    selector: string;
    families: string[];
    candidate?: boolean;
}
export interface ArtifactType {
    /** glob against `bomdd/`-relative path */
    file: string;
    defines: DefineSite[];
    refs: RefEdge[];
}
export interface DistributedDefine {
    selector: string;
    family: string;
}
export interface LintRule {
    id: string;
    name?: string;
    gate: string;
    /** "error" | "warn" | "info" | "per-family" | "per-edge" */
    severity: string;
}
export interface RefSchema {
    grammarVersion: string;
    edgesVersion: string;
    families: Family[];
    distributedDefines: DistributedDefine[];
    artifacts: ArtifactType[];
    lintRules: LintRule[];
    /** X-SCHEMA-001 findings produced during schema load (invalid entries disabled). */
    schemaFindings: SchemaLoadFinding[];
}
export interface SchemaLoadFinding {
    ref: string;
}
//# sourceMappingURL=types.d.ts.map