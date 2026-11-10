/** Token usage and published-rate cost. Rates are estimates applied to measured usage. */
export type TokenUsage = { promptTokens: number; cachedPromptTokens: number; completionTokens: number; totalTokens: number };
export type ProviderId = "meta" | "nvidia";

const n = (v: unknown) => (typeof v === "number" && Number.isFinite(v) ? v : null);

/** Read an OpenAI-compatible usage object. Returns null when the provider omits it. */
export function readUsage(body: unknown): TokenUsage | null {
  const u = (body as { usage?: Record<string, unknown> } | null)?.usage;
  if (!u || typeof u !== "object") return null;
  const details = (u.prompt_tokens_details ?? u.input_tokens_details) as { cached_tokens?: unknown } | undefined;
  const prompt = n(u.prompt_tokens ?? u.input_tokens);
  const completion = n(u.completion_tokens ?? u.output_tokens);
  if (prompt == null && completion == null) return null;
  const promptTokens = prompt ?? 0;
  const completionTokens = completion ?? 0;
  const cachedPromptTokens = Math.min(promptTokens, n(details?.cached_tokens ?? u.cached_tokens) ?? 0);
  return { promptTokens, cachedPromptTokens, completionTokens, totalTokens: n(u.total_tokens) ?? promptTokens + completionTokens };
}

export type CostEstimate = {
  usd: number;
  provider: ProviderId;
  model: string;
  estimated: true;
  rateNote: string;
  source: string;
};

/**
 * Standard Muse Spark rates from Meta's pricing page, checked 2026-11-10.
 * Contributor-mode models are priced only if the response model id says so.
 * The NVIDIA path this app calls is the build.nvidia.com prototype endpoint, which publishes no per-token charge.
 */
const META_STANDARD = { inputPerM: 1.25, cachedPerM: 0.15, outputPerM: 4.25, source: "https://dev.meta.ai/docs/pricing-rate-limits", label: "Muse Spark standard" };
const META_CONTRIBUTOR = { inputPerM: 0.10, cachedPerM: 0.002, outputPerM: 0.20, source: "https://dev.meta.ai/docs/pricing-rate-limits", label: "Muse Spark contributor" };

export function estimateReportCost(provider: ProviderId, model: string, usage: TokenUsage | null): CostEstimate | null {
  if (!usage) return null;
  if (provider === "nvidia") {
    return {
      usd: 0,
      provider,
      model,
      estimated: true,
      source: "https://build.nvidia.com/search",
      rateNote: "NVIDIA NIM prototype (integrate.api.nvidia.com) publishes no per-token charge. Token counts are from the response. This is not a paid partner price. Checked 2026-11-10.",
    };
  }
  const rate = /contributor/i.test(model) ? META_CONTRIBUTOR : META_STANDARD;
  const uncached = Math.max(0, usage.promptTokens - usage.cachedPromptTokens);
  const usd = (uncached * rate.inputPerM + usage.cachedPromptTokens * rate.cachedPerM + usage.completionTokens * rate.outputPerM) / 1_000_000;
  return {
    usd,
    provider,
    model,
    estimated: true,
    source: rate.source,
    rateNote: `${rate.label}: $${rate.inputPerM}/1M input, $${rate.cachedPerM}/1M cached input, $${rate.outputPerM}/1M output. Estimate = published rate × usage returned by the API. Checked 2026-11-10.`,
  };
}
