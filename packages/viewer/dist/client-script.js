// Client-side script embedded verbatim into plm-view.html (§2.11 static generation).
// Runs entirely against the embedded diagnostics/graph/ledger JSON — no fetch, no localStorage,
// no persistent state (INV-008 / REQ-018). Written as a plain string template (not bundled),
// so this file's exported constant is the literal <script> body.
//
// CHEAT-note: DOM structure/class naming beyond the mock's data-ui-id contract, internal function
// layout, and the SVG layout algorithm are exploratory dimensions (declared out of display-contract
// scope by 40-work-order.md's exploratory list) — recorded in bomdd/51-cheat-log.md.
export const CLIENT_SCRIPT = String.raw `
(function () {
  "use strict";
  var diagEl = document.getElementById("data-diagnostics");
  var graphEl = document.getElementById("data-graph");
  var ledgerEl = document.getElementById("data-ledger");
  var diag = JSON.parse(diagEl.textContent);
  var graph = JSON.parse(graphEl.textContent);
  var ledger = JSON.parse(ledgerEl.textContent);

  var LADDER = { always: 0, G1: 1, G3: 2, freeze: 3, acceptance: 4 };

  // ---- gate state (client-side filter only; not a re-run) ----
  var state = {
    gate: diag.run.gate,
    eco: diag.run.eco,
    sevOn: { error: true, warn: true, info: false, suppressed: false },
    ruleFilter: "",
    search: "",
    famOn: {},
    graphDepth: 2,
    graphSearch: "",
    selectedNode: null,
    ledgerTab: "eco",
    onlyUncovered: false,
    page: 0
  };

  function ruleGate(ruleId) {
    // gate lookup: derive from findings that carry this rule (gate is per-finding already).
    return null;
  }

  function appliedRuleSet() {
    // Build the set of rule ids that are "in gate" from diag.findings' own gate field,
    // since diagnostics.json already carries each finding's gate (no schema access on client).
    var target = LADDER[state.gate] !== undefined ? LADDER[state.gate] : 0;
    var applied = {};
    for (var i = 0; i < diag.findings.length; i++) {
      var f = diag.findings[i];
      var g = f.gate;
      if (g === "eco") {
        if (state.eco) applied[f.rule] = true;
      } else if ((LADDER[g] !== undefined ? LADDER[g] : 0) <= target) {
        applied[f.rule] = true;
      }
    }
    return applied;
  }

  function inGateFindings() {
    var applied = appliedRuleSet();
    return diag.findings.filter(function (f) { return applied[f.rule]; });
  }

  // ================= shell =================
  document.querySelectorAll("nav.viewtabs button").forEach(function (b) {
    b.addEventListener("click", function () {
      document.querySelectorAll("nav.viewtabs button").forEach(function (x) { x.classList.remove("active"); });
      document.querySelectorAll(".view").forEach(function (x) { x.classList.remove("active"); });
      b.classList.add("active");
      document.getElementById("view-" + b.dataset.view).classList.add("active");
      if (b.dataset.view === "graph") renderGraph();
      if (b.dataset.view === "trace") renderTrace();
      if (b.dataset.view === "ledgers") renderLedgers();
    });
  });

  var gateSelect = document.getElementById("gate-select");
  var ecoCheck = document.getElementById("gate-eco-check");
  gateSelect.value = state.gate;
  ecoCheck.checked = state.eco;
  gateSelect.addEventListener("change", function () {
    state.gate = gateSelect.value;
    renderAll();
  });
  ecoCheck.addEventListener("change", function () {
    state.eco = ecoCheck.checked;
    renderAll();
  });

  function renderAll() {
    renderFindings();
    var activeView = document.querySelector(".view.active");
    if (activeView && activeView.id === "view-graph") renderGraph();
    if (activeView && activeView.id === "view-trace") renderTrace();
  }

  // ================= findings view (DC-FINDINGS-001) =================
  var PAGE_SIZE = 200;

  function findingLoc(f) {
    return f.line !== undefined ? f.file + ":" + f.line : f.file;
  }

  function escapeHtml(s) {
    return String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
  }

  function famClass(fam) {
    var known = { REQ: 1, E: 1, M: 1, K: 1, CP: 1, SB: 1 };
    return known[fam] ? fam : "other";
  }

  function renderFindings() {
    var inGate = inGateFindings();
    var err = 0, warn = 0, info = 0, sup = 0;
    for (var i = 0; i < inGate.length; i++) {
      var f = inGate[i];
      if (f.suppressed) sup++;
      else if (f.severity === "error") err++;
      else if (f.severity === "warn") warn++;
      else info++;
    }
    document.getElementById("n-err").textContent = String(err);
    document.getElementById("n-warn").textContent = String(warn);
    document.getElementById("n-info").textContent = String(info);
    document.getElementById("n-sup").textContent = String(sup);

    // rule select options (populate once)
    var ruleSelect = document.getElementById("rule-filter");
    if (ruleSelect.options.length <= 1) {
      var rules = {};
      diag.findings.forEach(function (f) { rules[f.rule] = true; });
      var ruleIds = Object.keys(rules).sort();
      ruleIds.forEach(function (r) {
        var o = document.createElement("option");
        o.value = r; o.textContent = r;
        ruleSelect.appendChild(o);
      });
    }

    var filtered = inGate.filter(function (f) {
      var sevKey = f.suppressed ? "suppressed" : f.severity;
      if (!state.sevOn[sevKey]) return false;
      if (state.ruleFilter && f.rule !== state.ruleFilter) return false;
      if (state.search) {
        var s = state.search.toLowerCase();
        var hay = (f.file + " " + (f.targetId || "") + " " + f.message).toLowerCase();
        if (hay.indexOf(s) === -1) return false;
      }
      return true;
    });

    var tbody = document.querySelector("#findings-table tbody");
    var emptyState = document.getElementById("findings-empty");
    var table = document.getElementById("findings-table");
    var pager = document.getElementById("findings-pager");

    if (filtered.length === 0) {
      table.style.display = "none";
      pager.style.display = "none";
      emptyState.style.display = "";
      document.getElementById("empty-stats").textContent =
        "検査済み: " + diag.stats.files + " ファイル / " + diag.stats.ids + " ID / " + diag.stats.refs + " 参照";
      return;
    }
    table.style.display = "";
    emptyState.style.display = "none";

    var totalPages = Math.ceil(filtered.length / PAGE_SIZE);
    if (state.page >= totalPages) state.page = totalPages - 1;
    if (state.page < 0) state.page = 0;
    var startIdx = state.page * PAGE_SIZE;
    var pageItems = filtered.slice(startIdx, startIdx + PAGE_SIZE);

    var rows = pageItems.map(function (f) {
      var sevKey = f.suppressed ? "suppressed" : f.severity;
      var rowClass = f.suppressed ? " class=\"suppressed-row\"" : "";
      var loc = findingLoc(f);
      var target = f.targetId ? '<span class="fam ' + famClass(guessFamily(f.targetId)) + '">' + escapeHtml(f.targetId) + "</span>" : "";
      var reasonLine = f.suppressed
        ? '<span class="reason">suppress: ' + escapeHtml(f.suppressReason || "") + (f.suppressRef ? " — " + escapeHtml(f.suppressRef) : "") + "</span><br/>"
        : "";
      return (
        "<tr" + rowClass + ">" +
        '<td><span class="chip ' + sevKey + '">' + sevKey + "</span></td>" +
        '<td class="mono">' + escapeHtml(f.rule) + "</td>" +
        '<td class="loc"><span class="path mono" title="' + escapeHtml(loc) + '">' + escapeHtml(loc) + "</span></td>" +
        "<td>" + target + "</td>" +
        '<td class="msg">' + reasonLine + escapeHtml(f.message) + '<span class="fix">' + escapeHtml(f.fixTarget) + "</span></td>" +
        "</tr>"
      );
    });
    tbody.innerHTML = rows.join("");

    pager.style.display = totalPages > 1 ? "flex" : "none";
    document.getElementById("page-info").textContent = (state.page + 1) + " / " + totalPages + "(" + filtered.length + " 件)";
    document.getElementById("page-prev").disabled = state.page === 0;
    document.getElementById("page-next").disabled = state.page >= totalPages - 1;
  }

  function guessFamily(id) {
    var m = /^([A-Za-z]+(?:-[A-Za-z]+)*?)-/.exec(id);
    return m ? m[1] : id;
  }

  document.querySelectorAll(".filterbar .fchip[data-sev]").forEach(function (c) {
    c.addEventListener("click", function () {
      var sev = c.dataset.sev;
      state.sevOn[sev] = !state.sevOn[sev];
      c.classList.toggle("on");
      state.page = 0;
      renderFindings();
    });
  });
  document.getElementById("rule-filter").addEventListener("change", function (e) {
    state.ruleFilter = e.target.value;
    state.page = 0;
    renderFindings();
  });
  document.getElementById("findings-search").addEventListener("input", function (e) {
    state.search = e.target.value;
    state.page = 0;
    renderFindings();
  });
  document.getElementById("page-prev").addEventListener("click", function () { state.page--; renderFindings(); });
  document.getElementById("page-next").addEventListener("click", function () { state.page++; renderFindings(); });

  // ================= graph view (DC-GRAPH-001) =================
  var graphRendered = false;
  var FAM_COLOR = {
    REQ: "var(--fam-req)", E: "var(--fam-e)", M: "var(--fam-m)",
    K: "var(--fam-k)", CP: "var(--fam-cp)", SB: "var(--fam-sb)"
  };

  function nodeKey(family, id) { return family + "" + id; }

  function buildAdjacency() {
    var adj = {}; // id -> Set of neighbor ids (undirected, lineage counted as distance 1)
    function ensure(id) { if (!adj[id]) adj[id] = {}; }
    graph.edges.forEach(function (e) {
      ensure(e.from); ensure(e.to);
      adj[e.from][e.to] = true;
      adj[e.to][e.from] = true;
    });
    return adj;
  }

  function isSuperseded(n) {
    return n.lifecycle === "superseded" || n.lifecycle === "retired";
  }

  function initialSelection() {
    var applied = appliedRuleSet();
    var withError = [];
    diag.findings.forEach(function (f) {
      if (f.severity === "error" && !f.suppressed && applied[f.rule] && f.targetId) {
        withError.push(f.targetId);
      }
    });
    var errIdSet = {};
    withError.forEach(function (id) { errIdSet[id] = true; });
    var candidates = graph.nodes.filter(function (n) { return errIdSet[n.id]; });
    var pool = candidates.length > 0 ? candidates : graph.nodes;
    if (pool.length === 0) return null;
    var sorted = pool.slice().sort(function (a, b) {
      if (a.family !== b.family) return a.family < b.family ? -1 : 1;
      return a.id < b.id ? -1 : (a.id > b.id ? 1 : 0);
    });
    return sorted[0];
  }

  function neighborsWithinDepth(startId, depth) {
    var adj = buildAdjacency();
    var visited = {};
    visited[startId] = 0;
    var queue = [startId];
    while (queue.length > 0) {
      var cur = queue.shift();
      var d = visited[cur];
      if (d >= depth) continue;
      var neigh = adj[cur] || {};
      Object.keys(neigh).forEach(function (nb) {
        if (visited[nb] === undefined) {
          visited[nb] = d + 1;
          queue.push(nb);
        }
      });
    }
    return visited;
  }

  function renderGraph() {
    if (state.selectedNode === null) {
      var init = initialSelection();
      state.selectedNode = init ? init.id : null;
    }
    var nodesById = {};
    graph.nodes.forEach(function (n) { nodesById[n.id] = n; });

    var famOnAny = Object.keys(state.famOn).length > 0;
    var visibleIds;
    if (state.selectedNode && nodesById[state.selectedNode]) {
      var within = neighborsWithinDepth(state.selectedNode, state.graphDepth);
      visibleIds = Object.keys(within);
    } else {
      visibleIds = graph.nodes.map(function (n) { return n.id; });
    }
    var visibleSet = {};
    visibleIds.forEach(function (id) { visibleSet[id] = true; });

    var searchLower = state.graphSearch.toLowerCase();
    var nodes = graph.nodes.filter(function (n) {
      if (!visibleSet[n.id]) return false;
      if (famOnAny && state.famOn[n.family] === false) return false;
      if (searchLower) {
        var hay = (n.id + " " + (n.name || "")).toLowerCase();
        if (hay.indexOf(searchLower) === -1) return false;
      }
      return true;
    });
    var nodeIdSet = {};
    nodes.forEach(function (n) { nodeIdSet[n.id] = true; });

    var violatingEdges = {};
    diag.findings.forEach(function (f) {
      if (f.rule === "R-040" && !f.suppressed) violatingEdges[f.targetId + ">" + (f.message || "")] = true;
    });

    var edges = graph.edges.filter(function (e) {
      return nodeIdSet[e.from] && (nodeIdSet[e.to] || !e.resolved);
    });

    // deterministic grid layout (columns by family, rows by index) — layout algorithm is
    // exploratory per work-order §K-VIEWER-VANILLA "決定的層状" scope.
    var famOrder = [];
    nodes.forEach(function (n) { if (famOrder.indexOf(n.family) === -1) famOrder.push(n.family); });
    famOrder.sort();
    var colX = {};
    famOrder.forEach(function (f, i) { colX[f] = 80 + i * 180; });
    var rowCounters = {};
    var positions = {};
    nodes.forEach(function (n) {
      var col = colX[n.family];
      var row = rowCounters[n.family] || 0;
      rowCounters[n.family] = row + 1;
      positions[n.id] = { x: col, y: 60 + row * 60 };
    });
    var height = Math.max(400, 60 + (Math.max.apply(null, Object.keys(rowCounters).map(function (k) { return rowCounters[k]; }).concat([1])) ) * 60 + 40);
    var width = Math.max(700, 80 + famOrder.length * 180 + 120);

    var svgParts = [];
    svgParts.push('<svg viewBox="0 0 ' + width + ' ' + height + '" width="100%" height="100%" style="min-width:700px;min-height:380px">');
    svgParts.push('<defs><marker id="arr" markerWidth="7" markerHeight="7" refX="6" refY="3" orient="auto"><path d="M0,0 L6,3 L0,6" fill="none" stroke="#9aa3af"/></marker></defs>');
    edges.forEach(function (e) {
      var p1 = positions[e.from];
      var p2 = positions[e.to];
      if (!p1) return;
      var x2 = p2 ? p2.x : p1.x + 140;
      var y2 = p2 ? p2.y : p1.y + 40;
      var cls = "edge";
      if (!e.resolved) cls += " unresolved";
      if (violatingEdges[e.from + ">"]) cls += "";
      svgParts.push('<line class="' + cls + '" x1="' + (p1.x + 60) + '" y1="' + (p1.y + 13) + '" x2="' + (x2) + '" y2="' + (y2 + 13) + '"><title>' + escapeHtml(e.kind + ": " + e.from + " -> " + e.to + (e.resolved ? "" : " (unresolved)")) + "</title></line>");
    });
    nodes.forEach(function (n) {
      var pos = positions[n.id];
      var superseded = isSuperseded(n);
      var cls = "node" + (superseded ? " superseded" : "") + (n.id === state.selectedNode ? " sel" : "");
      var fill = superseded ? "#b8bcc4" : (FAM_COLOR[n.family] || "var(--fam-default)");
      var strokeAttr = n.id === state.selectedNode ? ' stroke="var(--accent)" stroke-width="2.5"' : "";
      var label = n.id.length > 16 ? n.id.slice(0, 14) + "…" : n.id;
      svgParts.push(
        '<g class="' + cls + '" data-item="' + escapeHtml(n.id) + '">' +
        '<rect x="' + pos.x + '" y="' + pos.y + '" width="120" height="26" fill="' + fill + '"' + strokeAttr + "></rect>" +
        '<text x="' + (pos.x + 6) + '" y="' + (pos.y + 17) + '">' + escapeHtml(label) + "</text>" +
        "</g>"
      );
    });
    svgParts.push("</svg>");
    document.getElementById("graph-canvas").innerHTML = svgParts.join("");

    document.querySelectorAll("#graph-canvas .node").forEach(function (g) {
      g.addEventListener("click", function () {
        state.selectedNode = g.dataset.item;
        renderGraph();
      });
    });

    renderGraphDetail(nodesById);
    graphRendered = true;
  }

  function reverseRefs(id) {
    var out = [];
    graph.edges.forEach(function (e) {
      if (e.to === id) out.push(e.from + "(" + e.kind + ")");
    });
    return out;
  }
  function forwardRefs(id) {
    var out = [];
    graph.edges.forEach(function (e) {
      if (e.from === id) out.push(e.to + "(" + e.kind + ")");
    });
    return out;
  }

  function renderGraphDetail(nodesById) {
    var panel = document.getElementById("detail-panel");
    var id = state.selectedNode;
    if (!id || !nodesById[id]) {
      panel.innerHTML = '<div class="empty-state"><p>品目が選択されていません</p></div>';
      return;
    }
    var n = nodesById[id];
    var lcClass = isSuperseded(n) ? " superseded" : "";
    var reqRefs = [];
    graph.edges.forEach(function (e) {
      if (e.from === id && e.kind === "requirement_refs") reqRefs.push(e.to);
    });
    var findingsForItem = diag.findings.filter(function (f) { return f.targetId === id; });
    var violation = diag.findings.find(function (f) { return f.rule === "R-040" && f.targetId === id && !f.suppressed; });

    var html = "";
    html += '<h3><span class="fam ' + famClass(n.family) + '">' + escapeHtml(n.family) + '</span> <span class="mono">' + escapeHtml(n.id) + '</span> <span class="lc' + lcClass + '">' + escapeHtml(n.lifecycle || "") + "</span></h3>";
    html += '<div id="d-name">' + escapeHtml(n.name || "") + "</div>";
    html += "<dl>";
    html += "<dt>要求(requirement_refs)</dt><dd>" + reqRefs.map(function (r) { return '<span class="fam REQ">' + escapeHtml(r) + "</span>"; }).join(" ") + "</dd>";
    html += "<dt>この品目を参照(逆引き)</dt><dd><ul class=\"mono\">" + reverseRefs(id).map(function (r) { return "<li>" + escapeHtml(r) + "</li>"; }).join("") + "</ul></dd>";
    html += "<dt>この品目が参照</dt><dd><ul class=\"mono\">" + forwardRefs(id).map(function (r) { return "<li>" + escapeHtml(r) + "</li>"; }).join("") + "</ul></dd>";
    html += "<dt>lineage</dt><dd class=\"mono\">" + (isSuperseded(n) ? "superseded/retired" : "-") + "</dd>";
    html += "<dt>この品目の所見</dt><dd>" + findingsForItem.map(function (f) {
      return '<span class="chip ' + (f.suppressed ? "suppressed" : f.severity) + '">' + (f.suppressed ? "suppressed" : f.severity) + '</span> <span class="mono">' + escapeHtml(f.rule) + "</span>";
    }).join(" ") + "</dd>";
    html += "</dl>";
    if (violation) {
      html += '<div class="violation-callout"><b>R-040</b>: ' + escapeHtml(violation.message) + "<br/>" + escapeHtml(violation.fixTarget) + "</div>";
    }
    panel.innerHTML = html;
  }

  document.getElementById("graph-search").addEventListener("input", function (e) {
    state.graphSearch = e.target.value;
    renderGraph();
  });
  document.getElementById("graph-depth").addEventListener("change", function (e) {
    state.graphDepth = parseInt(e.target.value, 10);
    renderGraph();
  });
  document.querySelectorAll("#graph-family-filter .fchip").forEach(function (c) {
    c.classList.add("on");
    state.famOn[c.dataset.fam] = true;
    c.addEventListener("click", function () {
      state.famOn[c.dataset.fam] = !state.famOn[c.dataset.fam];
      c.classList.toggle("on");
      renderGraph();
    });
  });

  // ================= trace matrix view (DC-TRACE-001, INV-010) =================
  function renderTrace() {
    var applied = appliedRuleSet();
    var reqNodes = graph.nodes.filter(function (n) { return n.family === "REQ"; }).sort(function (a, b) {
      return a.id < b.id ? -1 : (a.id > b.id ? 1 : 0);
    });

    // finding -> cells mapping (R-010/011/012/050). R-010 targets a REQ id directly.
    // R-011/012/050 target E/CP ids; map to REQ rows via requirement_refs edges (E -> REQ).
    var reqToEItems = {}; // reqId -> [eId]
    graph.edges.forEach(function (e) {
      if (e.kind === "requirement_refs") {
        if (!reqToEItems[e.to]) reqToEItems[e.to] = [];
        reqToEItems[e.to].push(e.from);
      }
    });
    var eToReq = {}; // eId -> [reqId]
    Object.keys(reqToEItems).forEach(function (reqId) {
      reqToEItems[reqId].forEach(function (eId) {
        if (!eToReq[eId]) eToReq[eId] = [];
        eToReq[eId].push(reqId);
      });
    });

    var uncovered = { E: {}, M: {}, CP: {}, TE: {} };
    diag.findings.forEach(function (f) {
      if (f.suppressed || !applied[f.rule]) return;
      if (f.rule === "R-010" && f.targetId) {
        uncovered.E[f.targetId] = uncovered.E[f.targetId] || [];
        uncovered.E[f.targetId].push(f);
      } else if ((f.rule === "R-011" || f.rule === "R-012") && f.targetId) {
        uncovered.M[f.targetId] = uncovered.M[f.targetId] || [];
        uncovered.M[f.targetId].push(f);
      } else if (f.rule === "R-050" && f.targetId) {
        uncovered.TE[f.targetId] = uncovered.TE[f.targetId] || [];
        uncovered.TE[f.targetId].push(f);
      }
    });

    var nodesById = {};
    graph.nodes.forEach(function (n) { nodesById[n.id] = n; });

    var mByE = {}; // eId -> [mId]
    graph.edges.forEach(function (e) {
      if (e.kind === "ebom_refs") {
        if (!mByE[e.to]) mByE[e.to] = [];
        mByE[e.to].push(e.from);
      }
    });
    var cpByE = {}; // eId -> [cpId] (acceptance_refs or verifies)
    graph.edges.forEach(function (e) {
      if (e.kind === "acceptance_refs" || e.kind === "verifies") {
        if (!cpByE[e.from]) cpByE[e.from] = [];
        cpByE[e.from].push(e.to);
      }
    });
    var specBySpecEdge = {}; // reqId -> spec section (trace_links to 20-spec.md#...)
    graph.edges.forEach(function (e) {
      if (e.kind === "trace_links" && /20-spec\.md#/.test(e.to)) {
        specBySpecEdge[e.from] = e.to.split("#")[1] || e.to;
      }
    });

    var rows = reqNodes.map(function (req) {
      var draft = req.lifecycle === "draft" || req.lifecycle === "retired";
      var eIds = reqToEItems[req.id] || [];
      var specCell = specBySpecEdge[req.id] ? { state: "ok", text: specBySpecEdge[req.id] } : { state: "draft", text: "—" };
      var eCell;
      if (draft) eCell = { state: "draft", text: "—" };
      else if (eIds.length === 0 || (uncovered.E[req.id] || []).length > 0) eCell = { state: "ng", text: "✗ 未被覆", findings: uncovered.E[req.id] || [] };
      else eCell = { state: "ok", text: eIds.join(", ") };

      var mCell = { state: "draft", text: "—" };
      var cpCell = { state: "draft", text: "—" };
      var teCell = { state: "draft", text: "—" };
      if (!draft && eIds.length > 0) {
        var anyMUncovered = eIds.some(function (eId) { return (uncovered.M[eId] || []).length > 0; });
        var mIds = [];
        eIds.forEach(function (eId) { (mByE[eId] || []).forEach(function (m) { if (mIds.indexOf(m) === -1) mIds.push(m); }); });
        if (mIds.length === 0 || anyMUncovered) {
          var mFindings = [];
          eIds.forEach(function (eId) { mFindings = mFindings.concat(uncovered.M[eId] || []); });
          mCell = { state: "ng", text: "✗ 未被覆", findings: mFindings };
        } else {
          mCell = { state: "ok", text: mIds.join(", ") };
        }

        var cpIds = [];
        eIds.forEach(function (eId) { (cpByE[eId] || []).forEach(function (cp) { if (cpIds.indexOf(cp) === -1) cpIds.push(cp); }); });
        if (cpIds.length === 0) {
          cpCell = { state: "ng", text: "✗ CP なし", findings: [] };
        } else {
          cpCell = { state: "ok", text: cpIds.join(", ") };
          var anyTeUncovered = cpIds.some(function (cp) { return (uncovered.TE[cp] || []).length > 0; });
          if (anyTeUncovered) {
            var teFindings = [];
            cpIds.forEach(function (cp) { teFindings = teFindings.concat(uncovered.TE[cp] || []); });
            teCell = { state: "ng", text: "✗ 証跡なし", findings: teFindings };
          } else {
            teCell = { state: "ok", text: "✓" };
          }
        }
      }

      return { req: req, draft: draft, specCell: specCell, eCell: eCell, mCell: mCell, cpCell: cpCell, teCell: teCell };
    });

    var visibleRows = state.onlyUncovered
      ? rows.filter(function (r) {
          return [r.eCell, r.mCell, r.cpCell, r.teCell].some(function (c) { return c.state === "ng"; });
        })
      : rows;

    function cellHtml(cell) {
      var cls = cell.state === "ok" ? "cell-ok mono" : cell.state === "ng" ? "cell-ng" : "cell-draft";
      var title = cell.findings && cell.findings.length ? cell.findings.map(function (f) { return f.rule + ": " + f.message; }).join("; ") : "";
      return '<td class="' + cls + '"' + (title ? ' title="' + escapeHtml(title) + '"' : "") + ">" + escapeHtml(cell.text) + "</td>";
    }

    var tbody = document.querySelector("#trace-table tbody");
    tbody.innerHTML = visibleRows.map(function (r) {
      var lcSpan = r.draft ? ' <span class="lc">' + escapeHtml(r.req.lifecycle || "") + "</span>" : "";
      return (
        "<tr>" +
        '<td><span class="fam REQ">' + escapeHtml(r.req.id) + "</span>" + lcSpan + "</td>" +
        cellHtml(r.specCell) + cellHtml(r.eCell) + cellHtml(r.mCell) + cellHtml(r.cpCell) + cellHtml(r.teCell) +
        "</tr>"
      );
    }).join("");

    var totalReq = rows.length;
    var eCovered = rows.filter(function (r) { return r.eCell.state === "ok"; }).length;
    var cpCovered = rows.filter(function (r) { return r.cpCell.state === "ok"; }).length;
    var eDenom = rows.filter(function (r) { return !r.draft; }).length;
    var teCovered = rows.filter(function (r) { return r.teCell.state === "ok"; }).length;
    var teDenom = rows.filter(function (r) { return r.cpCell.state === "ok"; }).length;
    document.getElementById("trace-summary").textContent =
      "被覆率: REQ→E " + pct(eCovered, eDenom) + "(" + eCovered + "/" + eDenom + ")・" +
      "E→CP " + pct(cpCovered, eDenom) + "(" + cpCovered + "/" + eDenom + ")・" +
      "CP→証跡 " + pct(teCovered, teDenom) + "(" + teCovered + "/" + teDenom + ")";
  }

  function pct(n, d) {
    if (d === 0) return "-";
    return Math.round((n / d) * 100) + "%";
  }

  document.getElementById("only-uncovered").addEventListener("change", function (e) {
    state.onlyUncovered = e.target.checked;
    renderTrace();
  });

  // ================= ledgers view (DC-LEDGER-001) =================
  function renderLedgers() {
    document.getElementById("tab-eco-count").textContent = "(" + ledger.ledgers.eco.length + ")";
    document.getElementById("tab-cheat-count").textContent = "(" + ledger.ledgers.cheat.length + ")";
    document.getElementById("tab-dec-count").textContent = "(" + ledger.ledgers.decision.length + ")";

    var ecoRows = ledger.ledgers.eco.map(function (e) {
      var st = e.status ? '<span class="st ' + escapeHtml(e.status) + '">' + escapeHtml(e.status) + "</span>" : "";
      var ac = e.affectedCount !== undefined ? e.affectedCount : "";
      return "<tr><td class=\"mono\">" + escapeHtml(e.id) + "</td><td>" + escapeHtml(e.title) + "</td><td>" + st + "</td><td class=\"mono\">" + ac + "</td></tr>";
    }).join("");
    document.querySelector("#pane-eco tbody").innerHTML = ecoRows;

    var cheatRows = ledger.ledgers.cheat.map(function (e) {
      return "<tr><td class=\"mono\">" + escapeHtml(e.id) + "</td><td>" + escapeHtml(e.title) + "</td><td class=\"mono\"></td></tr>";
    }).join("");
    document.querySelector("#pane-cheat tbody").innerHTML = cheatRows;

    var decRows = ledger.ledgers.decision.map(function (d) {
      var st = d.status ? '<span class="st ' + escapeHtml(d.status) + '">' + escapeHtml(d.status) + "</span>" : "";
      var binds = d.binds ? d.binds.join(", ") : "";
      return "<tr><td class=\"mono\">" + escapeHtml(d.id) + "</td><td>" + escapeHtml(d.title) + "</td><td>" + st + "</td><td class=\"mono\">" + escapeHtml(binds) + "</td><td>" + escapeHtml(d.approver || "") + "</td></tr>";
    }).join("");
    document.querySelector("#pane-dec tbody").innerHTML = decRows;
  }

  document.querySelectorAll(".ledger-tabs button").forEach(function (b) {
    b.addEventListener("click", function () {
      document.querySelectorAll(".ledger-tabs button").forEach(function (x) { x.classList.remove("active"); });
      document.querySelectorAll(".ledger-pane").forEach(function (x) { x.classList.remove("active"); });
      b.classList.add("active");
      document.getElementById("pane-" + b.dataset.pane).classList.add("active");
    });
  });

  // ---- initial render ----
  renderFindings();
})();
`;
