// Suppress (§2.8). rule+target+reason all required. Match => demote to info + suppressed:true + reason.
// reason empty/missing => X-SUPPRESS-001 (error). No finding matched => X-SUPPRESS-002 (warn, dead).

import type { Finding } from "../types.js";
import type { SuppressEntry } from "../workspace/workspace.js";
import { getMessage } from "../rules/messages.js";
import { pathEqualsCI } from "../util/paths.js";

export interface SuppressResult {
  findings: Finding[];
}

/**
 * Apply suppression. workspaceFileCanonical is used to build suppressRef positions.
 */
export function applySuppress(
  findings: Finding[],
  suppress: SuppressEntry[],
  workspaceFileCanonical: string | undefined
): SuppressResult {
  const out: Finding[] = findings.map((f) => ({ ...f }));
  const extra: Finding[] = [];

  suppress.forEach((s) => {
    // reason required
    if (!s.reason || s.reason.trim() === "") {
      const m = getMessage("X-SUPPRESS-001", { supIndex: s.index });
      extra.push({
        rule: "X-SUPPRESS-001",
        severity: "error",
        gate: "always",
        file: workspaceFileCanonical ?? "bomdd-workspace.yaml",
        message: m.message,
        fixTarget: m.fixTarget,
      });
      return;
    }
    if (!s.rule || !s.target) {
      // rule/target missing also invalidates the row; treat as dead (X-SUPPRESS-002).
      pushDead(s, workspaceFileCanonical, extra);
      return;
    }

    let matched = false;
    for (const f of out) {
      if (f.suppressed) continue;
      if (f.rule !== s.rule) continue;
      if (!targetMatches(f, s.target)) continue;
      matched = true;
      f.severity = "info";
      f.suppressed = true;
      f.suppressReason = s.reason;
      f.suppressRef = `${workspaceFileCanonical ?? "bomdd-workspace.yaml"}#suppress[${s.index}]`;
    }
    if (!matched) {
      pushDead(s, workspaceFileCanonical, extra);
    }
  });

  return { findings: [...out, ...extra] };
}

function pushDead(s: SuppressEntry, wsFile: string | undefined, extra: Finding[]): void {
  const m = getMessage("X-SUPPRESS-002", { supIndex: s.index });
  extra.push({
    rule: "X-SUPPRESS-002",
    severity: "warn",
    gate: "always",
    file: wsFile ?? "bomdd-workspace.yaml",
    message: m.message,
    fixTarget: m.fixTarget,
  });
}

/**
 * target matches:
 * - ID target: case-sensitive equality with finding.targetId.
 * - path target: matches finding.file via INV-004 case-insensitive identity.
 * We disambiguate: if target equals a finding.targetId (case-sensitive) => ID match.
 * Else compare as path (case-insensitive) to finding.file.
 */
function targetMatches(f: Finding, target: string): boolean {
  if (f.targetId !== undefined && f.targetId === target) return true;
  // path match against canonical file
  return pathEqualsCI(f.file, target);
}
