import "server-only";
// Grounded safety Q&A: Meta latency agent when MODEL_API_KEY exists, else NVIDIA engine, else catalog keyword match.
import { HAZARDS, EMERGENCY, DISCLAIMER } from "../hazards";
import { nvChat, nvLive, GROUNDED_SYS, NV_MODEL } from "./nvidia-engine";
import { chat } from "./router";
export const REFUSAL = "I can only answer from FixLine's cited safety references. That question is outside them. Ask your safety officer, and call emergency services if anyone is in danger.";
export function catalogMatch(q: string) { const s = q.toLowerCase(); return HAZARDS.filter((h) => [h.id, h.title, h.detect].join(" ").toLowerCase().split(/[^a-z0-9]+/).some((w) => w.length > 3 && s.includes(w))); }
export async function askSafety(q: string) {
  const hits = catalogMatch(q);
  let answer = "", model = "catalog";
  try {
    const r = await chat([{ role: "system", content: GROUNDED_SYS }, { role: "user", content: `<q>${q}</q>` }], 1200); answer = r.text; model = r.model; // Meta primary, NVIDIA fallback
  } catch { answer = ""; }
  if (!answer) answer = hits.length ? hits.map((h) => `[${h.id}] ${h.steps[0]}`).join("\n") : "OUT_OF_SCOPE";
  const refused = /OUT_OF_SCOPE/.test(answer) || (!hits.length && !/\[[a-z-]+\]/.test(answer));
  return { model, refused, answer: refused ? REFUSAL : answer, citations: hits.map((h) => ({ id: h.id, sources: h.sources })), callFirst: EMERGENCY, disclaimer: DISCLAIMER };
}
