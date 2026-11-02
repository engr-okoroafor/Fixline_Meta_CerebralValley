/** Pure engineering calculations for the Engineering lab (unit-testable, no UI). Simplified field methods — verify against code for design. */
const r2 = (n: number, d = 2) => +(Number.isFinite(n) ? n : 0).toFixed(d);
export const SIZES = [1.5, 2.5, 4, 6, 10, 16, 25, 35, 50, 70, 95, 120, 150, 185, 240, 300];
// IEC 60364-5-52 method C, Cu PVC 70 °C, 3 loaded conductors (A)
const AMP: Record<number, number> = { 1.5: 17.5, 2.5: 24, 4: 32, 6: 41, 10: 57, 16: 76, 25: 96, 35: 119, 50: 144, 70: 184, 95: 223, 120: 259, 150: 299, 185: 341, 240: 403, 300: 464 };
const RHO = 0.0225; // Ω·mm²/m copper at operating temperature

export function vibSpectrum(s: { rpm: number; a1: number; a2: number; a3: number; bpfo: number }) {
  const f1 = s.rpm / 60; const bars = [{ f: r2(f1, 1), a: s.a1, n: "1×" }, { f: r2(2 * f1, 1), a: s.a2, n: "2×" }, { f: r2(3 * f1, 1), a: s.a3, n: "3×" }, { f: r2(3.58 * f1, 1), a: s.bpfo, n: "BPFO" }];
  const overall = r2(Math.sqrt(bars.reduce((a, b) => a + b.a * b.a, 0)), 2);
  const top = [...bars].sort((a, b) => b.a - a.a)[0];
  const cause = overall < 1.4 ? "Healthy" : top.n === "1×" ? "Unbalance" : top.n === "2×" ? "Misalignment" : top.n === "3×" ? "Looseness" : "Bearing outer race";
  return { bars: bars.map((b) => ({ ...b, hot: b === top && overall >= 1.4 })), overall, cause };
}

export function voltDrop(s: { i: number; len: number; mm2: number; v: number; pf: number; ph: 1 | 3; limit: number }) {
  const k = s.ph === 3 ? Math.sqrt(3) : 2; const R = (RHO * s.len) / Math.max(0.1, s.mm2); const X = 0.00008 * s.len; const sin = Math.sqrt(Math.max(0, 1 - s.pf * s.pf));
  const dv = k * s.i * (R * s.pf + X * sin); const pct = (dv / Math.max(1, s.v)) * 100; const amp = AMP[s.mm2] ?? 0;
  const rec = SIZES.find((z) => { const Rz = (RHO * s.len) / z; return (k * s.i * (Rz * s.pf + X * sin) / s.v) * 100 <= s.limit && (AMP[z] ?? 0) >= s.i; }) ?? SIZES[SIZES.length - 1];
  return { dv: r2(dv, 1), pct: r2(pct), ok: pct <= s.limit, amp, ampOk: amp >= s.i, rec };
}
export function vdCurve(s: Parameters<typeof voltDrop>[0]) { const max = Math.max(50, s.len * 2); return Array.from({ length: 21 }, (_, i) => { const m = Math.round((max * i) / 20); return { m, pct: voltDrop({ ...s, len: m }).pct }; }); }

export function pumpSystem(s: { q: number; hs: number; d: number; len: number; shut: number; qmax: number; hatm: number; hsuc: number; hvap: number; npshr: number }) {
  const D = Math.max(10, s.d) / 1000; const A = (Math.PI * D * D) / 4; const f = 0.02;
  const hf = (q: number) => { const v = q / 3600 / A; return f * (s.len / D) * (v * v) / (2 * 9.81) * 1.15; };
  const sys = (q: number) => s.hs + hf(q); const pump = (q: number) => Math.max(0, s.shut * (1 - (q / Math.max(1, s.qmax)) ** 2));
  const qm = Math.max(s.qmax, s.q) * 1.1; const curve = Array.from({ length: 23 }, (_, i) => { const q = r2((qm * i) / 22, 0); return { q, pump: r2(pump(q), 1), sys: r2(sys(q), 1) }; });
  let lo = 0, hi = s.qmax; for (let i = 0; i < 50; i++) { const m = (lo + hi) / 2; if (pump(m) > sys(m)) lo = m; else hi = m; }
  const op = { q: r2(lo, 0), h: r2(pump(lo), 1) }; const vel = (s.q / 3600) / A; const hfs = hf(s.q) * 0.1;
  const npsha = s.hatm + s.hsuc - hfs - s.hvap;
  return { curve, op, vel: r2(vel), hf: r2(hf(s.q), 1), npsha: r2(npsha, 1), npshOk: npsha >= s.npshr + 1, kw: r2((1000 * 9.81 * (op.q / 3600) * op.h) / 1000, 1) };
}

export function irCurve(r1: number, r10: number) { const n = Math.log(Math.max(1.0001, r10 / Math.max(1, r1))) / Math.log(10); return [0.5, 1, 2, 3, 5, 7, 10].map((t) => ({ t, ir: r2(r1 * t ** n, 0) })); }

export function faultCurrent(s: { kva: number; z: number; v: number; len: number; mm2: number }) {
  const flc = (s.kva * 1000) / (Math.sqrt(3) * Math.max(1, s.v)); const bus = flc / Math.max(0.1, s.z / 100);
  const Zt = (s.v / Math.sqrt(3)) / bus; const Zc = (RHO * s.len) / Math.max(1, s.mm2); const end = (s.v / Math.sqrt(3)) / (Zt + Zc);
  const std = [6, 10, 16, 25, 36, 50, 65, 85, 100, 150]; const icu = std.find((x) => x * 1000 >= bus * 1.1) ?? 200;
  return { flc: r2(flc, 0), bus: r2(bus / 1000, 1), icu, bars: [{ n: "LV bus", ka: r2(bus / 1000, 1) }, { n: `Cable end (${s.len} m)`, ka: r2(end / 1000, 1) }, { n: "Transformer FLC", ka: r2(flc / 1000, 2) }] };
}

export function coolingLoad(s: { area: number; h: number; people: number; sun: "low" | "medium" | "high"; equipW: number; climate: "temperate" | "hot" | "tropical" }) {
  const wpm2 = { low: 70, medium: 95, high: 125 }[s.sun] * { temperate: 0.85, hot: 1, tropical: 1.12 }[s.climate];
  const env = (s.area * wpm2 * (s.h / 3)) / 1000; const ppl = (s.people * 130) / 1000; const eq = s.equipW / 1000; const vent = (s.area * s.h * 1.2 * 1.006 * 8 * ({ temperate: 0.6, hot: 0.9, tropical: 1.3 }[s.climate])) / 3600;
  const kw = (env + ppl + eq + vent) * 1.1;
  return { kw: r2(kw, 1), tons: r2(kw / 3.517, 1), btu: Math.round(kw * 3412), cfm: Math.round(kw * 3.517 * 400), parts: [{ n: "Envelope", kw: r2(env, 1) }, { n: "People", kw: r2(ppl, 1) }, { n: "Equipment", kw: r2(eq, 1) }, { n: "Fresh air", kw: r2(vent, 1) }] };
}

export type Service = "sour" | "seawater" | "hightemp" | "cryo" | "caustic" | "water" | "acid";
export const SERVICES: [Service, string][] = [["sour", "Sour gas / H₂S"], ["seawater", "Seawater / chlorides"], ["hightemp", "High-temp steam / hot oil"], ["cryo", "Cryogenic (LNG)"], ["caustic", "Caustic / alkaline"], ["acid", "Dilute acids"], ["water", "Fresh / cooling water"]];
const MAT: { n: string; tmin: number; tmax: number; cost: number; why: string; res: Partial<Record<Service, number>> }[] = [
  { n: "Carbon steel A106-B", tmin: -29, tmax: 425, cost: 1, why: "cheapest, ok for non-corrosive service", res: { water: 60, caustic: 55, hightemp: 55, sour: 45 } },
  { n: "LTCS A333-6", tmin: -46, tmax: 343, cost: 1.3, why: "impact-tested CS for low temperature", res: { water: 60, sour: 50, caustic: 55 } },
  { n: "P11/P22 Cr-Mo", tmin: -29, tmax: 595, cost: 2.2, why: "creep strength for steam/hot oil", res: { hightemp: 95, water: 55 } },
  { n: "SS 316L", tmin: -196, tmax: 450, cost: 3.5, why: "general corrosion resistance, cryo-capable", res: { water: 90, acid: 70, cryo: 90, caustic: 70, sour: 60, seawater: 45 } },
  { n: "Duplex 2205", tmin: -50, tmax: 300, cost: 4.5, why: "chloride SCC resistant, high strength", res: { seawater: 80, sour: 75, water: 90, acid: 70 } },
  { n: "Super duplex 2507", tmin: -50, tmax: 280, cost: 6, why: "seawater & sour gold standard", res: { seawater: 95, sour: 85, acid: 80, water: 90 } },
  { n: "Alloy 625", tmin: -196, tmax: 650, cost: 12, why: "extreme corrosion + temperature", res: { seawater: 98, sour: 95, acid: 92, hightemp: 90, cryo: 90, caustic: 85 } },
  { n: "Cu-Ni 90/10", tmin: -50, tmax: 200, cost: 3, why: "seawater cooling, anti-fouling", res: { seawater: 90, water: 85 } },
  { n: "HDPE / GRE", tmin: -40, tmax: 80, cost: 1.5, why: "non-metallic, no corrosion at low T/P", res: { water: 95, seawater: 95, acid: 85, caustic: 85 } },
];
export function materials(s: { service: Service; t: number; p: number }) {
  return MAT.map((m) => { const ok = s.t >= m.tmin && s.t <= m.tmax && !(m.n.startsWith("HDPE") && s.p > 16); const res = m.res[s.service] ?? 30; const score = ok ? Math.round(res * 0.8 + (20 - Math.min(20, m.cost * 1.6))) : Math.round(res * 0.25); return { n: m.n, score, ok, why: ok ? m.why : `outside ${m.tmin}…${m.tmax} °C${m.n.startsWith("HDPE") ? " / 16 bar" : ""}` }; }).sort((a, b) => b.score - a.score);
}

export function weldHeat(s: { v: number; a: number; speed: number; eff: number; wall: number; ce: number }) {
  const hi = (s.eff * s.v * s.a * 60) / (Math.max(1, s.speed) * 1000);
  const preheat = Math.max(0, Math.round((s.ce - 0.3) * 400 + (s.wall - 10) * 4 - (hi - 1) * 30));
  const band = hi < 0.6 ? "low" : hi > 2.5 ? "high" : "ok";
  return { hi: r2(hi), preheat: Math.min(250, Math.round(preheat / 5) * 5), band, note: band === "low" ? "HAZ cracking risk" : band === "high" ? "toughness loss" : "within typical PQR" };
}

export const BOLTS = [8, 10, 12, 16, 20, 24, 27, 30, 36];
const AS: Record<number, number> = { 8: 36.6, 10: 58, 12: 84.3, 16: 157, 20: 245, 24: 353, 27: 459, 30: 561, 36: 817 };
const PROOF: Record<string, number> = { "8.8": 600, "10.9": 830, "12.9": 970, B7: 720 };
export function boltTorque(s: { d: number; grade: string; k: number; pct: number }) {
  const F = (AS[s.d] ?? 245) * (PROOF[s.grade] ?? 600) * (s.pct / 100); const T = (s.k * F * s.d) / 1000;
  return { kn: r2(F / 1000, 1), torque: Math.round(T), passes: [0.3, 0.7, 1].map((p) => Math.round(T * p)) };
}
