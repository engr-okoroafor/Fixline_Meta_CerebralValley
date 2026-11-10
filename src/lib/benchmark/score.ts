import faultsFile from "../../../data/benchmark/faults.json";
import { diagnose, getEquipment, searchEquipment, type Equipment } from "../equipment";
import { guideFor } from "../repair-guide";
import type { TokenUsage } from "../ai/usage";

export type FaultCase = {
  id: string;
  asset: string;
  heldOut: boolean;
  symptom: string;
  expectedEquipmentId: string;
  expectedEquipment: string;
  expectedFailure: string;
};
export const SAMPLE_LABEL = faultsFile.label;
export const FAULT_CASES = faultsFile.cases as FaultCase[];

const words = (s: string) => s.toLowerCase().split(/[^a-z0-9]+/).filter((w) => w.length > 2);

/** Lexical match against the seeded expected labels. A hit requires every expected word to appear. */
export function scoreText(text: string, expectedEquipment: string, expectedFailure: string) {
  const n = text.toLowerCase();
  const has = (phrase: string) => words(phrase).every((w) => n.includes(w));
  const equipmentHit = has(expectedEquipment);
  const failureHit = has(expectedFailure);
  return { equipmentHit, failureHit, correct: equipmentHit && failureHit };
}

/** Share of expected words found in the answer. Near-miss is at least half on both labels. Exact stays in scoreText. */
export function coverage(text: string, phrase: string) {
  const w = words(phrase);
  if (!w.length) return 0;
  const n = text.toLowerCase();
  return w.filter((x) => n.includes(x)).length / w.length;
}
export function nearMissScore(text: string, expectedEquipment: string, expectedFailure: string) {
  const equipmentCoverage = coverage(text, expectedEquipment);
  const failureCoverage = coverage(text, expectedFailure);
  return { equipmentCoverage, failureCoverage, nearMiss: equipmentCoverage >= 0.5 && failureCoverage >= 0.5 };
}

export type HybridCandidate = { id: string; name: string; failures: string[] };
/** Top catalog rows plus a short manual snippet. The model may only choose from these. */
export function hybridPacket(symptom: string, k = 4) {
  const candidates = searchEquipment(symptom).slice(0, k);
  const guide = guideFor(symptom);
  const manual = guide.machine === "Industrial machine"
    ? "No specific repair-guide entry."
    : guide.steps.slice(0, 2).map((s) => `${s.what}. ${s.how}`).join(" ").slice(0, 480);
  const lines = candidates.map((e: Equipment) => `id=${e.id}; name=${e.name}; category=${e.category}; failures=${e.failures.join(" | ")}; check=${(e.checks[0] ?? "").slice(0, 120)}; manual=${(e.howTo?.[0] ?? "").slice(0, 220)}`);
  return {
    candidates: candidates.map((e): HybridCandidate => ({ id: e.id, name: e.name, failures: e.failures })),
    prompt: `<candidates>\n${lines.join("\n") || "(none)"}\n</candidates>\n<repair-guide>\n${manual}\n</repair-guide>\n<q>${symptom}</q>`,
  };
}

const field = (text: string, key: string) => text.match(new RegExp(`"${key}"\\s*:\\s*"([^"\\\\]{0,400})`))?.[1]?.trim() ?? "";
export function parseChoice(text: string) {
  const base = parseDiag(text);
  let confidence: number | null = null;
  const num = text.match(/"confidence"\s*:\s*([0-9]*\.?[0-9]+)/);
  if (num) confidence = Number(num[1]);
  const m = text.match(/\{[\s\S]*\}/);
  if (m) {
    try {
      const j = JSON.parse(m[0]) as Record<string, unknown>;
      const c = Number(j.confidence);
      if (Number.isFinite(c)) confidence = c;
    } catch { /* keep the loose number */ }
  }
  return {
    equipment: field(text, "equipment") || base.equipment,
    failure: field(text, "failure") || base.diagnosis,
    catalogId: field(text, "catalogId"),
    nextStep: field(text, "nextStep") || base.firstAction,
    confidence: confidence != null && Number.isFinite(confidence) ? confidence : null,
  };
}
export function parseDiag(text: string) {
  const loose = { equipment: field(text, "equipment"), diagnosis: field(text, "diagnosis"), firstAction: field(text, "firstAction"), report: field(text, "report") };
  const m = text.match(/\{[\s\S]*\}/);
  if (!m) return { equipment: loose.equipment, diagnosis: loose.diagnosis || text.slice(0, 500), firstAction: loose.firstAction, report: loose.report || text.slice(0, 1000) };
  try {
    const j = JSON.parse(m[0]) as Record<string, unknown>;
    const s = (k: string, max: number) => String(j[k] ?? "").slice(0, max);
    return { equipment: s("equipment", 200) || loose.equipment, diagnosis: s("diagnosis", 500) || loose.diagnosis || text.slice(0, 500), firstAction: s("firstAction", 500) || loose.firstAction, report: s("report", 1200) || loose.report || text.slice(0, 1000) };
  } catch {
    return { equipment: loose.equipment, diagnosis: loose.diagnosis || text.slice(0, 500), firstAction: loose.firstAction, report: loose.report || text.slice(0, 1000) };
  }
}

/** Same word rule as diagnose(): a failure counts only when one of its words is in the symptom. */
export function catalogDiagnosis(symptom: string, expectedId: string, expectedEquipment: string, expectedFailure: string) {
  const top = searchEquipment(symptom)[0] ?? null;
  const equipment = top ? getEquipment(top.id) : null;
  const s = symptom.toLowerCase();
  const matched = (equipment?.failures ?? []).filter((f) => f.toLowerCase().split(/\W+/).some((w) => w.length > 3 && s.includes(w)));
  const d = top ? diagnose(top.id, symptom) : null;
  const equipmentBlob = `${top?.name ?? ""} ${top?.category ?? ""} ${top?.id ?? ""}`.toLowerCase();
  const failureBlob = matched.join(" \n ");
  const equipmentHit = words(expectedEquipment).every((w) => equipmentBlob.includes(w));
  const failureHit = words(expectedFailure).every((w) => failureBlob.toLowerCase().includes(w));
  return { topId: top?.id ?? null, topName: top?.name ?? null, likely: d?.likely ?? [], matched, checks: d?.checks ?? [], equipmentHit, failureHit, correct: equipmentHit && failureHit, expectedId };
}

export type BenchRow = {
  id: string;
  asset: string;
  symptom: string;
  expectedEquipment: string;
  expectedFailure: string;
  equipment: string;
  diagnosis: string;
  firstAction: string;
  heldOut: boolean;
  correct: boolean;
  nearMiss: boolean;
  equipmentCoverage: number;
  failureCoverage: number;
  equipmentHit: boolean;
  failureHit: boolean;
  catalogId: string;
  confidence: number | null;
  ms: number;
  provider: "meta" | "nvidia" | "catalog";
  model: string;
  fallback: boolean;
  usage: TokenUsage | null;
  estimatedUsd: number | null;
  rateNote: string;
  report: string;
  sample: true;
};

export type BenchPayload = {
  ranAt: string;
  cached: boolean;
  sample: true;
  sampleLabel: string;
  rows: BenchRow[];
  summary: BenchSummary;
  catalogRows: BenchRow[];
  catalogSummary: BenchSummary;
  hybridRows: BenchRow[];
  hybridSummary: BenchSummary;
  note?: string;
};

export type BenchSummary = {
  n: number;
  correct: number;
  accuracy: number;
  nearMisses: number;
  nearMissAccuracy: number;
  heldOut: number;
  heldOutCorrect: number;
  heldOutNear: number;
  meanMs: number;
  medianMs: number;
  totalPromptTokens: number;
  totalCachedTokens: number;
  totalCompletionTokens: number;
  reportsWithUsage: number;
  estimatedUsd: number | null;
  costPerReportUsd: number | null;
  providers: Record<string, number>;
};

const median = (xs: number[]) => {
  if (!xs.length) return 0;
  const s = [...xs].sort((a, b) => a - b);
  const m = Math.floor(s.length / 2);
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
};

export function summarize(rows: BenchRow[]): BenchSummary {
  const n = rows.length;
  const correct = rows.filter((r) => r.correct).length;
  const nearMisses = rows.filter((r) => r.nearMiss).length;
  const held = rows.filter((r) => r.heldOut);
  const ms = rows.map((r) => r.ms);
  const priced = rows.filter((r) => r.estimatedUsd != null);
  const estimatedUsd = priced.length ? priced.reduce((a, r) => a + (r.estimatedUsd ?? 0), 0) : null;
  const providers: Record<string, number> = {};
  for (const r of rows) providers[r.provider] = (providers[r.provider] ?? 0) + 1;
  return {
    n,
    correct,
    accuracy: n ? correct / n : 0,
    nearMisses,
    nearMissAccuracy: n ? nearMisses / n : 0,
    heldOut: held.length,
    heldOutCorrect: held.filter((r) => r.correct).length,
    heldOutNear: held.filter((r) => r.nearMiss).length,
    meanMs: n ? ms.reduce((a, b) => a + b, 0) / n : 0,
    medianMs: median(ms),
    totalPromptTokens: rows.reduce((a, r) => a + (r.usage?.promptTokens ?? 0), 0),
    totalCachedTokens: rows.reduce((a, r) => a + (r.usage?.cachedPromptTokens ?? 0), 0),
    totalCompletionTokens: rows.reduce((a, r) => a + (r.usage?.completionTokens ?? 0), 0),
    reportsWithUsage: rows.filter((r) => r.usage != null).length,
    estimatedUsd,
    costPerReportUsd: estimatedUsd == null ? null : estimatedUsd / priced.length,
    providers,
  };
}
