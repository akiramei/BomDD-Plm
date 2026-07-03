import type { Finding } from "../types.js";
import type { Model } from "../resolve/model.js";
import type { RepoSpec } from "../discover/discover.js";
/**
 * Evaluate R-052 across all 60-change-register.yaml artifacts in the model. Returns [] when
 * `eco` is false (opt-in at the `--eco` boundary, per §2.17 — not just an output-side gate filter).
 */
export declare function evaluateR052(model: Model, repos: RepoSpec[], eco: boolean): Finding[];
//# sourceMappingURL=r052.d.ts.map