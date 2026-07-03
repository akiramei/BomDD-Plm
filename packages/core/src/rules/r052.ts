// R-052 eco-diff-within-impact (§2.17 rev4, ref-v0.8, K-GIT). Machine-checks 63-diff-audit:
// for change-register entries carrying `diff_audit: { baseline, head?, allowed_paths[] }` (opt-in),
// the real git diff (baseline..head, or baseline..HEAD when head is absent) must stay within
// bomdd/ + allowed_paths (prefix match). `head` anchors the window at verify time so closed ECOs
// stay deterministic (ECO-005: the stale-window fix).
//
// Evaluated ONLY when --eco is passed (§2.17: "`--eco` 実行時... のみ"; §2.6 unmodified list still
// excludes R-052 from the "evaluate every rule always" set because it requires git I/O). This is a
// narrower gate than gate=eco's normal ladder-orthogonal output filter (§2.7) — R-052 findings do not
// exist at all in a non---eco run, by design (opt-in, fail-open, no accidental CI wedge).

import type { Finding, Severity } from "../types.js";
import type { RefSchema } from "../schema/types.js";
import type { Model } from "../resolve/model.js";
import type { RepoSpec } from "../discover/discover.js";
import { getMessage } from "./messages.js";
import { gateOfRule } from "../gate/gate.js";
import { gitDiffNameOnly } from "../gitdiff/gitdiff.js";

interface DiffAudit {
  baseline: string;
  /** ref-v0.8 (§2.17 rev4): optional window anchor. Present => diff baseline..head (fixed,
   * deterministic forever — verified ECOs don't go stale). Absent => baseline..HEAD (live). */
  head?: string;
  allowedPaths: string[];
}

interface ChangeEntry {
  id: string;
  diffAudit?: DiffAudit;
}

function str(v: unknown): string | undefined {
  return typeof v === "string" ? v : undefined;
}

function strArr(v: unknown): string[] {
  if (!Array.isArray(v)) return [];
  return v.filter((x): x is string => typeof x === "string");
}

/** Read changes[].{id, diff_audit} from a parsed 60-change-register.yaml document. */
function readChangeEntries(doc: unknown): ChangeEntry[] {
  const out: ChangeEntry[] = [];
  if (typeof doc !== "object" || doc === null) return out;
  const changes = (doc as Record<string, unknown>)["changes"];
  if (!Array.isArray(changes)) return out;
  for (const raw of changes) {
    if (!raw || typeof raw !== "object") continue;
    const c = raw as Record<string, unknown>;
    const id = str(c["id"]);
    if (!id) continue;
    const entry: ChangeEntry = { id };
    const da = c["diff_audit"];
    if (da && typeof da === "object") {
      const daObj = da as Record<string, unknown>;
      const baseline = str(daObj["baseline"]);
      if (baseline) {
        entry.diffAudit = { baseline, allowedPaths: strArr(daObj["allowed_paths"]) };
        const head = str(daObj["head"]);
        if (head) entry.diffAudit.head = head;
      }
    }
    out.push(entry);
  }
  return out;
}

function mk(
  rule: string,
  severity: Severity,
  gate: string,
  file: string,
  vars: { targetId?: string; ref?: string },
  targetId?: string
): Finding {
  const m = getMessage(rule, vars);
  const f: Finding = { rule, severity, gate, file, message: m.message, fixTarget: m.fixTarget };
  if (targetId !== undefined) f.targetId = targetId;
  return f;
}

/** True if `file` (repo-relative, `/`-separated) is inside the allowed set (§2.17 判定). */
function isAllowed(file: string, allowedPaths: string[]): boolean {
  if (file === "bomdd" || file.startsWith("bomdd/")) return true;
  return allowedPaths.some((p) => file === p || file.startsWith(p));
}

/**
 * Evaluate R-052 across all 60-change-register.yaml artifacts in the model. Returns [] when
 * `eco` is false (opt-in at the `--eco` boundary, per §2.17 — not just an output-side gate filter).
 */
export function evaluateR052(model: Model, repos: RepoSpec[], eco: boolean): Finding[] {
  if (!eco) return [];
  const schema: RefSchema = model.schema;
  const out: Finding[] = [];
  const gate = gateOfRule("R-052", schema);

  for (const pa of model.parsed) {
    if (!pa.artifact.relPath.toLowerCase().endsWith("60-change-register.yaml")) continue;
    const entries = readChangeEntries(pa.doc);
    if (entries.length === 0) continue;

    const repo = repos.find((r) => r.name === pa.artifact.repo);
    if (!repo) continue; // should not happen (artifact came from a discovered repo)

    for (const entry of entries) {
      if (!entry.diffAudit) continue; // opt-in: no diff_audit => not checked (closed/legacy ECOs)

      const { baseline, head } = entry.diffAudit;
      const diff = gitDiffNameOnly(repo.absPath, baseline, head);
      if (!diff.ok) {
        out.push(
          mk(
            "X-GIT-001",
            "info",
            "always",
            pa.artifact.canonicalPath,
            // どちらの rev が不能かは git 出力から特定しない(fail-open は窓単位)— 窓の表記で示す。
            { targetId: entry.id, ref: head ? `${baseline}..${head}` : baseline },
            entry.id
          )
        );
        continue; // skip R-052 judgment for this ECO (fail-open)
      }

      for (const file of diff.files) {
        if (!isAllowed(file, entry.diffAudit.allowedPaths)) {
          out.push(
            mk(
              "R-052",
              "error",
              gate,
              pa.artifact.canonicalPath,
              { targetId: entry.id, ref: file },
              entry.id
            )
          );
        }
      }
    }
  }

  return out;
}
