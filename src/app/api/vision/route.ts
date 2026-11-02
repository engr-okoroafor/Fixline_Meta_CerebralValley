import { parseBoxes, type Box } from "@/lib/ai";
const BASE = process.env.META_MODEL_API_BASE ?? "https://api.meta.ai/v1";
const DEMO: Record<string, Box[]> = {
  default: [{ label: "mechanical seal", score: 0.93, x: 0.38, y: 0.42, w: 0.22, h: 0.2 }, { label: "coupling guard", score: 0.81, x: 0.64, y: 0.36, w: 0.2, h: 0.24 }],
  qa: [{ label: "scratch", score: 0.88, x: 0.2, y: 0.3, w: 0.18, h: 0.08 }, { label: "dent", score: 0.79, x: 0.58, y: 0.55, w: 0.12, h: 0.12 }, { label: "label misprint", score: 0.71, x: 0.4, y: 0.15, w: 0.2, h: 0.1 }],
};
export async function POST(req: Request) {
  const { image, prompt = "mechanical seal", mode = "repair", step } = await req.json().catch(() => ({}));
  if (process.env.MODEL_API_KEY && image) {
    try {
      const r = await fetch(`${BASE}/chat/completions`, { method: "POST", headers: { Authorization: `Bearer ${process.env.MODEL_API_KEY}`, "Content-Type": "application/json" },
        body: JSON.stringify({ model: "sam-3.1", messages: [{ role: "user", content: [{ type: "text", text: `Segment and track: ${prompt}. Return JSON [{label,score,box:[x,y,w,h]}] normalized 0-1.` }, { type: "image_url", image_url: { url: image } }] }] }), signal: AbortSignal.timeout(15000) });
      if (r.ok) { const j = await r.json(); const boxes = parseBoxes(JSON.stringify(j.boxes ?? j.choices?.[0]?.message?.content ?? "")); if (boxes.length) return Response.json({ engine: "sam-3.1", boxes, confirmed: step != null ? boxes.some((b) => b.score > 0.6) : undefined }); }
    } catch {}
  }
  const jitter = () => (Math.random() - 0.5) * 0.03;
  const boxes = (DEMO[mode] ?? DEMO.default).map((b) => ({ ...b, x: b.x + jitter(), y: b.y + jitter(), label: mode === "repair" && prompt ? (b === DEMO.default[0] ? prompt : b.label) : b.label }));
  return Response.json({ engine: "demo", boxes, confirmed: step != null ? true : undefined, note: step != null ? "Demo confirmation: target re-acquired, state matches expected." : undefined });
}
