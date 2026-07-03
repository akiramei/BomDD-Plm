// Shared helpers for static HTML generation (viewer). No DOM libs — pure string templating.

export function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

/** Escape a JSON string for safe embedding inside <script type="application/json">. */
export function escapeForScriptTag(json: string): string {
  return json.replace(/<\/script/gi, "<\\/script");
}

const KNOWN_FAMILIES = new Set(["REQ", "E", "M", "K", "CP", "SB"]);

export function famClass(family: string): string {
  return KNOWN_FAMILIES.has(family) ? family : "other";
}
