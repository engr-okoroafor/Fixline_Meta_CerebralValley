import { describe, it, expect } from "vitest";
import { isoZone, alignment, megger, simulatePid, zieglerNichols } from "@/lib/eng";
import { alarmLevel, drift, guardWrite, activeTrips, initSim, stepSim, TAGS } from "@/lib/scada/model";
import { sanitizeSvg } from "@/lib/ai/svg";
import { cell } from "@/components/XRScene";
describe("engineering calcs", () => {
  it("ISO 10816 zones", () => { expect(isoZone(1, "II")).toBe("A"); expect(isoZone(5, "II")).toBe("C"); expect(isoZone(9, "II")).toBe("D"); });
  it("alignment shims cancel offset at coupling", () => { const a = alignment({ offsetV: 0.1, angleV: 0, offsetH: 0, angleH: 0, couplingToFront: 200, frontToRear: 400 }); expect(a.shimFront).toBe(-0.1); expect(a.shimRear).toBe(-0.1); expect(a.tolerance).toBe("acceptable"); });
  it("alignment angularity scales with distance", () => { const a = alignment({ offsetV: 0, angleV: 0.1, offsetH: 0, angleH: 0, couplingToFront: 100, frontToRear: 100 }); expect(a.shimRear).toBeCloseTo(-0.2); });
  it("megger PI + temp correction", () => { expect(megger(100, 150, 40, 0.4).verdict).toMatch(/PI/); expect(megger(0.5, 1, 40, 0.4).verdict).toMatch(/FAIL/); expect(megger(500, 1500, 30, 0.4).r40).toBe(250); });
  it("PID converges, ZN gains", () => { const r = simulatePid({ kp: 2, ki: 0.4, kd: 0.1 }); expect(Math.abs(r.finalError)).toBeLessThan(0.05); expect(zieglerNichols(6, 8)).toEqual({ kp: 3.6, ki: 0.9, kd: 3.6 }); });
});
describe("SCADA", () => {
  const P = TAGS[0].limits;
  it("ISA-18.2 levels", () => { expect(alarmLevel(18, P)).toBe("HIHI"); expect(alarmLevel(16, P)).toBe("HI"); expect(alarmLevel(7, P)).toBe("LO"); expect(alarmLevel(5, P)).toBe("LOLO"); expect(alarmLevel(12, P)).toBeNull(); });
  it("drift: ROC + z-score", () => { const h = Array.from({ length: 30 }, (_, i) => 50 + (i % 2) * 0.1); expect(drift([...h, 60], 2).rocAlarm).toBe(true); expect(drift([...h, 60], 20).devAlarm).toBe(true); expect(drift(h, 2).devAlarm).toBe(false); });
  it("AI can never write to real plant; e-stop blocks all; SP must be in window", () => {
    expect(guardWrite({ tag: "SEP1_P", sp: 12, target: "real", confirmed: true, actor: "ai", estop: false }).ok).toBe(false);
    expect(guardWrite({ tag: "SEP1_P", sp: 12, target: "real", confirmed: false, actor: "operator", estop: false }).ok).toBe(false);
    expect(guardWrite({ tag: "SEP1_P", sp: 12, target: "real", confirmed: true, actor: "operator", estop: false }).ok).toBe(true);
    expect(guardWrite({ tag: "SEP1_P", sp: 12, target: "sim", confirmed: false, actor: "ai", estop: true }).ok).toBe(false);
    expect(guardWrite({ tag: "SEP1_P", sp: 30, target: "sim", confirmed: true, actor: "operator", estop: false }).ok).toBe(false);
    expect(guardWrite({ tag: "TK1_L", sp: 50, target: "sim", confirmed: true, actor: "operator", estop: false }).ok).toBe(false);
  });
  it("interlock trips on PSHH and shuts inlet regardless of auto/AI", () => { const s = initSim(); s.v.SEP1_P = 18; expect(activeTrips(s.v).map((t) => t.id)).toContain("PSHH-SEP1"); expect(stepSim(s, 1, () => 0.5).valves.inlet).toBe(0); });
  it("closed loop holds separator pressure near SP", () => { let s = initSim(); for (let i = 0; i < 300; i++) s = stepSim(s, 1, () => 0.5); expect(Math.abs(s.v.SEP1_P - 12)).toBeLessThan(1.5); expect(Math.abs(s.v.SEP1_L - 50)).toBeLessThan(10); });
});
describe("LLM output safety", () => {
  it("SVG sanitizer strips script/handlers/links", () => { const s = sanitizeSvg('<svg><script>alert(1)</script><rect onload="x()" /><a href="javascript:x">y</a><image href="http://e"/></svg>')!; expect(s).not.toMatch(/script|onload|javascript|href|<image/i); });
  it("rejects non-svg", () => expect(sanitizeSvg("hello")).toBeNull());
});
describe("XR grid layout", () => { it("cells never overlap", () => { const w = 0.125, g = 0.02; const xs = [0, 1, 2].map((i) => cell(i, 0, 3, w, 0.06, g)[0]); for (let i = 1; i < 3; i++) expect(xs[i] - xs[i - 1]).toBeGreaterThanOrEqual(w); }); });
