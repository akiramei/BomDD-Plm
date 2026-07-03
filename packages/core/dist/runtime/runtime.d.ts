import type { RepoSpec } from "../discover/discover.js";
/** Thrown to signal CLI exit 2 (output dir inside a repo, or unwritable). */
export declare class OutputExitError extends Error {
    readonly code = 2;
    constructor(message: string);
}
/**
 * Validate that the resolved output directory is not inside any repo.
 * @throws OutputExitError with code 2 if it is.
 */
export declare function validateOutDir(outDir: string, repos: RepoSpec[]): string;
//# sourceMappingURL=runtime.d.ts.map