// BM25-lite ranking (pure, unit-tested). Swap for pgvector embeddings on Neon later.
const STOP = new Set("the and for with that this from what how when your have will into are was were there their about which".split(" "));
export const tokens = (t: string) => t.toLowerCase().split(/[^a-z0-9µ°%.-]+/).filter((w) => w.length > 2 && !STOP.has(w));
export function rank<T extends { text: string }>(q: string, docs: T[], k = 5): (T & { score: number })[] {
  const qt = [...new Set(tokens(q))]; if (!qt.length || !docs.length) return [];
  const toks = docs.map((d) => tokens(d.text)); const avg = toks.reduce((a, t) => a + t.length, 0) / toks.length || 1;
  const df = (w: string) => toks.filter((t) => t.includes(w)).length;
  const idf = Object.fromEntries(qt.map((w) => [w, Math.log(1 + (docs.length - df(w) + 0.5) / (df(w) + 0.5))]));
  return docs.map((d, i) => { const t = toks[i]; let s = 0; for (const w of qt) { const f = t.filter((x) => x === w).length; if (f) s += idf[w] * (f * 2.2) / (f + 1.2 * (0.25 + 0.75 * t.length / avg)); } return { ...d, score: +s.toFixed(3) }; }).filter((d) => d.score > 0).sort((a, b) => b.score - a.score).slice(0, k);
}
