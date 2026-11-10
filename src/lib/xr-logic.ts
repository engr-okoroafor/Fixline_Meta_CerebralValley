// Pure, headset-free XR logic (unit-tested with emulator-style fixtures).
import { SHAFT_STEPS } from "./shaft-job";
export const SEATED_REACH_M = 0.6;
export const FOV = { h: 30, v: 20 }; // comfortable half-angles (deg)
export type V3 = { x: number; y: number; z: number };
export function withinReach(p: V3, head: V3 = { x: 0, y: 0, z: 0 }) { return Math.hypot(p.x - head.x, p.y - head.y, p.z - head.z) <= SEATED_REACH_M + 1e-9; }
export function withinFov(p: V3, half = FOV) { const d = Math.max(1e-6, -p.z); return Math.abs(Math.atan2(p.x, d)) * 180 / Math.PI <= half.h && Math.abs(Math.atan2(p.y, Math.hypot(p.x, d))) * 180 / Math.PI <= half.v; }
/** Clamp a head-relative point into reach and comfortable FoV. */
export function clampSeated(p: V3, half = FOV): V3 {
  let d = Math.max(0.25, Math.min(SEATED_REACH_M * 0.9, Math.hypot(p.x, p.y, p.z)));
  const yaw = Math.max(-half.h, Math.min(half.h, Math.atan2(p.x, -p.z) * 180 / Math.PI)) * Math.PI / 180;
  const pitch = Math.max(-half.v, Math.min(half.v, Math.atan2(p.y, Math.hypot(p.x, p.z)) * 180 / Math.PI)) * Math.PI / 180;
  d = Math.min(d, SEATED_REACH_M * 0.9);
  return { x: d * Math.cos(pitch) * Math.sin(yaw), y: d * Math.sin(pitch), z: -d * Math.cos(pitch) * Math.cos(yaw) };
}
export function fovFromProjection(m: ArrayLike<number> | undefined) { if (!m) return FOV; const h = Math.atan(1 / m[0]) * 180 / Math.PI, v = Math.atan(1 / m[5]) * 180 / Math.PI; return { h: Math.min(FOV.h, h * 0.6), v: Math.min(FOV.v, v * 0.6) }; }
export type PlaneInfo = { orientation: "horizontal" | "vertical" | undefined; width: number; depth: number; label?: string; distance: number };
export type Suitability = { ok: boolean; score: number; reasons: string[] };
/** Judge whether a detected surface can host the Safety dashboard. clutter = mesh objects intersecting plane footprint. */
export function surfaceSuitability(p: PlaneInfo, clutter = 0): Suitability {
  const r: string[] = []; let s = 1;
  if (p.orientation !== "horizontal") { s -= 0.5; r.push("not horizontal"); }
  if (p.width * p.depth < 0.12) { s -= 0.5; r.push("too small (<0.12 m²)"); }
  if (p.distance > SEATED_REACH_M) { s -= 0.3; r.push("out of seated reach"); }
  if (clutter > 2) { s -= 0.5; r.push(`cluttered (${clutter} objects)`); }
  if (p.label && /floor|ceiling|wall/.test(p.label)) { s -= 0.4; r.push(`semantic: ${p.label}`); }
  return { ok: s >= 0.6, score: Math.max(0, +s.toFixed(2)), reasons: r };
}
export function bestSurface(planes: PlaneInfo[], clutter: number[] = []) { let best = -1, sc = -1; planes.forEach((p, i) => { const s = surfaceSuitability(p, clutter[i] ?? 0); if (s.ok && s.score > sc) { sc = s.score; best = i; } }); return best; }
/** Hazard zone radius (m) around anchored dashboard. */
export function hazardZoneRadius(p: PlaneInfo) { return Math.max(0.15, Math.min(0.5, Math.max(p.width, p.depth) / 2)); }
/** Hands-first input state: pause when no tracked hands. */
export function inputState(sources: { type: string; joints?: number }[]) {
  const hands = sources.filter((s) => s.type === "hand" && (s.joints ?? 25) === 25).length;
  return { hands, paused: hands === 0 && !sources.some((s) => s.type === "transientPointer"), controllersIgnored: sources.filter((s) => s.type === "controller").length };
}
/** Proactive prompts from semantic labels (P4). */
const LABEL_PROMPTS: Record<string, string> = { "electrical-outlet": "electrical", outlet: "electrical", "power-panel": "electrical", stove: "home-kitchen", generator: "co", "gas-cylinder": "gas-lpg", ladder: "height", stairs: "slips", "chemical-container": "chemical" };
export function promptsFromLabels(labels: (string | undefined)[]) { return [...new Set(labels.map((l) => l && LABEL_PROMPTS[l.toLowerCase()]).filter(Boolean) as string[])]; }
// --- Guided scenarios (complete in < 10 min) ---
export type Scenario = { id: string; title: string; hazard: string; steps: { text: string; seconds: number }[] };
export const SCENARIOS: Scenario[] = [
  { id: "shaft-align", title: "Laser-align pump P-101", hazard: "mechanical", steps: SHAFT_STEPS.map((s) => ({ text: s.text, seconds: s.seconds })) },
  { id: "loto", title: "Lockout/Tagout a conveyor motor", hazard: "electrical", steps: [
    { text: "Notify affected workers that the conveyor is shutting down.", seconds: 30 }, { text: "Stop the conveyor with its normal stop control.", seconds: 15 },
    { text: "Open the disconnect and isolate all energy sources.", seconds: 45 }, { text: "Apply your personal lock and tag to the isolation point.", seconds: 45 },
    { text: "Release stored energy: wait for rotation to stop, bleed pneumatics.", seconds: 60 }, { text: "Try-out: press START. Nothing must move.", seconds: 20 },
    { text: "Verify zero voltage with a tested meter (test-before-touch).", seconds: 60 }, { text: "Perform the work. Then clear tools, re-guard, remove lock, notify.", seconds: 120 } ] },
  { id: "gen-co", title: "Generator carbon-monoxide check", hazard: "co", steps: [
    { text: "Any headache, dizziness or nausea? If yes: everyone outside now and call emergency services.", seconds: 20 },
    { text: "Is the generator outdoors? Never in a home, garage or under windows.", seconds: 20 }, { text: "Confirm ≥6 m (20 ft) from doors, windows and vents; exhaust pointing away.", seconds: 45 },
    { text: "Test the CO alarm on every sleeping level (press test).", seconds: 60 }, { text: "Refuel only with engine off and cool.", seconds: 30 },
    { text: "Use heavy-duty outdoor extension cords; no back-feeding house wiring.", seconds: 30 } ] },
];
export const scenarioSeconds = (s: Scenario) => s.steps.reduce((a, b) => a + b.seconds, 0);
// --- pause/resume persistence ---
export type Attempt = { step: number; decision: "approved" | "rejected"; at: string };
export type Progress = { scenario: string; step: number; paused: boolean; phase: "doing" | "checkpoint"; attempts: Attempt[]; updated: number };
export const PROGRESS_KEY = "fixline.progress.v1";
export function startFlow(scenario = "shaft-align"): Progress {
  return { scenario, step: 0, paused: false, phase: "doing", attempts: [], updated: Date.now() };
}
/** Opens the human checkpoint. Saying "done" does not mark the step complete. */
export function requestCheckpoint(p: Progress): Progress {
  const sc = SCENARIOS.find((s) => s.id === p.scenario);
  if (!sc || p.phase === "checkpoint" || p.step >= sc.steps.length) return p;
  return { ...p, phase: "checkpoint" };
}
/** Approve advances. Reject stays on the step. Both are ignored until a checkpoint is open. */
export function resolveCheckpoint(p: Progress, decision: "approved" | "rejected", at: string): Progress {
  if (p.phase !== "checkpoint") return p;
  const attempts = [...(p.attempts ?? []), { step: p.step, decision, at }];
  if (decision === "rejected") return { ...p, phase: "doing", attempts };
  return { ...p, step: p.step + 1, phase: "doing", attempts };
}
export function saveProgress(store: Pick<Storage, "setItem">, p: Omit<Progress, "updated" | "phase" | "attempts"> & Partial<Pick<Progress, "phase" | "attempts">>) {
  store.setItem(PROGRESS_KEY, JSON.stringify({ ...p, phase: p.phase ?? "doing", attempts: p.attempts ?? [], updated: Date.now() }));
}
export function loadProgress(store: Pick<Storage, "getItem">): Progress | null {
  try {
    const p = JSON.parse(store.getItem(PROGRESS_KEY) ?? "null");
    if (!p || typeof p.step !== "number" || !SCENARIOS.some((s) => s.id === p.scenario)) return null;
    return { ...startFlow(p.scenario), ...p, phase: p.phase === "checkpoint" ? "checkpoint" : "doing", attempts: Array.isArray(p.attempts) ? p.attempts : [] };
  } catch { return null; }
}
/** Quest browser renders at 1×. Other screens cap at 1.5 so a 3× phone does not triple the fill rate. */
export function adaptiveDpr(devicePixelRatio: number, userAgent = "") {
  const quest = /Quest|OculusBrowser/i.test(userAgent);
  const dpr = Number.isFinite(devicePixelRatio) && devicePixelRatio > 0 ? devicePixelRatio : 1;
  return Math.min(dpr, quest ? 1 : 1.5);
}
/** "done" asks for a checkpoint. "approve" and "reject" apply only while that checkpoint is open. */
export function voiceIntent(text: string): "checkpoint" | "approve" | "reject" | "read" | "report" | null {
  const s = text.toLowerCase();
  if (/\b(reject|nope|not yet|hold on)\b/.test(s)) return "reject";
  if (/\b(approve|approved|accept|i approve)\b/.test(s)) return "approve";
  if (/\b(done|next|finished)\b/.test(s)) return "checkpoint";
  if (/\b(read|repeat)\b/.test(s)) return "read";
  if (/\breport\b/.test(s)) return "report";
  return null;
}
export const XR_FEATURES = { optionalFeatures: ["hand-tracking", "plane-detection", "mesh-detection", "hit-test", "anchors", "depth-sensing", "local-floor"], forbidden: ["controller-required"] };
