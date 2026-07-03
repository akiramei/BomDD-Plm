import type { RepoSpec } from "../discover/discover.js";
export interface SuppressEntry {
    rule?: string;
    target?: string;
    reason?: string;
    /** 1-based index in the suppress array (for suppressRef + X-SUPPRESS messages) */
    index: number;
}
export interface Workspace {
    repos: RepoSpec[];
    suppress: SuppressEntry[];
    /** canonical path of the workspace file (for suppressRef), or undefined for single-repo runs */
    workspaceFileCanonical?: string;
}
/** Thrown to signal CLI exit 2 (bad input target). */
export declare class InputExitError extends Error {
    readonly code = 2;
    constructor(message: string);
}
/**
 * Resolve the CLI target into a Workspace.
 * @param target repo directory OR a bomdd-workspace.yaml file path.
 */
export declare function resolveWorkspace(target: string): Workspace;
//# sourceMappingURL=workspace.d.ts.map