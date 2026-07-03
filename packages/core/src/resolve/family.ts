// Family determination (§2.4). ①family_pattern match → ②longest prefix match.
// Ties (same prefix length) resolved by id-grammar definition order (first wins).

import type { Family, RefSchema } from "../schema/types.js";

export interface FamilyMatch {
  family: Family;
}

/** ID token delimiter: `[A-Za-z0-9._-]+` is one token (§2.4). */
export const ID_TOKEN_RE = /[A-Za-z0-9._-]+/g;

/**
 * Determine the family of a full ID token.
 * Returns undefined if no family matches (=> X-ID-001 for definition values).
 */
export function determineFamily(id: string, schema: RefSchema): Family | undefined {
  // ① family_pattern (definition order)
  for (const fam of schema.families) {
    if (fam.regex && fam.regex.test(id)) {
      return fam;
    }
  }
  // ② longest prefix match. `prefix-tail` form; prefix must be followed by `-`.
  let best: Family | undefined;
  let bestLen = -1;
  for (const fam of schema.families) {
    if (fam.familyPattern) continue; // pattern families already handled
    const p = fam.prefix;
    if (id === p || id.startsWith(p + "-")) {
      if (p.length > bestLen) {
        best = fam;
        bestLen = p.length;
      }
    }
  }
  return best;
}

/**
 * Check whether a token belongs to one of the given target families (for reference resolution).
 * A pattern family matches by regex; a prefix family matches by `prefix` / `prefix-...`.
 */
export function tokenMatchesFamily(token: string, families: string[], schema: RefSchema): boolean {
  const fam = determineFamily(token, schema);
  if (!fam) return false;
  return families.includes(fam.prefix);
}

/** Does a token syntactically look like an ID in any known family (for id-or-path ① test)? */
export function looksLikeKnownId(token: string, schema: RefSchema): Family | undefined {
  return determineFamily(token, schema);
}
