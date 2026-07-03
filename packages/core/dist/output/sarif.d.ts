import type { Diagnostics } from "../types.js";
export interface SarifLog {
    $schema?: string;
    version: string;
    runs: SarifRun[];
}
export interface SarifRun {
    tool: {
        driver: SarifDriver;
    };
    results: SarifResult[];
}
export interface SarifDriver {
    name: string;
    version: string;
    informationUri: string;
    rules: SarifRuleMeta[];
}
export interface SarifRuleMeta {
    id: string;
    shortDescription: {
        text: string;
    };
}
export interface SarifResult {
    ruleId: string;
    level: "error" | "warning" | "note";
    message: {
        text: string;
    };
    locations: SarifLocation[];
    suppressions?: {
        kind: "external";
    }[];
}
export interface SarifLocation {
    physicalLocation: {
        artifactLocation: {
            uri: string;
        };
        region?: {
            startLine: number;
        };
    };
}
export interface BuildSarifInput {
    diagnostics: Diagnostics;
    /** product version string (from package.json), for tool.driver.version. */
    version: string;
    /** repository URL, for tool.driver.informationUri. */
    informationUri: string;
}
/**
 * Build the SARIF log object in canonical (schema-order) key shape, ready for canonicalJson().
 * findings are consumed in diagnostics.json's already-sorted order (§2.9: "diagnostics と同一ソート順").
 */
export declare function buildSarif(input: BuildSarifInput): SarifLog;
//# sourceMappingURL=sarif.d.ts.map