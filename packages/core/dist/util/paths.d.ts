/** Convert an OS path (possibly backslash) to posix-style forward slashes. */
export declare function toPosix(p: string): string;
/** Build canonical path from repo name + repo-relative (posix) path. */
export declare function canonical(repoName: string, relPosix: string): string;
/**
 * Case-insensitive identity comparison for path matching (INV-004 same-file identity).
 * Used for suppress path matching and cross-repo path existence identity — NOT for sort.
 */
export declare function pathEqualsCI(a: string, b: string): boolean;
//# sourceMappingURL=paths.d.ts.map