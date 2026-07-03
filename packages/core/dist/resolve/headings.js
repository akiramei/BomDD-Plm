// Heading extraction mechanism (§2.15, shared with §2.4). Common implementation for .md ledgers.
// `#`..`###` heading lines whose text contains an ID token matching a family ID.
// The FIRST matching token in the line = entry ID. Title = heading text minus that token, trimmed of
// surrounding whitespace and separators (— : - ・).
import { determineFamily, ID_TOKEN_RE } from "./family.js";
/**
 * Extract heading entries from markdown text.
 * @param familyFilter optional: only accept tokens whose family prefix is in this set.
 */
export function extractHeadings(text, schema, familyFilter) {
    const lines = text.split(/\r\n|\r|\n/);
    const entries = [];
    let headingCount = 0;
    for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        const m = /^(#{1,3})\s+(.*)$/.exec(line);
        if (!m)
            continue;
        headingCount++;
        const headingText = m[2];
        // find first ID token that matches a family (optionally filtered)
        let entryId;
        let matchStart = -1;
        let matchEnd = -1;
        ID_TOKEN_RE.lastIndex = 0;
        let tok;
        while ((tok = ID_TOKEN_RE.exec(headingText)) !== null) {
            const token = tok[0];
            const fam = determineFamily(token, schema);
            if (fam && (!familyFilter || familyFilter.includes(fam.prefix))) {
                entryId = token;
                matchStart = tok.index;
                matchEnd = tok.index + token.length;
                break;
            }
        }
        if (entryId === undefined)
            continue;
        // title = heading text minus the entry ID token, trimmed of whitespace + separators
        const before = headingText.slice(0, matchStart);
        const after = headingText.slice(matchEnd);
        const title = (before + after).replace(/^[\s—:\-・]+|[\s—:\-・]+$/g, "").trim();
        entries.push({ id: entryId, title, line: i + 1 });
    }
    return { entries, headingCount };
}
