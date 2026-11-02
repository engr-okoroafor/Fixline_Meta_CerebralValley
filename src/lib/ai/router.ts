import "server-only";
import { nvChat, nvLive, NV_MODEL } from "./nvidia-engine";
import { appSettings } from "../settings";
const BASE = process.env.META_MODEL_API_BASE ?? "https://api.meta.ai/v1";
type Msg = { role: "system" | "user" | "assistant"; content: unknown };
/**
 * Dual-API routing policy:
 *  - PRIMARY: Meta muse-spark-1.3 for every latency-critical / conversational path (voice, vision, Ask AI, safety, SCADA diagnosis).
 *  - FALLBACK: NVIDIA Nemotron only when Meta has no key, errors, or times out (also used for heavy async jobs).
 */
export async function chat(messages: Msg[], max = 1500, metaTimeoutMs = 20000, prefer: "meta" | "nvidia" = "meta"): Promise<{ text: string; model: string; fallback: boolean }> {
  // Admin console (production) policy, then user preference (Settings → AI order). NVIDIA-first still falls back to Meta.
  const cfg = await appSettings().catch(() => null);
  if (cfg) { if (cfg.ai.primary === "nvidia") prefer = "nvidia"; metaTimeoutMs = Math.min(metaTimeoutMs, cfg.ai.timeoutMs); }
  if (prefer === "nvidia" && nvLive()) { try { return { text: await nvChat(messages as never, Math.min(max, 2500)), model: NV_MODEL, fallback: false }; } catch { /* fall back to Meta */ } }
  const key = process.env.MODEL_API_KEY;
  if (key) {
    try {
      const r = await fetch(`${BASE}/chat/completions`, { method: "POST", headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" }, body: JSON.stringify({ model: "muse-spark-1.3", messages, max_tokens: max, reasoning_effort: "low" }), signal: AbortSignal.timeout(metaTimeoutMs) });
      if (r.ok) { const t = String((await r.json()).choices?.[0]?.message?.content ?? "").trim(); if (t) return { text: t, model: "muse-spark-1.3", fallback: false }; }
    } catch { /* fall through to NVIDIA */ }
  }
  if (nvLive() && cfg?.ai.fallback !== "none") return { text: await nvChat(messages as never, Math.min(max, 2500)), model: NV_MODEL, fallback: true };
  throw new Error("no AI provider available");
}
