// Test helper (S-22, 40-work-order.md §2): build a throwaway git repo in a temp dir for R-052 /
// X-GIT-001 fixtures. The repo lives ONLY under os.tmpdir() — this repository itself must never
// carry a .git (BOM製造条件). All git invocations pass -c user.email/-c user.name so tests are
// hermetic regardless of the host's global git config.

import { spawnSync } from "node:child_process";
import { mkdtempSync, writeFileSync, mkdirSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, dirname } from "node:path";

const GIT_ENV = ["-c", "user.email=fixture@example.invalid", "-c", "user.name=fixture"];

/** True if a usable `git` binary is on PATH (used to fail-open/skip git-dependent tests). */
export function gitAvailable() {
  const r = spawnSync("git", ["--version"], { encoding: "utf8" });
  return !r.error && r.status === 0;
}

function run(cwd, args) {
  const r = spawnSync("git", [...GIT_ENV, ...args], { cwd, encoding: "utf8" });
  if (r.error || r.status !== 0) {
    throw new Error(`git ${args.join(" ")} failed: ${r.error ?? r.stderr}`);
  }
  return r.stdout;
}

/**
 * Write `relPath` (posix-separated, may include subdirs) with `content` under `repoDir`.
 */
function writeRepoFile(repoDir, relPath, content) {
  const abs = join(repoDir, ...relPath.split("/"));
  mkdirSync(dirname(abs), { recursive: true });
  writeFileSync(abs, content, "utf8");
}

/**
 * Build a fresh git repo under a new temp dir, with an initial commit, and return helpers to
 * write more files / commit / tag against it. The temp dir's basename becomes the single-repo
 * run's repo name (resolveWorkspace §2.5).
 */
export function initGitFixture(prefix) {
  const repoDir = mkdtempSync(join(tmpdir(), prefix));
  run(repoDir, ["init", "-q"]);
  run(repoDir, ["config", "core.autocrlf", "false"]);
  return {
    dir: repoDir,
    write(relPath, content) {
      writeRepoFile(repoDir, relPath, content);
    },
    addAll() {
      run(repoDir, ["add", "-A"]);
    },
    commit(message) {
      run(repoDir, ["-c", "commit.gpgsign=false", "commit", "-q", "-m", message]);
    },
    tag(name) {
      run(repoDir, ["tag", name]);
    },
    rev(ref) {
      return run(repoDir, ["rev-parse", ref]).trim();
    },
  };
}
