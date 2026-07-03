import type { RefSchema } from "./types.js";
/** Thrown to signal CLI exit code 2 (schema unusable). Caught only at the CLI boundary. */
export declare class SchemaExitError extends Error {
    readonly code = 2;
    constructor(message: string);
}
export declare function loadSchema(dir: string): RefSchema;
//# sourceMappingURL=load.d.ts.map