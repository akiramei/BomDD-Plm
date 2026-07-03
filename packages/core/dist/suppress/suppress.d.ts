import type { Finding } from "../types.js";
import type { SuppressEntry } from "../workspace/workspace.js";
export interface SuppressResult {
    findings: Finding[];
}
/**
 * Apply suppression. workspaceFileCanonical is used to build suppressRef positions.
 */
export declare function applySuppress(findings: Finding[], suppress: SuppressEntry[], workspaceFileCanonical: string | undefined): SuppressResult;
//# sourceMappingURL=suppress.d.ts.map