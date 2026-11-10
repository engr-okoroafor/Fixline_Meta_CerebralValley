import { describe, it, expect } from "vitest";
import { SHAFT_SAMPLE, SHAFT_STEPS, inTolerance, shaftReport } from "@/lib/shaft-job";
import { FAULT_CASES, catalogDiagnosis, parseDiag, scoreText, summarize, type BenchRow } from "@/lib/benchmark/score";
import { estimateReportCost, readUsage } from "@/lib/ai/usage";

describe("shaft job", () => {
  it("keeps the seeded as-found outside tolerance and the as-left inside", () => {
    expect(inTolerance(SHAFT_SAMPLE.before, SHAFT_SAMPLE.rpm)).toBe(false);
    expect(inTolerance(SHAFT_SAMPLE.after, SHAFT_SAMPLE.rpm)).toBe(true);
    expect(SHAFT_STEPS).toHaveLength(6);
  });
  it("stamps every approve and reject into the report", () => {
    const md = shaftReport({
      completedAt: "2026-11-10T12:00:00.000Z",
      attempts: [
        { step: 0, decision: "rejected", at: "2026-11-10T11:00:00.000Z" },
        { step: 0, decision: "approved", at: "2026-11-10T11:01:00.000Z" },
        ...SHAFT_STEPS.slice(1).map((_, i) => ({ step: i + 1, decision: "approved" as const, at: "2026-11-10T11:02:00.000Z" })),
      ],
    });
    expect(md).toContain("Sample job");
    expect(md).toContain("-0.56");
    expect(md).toContain("0.04");
    expect(md).toContain("rejected at 2026-11-10T11:00:00.000Z");
    expect(md).toContain("approved at 2026-11-10T11:01:00.000Z");
    expect(md).toContain("2026-11-10T12:00:00.000Z");
  });
});

describe("benchmark score", () => {
  it("reads a diagnosis that was cut off mid-JSON", () => {
    const p = parseDiag('{"equipment":"Centrifugal pump","diagnosis":"seal leak","firstAction":"Lock out');
    expect(p.equipment).toBe("Centrifugal pump");
    expect(p.diagnosis).toMatch(/seal leak/);
  });
  it("matches equipment and failure words, and misses a wrong fault", () => {
    expect(scoreText("Centrifugal pump seal leak at the weep hole", "Centrifugal pump", "Seal leak").correct).toBe(true);
    expect(scoreText("Centrifugal pump cavitation on the suction", "Centrifugal pump", "Seal leak").correct).toBe(false);
  });
  it("scores the seeded catalog without calling a model", () => {
    const rows = FAULT_CASES.map((c) => ({ id: c.id, ...catalogDiagnosis(c.symptom, c.expectedEquipmentId, c.expectedEquipment, c.expectedFailure) }));
    const misses = rows.filter((r) => !r.correct).map((r) => `${r.id} top=${r.topId} matched=${r.matched.join("|")} eq=${r.equipmentHit} fail=${r.failureHit}`);
    expect(misses, misses.join("\n")).toEqual([]);
  });
  it("averages cost only from rows that have a figure", () => {
    const row = (estimatedUsd: number | null, provider: BenchRow["provider"]): BenchRow => ({
      id: "x", asset: "A", symptom: "s", expectedEquipment: "E", expectedFailure: "F", equipment: "E", diagnosis: "F", firstAction: "lockout",
      correct: true, equipmentHit: true, failureHit: true, ms: 10, provider, model: "m", fallback: false, usage: estimatedUsd == null ? null : { promptTokens: 10, cachedPromptTokens: 0, completionTokens: 5, totalTokens: 15 },
      estimatedUsd, rateNote: "", report: "", sample: true,
    });
    const s = summarize([row(0.002, "meta"), row(null, "nvidia")]);
    expect(s.correct).toBe(2);
    expect(s.costPerReportUsd).toBeCloseTo(0.002);
    expect(s.reportsWithUsage).toBe(1);
  });
});

describe("provider cost", () => {
  it("reads usage and prices Muse Spark standard", () => {
    const usage = readUsage({ usage: { prompt_tokens: 1000, completion_tokens: 100, prompt_tokens_details: { cached_tokens: 200 } } });
    const cost = estimateReportCost("meta", "muse-spark-1.3", usage);
    expect(cost?.usd).toBeCloseTo((800 * 1.25 + 200 * 0.15 + 100 * 4.25) / 1_000_000, 8);
    expect(estimateReportCost("meta", "muse-spark-1.3", null)).toBeNull();
  });
  it("prices a NVIDIA NIM prototype answer at zero dollars", () => {
    const cost = estimateReportCost("nvidia", "nvidia/nemotron-3.5-super-vl-120b-a12b", { promptTokens: 400, cachedPromptTokens: 0, completionTokens: 80, totalTokens: 480 });
    expect(cost?.usd).toBe(0);
    expect(cost?.rateNote).toMatch(/no per-token charge/i);
  });
});
