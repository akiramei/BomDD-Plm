// Gate ladder + eco orthogonal flag (§2.7).
// applied = { r | ladder(gate(r)) <= ladder(specified) } ∪ (--eco ? { r | gate(r)=eco } : {})
export const LADDER = {
    always: 0,
    G1: 1,
    G3: 2,
    freeze: 3,
    acceptance: 4,
};
export const VALID_GATES = ["always", "G1", "G3", "freeze", "acceptance"];
export function isValidGate(g) {
    return VALID_GATES.includes(g);
}
/** X-* implementation diagnostics are all gate=always (§2.6). */
export function gateOfRule(ruleId, schema) {
    if (ruleId.startsWith("X-"))
        return "always";
    const r = schema.lintRules.find((x) => x.id === ruleId);
    return r?.gate ?? "always";
}
/** Compute the set of rule IDs applied under a gate (+ eco). */
export function appliedRules(gate, eco, schema) {
    const target = LADDER[gate] ?? 0;
    const applied = new Set();
    const allRuleIds = [
        ...schema.lintRules.map((r) => r.id),
        "X-PARSE-001",
        "X-TYPE-001",
        "X-SCHEMA-001",
        "X-ID-001",
        "X-XREPO-001",
        "X-SUPPRESS-001",
        "X-SUPPRESS-002",
    ];
    for (const id of allRuleIds) {
        const g = gateOfRule(id, schema);
        if (g === "eco") {
            if (eco)
                applied.add(id);
        }
        else if ((LADDER[g] ?? 0) <= target) {
            applied.add(id);
        }
    }
    return applied;
}
