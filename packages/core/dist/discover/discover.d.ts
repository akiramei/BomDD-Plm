import type { Artifact } from "../types.js";
import type { RefSchema } from "../schema/types.js";
export interface RepoSpec {
    name: string;
    /** absolute path to repo root */
    absPath: string;
    role?: string;
}
/**
 * Discover typed artifacts across the workspace. Returns a sorted (by canonicalPath) list.
 */
export declare function discover(repos: RepoSpec[], schema: RefSchema): Artifact[];
//# sourceMappingURL=discover.d.ts.map