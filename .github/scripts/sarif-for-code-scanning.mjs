// SARIF → GitHub code scanning 適合変換(消費者側の変換 — 製品の SARIF 契約 §2.9 は不変)。
//   1) artifactLocation.uri の正準形 <repo>/<相対>(INV-004 形式1)をリポ相対へ剥がす
//      (code scanning は相対 uri をリポジトリルート基準で解釈するため)
//   2) note(info)級の結果を落とす(info は台帳/ビューアの管轄。Security タブは error/warn の信号線 —
//      self-hosting は info 級 173 件が常在し、note を上げると信号が埋まる)
//   driver.rules[] は発火規則のまま残す(結果なしの規則メタは SARIF として合法)。
// 使い方: node sarif-for-code-scanning.mjs <in.sarif> <out.sarif> <repoPrefix/>
import { readFileSync, writeFileSync } from "node:fs";

const [inFile, outFile, prefix] = process.argv.slice(2);
if (!inFile || !outFile || !prefix) {
  console.error("usage: node sarif-for-code-scanning.mjs <in.sarif> <out.sarif> <repoPrefix/>");
  process.exit(2);
}

const log = JSON.parse(readFileSync(inFile, "utf8"));
for (const run of log.runs ?? []) {
  run.results = (run.results ?? []).filter((r) => r.level !== "note");
  for (const r of run.results) {
    for (const loc of r.locations ?? []) {
      const a = loc.physicalLocation?.artifactLocation;
      if (a?.uri?.startsWith(prefix)) a.uri = a.uri.slice(prefix.length);
    }
  }
}
writeFileSync(outFile, JSON.stringify(log, null, 2) + "\n");
console.log(
  `sarif-for-code-scanning: results=${(log.runs ?? []).map((r) => r.results.length).join("+")} -> ${outFile}`
);
