// Robust parse + tolerant accept (§2.2).
// - YAML/JSON syntax errors AND invalid UTF-8 byte sequences => X-PARSE-001 (error), skip file, continue.
// - Known authoring traps => hint appended to message.
// - Duplicate keys / empty file => X-TYPE-001 (per K-TS-DETERMINISM: dup key = X-TYPE-001 warn + last wins).
// - Type mismatches on ref-edges-typed fields => X-TYPE-001 (warn) — handled in resolve; here we surface parse-level.
import { parseDocument, LineCounter, isMap, isSeq, isScalar, isPair } from "yaml";
import { getMessage } from "../rules/messages.js";
/**
 * Detect invalid UTF-8 by round-tripping the raw bytes.
 * Node's utf8 decode replaces invalid sequences with U+FFFD; if re-encoding differs, bytes were invalid.
 * Returns the byte offset of the first replacement, or -1 if valid.
 */
export function firstInvalidUtf8Offset(buf) {
    const decoded = buf.toString("utf8");
    const reencoded = Buffer.from(decoded, "utf8");
    if (reencoded.equals(buf))
        return -1;
    // find first differing byte
    const n = Math.min(buf.length, reencoded.length);
    for (let i = 0; i < n; i++) {
        if (buf[i] !== reencoded[i])
            return i;
    }
    return n;
}
/** Compute 1-based line/column (code point units) for a byte offset in a buffer. */
function lineColForByteOffset(buf, byteOffset) {
    let line = 1;
    let column = 1;
    const upto = buf.subarray(0, Math.min(byteOffset, buf.length)).toString("utf8");
    for (const ch of upto) {
        if (ch === "\n") {
            line++;
            column = 1;
        }
        else if (ch === "\r") {
            // do not advance column for CR; LF handles newline
        }
        else {
            column++;
        }
    }
    return { line, column };
}
const CANON_TRAP_HINTS = {
    star: "hint: `*` 始まりの項目は引用符で囲む",
    colon: "hint: 行末の `:` を含む文は `>-` ブロックにするか引用符で囲む",
    quote: "hint: 項目全体を引用符で囲むか、引用符を先頭から外す",
};
/** Choose a canonical hint based on the offending source line, or undefined if none matches. */
function hintForLine(sourceLine) {
    if (sourceLine === undefined)
        return undefined;
    // Trap 1: list item beginning with `*`
    if (/^\s*-\s+\*/.test(sourceLine))
        return CANON_TRAP_HINTS.star;
    // Trap 3: item that starts with a quote but has trailing text after the closing quote
    if (/^\s*-\s+(["']).*?\1\s*\S/.test(sourceLine))
        return CANON_TRAP_HINTS.quote;
    // Trap 2: a line that ends with a colon inside a multi-line plain scalar context
    if (/\S.*:\s*$/.test(sourceLine) && !/^\s*[\w"'.\-]+\s*:\s*$/.test(sourceLine)) {
        return CANON_TRAP_HINTS.colon;
    }
    return undefined;
}
function mkFinding(rule, file, ref, extra = {}) {
    const m = getMessage(rule, { ref });
    return {
        rule,
        severity: rule === "X-TYPE-001" ? "warn" : "error",
        gate: "always",
        file,
        message: m.message,
        fixTarget: m.fixTarget,
        ...extra,
    };
}
/**
 * Parse a single artifact by its canonical type.
 * .md artifacts are NOT parsed as YAML (§2.2). They return doc=undefined with no findings.
 */
export function parseArtifact(art, raw) {
    const findings = [];
    const isMd = art.relPath.toLowerCase().endsWith(".md");
    // Invalid UTF-8 detection applies to all files (including .md).
    const badOffset = firstInvalidUtf8Offset(raw);
    if (badOffset >= 0) {
        const { line, column } = lineColForByteOffset(raw, badOffset);
        findings.push(mkFinding("X-PARSE-001", art.canonicalPath, `不正な UTF-8 バイト列(byte offset ${badOffset})`, {
            line,
            column,
        }));
        return { findings };
    }
    if (isMd) {
        // Markdown ledgers are NOT YAML-parsed (§2.2) — `doc` holds the raw text instead, so
        // downstream heading extraction (§2.4/§2.15, shared extractHeadings) has something to scan.
        let mdText = raw.toString("utf8");
        if (mdText.charCodeAt(0) === 0xfeff)
            mdText = mdText.slice(1);
        return { doc: mdText, findings };
    }
    // Strip UTF-8 BOM for parsing (line numbers stay newline-independent).
    let text = raw.toString("utf8");
    if (text.charCodeAt(0) === 0xfeff)
        text = text.slice(1);
    const lineCounter = new LineCounter();
    const isJson = art.relPath.toLowerCase().endsWith(".json");
    // uniqueKeys:true so the yaml library flags duplicate keys as a DUPLICATE_KEY composer error
    // (with uniqueKeys:false it silently last-wins with no warning at all — a detection gap;
    // §2.2 requires duplicate keys to surface as X-TYPE-001). We reclassify DUPLICATE_KEY errors
    // below instead of treating all doc.errors as syntax errors.
    const doc = parseDocument(text, {
        lineCounter,
        keepSourceTokens: false,
        uniqueKeys: true,
        strict: false,
    });
    const srcLines = text.split(/\r\n|\r|\n/);
    // Partition errors: DUPLICATE_KEY => X-TYPE-001 (warn, last-wins); everything else => X-PARSE-001.
    const dupKeyErrors = doc.errors.filter((e) => e.code === "DUPLICATE_KEY");
    const syntaxErrors = doc.errors.filter((e) => e.code !== "DUPLICATE_KEY");
    if (syntaxErrors.length > 0) {
        for (const err of syntaxErrors) {
            const pos = err.pos?.[0] ?? 0;
            const lc = lineCounter.linePos(pos);
            const sourceLine = srcLines[lc.line - 1];
            const hint = hintForLine(sourceLine);
            const cause = isJson ? `JSON 構文エラー: ${err.message}` : `YAML 構文エラー: ${err.message}`;
            const refMsg = hint ? `${cause} ${hint}` : cause;
            findings.push(mkFinding("X-PARSE-001", art.canonicalPath, refMsg, { line: lc.line, column: lc.col }));
        }
        return { findings };
    }
    for (const err of dupKeyErrors) {
        const pos = err.pos?.[0] ?? 0;
        const lc = lineCounter.linePos(pos);
        findings.push(mkFinding("X-TYPE-001", art.canonicalPath, `重複キー: ${err.message}(後勝ち採用)`, {
            line: lc.line,
            column: lc.col,
        }));
    }
    // Empty file / empty document => X-TYPE-001 (treated as structural issue per §2.2).
    // doc.errors can be empty yet doc.toJS() still throw (e.g. unresolved alias/anchor) — §2.2
    // requires detecting these too ("使用パーサが例外を投げず errors 配列に集める形式でも検出").
    let value;
    try {
        value = doc.toJS({ maxAliasCount: -1 });
    }
    catch (e) {
        findings.push(mkFinding("X-PARSE-001", art.canonicalPath, `YAML 構文エラー: ${e.message}`));
        return { findings };
    }
    if (value === null || value === undefined) {
        findings.push(mkFinding("X-TYPE-001", art.canonicalPath, "ドキュメントが空です"));
        return { doc: value, findings };
    }
    const lineOf = buildLineLookup(doc, lineCounter);
    return { doc: value, findings, lineOf };
}
/** Walk the YAML AST by path to find a node, then return its 1-based line. */
function buildLineLookup(doc, lineCounter) {
    return (path) => {
        let node = doc.contents;
        for (const key of path) {
            if (isMap(node)) {
                let found = undefined;
                for (const item of node.items) {
                    if (isPair(item) && isScalar(item.key) && String(item.key.value) === String(key)) {
                        found = item.value;
                        break;
                    }
                }
                node = found;
            }
            else if (isSeq(node) && typeof key === "number") {
                node = node.items[key];
            }
            else {
                return undefined;
            }
            if (node === undefined || node === null)
                return undefined;
        }
        const range = node.range;
        if (range && typeof range[0] === "number") {
            return lineCounter.linePos(range[0]).line;
        }
        return undefined;
    };
}
