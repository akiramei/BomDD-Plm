import type { ParsedArtifact } from "../resolve/model.js";
export interface EbomItem {
    id: string;
    classification?: string;
    lifecycleState?: string;
    requirementRefs: string[];
    acceptanceRefs: string[];
    kbomRefs: string[];
    externalSourceRef?: string;
    displayContractRefs: string[];
    designSystemRefs: string[];
    file: string;
    line?: number;
}
export interface MbomUnit {
    id: string;
    ebomRefs: string[];
    file: string;
}
export interface CpChar {
    id: string;
    depth?: string;
    testVectors: unknown[];
    file: string;
    line?: number;
}
export declare function ebomItems(parsed: ParsedArtifact[]): EbomItem[];
export declare function mbomUnits(parsed: ParsedArtifact[]): MbomUnit[];
export declare function cpChars(parsed: ParsedArtifact[]): CpChar[];
/** All ui-trace-map ebomItemRef values across the workspace (for R-020). */
export declare function traceMapEbomRefs(parsed: ParsedArtifact[]): Set<string>;
/** Design-system-bom surface parts (for R-021). */
export declare function designSurfaceParts(parsed: ParsedArtifact[]): {
    id: string;
    file: string;
    line?: number;
    coverageStatus?: string;
}[];
/** change-register presence + entries (for R-051). */
export declare function changeRegisterExists(parsed: ParsedArtifact[]): boolean;
//# sourceMappingURL=context.d.ts.map