import type { Family, RefSchema } from "../schema/types.js";
export interface FamilyMatch {
    family: Family;
}
/** ID token delimiter: `[A-Za-z0-9._-]+` is one token (§2.4). */
export declare const ID_TOKEN_RE: RegExp;
/**
 * Determine the family of a full ID token.
 * Returns undefined if no family matches (=> X-ID-001 for definition values).
 */
export declare function determineFamily(id: string, schema: RefSchema): Family | undefined;
/**
 * Check whether a token belongs to one of the given target families (for reference resolution).
 * A pattern family matches by regex; a prefix family matches by `prefix` / `prefix-...`.
 */
export declare function tokenMatchesFamily(token: string, families: string[], schema: RefSchema): boolean;
/** Does a token syntactically look like an ID in any known family (for id-or-path ① test)? */
export declare function looksLikeKnownId(token: string, schema: RefSchema): Family | undefined;
//# sourceMappingURL=family.d.ts.map