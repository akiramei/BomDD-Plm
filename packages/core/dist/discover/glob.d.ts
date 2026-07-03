/**
 * Compile a glob to a RegExp.
 * Double-star matches any number of characters including slash.
 * Single-star matches any characters except slash (within one path segment).
 * A trailing double-star + slash optionally matches zero directories, so
 * "a/[star][star]/b" matches "a/b".
 */
export declare function globToRegExp(glob: string): RegExp;
export declare function globMatch(glob: string, path: string): boolean;
//# sourceMappingURL=glob.d.ts.map