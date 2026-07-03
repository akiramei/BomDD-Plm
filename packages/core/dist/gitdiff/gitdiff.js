// git read-only diff adapter (K-GIT, §2.17). Used only by R-052 (eco-diff-within-impact).
// Read-only: the only subcommand issued is `diff --name-only`. No write subcommand exists in
// this module by construction (K-GIT: "書き込み系の発行はコード上存在させない").
import { spawnSync } from "node:child_process";
/**
 * Run `git -c core.quotepath=false diff --name-only <baseline> HEAD` in `cwd` (the target repo's
 * absolute path). Two-point diff (baseline HEAD), NOT baseline..HEAD / triple-dot — §2.17: "baseline
 * から現在まで" の実変更, not a merge-base-relative diff.
 *
 * core.quotepath=false (K-GIT) suppresses octal-escaping of non-ASCII (e.g. Japanese) paths so the
 * returned strings are raw UTF-8, matching allowed_paths prefix comparison without re-decoding.
 *
 * spawnSync with shell:false (default) and an argv array — no shell interpolation, no quoting
 * differences across OSes (K-GIT risk_if_implicit).
 */
export function gitDiffNameOnly(repoAbsPath, baseline) {
    const res = spawnSync("git", ["-c", "core.quotepath=false", "diff", "--name-only", baseline, "HEAD"], { cwd: repoAbsPath, encoding: "utf8" });
    if (res.error) {
        // ENOENT (git not installed) or other spawn failure => fail-open.
        return { ok: false, reason: "enoent" };
    }
    if (res.status !== 0) {
        // Non-git-repo / unresolvable baseline / other git failure => fail-open.
        return { ok: false, reason: "nonzero" };
    }
    const out = res.stdout ?? "";
    const files = out.split("\n").filter((line) => line.length > 0);
    return { ok: true, files };
}
