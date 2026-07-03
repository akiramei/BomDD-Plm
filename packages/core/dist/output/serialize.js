// Canonical serializer (§2.9). UTF-8, LF, 2-space indent, keys in schema-defined order,
// single trailing newline, no BOM. -0 normalized to 0.
/**
 * Serialize a JS value to canonical JSON. Object keys are emitted in insertion order,
 * so callers MUST construct objects with keys in schema property order.
 * Arrays are emitted in their given order (callers pre-sort with the §2.9 comparators).
 */
export function canonicalJson(value) {
    return render(value, 0) + "\n";
}
function render(value, indent) {
    if (value === null || value === undefined)
        return "null";
    if (typeof value === "boolean")
        return value ? "true" : "false";
    if (typeof value === "number") {
        const n = value === 0 ? 0 : value; // normalize -0
        return String(n);
    }
    if (typeof value === "string")
        return JSON.stringify(value);
    if (Array.isArray(value)) {
        if (value.length === 0)
            return "[]";
        const pad = "  ".repeat(indent + 1);
        const closePad = "  ".repeat(indent);
        const items = value.map((v) => pad + render(v, indent + 1));
        return "[\n" + items.join(",\n") + "\n" + closePad + "]";
    }
    if (typeof value === "object") {
        const entries = Object.entries(value).filter(([, v]) => v !== undefined);
        if (entries.length === 0)
            return "{}";
        const pad = "  ".repeat(indent + 1);
        const closePad = "  ".repeat(indent);
        const parts = entries.map(([k, v]) => pad + JSON.stringify(k) + ": " + render(v, indent + 1));
        return "{\n" + parts.join(",\n") + "\n" + closePad + "}";
    }
    return "null";
}
