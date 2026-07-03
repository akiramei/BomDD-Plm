// Workspace resolution (§2.5). Single-repo run = implicit workspace with 1 repo, no suppress.

import { readFileSync, statSync } from "node:fs";
import { basename, dirname, isAbsolute, resolve as pathResolve } from "node:path";
import { parse as yamlParse } from "yaml";
import type { RepoSpec } from "../discover/discover.js";

export interface SuppressEntry {
  rule?: string;
  target?: string;
  reason?: string;
  /** 1-based index in the suppress array (for suppressRef + X-SUPPRESS messages) */
  index: number;
}

export interface Workspace {
  repos: RepoSpec[];
  suppress: SuppressEntry[];
  /** canonical path of the workspace file (for suppressRef), or undefined for single-repo runs */
  workspaceFileCanonical?: string;
}

/** Thrown to signal CLI exit 2 (bad input target). */
export class InputExitError extends Error {
  readonly code = 2;
  constructor(message: string) {
    super(message);
    this.name = "InputExitError";
  }
}

function isDir(p: string): boolean {
  try {
    return statSync(p).isDirectory();
  } catch {
    return false;
  }
}

function isFile(p: string): boolean {
  try {
    return statSync(p).isFile();
  } catch {
    return false;
  }
}

/**
 * Resolve the CLI target into a Workspace.
 * @param target repo directory OR a bomdd-workspace.yaml file path.
 */
export function resolveWorkspace(target: string): Workspace {
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

function parseWorkspaceFile(absFile: string): Workspace {
  let text: string;
  try {
    text = readFileSync(absFile, "utf8");
  } catch {
    throw new InputExitError(`workspace ファイルが読めません: ${absFile}`);
  }
  let doc: unknown;
  try {
    doc = yamlParse(text);
  } catch (e) {
    throw new InputExitError(`workspace ファイルが YAML として不正です: ${(e as Error).message}`);
  }
  if (typeof doc !== "object" || doc === null) {
    throw new InputExitError("workspace ファイルが空か不正です");
  }
  const obj = doc as Record<string, unknown>;
  const wsDir = dirname(absFile);
  const repos: RepoSpec[] = [];
  for (const raw of Array.isArray(obj["repos"]) ? (obj["repos"] as unknown[]) : []) {
    if (typeof raw !== "object" || raw === null) continue;
    const r = raw as Record<string, unknown>;
    const name = typeof r["name"] === "string" ? (r["name"] as string) : undefined;
    const p = typeof r["path"] === "string" ? (r["path"] as string) : undefined;
    if (!name || !p) continue;
    const repoAbs = isAbsolute(p) ? p : pathResolve(wsDir, p);
    const spec: RepoSpec = { name, absPath: repoAbs };
    if (typeof r["role"] === "string") spec.role = r["role"] as string;
    repos.push(spec);
  }
  if (repos.length === 0) {
    throw new InputExitError("workspace の repos が空です");
  }
  const suppress: SuppressEntry[] = [];
  const rawSup = Array.isArray(obj["suppress"]) ? (obj["suppress"] as unknown[]) : [];
  rawSup.forEach((raw, i) => {
    const s = (raw && typeof raw === "object" ? raw : {}) as Record<string, unknown>;
    const entry: SuppressEntry = { index: i };
    if (typeof s["rule"] === "string") entry.rule = s["rule"] as string;
    if (typeof s["target"] === "string") entry.target = s["target"] as string;
    if (typeof s["reason"] === "string") entry.reason = s["reason"] as string;
    suppress.push(entry);
  });

  // canonical path of workspace file: use its basename under a synthetic repo? Spec uses
  // `<workspaceファイル正準パス>`. We use the workspace file's basename relative to its dir.
  const wsCanonical = basename(absFile);
  return { repos, suppress, workspaceFileCanonical: wsCanonical };
}
