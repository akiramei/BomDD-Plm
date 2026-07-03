/** UTF-8 byte-order comparison of two strings (case-sensitive). */
export declare function byteCompare(a: string, b: string): number;
/** Missing string key => empty string (sorts first). Missing numeric key => -1. */
export declare function cmpStr(a: string | undefined, b: string | undefined): number;
export declare function cmpNum(a: number | undefined, b: number | undefined): number;
/** Normalize -0 to 0. */
export declare function normNum(n: number): number;
//# sourceMappingURL=determinism.d.ts.map