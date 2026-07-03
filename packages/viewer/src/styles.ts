// Static CSS for plm-view.html (K-VIEWER-VANILLA — no external stylesheet, no CDN).
// Transcribed/adapted from bomdd/ui/mock/bomdd-plm-viewer.html <style> block (design原器).
// CHEAT-note: exact class naming / pixel layout details are exploratory (display contract外) — see cheat-log.

export const STYLES = `
:root {
  --bg: #f5f6f8;
  --surface: #ffffff;
  --surface-2: #eef0f3;
  --border: #d8dce2;
  --text: #1f2733;
  --text-2: #5b6675;
  --accent: #2f5aa8;
  --error: #c53030;
  --warn: #b7791f;
  --info: #4a6b8a;
  --ok: #2f855a;
  --suppressed: #8a8f98;
  --fam-req: #64748b;
  --fam-e: #2f5aa8;
  --fam-m: #2f855a;
  --fam-k: #7c3aed;
  --fam-cp: #c05621;
  --fam-sb: #0e7490;
  --fam-default: #475569;
  --radius: 6px;
  --font: "Segoe UI", "Yu Gothic UI", system-ui, sans-serif;
  --mono: Consolas, "Cascadia Mono", monospace;
  --fs: 13px; --fs-s: 12px; --fs-l: 15px;
}
* { box-sizing: border-box; margin: 0; }
body { font-family: var(--font); font-size: var(--fs); color: var(--text); background: var(--bg); }

.shell { display: flex; flex-direction: column; height: 100vh; }
header.topbar {
  flex: 0 0 auto; display: flex; align-items: center; gap: 16px;
  background: var(--surface); border-bottom: 1px solid var(--border); padding: 8px 16px;
}
.brand { font-size: var(--fs-l); font-weight: 600; white-space: nowrap; }
.brand .ro-badge { font-size: 10px; color: var(--ok); border: 1px solid var(--ok); border-radius: 3px; padding: 1px 5px; margin-left: 6px; vertical-align: 2px; }
.ws-chip { font-family: var(--mono); font-size: var(--fs-s); background: var(--surface-2); border: 1px solid var(--border); border-radius: 12px; padding: 2px 10px; max-width: 320px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.gate-box { margin-left: auto; display: flex; align-items: center; gap: 8px; white-space: nowrap; }
.gate-box label { color: var(--text-2); font-size: var(--fs-s); }
.gate-box select, .gate-box input[type=checkbox] { font-size: var(--fs); }

nav.viewtabs { flex: 0 0 auto; display: flex; gap: 2px; background: var(--surface); border-bottom: 2px solid var(--border); padding: 0 16px; }
nav.viewtabs button {
  border: none; background: none; padding: 8px 18px; font: inherit; cursor: pointer;
  color: var(--text-2); border-bottom: 2px solid transparent; margin-bottom: -2px;
}
nav.viewtabs button.active { color: var(--accent); border-bottom-color: var(--accent); font-weight: 600; }

main { flex: 1 1 auto; overflow: auto; padding: 16px; }
footer.runmeta {
  flex: 0 0 auto; display: flex; gap: 24px; padding: 6px 16px; font-size: var(--fs-s);
  color: var(--text-2); background: var(--surface); border-top: 1px solid var(--border); font-family: var(--mono);
}
.view { display: none; } .view.active { display: block; }

.chip { display: inline-block; font-size: 11px; border-radius: 3px; padding: 1px 7px; font-weight: 600; }
.chip.error { background: #fde8e8; color: var(--error); }
.chip.warn  { background: #fdf3e0; color: var(--warn); }
.chip.info  { background: #e8eff5; color: var(--info); }
.chip.suppressed { background: #ededef; color: var(--suppressed); text-decoration: line-through; }
.fam { display: inline-block; font-family: var(--mono); font-size: 11px; border-radius: 3px; padding: 1px 6px; color: #fff; }
.fam.REQ{background:var(--fam-req)} .fam.E{background:var(--fam-e)} .fam.M{background:var(--fam-m)}
.fam.K{background:var(--fam-k)} .fam.CP{background:var(--fam-cp)} .fam.SB{background:var(--fam-sb)}
.fam.other{background:var(--fam-default)}
.lc { font-size: 10px; border: 1px solid var(--border); border-radius: 3px; padding: 0 4px; color: var(--text-2); }
.lc.superseded { color: var(--suppressed); border-style: dashed; }
.card { background: var(--surface); border: 1px solid var(--border); border-radius: var(--radius); }
code, .mono { font-family: var(--mono); font-size: var(--fs-s); }
table.grid { width: 100%; border-collapse: collapse; background: var(--surface); }
table.grid th { text-align: left; font-size: var(--fs-s); color: var(--text-2); font-weight: 600; padding: 6px 10px; border-bottom: 2px solid var(--border); position: sticky; top: 0; background: var(--surface); }
table.grid td { padding: 6px 10px; border-bottom: 1px solid var(--surface-2); vertical-align: top; }
.empty-state { text-align: center; padding: 48px 16px; color: var(--text-2); }
.empty-state .big { font-size: 28px; color: var(--ok); }

.summary-row { display: flex; gap: 12px; margin-bottom: 12px; }
.sum-card { width: 150px; flex: 0 0 auto; padding: 10px 14px; }
.sum-card .num { font-size: 24px; font-weight: 700; font-variant-numeric: tabular-nums; }
.sum-card .lbl { font-size: var(--fs-s); color: var(--text-2); }
.sum-card.error .num { color: var(--error); } .sum-card.warn .num { color: var(--warn); }
.sum-card.info .num { color: var(--info); } .sum-card.sup .num { color: var(--suppressed); }
.filterbar { display: flex; align-items: center; gap: 10px; background: var(--surface-2); border: 1px solid var(--border); border-radius: var(--radius); padding: 6px 10px; margin-bottom: 10px; flex-wrap: wrap; }
.filterbar .fchip { cursor: pointer; user-select: none; border: 1px solid var(--border); background: var(--surface); border-radius: 12px; padding: 2px 10px; font-size: var(--fs-s); }
.filterbar .fchip.on { border-color: var(--accent); color: var(--accent); background: #eaf0fa; }
.filterbar input[type=search] { font: inherit; padding: 3px 8px; border: 1px solid var(--border); border-radius: 4px; width: 220px; }
td.loc { max-width: 300px; } td.loc .path { display: block; max-width: 290px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; direction: rtl; text-align: left; }
td.msg .fix { display: block; color: var(--text-2); font-size: var(--fs-s); margin-top: 2px; }
td.msg .fix::before { content: "→ 是正先: "; color: var(--accent); }
tr.suppressed-row td { color: var(--suppressed); background: #fafafb; }
tr.suppressed-row .reason { font-size: 11px; }
.pager { display: flex; gap: 8px; align-items: center; padding: 8px 10px; font-size: var(--fs-s); color: var(--text-2); }
.pager button { font: inherit; padding: 2px 10px; border: 1px solid var(--border); background: var(--surface); border-radius: 4px; cursor: pointer; }
.pager button:disabled { opacity: 0.5; cursor: default; }

.graph-layout { display: flex; gap: 12px; height: calc(100vh - 210px); min-height: 420px; }
.graph-main { flex: 1 1 auto; display: flex; flex-direction: column; min-width: 0; }
.graph-toolbar { display: flex; align-items: center; gap: 10px; padding: 6px 10px; background: var(--surface-2); border: 1px solid var(--border); border-radius: var(--radius) var(--radius) 0 0; flex-wrap: wrap; }
.graph-canvas { flex: 1 1 auto; border: 1px solid var(--border); border-top: none; border-radius: 0 0 var(--radius) var(--radius); background: var(--surface); overflow: auto; }
.detail-panel { flex: 0 0 300px; width: 300px; overflow: auto; padding: 12px; }
.detail-panel h3 { font-size: var(--fs); margin-bottom: 4px; word-break: break-all; }
.detail-panel dl { margin: 8px 0; } .detail-panel dt { font-size: 11px; color: var(--text-2); margin-top: 8px; }
.detail-panel dd { margin: 2px 0 0 0; } .detail-panel dd ul { margin: 2px 0 0 16px; padding: 0; }
svg .node { cursor: pointer; } svg .node rect { rx: 4; }
svg .node text { font-family: var(--mono); font-size: 10px; fill: #fff; }
svg .node.superseded rect { fill: #b8bcc4 !important; stroke-dasharray: 4 3; }
svg .edge { stroke: #9aa3af; stroke-width: 1.2; marker-end: url(#arr); }
svg .edge.violation { stroke: var(--error); stroke-width: 2; }
svg .edge.unresolved { stroke: var(--error); stroke-width: 1.4; stroke-dasharray: 5 3; }
.violation-callout { border-left: 3px solid var(--error); background: #fde8e8; padding: 6px 10px; font-size: var(--fs-s); margin-top: 8px; }

.matrix-toolbar { display: flex; gap: 12px; align-items: center; margin-bottom: 10px; }
td.cell-ok { color: var(--ok); } td.cell-ng { background: #fde8e8; color: var(--error); font-weight: 700; cursor: pointer; }
td.cell-draft { color: var(--suppressed); }
.legend { font-size: var(--fs-s); color: var(--text-2); display: flex; gap: 16px; margin-top: 8px; }

.ledger-tabs { display: flex; gap: 2px; margin-bottom: 10px; }
.ledger-tabs button { border: 1px solid var(--border); background: var(--surface); padding: 5px 16px; font: inherit; cursor: pointer; border-radius: var(--radius) var(--radius) 0 0; color: var(--text-2); }
.ledger-tabs button.active { color: var(--accent); font-weight: 600; border-bottom-color: var(--surface); }
.ledger-pane { display: none; } .ledger-pane.active { display: block; }
.st { font-size: 11px; border-radius: 3px; padding: 1px 7px; font-weight: 600; }
.st.open { background: #fdf3e0; color: var(--warn); } .st.decided, .st.completed { background: #e2f2e9; color: var(--ok); }
.st.superseded { background: #ededef; color: var(--suppressed); }
.unstructured-note { font-size: var(--fs-s); color: var(--text-2); margin-top: 6px; }
`;
