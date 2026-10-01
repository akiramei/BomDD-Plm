import type { Finding, MeasurementEntry } from "../types.js";
import type { Model } from "../resolve/model.js";
/** Definition-site status of one family (ok = at least one definition was extracted). */
export type SiteStatus = "ok" | "absent" | "unreadable" | "selector-miss" | "empty";
export interface FamilySite {
    status: SiteStatus;
    /** the artifact the non-ok status was observed on (absent: none) */
    file?: string;
}
/** Status of a family's declared definition sites. undefined = the family declares no structured site. */
export declare function familySite(model: Model, family: string): FamilySite | undefined;
/**
 * Assign `outcome` to findings and collect the measurement causes. Mutates the findings in place
 * (outcome only) and returns the measurement entries.
 */
export declare function classify(model: Model, findings: Finding[]): MeasurementEntry[];
//# sourceMappingURL=measure.d.ts.map