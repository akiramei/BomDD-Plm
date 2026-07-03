// Deterministic primitives (K-TS-DETERMINISM). No localeCompare / Intl / Date / random.

/** UTF-8 byte-order comparison of two strings (case-sensitive). */
export function byteCompare(a: string, b: string): number {
  return Buffer.compare(Buffer.from(a, "utf8"), Buffer.from(b, "utf8"));
}

/** Missing string key => empty string (sorts first). Missing numeric key => -1. */
export function cmpStr(a: string | undefined, b: string | undefined): number {
  return byteCompare(a ?? "", b ?? "");
}

export function cmpNum(a: number | undefined, b: number | undefined): number {
  const x = a ?? -1;
  const y = b ?? -1;
  return x - y;
}

/** Normalize -0 to 0. */
export function normNum(n: number): number {
  return n === 0 ? 0 : n;
}
