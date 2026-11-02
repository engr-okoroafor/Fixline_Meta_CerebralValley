import { describe, it, expect } from "vitest";
import { route, navCommand, remember, recall, withRetry } from "@/lib/ai/harness";
import { cableSize, pipe } from "@/lib/calc";
import { diagnose, EQUIPMENT } from "@/lib/equipment";
import { langLabel } from "@/lib/langs";
describe("harness", () => {
  it("routes", () => { expect(route("kitchen oil fire")).toBe("SafetyAgent"); expect(route("separator pressure alarm")).toBe("ScadaAgent"); expect(route("translate this to igbo")).toBe("TranslatorAgent"); expect(route("pump noisy")).toBe("RepairAgent"); });
  it("nav", () => { expect(navCommand("open safety please")).toBe("safety"); expect(navCommand("pump noisy")).toBeNull(); });
  it("memory", () => { remember("s", "centrifugal pump seal leaking"); expect(recall("s", "pump seal")[0]).toContain("seal"); expect(recall("x", "pump")).toEqual([]); });
  it("retry", async () => { let n = 0; await expect(withRetry(async () => { n++; if (n < 2) throw new Error("x"); return 1; })).resolves.toBe(1); });
});
describe("calc", () => {
  it("cable cites table", () => { const c = cableSize(40); expect(c).toMatchObject({ mm2: 6 }); expect(c.source).toMatch(/IEC 60364/); expect(cableSize(9999)).toHaveProperty("error"); });
  it("pipe", () => { expect(pipe("4", "40")).toMatchObject({ wall: 0.237, bolts: "8 × 5/8\"" }); expect(pipe("99", "40")).toHaveProperty("error"); });
  it("equipment", () => { expect(EQUIPMENT.length).toBeGreaterThanOrEqual(20); expect(diagnose("pump-centrifugal", "cavitation noise")!.likely).toContain("Cavitation"); });
  it("lang names", () => { expect(langLabel("yo")).toBe("🇳🇬 Yoruba"); expect(langLabel("en-NG")).toContain("English (Nigeria)"); });
});
