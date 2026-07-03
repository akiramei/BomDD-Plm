#!/usr/bin/env node
// bomdd-lint CLI entry (§2.10). exit 0/1/2. stdout = data, stderr = logs.
import { mkdirSync, writeFileSync, readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath as u2p } from "node:url";
import { runLint, canonicalJson, appliedRules, SchemaExitError, InputExitError, OutputExitError, validateOutDir, } from "@bomdd/core";
import { generateView } from "@bomdd/viewer";
import { parseCliArgs, ArgError } from "./args.js";
import { formatText } from "./text.js";
function defaultSchemaDir() {
    // Schema snapshot lives at <repo-root>/schemas/ref-v0. Resolve relative to this file:
    // dist/main.js -> packages/cli/dist -> repo root is ../../../
    const here = dirname(u2p(import.meta.url));
    return join(here, "..", "..", "..", "schemas", "ref-v0");
}
function readVersion() {
    try {
        const here = dirname(u2p(import.meta.url));
        const pkg = JSON.parse(readFileSync(join(here, "..", "package.json"), "utf8"));
        return typeof pkg.version === "string" ? pkg.version : "0.0.0";
    }
    catch {
        return "0.0.0";
    }
}
const HELP = `Usage: bomdd-lint <repo-path | workspace.yaml> [options]

Options:
  --gate <always|G1|G3|freeze|acceptance>  適用ゲート (既定: always)
  --eco                                    eco 規則を加算
  --format <json|text>                     stdout 形式 (既定: text)
  --out <DIR>                              出力先ディレクトリ (既定: ./plm-out)
  --fail-on <error|warn>                   exit 1 の閾値 (既定: error)
  --schema <DIR>                           ref-v0 スキーマの場所 (既定: 同梱)
  --view                                   plm-view.html を追加生成
  --help                                   このヘルプを表示
  --version                                バージョンを表示

Examples:
  bomdd-lint ./my-repo
  bomdd-lint ./ws.yaml --gate G3 --view --out ./out
`;
/** Compute exit code from in-gate, post-demotion severities. */
function computeExit(diag, schema, failOn) {
    const applied = appliedRules(diag.run.gate, diag.run.eco, schema);
    let hasError = false;
    let hasWarn = false;
    for (const f of diag.findings) {
        if (!applied.has(f.rule))
            continue;
        if (f.suppressed)
            continue;
        if (f.severity === "error")
            hasError = true;
        else if (f.severity === "warn")
            hasWarn = true;
    }
    if (hasError)
        return 1;
    if (failOn === "warn" && hasWarn)
        return 1;
    return 0;
}
export function main(argv) {
    let args;
    try {
        args = parseCliArgs(argv);
    }
    catch (e) {
        if (e instanceof ArgError) {
            process.stderr.write(`エラー: ${e.message}\n`);
            process.stderr.write("使い方: bomdd-lint <repo-path | workspace.yaml> [--help]\n");
            return 2;
        }
        throw e;
    }
    if (args.help) {
        process.stdout.write(HELP);
        return 0;
    }
    if (args.version) {
        process.stdout.write(`bomdd-lint ${readVersion()}\n`);
        return 0;
    }
    const schemaDir = args.schema ?? defaultSchemaDir();
    try {
        // Resolve workspace first (for out-dir validation), then run lint.
        const result = runLint({
            target: args.target,
            gate: args.gate,
            eco: args.eco,
            schemaDir,
        });
        // Validate output directory is not inside any repo (§2.0).
        let absOut;
        try {
            absOut = validateOutDir(args.out, result.workspace.repos);
        }
        catch (e) {
            if (e instanceof OutputExitError) {
                process.stderr.write(`エラー: ${e.message}\n`);
                return 2;
            }
            throw e;
        }
        // Write output files (always, regardless of --format).
        try {
            mkdirSync(absOut, { recursive: true });
            writeFileSync(join(absOut, "diagnostics.json"), canonicalJson(result.diagnostics));
            writeFileSync(join(absOut, "graph.json"), canonicalJson(result.graph));
            writeFileSync(join(absOut, "ledger.json"), canonicalJson(result.ledger));
            if (args.view) {
                const html = generateView(canonicalJson(result.diagnostics), canonicalJson(result.graph), canonicalJson(result.ledger));
                writeFileSync(join(absOut, "plm-view.html"), html);
            }
        }
        catch (e) {
            process.stderr.write(`エラー: 出力先へ書き込めません: ${e.message}\n`);
            return 2;
        }
        // stdout.
        if (args.format === "json") {
            process.stdout.write(canonicalJson(result.diagnostics));
        }
        else {
            process.stdout.write(formatText(result.diagnostics, result.schema));
        }
        return computeExit(result.diagnostics, result.schema, args.failOn);
    }
    catch (e) {
        if (e instanceof SchemaExitError || e instanceof InputExitError) {
            process.stderr.write(`エラー: ${e.message}\n`);
            return 2;
        }
        // Uncaught => exit 2.
        process.stderr.write(`エラー: ${e.message}\n`);
        return 2;
    }
}
// Direct execution guard.
const isMain = (() => {
    try {
        return process.argv[1] && u2p(import.meta.url) === process.argv[1];
    }
    catch {
        return false;
    }
})();
if (isMain) {
    const code = main(process.argv.slice(2));
    process.exit(code);
}
