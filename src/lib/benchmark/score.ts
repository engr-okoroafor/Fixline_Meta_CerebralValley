import faultsFile from "../../../data/benchmark/faults.json";
import { diagnose, getEquipment, searchEquipment } from "../equipment";
import type { TokenUsage } from "../ai/usage";

export type FaultCase = {
  id: string;
  asset: string;
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

const field = (text: string, key: string) => text.match(new RegExp(`"${key}"\\s*:\\s*"([^"\\\\]{0,400})`))?.[1]?.trim() ?? "";
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
  correct: boolean;
  equipmentHit: boolean;
  failureHit: boolean;
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
  note?: string;
};

export type BenchSummary = {
  n: number;
  correct: number;
  accuracy: number;
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
  const ms = rows.map((r) => r.ms);
  const priced = rows.filter((r) => r.estimatedUsd != null);
  const estimatedUsd = priced.length ? priced.reduce((a, r) => a + (r.estimatedUsd ?? 0), 0) : null;
  const providers: Record<string, number> = {};
  for (const r of rows) providers[r.provider] = (providers[r.provider] ?? 0) + 1;
  return {
    n,
    correct,
    accuracy: n ? correct / n : 0,
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
