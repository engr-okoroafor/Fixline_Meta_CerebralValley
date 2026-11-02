import { describe, it, expect } from "vitest";
import { enqueue, getJob } from "@/lib/ai/nvidia-engine";
import { askSafety, REFUSAL } from "@/lib/ai/grounded";
describe("heavy-lift queue", () => {
  it("runs jobs async and isolates owners", async () => {
    const id = enqueue("risk-analysis", { text: "forklift near racking" }, "a", async () => "ok");
    expect(getJob(id, "b")).toBeNull();
    await new Promise((r) => setTimeout(r, 10)); expect(getJob(id, "a")).toMatchObject({ status: "done", result: "ok" });
  });
});
describe("grounded Q&A refusal (no keys → catalog)", () => {
  it("refuses out-of-scope", async () => { delete process.env.NVIDIA_API_KEY; const r = await askSafety("what is the best stock to buy"); expect(r.refused).toBe(true); expect(r.answer).toBe(REFUSAL); });
  it("answers in-scope with citations", async () => { const r = await askSafety("generator carbon monoxide in garage"); expect(r.refused).toBe(false); expect(r.citations.length).toBeGreaterThan(0); });
});
