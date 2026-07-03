// Argument parsing (K-NODE-CLI). node:util parseArgs; single positional; no subcommands.

import { parseArgs } from "node:util";

export interface CliArgs {
  target?: string;
  gate: string;
  eco: boolean;
  format: "text" | "json";
  out: string;
  failOn: "error" | "warn";
  schema?: string;
  view: boolean;
  sarif: boolean;
  help: boolean;
  version: boolean;
}

export class ArgError extends Error {
  readonly code = 2;
  constructor(message: string) {
    super(message);
    this.name = "ArgError";
  }
}

const VALID_GATES = ["always", "G1", "G3", "freeze", "acceptance"];

export function parseCliArgs(argv: string[]): CliArgs {
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
        sarif: { type: "boolean", default: false },
        help: { type: "boolean", default: false },
        version: { type: "boolean", default: false },
      },
    });
  } catch (e) {
    throw new ArgError((e as Error).message);
  }

  const v = parsed.values;
  const positionals = parsed.positionals;

  const result: CliArgs = {
    gate: (v.gate as string) ?? "always",
    eco: v.eco === true,
    format: "text",
    out: (v.out as string) ?? "./plm-out",
    failOn: "error",
    view: v.view === true,
    sarif: v.sarif === true,
    help: v.help === true,
    version: v.version === true,
  };

  if (result.help || result.version) {
    return result; // help/version take priority over other validation
  }

  // format
  const fmt = (v.format as string) ?? "text";
  if (fmt !== "text" && fmt !== "json") {
    throw new ArgError(`--format の値が不正です: ${fmt}(text|json のみ)`);
  }
  result.format = fmt;

  // gate
  if (!VALID_GATES.includes(result.gate)) {
    throw new ArgError(`--gate の値が不正です: ${result.gate}(${VALID_GATES.join("|")} のみ)`);
  }

  // fail-on
  const failOn = (v["fail-on"] as string) ?? "error";
  if (failOn !== "error" && failOn !== "warn") {
    throw new ArgError(`--fail-on の値が不正です: ${failOn}(error|warn のみ)`);
  }
  result.failOn = failOn;

  if (v.schema !== undefined) result.schema = v.schema as string;

  if (positionals.length === 0) {
    throw new ArgError("対象(リポパス または workspace.yaml)を1つ指定してください");
  }
  if (positionals.length > 1) {
    throw new ArgError("位置引数は1つだけ指定できます");
  }
  result.target = positionals[0];

  return result;
}
