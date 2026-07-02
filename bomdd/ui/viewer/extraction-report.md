# UI 抽出レポート — viewer 4画面(2026-07-03)

- 原資料: `bomdd/ui/mock/bomdd-plm-viewer.html`(v0.1 — **2026-07-03 akira 承認済み。設計原器**)
- モックは `data-ui-id` 埋込済みのため locator=stable id。抽出の曖昧さは低い。
- 成果: screens 4 / regions 10 / components 15 / actions 7 / inputs 4 / states 6 / domainConcepts 7 / **layoutInvariants 4**。
- S3(データ分散)予防: モック自体に境界状態を実装 — 空状態デモ(件数 0 切替)・4桁件数(1204)・長大パス行。
  contentVariance は summary-card(桁 0〜9999)・findings-table(行 0〜1万)・graph-canvas(ノード 5〜5千)等に宣言。
- BOM 対象外: DESIGN DIRECTION は designIntent として扱い、色言語・密度・不変条件は仕様 §2.12〜2.15 と
  Design System BOM 候補(SeverityChip/FamilyChip/SummaryCard/GraphNode/TraceCell/LedgerTable/EmptyStateDone 等)へ接続。
- E-BOM 昇格候補: E-VIEWER-SHELL-001 / E-VIEWER-FINDINGS-002 / E-VIEWER-GRAPH-003 / E-VIEWER-TRACE-004 / E-VIEWER-LEDGER-005(Phase 3 で確定)。
- 承認済み(UQ-UI-001 decided)。以後の改稿は ECO として扱い、data-ui-id を保存して差分を IR に反映する。
