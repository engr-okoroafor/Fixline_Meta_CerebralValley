/** Futuristic display names for model attribution. Meta = primary, NVIDIA = secondary/fallback. */
export type ModelInfo = { name: string; vendor: "Meta" | "NVIDIA" | "Offline"; tier: "primary" | "fallback" | "offline"; raw: string };
export function modelInfo(raw?: string, fallback?: boolean): ModelInfo {
  const r = (raw ?? "").toLowerCase();
  if (!r || r === "mock" || r.includes("offline") || r.includes("rules")) return { name: "Guardian Offline KB", vendor: "Offline", tier: "offline", raw: raw ?? "offline" };
  if (r.includes("nvidia") || r.includes("nemotron") || r.includes("nim")) return { name: `NVIDIA ${/nemotron/.test(r) ? "Nemotron" : "NIM"} · Fallback Engine`, vendor: "NVIDIA", tier: "fallback", raw: raw! };
  const name = r.includes("muse") ? `Meta Muse Spark ${(raw!.match(/[\d.]+$/) ?? [""])[0]}`.trim() : r.includes("llama") ? `Meta ${raw}` : `Meta AI (${raw})`;
  return { name, vendor: "Meta", tier: fallback ? "fallback" : "primary", raw: raw! };
}
