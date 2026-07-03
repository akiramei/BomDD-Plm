import type { RefSchema } from "../schema/types.js";
export declare const LADDER: Record<string, number>;
export declare const VALID_GATES: string[];
export declare function isValidGate(g: string): boolean;
/** X-* implementation diagnostics are all gate=always (§2.6). */
export declare function gateOfRule(ruleId: string, schema: RefSchema): string;
/** Compute the set of rule IDs applied under a gate (+ eco). */
export declare function appliedRules(gate: string, eco: boolean, schema: RefSchema): Set<string>;
//# sourceMappingURL=gate.d.ts.map