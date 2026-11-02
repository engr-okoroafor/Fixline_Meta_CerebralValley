import { ASSET, TELEMETRY } from "./demo";
const BASE = process.env.META_MODEL_API_BASE ?? "https://api.meta.ai/v1";
type Msg = { role: "system" | "user" | "assistant"; content: unknown };
export type Engine = "muse-spark-1.3" | "nvidia-fallback" | "demo";

async function call(base: string, key: string, model: string, messages: Msg[]) {
  const r = await fetch(`${base}/chat/completions`, {
    method: "POST", headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
    body: JSON.stringify({ model, messages, max_tokens: 700 }), signal: AbortSignal.timeout(20000),
  });
  if (!r.ok) throw new Error(`${model} ${r.status}`);
  const j = await r.json();
  return String(j.choices?.[0]?.message?.content ?? "");
}

export async function reason(messages: Msg[], fallback: () => string): Promise<{ text: string; engine: Engine }> {
  if (process.env.MODEL_API_KEY) {
    try { return { text: await call(BASE, process.env.MODEL_API_KEY, "muse-spark-1.3", messages), engine: "muse-spark-1.3" }; } catch {}
  }
  if (process.env.NVIDIA_API_KEY) {
    try { return { text: await call("https://integrate.api.nvidia.com/v1", process.env.NVIDIA_API_KEY, process.env.NVIDIA_MODEL ?? "nvidia/nemotron-3.5-super-vl-120b-a12b", messages), engine: "nvidia-fallback" }; } catch {}
  }
  return { text: fallback(), engine: "demo" };
}

export const SYSTEM = `You are FixLine, a hands-free repair & quality agent on Ray-Ban Meta glasses. Be terse (≤3 spoken sentences). Ground every claim in the manual sections and history below, cite section ids like [M-4.2]. Never advance a repair step without camera confirmation. Always enforce LOTO before hands-on work.
ASSET: ${ASSET.name} @ ${ASSET.site}
MANUAL: ${ASSET.manual.map((m) => `[${m.id}] ${m.title}: ${m.text}`).join(" | ")}
HISTORY: ${ASSET.history.map((h) => `${h.date}: ${h.note}`).join(" | ")}
LAST TELEMETRY: ${JSON.stringify(TELEMETRY.at(-1))}`;

export type Box = { label: string; score: number; x: number; y: number; w: number; h: number };
/** Parse SAM 3.1 / VLM output into normalized boxes. Accepts JSON arrays, {boxes:[]}, or "label: x,y,w,h" lines. */
export function parseBoxes(raw: string): Box[] {
  const clamp = (n: number) => Math.max(0, Math.min(1, n > 1 ? n / 1000 : n));
  try {
    const m = raw.match(/\[[\s\S]*\]|\{[\s\S]*\}/);
    if (m) {
      const j = JSON.parse(m[0]);
      const arr: Record<string, unknown>[] = Array.isArray(j) ? j : (j.boxes ?? j.masks ?? j.detections ?? []);
      return arr.map((b) => {
        const bb = (b.box ?? b.bbox) as number[] | undefined;
        const [x, y, w, h] = bb ?? [b.x, b.y, b.w ?? b.width, b.h ?? b.height].map(Number);
        return { label: String(b.label ?? b.name ?? "part"), score: Number(b.score ?? b.confidence ?? 0.8), x: clamp(+x), y: clamp(+y), w: clamp(+w), h: clamp(+h) };
      }).filter((b) => b.w > 0 && b.h > 0);
    }
  } catch {}
  return [...raw.matchAll(/([\w \-]+):\s*([\d.]+),\s*([\d.]+),\s*([\d.]+),\s*([\d.]+)/g)].map((m) => ({ label: m[1].trim(), score: 0.75, x: clamp(+m[2]), y: clamp(+m[3]), w: clamp(+m[4]), h: clamp(+m[5]) }));
}
