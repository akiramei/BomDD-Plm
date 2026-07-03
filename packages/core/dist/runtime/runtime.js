// Read-only runtime guards (§2.0). Output dir must not be inside any workspace repo.
import { resolve as pathResolve, relative, sep } from "node:path";
/** Thrown to signal CLI exit 2 (output dir inside a repo, or unwritable). */
export class OutputExitError extends Error {
    code = 2;
    constructor(message) {
        super(message);
        this.name = "OutputExitError";
    }
}
/** True if `child` is inside (or equal to) `parent`. */
function isInside(parent, child) {
    const rel = relative(parent, child);
    if (rel === "")
        return true;
    return !rel.startsWith("..") && !rel.startsWith(".." + sep) && !pathIsAbsoluteEscape(rel);
}
function pathIsAbsoluteEscape(rel) {
    // On Windows, relative() returns an absolute path when drives differ.
    return /^[A-Za-z]:[\\/]/.test(rel) || rel.startsWith(sep + sep);
}
/**
 * Validate that the resolved output directory is not inside any repo.
 * @throws OutputExitError with code 2 if it is.
 */
export function validateOutDir(outDir, repos) {
    const absOut = pathResolve(outDir);
    for (const repo of repos) {
        if (isInside(repo.absPath, absOut)) {
            throw new OutputExitError(`出力先がリポ配下です(read-only 違反): ${outDir} は ${repo.name} 内`);
        }
    }
    return absOut;
}
