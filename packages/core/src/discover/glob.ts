// Minimal glob matcher (§2.1). Only `**` (dir recursion) and `*` (one segment) are metachars.
// All other chars (`?`, `[`, ...) are literal. Case-sensitive. Paths are `/`-separated.

/** Escape regex metachars except our own `*`. */
function escapeLiteral(s: string): string {
  return s.replace(/[.+?^${}()|[\]\\]/g, "\\$&");
}

/**
 * Compile a glob to a RegExp.
 * Double-star matches any number of characters including slash.
 * Single-star matches any characters except slash (within one path segment).
 * A trailing double-star + slash optionally matches zero directories, so
 * "a/[star][star]/b" matches "a/b".
 */
export function globToRegExp(glob: string): RegExp {
  let re = "^";
  let i = 0;
  while (i < glob.length) {
    const c = glob[i];
    if (c === "*") {
      if (glob[i + 1] === "*") {
        // `**`
        // consume `**`
        i += 2;
        if (glob[i] === "/") {
          // `**/` => match zero-or-more full segments
          re += "(?:.*/)?";
          i += 1;
        } else {
          re += ".*";
        }
      } else {
        re += "[^/]*";
        i += 1;
      }
    } else {
      re += escapeLiteral(c);
      i += 1;
    }
  }
  re += "$";
  return new RegExp(re);
}

export function globMatch(glob: string, path: string): boolean {
  return globToRegExp(glob).test(path);
}
