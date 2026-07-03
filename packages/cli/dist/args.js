// Argument parsing (K-NODE-CLI). node:util parseArgs; single positional; no subcommands.
import { parseArgs } from "node:util";
export class ArgError extends Error {
    code = 2;
    constructor(message) {
        super(message);
        this.name = "ArgError";
    }
}
const VALID_GATES = ["always", "G1", "G3", "freeze", "acceptance"];
export function parseCliArgs(argv) {
    let parsed;
    try {
        parsed = parseArgs({
            args: argv,
            allowPositionals: true,
            strict: true,
            options: {
                gate: { type: "string" },
                eco: { type: "boolean", default: false },
                format: { type: "string", default: "text" },
                out: { type: "string" },
                "fail-on": { type: "string" },
                schema: { type: "string" },
                view: { type: "boolean", default: false },
                help: { type: "boolean", default: false },
                version: { type: "boolean", default: false },
            },
        });
    }
    catch (e) {
        throw new ArgError(e.message);
    }
    const v = parsed.values;
    const positionals = parsed.positionals;
    const result = {
        gate: v.gate ?? "always",
        eco: v.eco === true,
        format: "text",
        out: v.out ?? "./plm-out",
        failOn: "error",
        view: v.view === true,
        help: v.help === true,
        version: v.version === true,
    };
    if (result.help || result.version) {
        return result; // help/version take priority over other validation
    }
    // format
    const fmt = v.format ?? "text";
    if (fmt !== "text" && fmt !== "json") {
        throw new ArgError(`--format の値が不正です: ${fmt}(text|json のみ)`);
    }
    result.format = fmt;
    // gate
    if (!VALID_GATES.includes(result.gate)) {
        throw new ArgError(`--gate の値が不正です: ${result.gate}(${VALID_GATES.join("|")} のみ)`);
    }
    // fail-on
    const failOn = v["fail-on"] ?? "error";
    if (failOn !== "error" && failOn !== "warn") {
        throw new ArgError(`--fail-on の値が不正です: ${failOn}(error|warn のみ)`);
    }
    result.failOn = failOn;
    if (v.schema !== undefined)
        result.schema = v.schema;
    if (positionals.length === 0) {
        throw new ArgError("対象(リポパス または workspace.yaml)を1つ指定してください");
    }
    if (positionals.length > 1) {
        throw new ArgError("位置引数は1つだけ指定できます");
    }
    result.target = positionals[0];
    return result;
}
