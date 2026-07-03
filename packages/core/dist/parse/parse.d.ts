import type { Artifact, Finding } from "../types.js";
/** Map a concrete path (keys/indexes) to a 1-based line number, or undefined. */
export type LineLookup = (path: (string | number)[]) => number | undefined;
export interface ParseResult {
    doc?: unknown;
    findings: Finding[];
    lineOf?: LineLookup;
}
/**
 * Detect invalid UTF-8 by round-tripping the raw bytes.
 * Node's utf8 decode replaces invalid sequences with U+FFFD; if re-encoding differs, bytes were invalid.
 * Returns the byte offset of the first replacement, or -1 if valid.
 */
export declare function firstInvalidUtf8Offset(buf: Buffer): number;
/**
 * Parse a single artifact by its canonical type.
 * .md artifacts are NOT parsed as YAML (§2.2). They return doc=undefined with no findings.
 */
export declare function parseArtifact(art: Artifact, raw: Buffer): ParseResult;
//# sourceMappingURL=parse.d.ts.map