import { MODELS, reason } from "@/lib/ai";
const DEMO: Record<string, string> = {
  "Abeg, this pump dey leak for seal.": "Please, this pump is leaking at the seal.",
  "Ṣé kí n pa breaker náà?": "Should I switch off the breaker?",
};
const ISO3: Record<string, string> = { en: "eng", yo: "yor", ig: "ibo", ha: "hau", fr: "fra", pcm: "eng" };
/** Speech/text translation: open-weight SeamlessM4T v2 (self-hosted, SEAMLESS_M4T_URL) → Muse Spark 1.3 → NVIDIA → demo. */
export async function POST(req: Request) {
  const { text = "", to = "en", from = "en" } = await req.json().catch(() => ({}));
  if (process.env.SEAMLESS_M4T_URL) {
    try {
      const r = await fetch(process.env.SEAMLESS_M4T_URL, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ model: MODELS.translate, text, src_lang: ISO3[from] ?? from, tgt_lang: ISO3[to] ?? to }), signal: AbortSignal.timeout(15000) });
      if (r.ok) { const j = await r.json(); if (j.text ?? j.translation) return Response.json({ text: j.text ?? j.translation, engine: "seamless-m4t-v2" }); }
    } catch {}
  }
  const r = await reason([{ role: "system", content: `Translate to ${to}. Output only the translation; keep technical terms.` }, { role: "user", content: text }], () => DEMO[text] ?? `[${to}] ${text}`);
  return Response.json(r);
}
