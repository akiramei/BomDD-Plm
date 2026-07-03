// Test helper: lightweight DOM inspection for generated plm-view.html, without a DOM/JSDOM
// dependency (procurement discipline — 32-mbom.yaml lists no HTML-parsing package). Regex-based
// checks are sufficient for the L2 acceptance we run here: element presence via data-ui-id,
// absence of external references, and script-tag JSON payload extraction.

/** True if `html` contains an element carrying the given data-ui-id attribute value. */
export function hasUiId(html, uiId) {
  const re = new RegExp(`data-ui-id=["']${escapeRegExp(uiId)}["']`);
  return re.test(html);
}

/** Returns all data-ui-id values found in the document (for parity / duplicate checks). */
export function allUiIds(html) {
  const re = /data-ui-id=["']([^"']+)["']/g;
  const out = [];
  let m;
  while ((m = re.exec(html)) !== null) out.push(m[1]);
  return out;
}

/** True if the HTML references any external resource (CDN script, fetch, http(s) URL, storage). */
export function hasExternalReference(html) {
  return /https?:\/\/|(?<![.\w])fetch\s*\(|XMLHttpRequest|localStorage|sessionStorage/.test(html);
}

/** Extract the JSON payload embedded in a <script type="application/json" id="..."> tag. */
export function extractEmbeddedJson(html, scriptId) {
  const re = new RegExp(
    `<script type="application/json" id="${escapeRegExp(scriptId)}">([\\s\\S]*?)</script>`
  );
  const m = re.exec(html);
  if (!m) return undefined;
  return JSON.parse(m[1]);
}

function escapeRegExp(s) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
