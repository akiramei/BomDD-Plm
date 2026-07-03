export interface Selected {
    /** the terminal value */
    value: unknown;
    /** dotted path of concrete keys/indexes for line lookup */
    concretePath: (string | number)[];
}
interface Segment {
    /** null = wildcard `*`; string[] = key alternation; single string = one key */
    keys: string[] | null;
    isArray: boolean;
}
export declare function parseSelector(sel: string): Segment[];
/** Recursively resolve selector segments against a value. */
export declare function select(root: unknown, sel: string): Selected[];
export {};
//# sourceMappingURL=selector.d.ts.map