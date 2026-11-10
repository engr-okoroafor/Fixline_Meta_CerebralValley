import { describe, it, expect } from "vitest";
import * as L from "@/lib/xr-logic";
// Immersive-Web-Emulator-style fixtures (no headset).
const desk: L.PlaneInfo = { orientation: "horizontal", width: 0.8, depth: 0.5, label: "table", distance: 0.45 };
describe("P1 hands-first", () => {
  it("pauses with no hands, resumes with 25-joint hands, ignores controllers", () => {
    expect(L.inputState([]).paused).toBe(true);
    expect(L.inputState([{ type: "controller" }]).paused).toBe(true);
    expect(L.inputState([{ type: "hand", joints: 25 }, { type: "hand", joints: 25 }]).paused).toBe(false);
    expect(L.inputState([{ type: "transientPointer" }]).paused).toBe(false);
  });
  it("requests only optional XR features, never controllers", () => { expect(L.XR_FEATURES.optionalFeatures).toEqual(expect.arrayContaining(["hand-tracking", "plane-detection", "mesh-detection", "hit-test", "anchors", "depth-sensing"])); });
});
describe("P2 passthrough surfaces", () => {
  it("accepts a clear desk", () => expect(L.surfaceSuitability(desk).ok).toBe(true));
  it("rejects wall, tiny, cluttered, far", () => {
    expect(L.surfaceSuitability({ ...desk, orientation: "vertical", label: "wall" }).ok).toBe(false);
    expect(L.surfaceSuitability({ ...desk, width: 0.2, depth: 0.2 }).ok).toBe(false);
    expect(L.surfaceSuitability(desk, 5).ok).toBe(false);
    expect(L.surfaceSuitability({ ...desk, distance: 1.5, label: "floor" }).ok).toBe(false);
  });
  it("picks best surface, -1 when none (graceful fallback)", () => { expect(L.bestSurface([{ ...desk, label: "floor" }, desk])).toBe(1); expect(L.bestSurface([])).toBe(-1); });
  it("hazard zone bounded", () => { expect(L.hazardZoneRadius(desk)).toBeCloseTo(0.4); expect(L.hazardZoneRadius({ ...desk, width: 5 })).toBe(0.5); });
});
describe("P3 seated", () => {
  it("clamps every target into 0.6 m reach and ±30/±20 FoV", () => {
    for (const p of [{ x: 2, y: 1, z: -3 }, { x: -1, y: -1, z: -0.2 }, { x: 0, y: 0, z: -0.5 }]) { const c = L.clampSeated(p); expect(L.withinReach(c)).toBe(true); expect(L.withinFov(c, { h: 30.01, v: 20.01 })).toBe(true); }
  });
  it("scenarios finish in < 10 min", () => { for (const s of L.SCENARIOS) expect(L.scenarioSeconds(s)).toBeLessThan(600); });
  it("pause/resume persists place", () => { const m = new Map<string, string>(); const st = { setItem: (k: string, v: string) => m.set(k, v), getItem: (k: string) => m.get(k) ?? null };
    L.saveProgress(st, { scenario: "loto", step: 4, paused: true }); expect(L.loadProgress(st)).toMatchObject({ scenario: "loto", step: 4, paused: true });
    m.set(L.PROGRESS_KEY, "{bad"); expect(L.loadProgress(st)).toBeNull(); });
});
describe("checkpoint", () => {
  it("does not advance until a person approves, and reject stays put", () => {
    let p = L.startFlow("loto");
    expect(L.resolveCheckpoint(p, "approved", "t0")).toBe(p);
    p = L.requestCheckpoint(p);
    expect(p.phase).toBe("checkpoint");
    expect(p.step).toBe(0);
    const rejected = L.resolveCheckpoint(p, "rejected", "t1");
    expect(rejected.step).toBe(0);
    expect(rejected.phase).toBe("doing");
    const again = L.requestCheckpoint(rejected);
    const ok = L.resolveCheckpoint(again, "approved", "t2");
    expect(ok.step).toBe(1);
    expect(ok.attempts.map((a) => a.decision)).toEqual(["rejected", "approved"]);
  });
  it("voice done asks, approve does not skip the checkpoint", () => {
    expect(L.voiceIntent("done")).toBe("checkpoint");
    expect(L.voiceIntent("approve")).toBe("approve");
    expect(L.voiceIntent("reject that")).toBe("reject");
  });
  it("caps Quest pixel ratio at 1 and other screens at 1.5", () => {
    expect(L.adaptiveDpr(3, "Mozilla/5.0 (Linux; Android 10; Quest 3)")).toBe(1);
    expect(L.adaptiveDpr(3, "Chrome")).toBe(1.5);
    expect(L.adaptiveDpr(1, "Chrome")).toBe(1);
  });
});
describe("P4/P6", () => {
  it("outlet label triggers LOTO reminder", () => expect(L.promptsFromLabels(["electrical-outlet", "table", undefined])).toEqual(["electrical"]));
  it("FoV from projection never exceeds comfort cap", () => { const f = L.fovFromProjection([1, 0, 0, 0, 0, 1.2]); expect(f.h).toBeLessThanOrEqual(30); expect(f.v).toBeLessThanOrEqual(20); });
});
