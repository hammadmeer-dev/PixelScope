/** Ensures value is serializable (plain object/array/primitive) */
export function sanitizeValue(v: unknown, seen = new WeakSet<object>()): any {
  if (v === null || typeof v !== 'object') return v;
  if (v instanceof Date) return v.toISOString();

  // Handle arrays
  if (Array.isArray(v)) {
    return v.map((item) => sanitizeValue(item, seen));
  }

  // Handle objects
  const obj = v as Record<string, unknown>;

  // Detect circularity
  if (seen.has(obj)) return '[Circular]';
  seen.add(obj);

  // Check if it's a plain object (not a DOM node, Window, etc.)
  // We can check if the constructor is Object or if it's a null-prototype object
  const proto = Object.getPrototypeOf(obj);
  const isPlain = proto === null || proto === Object.prototype;

  if (!isPlain) {
    // Try to convert to string if it has a custom toString, otherwise use a placeholder
    try {
      if ((obj as any).tagName) return `[HTMLElement: ${(obj as any).tagName}]`;
      return String(obj);
    } catch {
      return '[Non-Serializable Object]';
    }
  }

  const out: Record<string, unknown> = {};
  for (const key of Object.keys(obj)) {
    out[key] = sanitizeValue(obj[key], seen);
  }
  return out;
}
