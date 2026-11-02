// Pure engineering calculators (unit-tested).
export type Machine = { id: string; name: string; kind: string; ratedKw: number; rpm: number; group: "I" | "II" | "III" | "IV"; checks: string[] };
export const MACHINES: Machine[] = [
  { id: "pump-c", name: "Centrifugal pump", kind: "pump", ratedKw: 37, rpm: 2950, group: "II", checks: ["Seal leakage", "Suction strainer", "Cavitation noise", "Coupling alignment"] },
  { id: "motor-ind", name: "Induction motor", kind: "motor", ratedKw: 55, rpm: 1480, group: "II", checks: ["Insulation resistance", "Bearing temperature", "Phase current balance", "Cooling fan"] },
  { id: "comp-recip", name: "Reciprocating compressor", kind: "compressor", ratedKw: 90, rpm: 980, group: "III", checks: ["Valve plates", "Discharge temp", "Oil level", "Safety valve test"] },
  { id: "gearbox", name: "Helical gearbox", kind: "gearbox", ratedKw: 75, rpm: 1480, group: "II", checks: ["Oil analysis", "Backlash", "Tooth wear pattern", "Breather"] },
  { id: "gen-diesel", name: "Diesel generator", kind: "generator", ratedKw: 250, rpm: 1500, group: "III", checks: ["Exhaust (CO) routing", "Coolant", "Battery", "AVR output"] },
  { id: "conveyor", name: "Belt conveyor", kind: "conveyor", ratedKw: 22, rpm: 1460, group: "I", checks: ["Belt tracking", "Idler rollers", "Pull-cord e-stop", "Guards fitted"] },
  { id: "fridge", name: "Home refrigerator", kind: "appliance", ratedKw: 0.15, rpm: 3000, group: "I", checks: ["Door seal", "Condenser coil dust", "Thermostat", "Defrost drain"] },
  { id: "washer", name: "Washing machine", kind: "appliance", ratedKw: 2, rpm: 1200, group: "I", checks: ["Drain pump filter", "Drum bearing noise", "Inlet hose", "Earth continuity"] },
];
/** ISO 10816-3 velocity zones (mm/s RMS). Rigid foundation thresholds by group. */
const ZONES: Record<Machine["group"], [number, number, number]> = { I: [0.71, 1.8, 4.5], II: [1.12, 2.8, 7.1], III: [1.8, 4.5, 11.2], IV: [2.8, 7.1, 18] };
export function isoZone(v: number, group: Machine["group"] = "II") { const [a, b, c] = ZONES[group]; return v <= a ? "A" : v <= b ? "B" : v <= c ? "C" : "D"; }
export const ZONE_TEXT = { A: "Newly commissioned", B: "Unrestricted long-term operation", C: "Restricted: plan maintenance", D: "Damage likely: stop" } as const;
/** Laser shaft alignment: offset (mm) & angularity (mm/100mm) at coupling, shim corrections at feet. */
export function alignment(i: { offsetV: number; angleV: number; offsetH: number; angleH: number; couplingToFront: number; frontToRear: number }) {
  const slope = (a: number) => a / 100; // mm per mm
  const foot = (off: number, ang: number, d: number) => +(off + slope(ang) * d).toFixed(3);
  const front = i.couplingToFront, rear = i.couplingToFront + i.frontToRear;
  return { shimFront: -foot(i.offsetV, i.angleV, front), shimRear: -foot(i.offsetV, i.angleV, rear), moveFront: -foot(i.offsetH, i.angleH, front), moveRear: -foot(i.offsetH, i.angleH, rear),
    tolerance: Math.abs(i.offsetV) <= 0.05 && Math.abs(i.offsetH) <= 0.05 && Math.abs(i.angleV) <= 0.05 && Math.abs(i.angleH) <= 0.05 ? "excellent" : Math.abs(i.offsetV) <= 0.1 && Math.abs(i.offsetH) <= 0.1 ? "acceptable" : "realign" };
}
/** Megger: insulation resistance corrected to 40°C, polarization index (IEEE 43-2013). */
export function megger(r1min: number, r10min: number, tempC: number, kV: number) {
  const r40 = r1min * Math.pow(0.5, (40 - tempC) / 10); const pi = r10min / Math.max(r1min, 1e-9); const min = kV + 1; // IEEE 43 legacy minimum MΩ
  return { r40: +r40.toFixed(1), pi: +pi.toFixed(2), minMOhm: min, verdict: r40 < min ? "FAIL: below minimum" : pi < 2 ? "WARN: PI < 2.0 (moisture/contamination)" : "PASS" };
}
/** First-order-plus-dead-time process with PID, returns trajectory and metrics. */
export function simulatePid(p: { kp: number; ki: number; kd: number; sp?: number; K?: number; tau?: number; dt?: number; steps?: number }) {
  const { kp, ki, kd, sp = 1, K = 1, tau = 5, dt = 0.1, steps = 400 } = p;
  let y = 0, i = 0, prev = sp, u = 0; const out: { t: number; y: number; u: number }[] = []; let peak = 0, settle = 0;
  for (let n = 0; n < steps; n++) { const e = sp - y; i = Math.max(-50, Math.min(50, i + e * dt)); const d = (e - prev) / dt; prev = e; u = Math.max(-10, Math.min(10, kp * e + ki * i + kd * d)); y += dt * (K * u - y) / tau; peak = Math.max(peak, y); if (Math.abs(sp - y) > 0.02 * sp) settle = n * dt; out.push({ t: +(n * dt).toFixed(1), y: +y.toFixed(4), u: +u.toFixed(3) }); }
  return { data: out, overshootPct: +Math.max(0, (peak - sp) / sp * 100).toFixed(1), settlingS: +settle.toFixed(1), finalError: +(sp - y).toFixed(4) };
}
/** Ziegler–Nichols from ultimate gain/period. */
export const zieglerNichols = (Ku: number, Tu: number) => ({ kp: +(0.6 * Ku).toFixed(3), ki: +(1.2 * Ku / Tu).toFixed(3), kd: +(0.075 * Ku * Tu).toFixed(3) });
