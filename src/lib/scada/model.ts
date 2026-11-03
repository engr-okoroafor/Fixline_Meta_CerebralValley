// Simulated oil & gas flow station + ISA-18.2 style alarming, drift detection, interlocks.
export type TagId = "SEP1_P" | "SEP1_L" | "SEP1_T" | "TK1_L" | "P101_FLOW" | "FLARE_FLOW" | "EXPORT_P";
export type Limits = { lolo: number; lo: number; hi: number; hihi: number };
export type Tag = { id: TagId; desc: string; unit: string; value: number; sp?: number; limits: Limits; kind: "pressure" | "level" | "temperature" | "flow" };
export const TAGS: Tag[] = [
  { id: "SEP1_P", desc: "HP separator pressure", unit: "barg", value: 12, sp: 12, kind: "pressure", limits: { lolo: 6, lo: 8, hi: 15, hihi: 17 } },
  { id: "SEP1_L", desc: "HP separator liquid level", unit: "%", value: 50, sp: 50, kind: "level", limits: { lolo: 10, lo: 20, hi: 80, hihi: 90 } },
  { id: "SEP1_T", desc: "Separator temperature", unit: "°C", value: 60, kind: "temperature", limits: { lolo: 20, lo: 35, hi: 85, hihi: 95 } },
  { id: "TK1_L", desc: "Crude storage tank level", unit: "%", value: 40, kind: "level", limits: { lolo: 5, lo: 15, hi: 85, hihi: 95 } },
  { id: "P101_FLOW", desc: "Export pump P-101 flow", unit: "m³/h", value: 120, kind: "flow", limits: { lolo: 30, lo: 60, hi: 180, hihi: 200 } },
  { id: "FLARE_FLOW", desc: "Flare gas flow", unit: "kSm³/d", value: 2, kind: "flow", limits: { lolo: -1, lo: -1, hi: 20, hihi: 40 } },
  { id: "EXPORT_P", desc: "Export pipeline pressure", unit: "barg", value: 30, kind: "pressure", limits: { lolo: 10, lo: 15, hi: 45, hihi: 55 } },
];
export type AlarmLevel = "LOLO" | "LO" | "HI" | "HIHI" | null;
export function alarmLevel(v: number, l: Limits, deadband = 0, prev: AlarmLevel = null): AlarmLevel {
  const db = (lim: number, up: boolean) => (prev ? (up ? lim - deadband : lim + deadband) : lim);
  if (v >= db(l.hihi, true)) return "HIHI"; if (v >= db(l.hi, true)) return "HI"; if (v <= db(l.lolo, false)) return "LOLO"; if (v <= db(l.lo, false)) return "LO"; return null;
}
export const PRIORITY: Record<Exclude<AlarmLevel, null>, "critical" | "high"> = { HIHI: "critical", LOLO: "critical", HI: "high", LO: "high" };
/** Drift/offset: rate-of-change and z-score vs history. */
export function drift(history: number[], rocLimitPerSample: number, z = 3) {
  if (history.length < 10) return { roc: 0, zscore: 0, rocAlarm: false, devAlarm: false };
  const n = history.length, last = history[n - 1], roc = last - history[n - 2];
  const base = history.slice(0, -1); const mean = base.reduce((a, b) => a + b, 0) / base.length; const sd = Math.sqrt(base.reduce((a, b) => a + (b - mean) ** 2, 0) / base.length) || 1e-6;
  const zs = (last - mean) / sd; return { roc: +roc.toFixed(3), zscore: +zs.toFixed(2), rocAlarm: Math.abs(roc) > rocLimitPerSample, devAlarm: Math.abs(zs) > z };
}
/** Safety Instrumented Function layer: hard-coded trips. NOT overridable by AI or operators via this app. */
export type Interlock = { id: string; when: (s: Record<TagId, number>) => boolean; action: string };
export const INTERLOCKS: Interlock[] = [
  { id: "PSHH-SEP1", when: (s) => s.SEP1_P >= 17, action: "Shut inlet ESDV, open blowdown to flare" },
  { id: "LSHH-SEP1", when: (s) => s.SEP1_L >= 90, action: "Shut inlet ESDV (liquid carry-over protection)" },
  { id: "LSLL-SEP1", when: (s) => s.SEP1_L <= 10, action: "Trip P-101 (gas blow-by protection)" },
  { id: "LSHH-TK1", when: (s) => s.TK1_L >= 95, action: "Stop transfer to tank TK-1" },
];
export const activeTrips = (s: Record<TagId, number>) => INTERLOCKS.filter((i) => i.when(s));
export type ValveId = "inlet" | "gasOut" | "liqOut";
/** Valve move guard. AI cannot move a valve. Real plants are not written from this app — the SIS stays in charge. Simulator moves need an explicit operator approval. */
export function guardValve(req: { valve: ValveId; open: boolean; target: "sim" | "real"; confirmed: boolean; actor: "ai" | "operator"; estop: boolean }) {
  if (req.actor !== "operator") return { ok: false, reason: "AI cannot move valves — an operator must approve" };
  if (!req.confirmed) return { ok: false, reason: "explicit operator approval required before any valve moves" };
  if (req.estop && req.open) return { ok: false, reason: "E-STOP active — valves stay in the safe state" };
  if (req.target === "real") return { ok: false, reason: "approved intent only — this app does not write valves on a live plant (IEC 61511)" };
  return { ok: true, reason: req.open ? "simulator: valve commanded open after approval" : "simulator: valve commanded closed after approval" };
}
/** Write guard: applies to every write path (operator, PID, AI). */
export function guardWrite(req: { tag: TagId; sp: number; target: "sim" | "real"; confirmed: boolean; actor: "ai" | "operator" | "pid"; estop: boolean }) {
  const t = TAGS.find((x) => x.id === req.tag); if (!t || t.sp === undefined) return { ok: false, reason: "tag not writable" };
  if (req.estop) return { ok: false, reason: "E-STOP active" };
  if (req.sp <= t.limits.lo || req.sp >= t.limits.hi) return { ok: false, reason: "setpoint outside safe operating window (LO..HI)" };
  if (req.target === "real" && (!req.confirmed || req.actor !== "operator")) return { ok: false, reason: "real plant: advisory only; operator must confirm each write" };
  return { ok: true, reason: req.target === "sim" ? "applied to simulator" : "operator-confirmed write queued" };
}
export class PID { i = 0; prev = 0; constructor(public kp: number, public ki: number, public kd: number, public lo = 0, public hi = 100) {}
  step(sp: number, pv: number, dt: number) { const e = sp - pv; this.i += e * dt; const d = (e - this.prev) / dt; this.prev = e; const u = this.kp * e + this.ki * this.i + this.kd * d; const c = Math.max(this.lo, Math.min(this.hi, u)); if (c !== u) this.i -= e * dt; return c; } }
export type SimState = { t: number; v: Record<TagId, number>; sp: Partial<Record<TagId, number>>; valves: { inlet: number; gasOut: number; liqOut: number }; auto: boolean; estop: boolean; fault: null | "gas-valve-stuck" | "level-sensor-drift" | "pump-degraded" };
export function initSim(): SimState { return { t: 0, v: Object.fromEntries(TAGS.map((t) => [t.id, t.value])) as Record<TagId, number>, sp: { SEP1_P: 12, SEP1_L: 50 }, valves: { inlet: 60, gasOut: 50, liqOut: 50 }, auto: true, estop: false, fault: null }; }
const pidP = new PID(-4, -0.6, 0, 0, 100), pidL = new PID(-3, -0.3, 0, 0, 100);
pidP.i = 50 / -0.6; pidL.i = 50 / -0.3; // bumpless start at 50% valve
export function stepSim(s: SimState, dt = 1, rnd = Math.random): SimState {
  const v = { ...s.v }; const valves = { ...s.valves };
  const trips = activeTrips(v);
  if (s.estop || trips.some((t) => t.id.startsWith("PSHH") || t.id.startsWith("LSHH-SEP"))) valves.inlet = 0; else valves.inlet = 60;
  if (s.auto && !s.estop) { valves.gasOut = s.fault === "gas-valve-stuck" ? valves.gasOut : pidP.step(s.sp.SEP1_P ?? 12, v.SEP1_P, dt); valves.liqOut = pidL.step(s.sp.SEP1_L ?? 50, v.SEP1_L, dt); }
  const n = () => (rnd() - 0.5) * 0.2;
  v.SEP1_P += dt * (0.05 * valves.inlet - 0.06 * valves.gasOut) * 0.2 + n(); v.SEP1_P = Math.max(0, v.SEP1_P);
  v.SEP1_L += dt * (0.04 * valves.inlet - 0.04 * valves.liqOut) * 0.3 + n(); v.SEP1_L = Math.min(100, Math.max(0, v.SEP1_L));
  v.SEP1_T += (60 - v.SEP1_T) * 0.05 + n();
  const pumpEff = s.fault === "pump-degraded" ? 0.6 : 1; const tripPump = trips.some((t) => t.id === "LSLL-SEP1") || s.estop;
  v.P101_FLOW = tripPump ? 0 : Math.max(0, 2.4 * valves.liqOut * pumpEff + n() * 10);
  v.TK1_L = Math.min(100, Math.max(0, v.TK1_L + dt * (v.P101_FLOW - 110) * 0.002));
  v.FLARE_FLOW = Math.max(0, (v.SEP1_P > 15 ? (v.SEP1_P - 15) * 8 : 1.5) + n());
  v.EXPORT_P = 10 + v.P101_FLOW * 0.17 + n();
  if (s.fault === "level-sensor-drift") v.SEP1_L += 0.15 * dt;
  return { ...s, t: s.t + dt, v, valves };
}
