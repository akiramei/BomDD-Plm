// Workspace resolution (§2.5). Single-repo run = implicit workspace with 1 repo, no suppress.
import { readFileSync, statSync } from "node:fs";
import { basename, dirname, isAbsolute, resolve as pathResolve } from "node:path";
import { parse as yamlParse } from "yaml";
/** Thrown to signal CLI exit 2 (bad input target). */
export class InputExitError extends Error {
    code = 2;
    constructor(message) {
        super(message);
        this.name = "InputExitError";
    }
}
function isDir(p) {
    try {
        return statSync(p).isDirectory();
    }
    catch {
        return false;
    }
}
function isFile(p) {
    try {
        return statSync(p).isFile();
    }
    catch {
        return false;
    }
}
/**
 * Resolve the CLI target into a Workspace.
 * @param target repo directory OR a bomdd-workspace.yaml file path.
 */
export function resolveWorkspace(target) {
    const abs = pathResolve(target);
    if (isDir(abs)) {
        // single-repo run
        const name = basename(abs);
        return { repos: [{ name, absPath: abs }], suppress: [] };
    }
    if (isFile(abs)) {
        return parseWorkspaceFile(abs);
    }
    throw new InputExitError(`対象パスが存在しません: ${target}`);
}
function parseWorkspaceFile(absFile) {
    let text;
    try {
        text = readFileSync(absFile, "utf8");
    }
    catch {
        throw new InputExitError(`workspace ファイルが読めません: ${absFile}`);
    }
    let doc;
    try {
        doc = yamlParse(text);
    }
    catch (e) {
        throw new InputExitError(`workspace ファイルが YAML として不正です: ${e.message}`);
    }
    if (typeof doc !== "object" || doc === null) {
        throw new InputExitError("workspace ファイルが空か不正です");
    }
    const obj = doc;
    const wsDir = dirname(absFile);
    const repos = [];
    for (const raw of Array.isArray(obj["repos"]) ? obj["repos"] : []) {
        if (typeof raw !== "object" || raw === null)
            continue;
        const r = raw;
        const name = typeof r["name"] === "string" ? r["name"] : undefined;
        const p = typeof r["path"] === "string" ? r["path"] : undefined;
        if (!name || !p)
            continue;
        const repoAbs = isAbsolute(p) ? p : pathResolve(wsDir, p);
        const spec = { name, absPath: repoAbs };
        if (typeof r["role"] === "string")
            spec.role = r["role"];
        repos.push(spec);
    }
    if (repos.length === 0) {
        throw new InputExitError("workspace の repos が空です");
    }
    const suppress = [];
    const rawSup = Array.isArray(obj["suppress"]) ? obj["suppress"] : [];
    rawSup.forEach((raw, i) => {
        const s = (raw && typeof raw === "object" ? raw : {});
        const entry = { index: i };
        if (typeof s["rule"] === "string")
            entry.rule = s["rule"];
        if (typeof s["target"] === "string")
            entry.target = s["target"];
        if (typeof s["reason"] === "string")
            entry.reason = s["reason"];
        suppress.push(entry);
    });
    // canonical path of workspace file: use its basename under a synthetic repo? Spec uses
    // `<workspaceファイル正準パス>`. We use the workspace file's basename relative to its dir.
    const wsCanonical = basename(absFile);
    return { repos, suppress, workspaceFileCanonical: wsCanonical };
}
