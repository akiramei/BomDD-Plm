// Path helpers. Canonical path = `<repo.name>/<repo-relative>` with `/` separators (INV-004).

/** Convert an OS path (possibly backslash) to posix-style forward slashes. */
export function toPosix(p: string): string {
  return p.replace(/\\/g, "/");
}

/** Build canonical path from repo name + repo-relative (posix) path. */
export function canonical(repoName: string, relPosix: string): string {
  const rel = relPosix.replace(/^\/+/, "");
  return `${repoName}/${rel}`;
}

/**
 * Case-insensitive identity comparison for path matching (INV-004 same-file identity).
 * Used for suppress path matching and cross-repo path existence identity — NOT for sort.
 */
export function pathEqualsCI(a: string, b: string): boolean {
  return a.toLowerCase() === b.toLowerCase();
}
