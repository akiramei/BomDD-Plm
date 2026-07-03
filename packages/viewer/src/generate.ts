// Static viewer generator (§2.11 SPEC-VIEWER-001). Produces a single self-contained plm-view.html:
// - diagnostics/graph/ledger JSON embedded via <script type="application/json">.
// - Zero external references (no CDN, no fetch, no images) — file:// openable.
// - Client-side gate filtering only (no re-run); no persistent state (INV-008).
//
// Shell + 4 views follow DC-FINDINGS-001 / DC-GRAPH-001 / DC-TRACE-001 / DC-LEDGER-001 (§2.12-2.15),
// modeled on the design原器 bomdd/ui/mock/bomdd-plm-viewer.html (UI-CAD parity).

import { STYLES } from "./styles.js";
import { CLIENT_SCRIPT } from "./client-script.js";
import { escapeForScriptTag, escapeHtml } from "./util.js";

/**
 * Generate the self-contained plm-view.html document.
 * @param diagnosticsJson canonical diagnostics.json text (plm-diag/1)
 * @param graphJson canonical graph.json text (plm-graph/1)
 * @param ledgerJson canonical ledger.json text (plm-ledger/1)
 */
export function generateView(diagnosticsJson: string, graphJson: string, ledgerJson: string): string {
  const diag = JSON.parse(diagnosticsJson) as {
    run: { gate: string; eco: boolean };
    workspace: { repos: { name: string; role?: string }[] };
    stats: { files: number; ids: number; refs: number };
    refSchema: { version: string };
  };

  const wsLabel = diag.workspace.repos.length
    ? diag.workspace.repos.map((r) => (r.role ? `${r.name}(${r.role})` : r.name)).join(", ")
    : "(no repos)";
  const wsTitle = `workspace: ${diag.workspace.repos.length} repos`;

  const gateOptions = ["always", "G1", "G3", "freeze", "acceptance"]
    .map((g) => `<option value="${g}"${g === diag.run.gate ? " selected" : ""}>${g}</option>`)
    .join("");

  return `<!DOCTYPE html>
<html lang="ja">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>BomDD PLM — read-only viewer</title>
<style>${STYLES}</style>
</head>
<body>
<div class="shell" data-ui-id="screen.plm-viewer">

  <header class="topbar" data-ui-id="region.shell-topbar">
    <div class="brand">BomDD PLM<span class="ro-badge" data-ui-id="state.shell.read-only" title="このツールは対象リポへ一切書き込みません">READ-ONLY</span></div>
    <span class="ws-chip" data-ui-id="component.workspace-chip" title="${escapeHtml(wsTitle)}">workspace: ${escapeHtml(wsLabel)}</span>
    <div class="gate-box" data-ui-id="input.shell.gate-select">
      <label for="gate-select">ゲート</label>
      <select id="gate-select">${gateOptions}</select>
      <label><input type="checkbox" id="gate-eco-check"> +eco</label>
    </div>
  </header>
  <nav class="viewtabs" data-ui-id="region.shell-nav">
    <button class="active" data-view="findings" data-ui-id="action.nav.findings">所見</button>
    <button data-view="graph" data-ui-id="action.nav.graph">品目グラフ</button>
    <button data-view="trace" data-ui-id="action.nav.trace">トレース</button>
    <button data-view="ledgers" data-ui-id="action.nav.ledgers">台帳</button>
  </nav>

  <main>
    <!-- ===== ビュー1: 所見 (DC-FINDINGS-001) ===== -->
    <section id="view-findings" class="view active" data-ui-id="screen.findings">
      <div class="summary-row" data-ui-id="region.findings-summary">
        <div class="card sum-card error" data-ui-id="component.summary-card.error"><div class="num" id="n-err">0</div><div class="lbl">error</div></div>
        <div class="card sum-card warn" data-ui-id="component.summary-card.warn"><div class="num" id="n-warn">0</div><div class="lbl">warn</div></div>
        <div class="card sum-card info" data-ui-id="component.summary-card.info"><div class="num" id="n-info">0</div><div class="lbl">info</div></div>
        <div class="card sum-card sup" data-ui-id="component.summary-card.suppressed"><div class="num" id="n-sup">0</div><div class="lbl">suppressed</div></div>
      </div>
      <div class="filterbar" data-ui-id="region.findings-filter">
        <span class="fchip on" data-sev="error" data-ui-id="action.findings.filter-severity">error</span>
        <span class="fchip on" data-sev="warn">warn</span>
        <span class="fchip" data-sev="info">info</span>
        <span class="fchip" data-sev="suppressed">suppressed</span>
        <select id="rule-filter" data-ui-id="input.findings.rule-filter"><option value="">rule: 全て</option></select>
        <input type="search" id="findings-search" placeholder="ファイル・ID で絞り込み" data-ui-id="input.findings.search">
      </div>
      <div class="card" style="overflow:auto; max-height: calc(100vh - 330px);">
        <table class="grid" id="findings-table" data-ui-id="component.findings-table">
          <thead><tr><th style="width:70px">severity</th><th style="width:70px">rule</th><th style="width:300px">位置</th><th style="width:150px">対象</th><th>内容と是正先</th></tr></thead>
          <tbody></tbody>
        </table>
        <div class="pager" id="findings-pager" style="display:none">
          <button id="page-prev">← 前へ</button>
          <span id="page-info"></span>
          <button id="page-next">次へ →</button>
        </div>
        <div class="empty-state" id="findings-empty" style="display:none" data-ui-id="state.findings.empty">
          <div class="big">✓</div>
          <p><b>現ゲートで所見なし</b></p>
          <p class="mono" id="empty-stats"></p>
        </div>
      </div>
    </section>

    <!-- ===== ビュー2: 品目グラフ (DC-GRAPH-001) ===== -->
    <section id="view-graph" class="view" data-ui-id="screen.item-graph">
      <div class="graph-layout">
        <div class="graph-main">
          <div class="graph-toolbar" data-ui-id="region.graph-toolbar">
            <input type="search" id="graph-search" placeholder="品目 ID・名前で検索" data-ui-id="input.graph.search" style="font:inherit;padding:3px 8px;border:1px solid var(--border);border-radius:4px;width:200px">
            <span id="graph-family-filter" data-ui-id="action.graph.filter-family">
              <span class="fchip" data-fam="REQ"><span class="fam REQ">REQ</span></span>
              <span class="fchip" data-fam="E"><span class="fam E">E</span></span>
              <span class="fchip" data-fam="M"><span class="fam M">M</span></span>
              <span class="fchip" data-fam="K"><span class="fam K">K</span></span>
              <span class="fchip" data-fam="CP"><span class="fam CP">CP</span></span>
              <span class="fchip" data-fam="SB"><span class="fam SB">SB</span></span>
            </span>
            <label data-ui-id="input.graph.depth" style="margin-left:auto;font-size:12px;color:var(--text-2)">近傍深さ
              <select id="graph-depth"><option value="1">1</option><option value="2" selected>2</option><option value="3">3</option></select>
            </label>
          </div>
          <div class="graph-canvas" id="graph-canvas" data-ui-id="component.graph-canvas"></div>
        </div>
        <aside class="card detail-panel" data-ui-id="region.graph-detail" id="detail-panel"></aside>
      </div>
    </section>

    <!-- ===== ビュー3: トレースマトリクス (DC-TRACE-001) ===== -->
    <section id="view-trace" class="view" data-ui-id="screen.trace-matrix">
      <div class="matrix-toolbar" data-ui-id="region.trace-toolbar">
        <label><input type="checkbox" id="only-uncovered" data-ui-id="action.trace.only-uncovered"> 未被覆のみ表示</label>
        <span id="trace-summary" style="color:var(--text-2);font-size:12px"></span>
      </div>
      <div class="card" style="overflow:auto; max-height: calc(100vh - 280px);">
        <table class="grid" id="trace-table" data-ui-id="component.trace-matrix">
          <thead><tr><th style="width:110px">REQ</th><th>仕様節</th><th>E-BOM</th><th>M-BOM</th><th>Control Plan</th><th>証跡(As-Built)</th></tr></thead>
          <tbody></tbody>
        </table>
      </div>
      <div class="legend" data-ui-id="component.trace-legend">
        <span style="color:var(--ok)">✓ 被覆(参照が解決)</span>
        <span style="color:var(--error)">✗ 未被覆(対応する lint 所見あり)</span>
        <span style="color:var(--suppressed)">— draft/対象外(現ゲートでは検査しない)</span>
      </div>
    </section>

    <!-- ===== ビュー4: 台帳 (DC-LEDGER-001) ===== -->
    <section id="view-ledgers" class="view" data-ui-id="screen.ledgers">
      <div class="ledger-tabs" data-ui-id="region.ledger-tabs">
        <button class="active" data-pane="eco" data-ui-id="action.ledgers.tab-eco">ECO<span id="tab-eco-count"></span></button>
        <button data-pane="cheat" data-ui-id="action.ledgers.tab-cheat">ずる<span id="tab-cheat-count"></span></button>
        <button data-pane="dec" data-ui-id="action.ledgers.tab-dec">裁定<span id="tab-dec-count"></span></button>
      </div>
      <div class="ledger-pane active card" id="pane-eco" data-ui-id="component.ledger-table.eco">
        <table class="grid">
          <thead><tr><th style="width:100px">ID</th><th>タイトル(見出し抽出)</th><th style="width:110px">状態</th><th style="width:120px">影響品目数</th></tr></thead>
          <tbody></tbody>
        </table>
        <p class="unstructured-note" data-ui-id="component.ledger-note">※ .md 台帳からは見出しと ID のみを抽出しています(全文の構造化はしない)。</p>
      </div>
      <div class="ledger-pane card" id="pane-cheat" data-ui-id="component.ledger-table.cheat">
        <table class="grid">
          <thead><tr><th style="width:130px">ID</th><th>要約(見出し抽出)</th><th style="width:110px">分類</th></tr></thead>
          <tbody></tbody>
        </table>
      </div>
      <div class="ledger-pane card" id="pane-dec" data-ui-id="component.ledger-table.dec">
        <table class="grid">
          <thead><tr><th style="width:100px">ID</th><th>タイトル</th><th style="width:100px">状態</th><th style="width:140px">binds</th><th style="width:100px">承認者</th></tr></thead>
          <tbody></tbody>
        </table>
      </div>
    </section>
  </main>

  <footer class="runmeta" data-ui-id="region.run-meta">
    <span>input: workspace(${diag.workspace.repos.length} repos)</span>
    <span>schema: ${escapeHtml(diag.refSchema.version)}</span>
    <span>diagnostics: plm-diag/1</span>
    <span data-ui-id="component.scan-stats">${diag.stats.files} files / ${diag.stats.ids} IDs / ${diag.stats.refs} refs</span>
  </footer>
</div>

<script type="application/json" id="data-diagnostics">${escapeForScriptTag(diagnosticsJson)}</script>
<script type="application/json" id="data-graph">${escapeForScriptTag(graphJson)}</script>
<script type="application/json" id="data-ledger">${escapeForScriptTag(ledgerJson)}</script>
<script>${CLIENT_SCRIPT}</script>
</body>
</html>
`;
}
