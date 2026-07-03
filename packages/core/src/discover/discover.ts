// Artifact discovery (§2.1). Scan each repo's `bomdd/` tree; type files by ref-edges artifacts[].file glob.
// 1 file = 1 type; first matching pattern in artifacts[] order wins. Non-matching files are ignored.
// Symbolic links are not followed (K-NODE-PORTABILITY).

import { readdirSync, statSync, lstatSync } from "node:fs";
import { join } from "node:path";
import type { Artifact } from "../types.js";
import type { RefSchema } from "../schema/types.js";
import { globMatch } from "./glob.js";
import { canonical } from "../util/paths.js";

export interface RepoSpec {
  name: string;
  /** absolute path to repo root */
  absPath: string;
  role?: string;
}

/** Recursively list repo-relative posix paths under `bomdd/`, sorted (K-TS-DETERMINISM). */
function listBomddFiles(repoAbs: string): string[] {
  const out: string[] = [];
  const root = join(repoAbs, "bomdd");
  function walk(dirAbs: string, relPosix: string): void {
    let entries: string[];
    try {
      entries = readdirSync(dirAbs);
    } catch {
      return;
    }
    entries.sort(); // deterministic; sort before processing
    for (const name of entries) {
      const childAbs = join(dirAbs, name);
      const childRel = relPosix ? `${relPosix}/${name}` : name;
      let st;
      try {
        st = lstatSync(childAbs);
      } catch {
        continue;
      }
      if (st.isSymbolicLink()) continue; // do not follow symlinks
      if (st.isDirectory()) {
        walk(childAbs, childRel);
      } else if (st.isFile()) {
        out.push(`bomdd/${childRel}`);
      }
    }
  }
  try {
    statSync(root);
  } catch {
    return out;
  }
  walk(root, "");
  return out;
}

/**
 * Discover typed artifacts across the workspace. Returns a sorted (by canonicalPath) list.
 */
export function discover(repos: RepoSpec[], schema: RefSchema): Artifact[] {
  const out: Artifact[] = [];
  for (const repo of repos) {
    const files = listBomddFiles(repo.absPath);
    for (const relPosix of files) {
      // First artifacts[] pattern (in order) that matches wins.
      let matched: string | undefined;
      for (const at of schema.artifacts) {
        if (globMatch(at.file, relPosix)) {
          matched = at.file;
          break;
        }
      }
      if (matched === undefined) continue; // pattern-external file: ignored
      out.push({
        repo: repo.name,
        canonicalPath: canonical(repo.name, relPosix),
        absPath: join(repo.absPath, ...relPosix.split("/")),
        type: matched,
        relPath: relPosix,
      });
    }
  }
  out.sort((a, b) => (a.canonicalPath < b.canonicalPath ? -1 : a.canonicalPath > b.canonicalPath ? 1 : 0));
  return out;
}
