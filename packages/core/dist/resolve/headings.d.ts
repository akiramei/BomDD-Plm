import type { RefSchema } from "../schema/types.js";
export interface HeadingEntry {
    id: string;
    title: string;
    line: number;
}
export interface HeadingScan {
    /** entries whose heading contained a family-matching ID token */
    entries: HeadingEntry[];
    /** total heading count (#..###) regardless of ID match */
    headingCount: number;
}
/**
 * Extract heading entries from markdown text.
 * @param familyFilter optional: only accept tokens whose family prefix is in this set.
 */
export declare function extractHeadings(text: string, schema: RefSchema, familyFilter?: string[]): HeadingScan;
//# sourceMappingURL=headings.d.ts.map