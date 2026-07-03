export interface CliArgs {
    target?: string;
    gate: string;
    eco: boolean;
    format: "text" | "json";
    out: string;
    failOn: "error" | "warn";
    schema?: string;
    view: boolean;
    help: boolean;
    version: boolean;
}
export declare class ArgError extends Error {
    readonly code = 2;
    constructor(message: string);
}
export declare function parseCliArgs(argv: string[]): CliArgs;
//# sourceMappingURL=args.d.ts.map