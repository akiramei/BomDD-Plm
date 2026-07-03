// Selector engine for ref-edges dot/[]/(a|b) notation (§2.4).
// Selectors traverse parsed YAML/JSON. Returns matched values with best-effort source lines.
//
// Grammar supported:
//   segment       = key | key[]  | *  | *[]  | (a|b|c)  | (a|b)[]
//   `.` separates segments; `[]` means "iterate array items".
//   `*` matches any key at that level.
//   `(a|b)` matches any of the listed keys.

export interface Selected {
  /** the terminal value */
  value: unknown;
  /** dotted path of concrete keys/indexes for line lookup */
  concretePath: (string | number)[];
}

interface Segment {
  /** null = wildcard `*`; string[] = key alternation; single string = one key */
  keys: string[] | null;
  isArray: boolean;
}

export function parseSelector(sel: string): Segment[] {
  const segs: Segment[] = [];
  // split on top-level dots (parentheses have no dots inside our schema, but be safe)
  const parts: string[] = [];
  let depth = 0;
  let cur = "";
  for (const ch of sel) {
    if (ch === "(") depth++;
    if (ch === ")") depth--;
    if (ch === "." && depth === 0) {
      parts.push(cur);
      cur = "";
    } else {
      cur += ch;
    }
  }
  if (cur) parts.push(cur);

  for (let raw of parts) {
    let isArray = false;
    if (raw.endsWith("[]")) {
      isArray = true;
      raw = raw.slice(0, -2);
    }
    if (raw === "*") {
      segs.push({ keys: null, isArray });
    } else if (raw.startsWith("(") && raw.endsWith(")")) {
      const alts = raw.slice(1, -1).split("|").map((s) => s.trim());
      segs.push({ keys: alts, isArray });
    } else {
      segs.push({ keys: [raw], isArray });
    }
  }
  return segs;
}

function isObject(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}

/** Recursively resolve selector segments against a value. */
export function select(root: unknown, sel: string): Selected[] {
  const segs = parseSelector(sel);
  const results: Selected[] = [];

  function recur(value: unknown, path: (string | number)[], idx: number): void {
    if (idx === segs.length) {
      results.push({ value, concretePath: path });
      return;
    }
    const seg = segs[idx];
    if (!isObject(value)) return;
    const keys = seg.keys === null ? Object.keys(value) : seg.keys;
    for (const key of keys) {
      if (!(key in value)) continue;
      const child = value[key];
      const childPath = [...path, key];
      if (seg.isArray) {
        if (Array.isArray(child)) {
          child.forEach((item, i) => recur(item, [...childPath, i], idx + 1));
        }
      } else {
        recur(child, childPath, idx + 1);
      }
    }
  }

  recur(root, [], 0);
  return results;
}
