// Test helper: run the built CLI (packages/cli/dist/main.js) as a child process, capturing
// stdout/stderr/exit code. Used by L1/L2 harness tests (CP-CLI-011, L1 smoke §40-work-order.md).

import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const __dirname = dirname(fileURLToPath(import.meta.url));
export const REPO_ROOT = join(__dirname, "..", "..");
export const CLI_MAIN = join(REPO_ROOT, "packages", "cli", "dist", "main.js");

/**
 * @param {string[]} args
 * @returns {{ stdout: string, stderr: string, status: number }}
 */
export function runCli(args) {
  const res = spawnSync(process.execPath, [CLI_MAIN, ...args], {
    encoding: "utf8",
    cwd: REPO_ROOT,
  });
  return {
    stdout: res.stdout ?? "",
    stderr: res.stderr ?? "",
    status: res.status ?? -1,
  };
}
