export interface GitDiffResult {
    ok: true;
    /** repo-root-relative, `/`-separated paths (git's native output — no canonicalization needed). */
    files: string[];
}
export interface GitDiffFailure {
    ok: false;
    /** reason for the fail-open path (ENOENT = git not found; non-zero exit = bad baseline / not a git repo). */
    reason: "enoent" | "nonzero";
}
export type GitDiffOutcome = GitDiffResult | GitDiffFailure;
/**
 * Run `git -c core.quotepath=false diff --name-only <baseline> <head>` in `cwd` (the target repo's
 * absolute path). Two-point diff, NOT baseline..head / triple-dot — §2.17: 窓内の実変更, not a
 * merge-base-relative diff. `head` defaults to "HEAD" (open-ECO live window); an anchored rev
 * (§2.17 rev4 / ref-v0.8 diff_audit.head) fixes the window so verified ECOs stay deterministic.
 *
 * core.quotepath=false (K-GIT) suppresses octal-escaping of non-ASCII (e.g. Japanese) paths so the
 * returned strings are raw UTF-8, matching allowed_paths prefix comparison without re-decoding.
 *
 * spawnSync with shell:false (default) and an argv array — no shell interpolation, no quoting
 * differences across OSes (K-GIT risk_if_implicit).
 */
export declare function gitDiffNameOnly(repoAbsPath: string, baseline: string, head?: string): GitDiffOutcome;
//# sourceMappingURL=gitdiff.d.ts.map