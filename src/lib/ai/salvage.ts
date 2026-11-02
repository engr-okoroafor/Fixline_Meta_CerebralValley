/** Truncated/invalid model JSON: recover string and string-array fields so the UI never shows raw JSON. */
export function looksJson(t: string) { return /^\s*(```(json)?\s*)?[{\[]/.test(t) || /"\w+"\s*:\s*["\[]/.test(t.slice(0, 200)); }
export function salvageJson(t: string): Record<string, unknown> {
  const o: Record<string, unknown> = {}; const un = (x: string) => { try { return JSON.parse(`"${x}"`) as string; } catch { return x.replace(/\\"/g, '"'); } };
  for (const m of t.matchAll(/"(\w+)"\s*:\s*"((?:[^"\\]|\\.)*)"/g)) if (!(m[1] in o)) o[m[1]] = un(m[2]);
  for (const m of t.matchAll(/"(\w+)"\s*:\s*\[([^\]]*)\]?/g)) if (!(m[1] in o)) { const items = [...m[2].matchAll(/"((?:[^"\\]|\\.)*)"/g)].map((x) => un(x[1])); if (items.length) o[m[1]] = items; }
  return o;
}
