import { ASSET, TELEMETRY } from "./demo";
export const BASE = process.env.META_MODEL_API_BASE ?? "https://api.meta.ai/v1";
/** Meta Model API model IDs (dev.meta.ai/docs/models, Nov 2026). Override via env if Meta ships a newer version. */
export const MODELS = {
  reason: process.env.META_REASON_MODEL ?? "muse-spark-1.3", // primary agentic reasoning + image understanding
  vision: process.env.META_SAM_MODEL ?? "sam-3.1", // Segment Anything Model 3.1, POST /v1/responses (streamed wire tokens)
  transcribe: process.env.META_ASR_MODEL ?? "muse-voice-transcribe-1.0", // POST /v1/asr/transcribe, DIARIZATION mode
  translate: "facebook/seamless-m4t-v2-large", // open-weight SeamlessM4T v2, self-hosted via SEAMLESS_M4T_URL
  fallback: process.env.NVIDIA_MODEL ?? "nvidia/nemotron-3.5-super-vl-120b-a12b", // automatic fallback only
} as const;
type Msg = { role: "system" | "user" | "assistant"; content: unknown };
export type Engine = string;

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
    try { return { text: await call(BASE, process.env.MODEL_API_KEY, MODELS.reason, messages), engine: MODELS.reason }; } catch {}
  }
  if (process.env.NVIDIA_API_KEY) {
    try { return { text: await call("https://integrate.api.nvidia.com/v1", process.env.NVIDIA_API_KEY, MODELS.fallback, messages), engine: "nvidia-fallback" }; } catch {}
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

/** Parse SAM 3.1 wire output: `<0f>1<|box;x1=..;y1=..;x2=..;y2=..;w=W;h=H;c=0.9|><|mask;...|>,2<|box...|>` → normalized boxes (first frame). */
export function parseSamWire(raw: string, label: string): Box[] {
  const line = raw.split("\n").find((l) => l.includes("<|box")) ?? "";
  return [...line.matchAll(/<\|box;([^|]*)\|>/g)].map((m) => {
    const f = Object.fromEntries(m[1].split(";").map((kv) => kv.split("=")).map(([k, v]) => [k, Number(v)]));
    const W = f.w || 1, H = f.h || 1;
    return { label, score: f.c ?? 0.85, x: f.x1 / W, y: f.y1 / H, w: (f.x2 - f.x1) / W, h: (f.y2 - f.y1) / H };
  }).filter((b) => b.w > 0 && b.h > 0);
}

/** One SAM 3.1 request per concept (Meta docs: one noun phrase per request), streamed over the Responses API. */
export async function samSegment(image: string, concept: string): Promise<Box[]> {
  const r = await fetch(`${BASE}/responses`, {
    method: "POST", headers: { Authorization: `Bearer ${process.env.MODEL_API_KEY}`, "Content-Type": "application/json" },
    body: JSON.stringify({ model: MODELS.vision, stream: true, include_confidence: true, input: [{ type: "message", role: "user", content: [{ type: "input_text", text: concept }, { type: "input_image", image_url: image }] }] }),
    signal: AbortSignal.timeout(15000),
  });
  if (!r.ok) throw new Error(`sam ${r.status}`);
  let text = "";
  for (const l of (await r.text()).split("\n")) {
    if (!l.startsWith("data:")) continue;
    try { const e = JSON.parse(l.slice(5)); if (e.type === "response.output_text.delta") text += e.delta + "\n"; } catch {}
  }
  return parseSamWire(text, concept);
}
