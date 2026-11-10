import "server-only";
import { nvChatDetailed, nvLive, NV_MODEL } from "./nvidia-engine";
import { readUsage, type TokenUsage } from "./usage";
import { appSettings } from "../settings";
const BASE = process.env.META_MODEL_API_BASE ?? "https://api.meta.ai/v1";
type Msg = { role: "system" | "user" | "assistant"; content: unknown };
export type ChatResult = { text: string; model: string; fallback: boolean; provider: "meta" | "nvidia"; usage: TokenUsage | null };
/**
 * Dual-API routing policy:
 *  - PRIMARY: Meta muse-spark-1.3 for every latency-critical / conversational path (voice, vision, Ask AI, safety, SCADA diagnosis).
 *  - FALLBACK: NVIDIA Nemotron only when Meta has no key, errors, or times out (also used for heavy async jobs).
 */
export async function chat(messages: Msg[], max = 1500, metaTimeoutMs = 20000, prefer: "meta" | "nvidia" = "meta"): Promise<ChatResult> {
  // Meta muse-spark is primary. NVIDIA NIM answers only when Meta has no key, errors, or times out.
  // An admin "NVIDIA first" setting still falls back to Meta. Keys stay in server env (MODEL_API_KEY, NVIDIA_API_KEY).
  const cfg = await appSettings().catch(() => null);
  if (cfg) { if (cfg.ai.primary === "nvidia") prefer = "nvidia"; metaTimeoutMs = Math.min(metaTimeoutMs, cfg.ai.timeoutMs); }
  const nvidia = async (fallback: boolean): Promise<ChatResult> => {
    const r = await nvChatDetailed(messages as never, Math.min(max, 2500));
    return { text: r.text, model: NV_MODEL, fallback, provider: "nvidia", usage: r.usage };
  };
  if (prefer === "nvidia" && nvLive()) { try { return await nvidia(false); } catch { /* fall back to Meta */ } }
  const key = process.env.MODEL_API_KEY;
  if (key) {
    try {
      const r = await fetch(`${BASE}/chat/completions`, { method: "POST", headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" }, body: JSON.stringify({ model: "muse-spark-1.3", messages, max_tokens: max, reasoning_effort: "low" }), signal: AbortSignal.timeout(metaTimeoutMs) });
      if (r.ok) {
        const j = await r.json();
        const t = String(j.choices?.[0]?.message?.content ?? "").trim();
        const model = String(j.model ?? "muse-spark-1.3");
        if (t) return { text: t, model, fallback: false, provider: "meta", usage: readUsage(j) };
      }
    } catch { /* fall through to NVIDIA */ }
  }
  if (nvLive() && cfg?.ai.fallback !== "none") return nvidia(true);
  throw new Error("no AI provider available");
}
