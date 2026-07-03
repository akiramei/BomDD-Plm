/**
 * Serialize a JS value to canonical JSON. Object keys are emitted in insertion order,
 * so callers MUST construct objects with keys in schema property order.
 * Arrays are emitted in their given order (callers pre-sort with the §2.9 comparators).
 */
export declare function canonicalJson(value: unknown): string;
//# sourceMappingURL=serialize.d.ts.map