"use client";
import { useMemo, useState } from "react";
import { motion } from "framer-motion";
import { ResponsiveContainer, LineChart, Line, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid, ReferenceLine, ReferenceDot, Cell } from "recharts";
import { Card, Field, Tip } from "../ui";
import { NeonSelect } from "../NeonSelect";
import { simulatePid, isoZone, ZONE_TEXT, megger } from "@/lib/eng";
import * as L from "@/lib/englab";

const G = "#39FF14", A = "#ffb020", R = "#ff4d6d", B = "#00e5ff";
const tt = { contentStyle: { background: "rgba(5,12,8,.95)", border: "1px solid rgba(57,255,20,.4)", borderRadius: 14, fontSize: 12 } };
const Num = ({ l, v, set, step = 1, tip }: { l: string; v: number; set: (n: number) => void; step?: number; tip?: string }) => <Field label={l} tip={tip}><input type="number" step={step} value={v} onChange={(e) => set(Number(e.target.value) || 0)} /></Field>;
const Out = ({ k, v, c = G }: { k: string; v: string; c?: string }) => <motion.div layout className="rounded-3xl p-3" style={{ background: "rgba(57,255,20,.05)", border: `1px solid ${c}55` }}><div className="muted text-[10px] uppercase tracking-widest">{k}</div><motion.b key={v} initial={{ opacity: .4, y: 3 }} animate={{ opacity: 1, y: 0 }} className="text-lg" style={{ color: c }}>{v}</motion.b></motion.div>;
const How = ({ t }: { t: string }) => <Tip label={t}><span tabIndex={0} className="pill" style={{ cursor: "help" }}>ⓘ how</span></Tip>;
const Chart = ({ children, h = 190 }: { children: React.ReactElement; h?: number }) => <div style={{ height: h }} className="rounded-3xl p-2" ><ResponsiveContainer>{children}</ResponsiveContainer></div>;
const grid = <CartesianGrid stroke="rgba(57,255,20,.08)" />;

function Ring({ pct, label, c }: { pct: number; label: string; c: string }) {
  const r = 44, C = 2 * Math.PI * r, p = Math.max(0, Math.min(1, pct));
  return <svg viewBox="0 0 110 110" width="110" height="110" role="img" aria-label={label}><circle cx="55" cy="55" r={r} stroke="rgba(57,255,20,.12)" strokeWidth="8" fill="none" />
    <motion.circle cx="55" cy="55" r={r} stroke={c} strokeWidth="8" fill="none" strokeLinecap="round" strokeDasharray={C} animate={{ strokeDashoffset: C * (1 - p) }} transform="rotate(-90 55 55)" style={{ filter: `drop-shadow(0 0 6px ${c})` }} />
    <text x="55" y="60" textAnchor="middle" fontSize="13" fontWeight="800" fill={c}>{label}</text></svg>;
}

function Vibration() {
  const [s, setS] = useState({ rpm: 2960, a1: 2.2, a2: 1.1, a3: 0.3, bpfo: 0.4, kw: 75 });
  const r = useMemo(() => L.vibSpectrum(s), [s]); const z = isoZone(r.overall, s.kw < 15 ? "I" : s.kw <= 300 ? "II" : "III");
  const zc = z === "A" || z === "B" ? G : z === "C" ? A : R;
  return <Card title="Vibration spectrum fault finder" sub="Enter amplitudes at 1×, 2×, 3× and bearing defect — spectrum, ISO 20816 zone and diagnosis update live" right={<How t="1× high = unbalance · 2× high (and axial) = misalignment · harmonics = looseness · BPFO peaks = outer-race bearing defect. Fix the dominant cause, then re-measure." />}>
    <div className="grid grid-cols-3 gap-3 md:grid-cols-6"><Num l="Speed (rpm)" v={s.rpm} set={(n) => setS({ ...s, rpm: n })} /><Num l="1× (mm/s)" v={s.a1} step={0.1} set={(n) => setS({ ...s, a1: n })} /><Num l="2× (mm/s)" v={s.a2} step={0.1} set={(n) => setS({ ...s, a2: n })} /><Num l="3× (mm/s)" v={s.a3} step={0.1} set={(n) => setS({ ...s, a3: n })} /><Num l="BPFO (mm/s)" v={s.bpfo} step={0.1} set={(n) => setS({ ...s, bpfo: n })} /><Num l="Power (kW)" v={s.kw} set={(n) => setS({ ...s, kw: n })} /></div>
    <Chart><BarChart data={r.bars}>{grid}<XAxis dataKey="f" fontSize={10} unit=" Hz" /><YAxis fontSize={10} /><Tooltip {...tt} /><Bar dataKey="a" name="mm/s" radius={[10, 10, 4, 4]}>{r.bars.map((b, i) => <Cell key={i} fill={b.hot ? A : G} />)}</Bar></BarChart></Chart>
    <div className="grid grid-cols-3 gap-2"><Out k="Overall RMS" v={`${r.overall} mm/s`} c={zc} /><Out k="ISO zone" v={`${z} · ${ZONE_TEXT[z as keyof typeof ZONE_TEXT]}`} c={zc} /><Out k="Likely cause" v={r.cause} c={r.cause === "Healthy" ? G : A} /></div>
  </Card>;
}

function Cable() {
  const [s, setS] = useState({ i: 120, len: 85, mm2: 35, v: 400, pf: 0.85, ph: 3 as 1 | 3, limit: 5 });
  const r = useMemo(() => L.voltDrop(s), [s]); const curve = useMemo(() => L.vdCurve(s), [s]);
  return <Card title="Cable sizing & voltage drop" sub="IEC 60364-5-52 copper, 70 °C PVC · drop curve vs length redraws as you type" right={<How t="Keep drop ≤ 3% lighting / ≤ 5% power. If over: next size up, shorten run, or raise voltage. Then check ampacity and protective device." />}>
    <div className="grid grid-cols-3 gap-3 md:grid-cols-4"><Num l="Load (A)" v={s.i} set={(n) => setS({ ...s, i: n })} /><Num l="Length (m)" v={s.len} set={(n) => setS({ ...s, len: n })} /><Field label="Size (mm²)"><NeonSelect value={s.mm2} onChange={(e) => setS({ ...s, mm2: +e.target.value })}>{L.SIZES.map((x) => <option key={x} value={x}>{x}</option>)}</NeonSelect></Field><Num l="Voltage (V)" v={s.v} set={(n) => setS({ ...s, v: n })} /><Num l="Power factor" v={s.pf} step={0.01} set={(n) => setS({ ...s, pf: n })} /><Field label="Phases"><NeonSelect value={s.ph} onChange={(e) => setS({ ...s, ph: +e.target.value as 1 })}><option value={3}>3-phase</option><option value={1}>1-phase</option></NeonSelect></Field><Num l="Drop limit (%)" v={s.limit} step={0.5} set={(n) => setS({ ...s, limit: n })} /></div>
    <Chart><LineChart data={curve}>{grid}<XAxis dataKey="m" fontSize={10} unit=" m" /><YAxis fontSize={10} unit="%" /><Tooltip {...tt} /><ReferenceLine y={s.limit} stroke={R} strokeDasharray="5 4" label={{ value: "limit", fill: R, fontSize: 10 }} /><Line dataKey="pct" stroke={G} strokeWidth={2.5} dot={false} name="drop %" /><ReferenceDot x={curve.reduce((a, c) => Math.abs(c.m - s.len) < Math.abs(a.m - s.len) ? c : a, curve[0]).m} y={r.pct} r={6} fill={r.ok ? G : R} stroke="none" /></LineChart></Chart>
    <div className="grid grid-cols-3 gap-2"><Out k="Voltage drop" v={`${r.dv} V · ${r.pct}%`} c={r.ok ? G : R} /><Out k="Ampacity" v={`${r.amp} A ${r.ampOk ? "✓" : "✕"}`} c={r.ampOk ? G : R} /><Out k="Recommended" v={`${r.rec} mm²`} c={B} /></div>
  </Card>;
}

function Pump() {
  const [s, setS] = useState({ q: 120, hs: 25, d: 150, len: 300, shut: 70, qmax: 260, hatm: 10.1, hsuc: 2, hvap: 0.4, npshr: 4.5 });
  const r = useMemo(() => L.pumpSystem(s), [s]);
  return <Card title="Pump head, system curve & NPSH" sub="Darcy–Weisbach system curve against your pump curve — operating point moves live" right={<How t="Operating point = intersection. NPSHa must exceed NPSHr by ≥ 1 m (or 1.3×) to avoid cavitation. Low margin: raise suction level, cut suction losses, cool liquid." />} className="lg:col-span-2">
    <div className="grid grid-cols-3 gap-3 md:grid-cols-5"><Num l="Duty flow (m³/h)" v={s.q} set={(n) => setS({ ...s, q: n })} /><Num l="Static head (m)" v={s.hs} set={(n) => setS({ ...s, hs: n })} /><Num l="Pipe ID (mm)" v={s.d} set={(n) => setS({ ...s, d: n })} /><Num l="Pipe length (m)" v={s.len} set={(n) => setS({ ...s, len: n })} /><Num l="Pump shut-off head (m)" v={s.shut} set={(n) => setS({ ...s, shut: n })} /><Num l="Pump max flow (m³/h)" v={s.qmax} set={(n) => setS({ ...s, qmax: n })} /><Num l="Atm head (m)" v={s.hatm} step={0.1} set={(n) => setS({ ...s, hatm: n })} /><Num l="Suction static (m, +flooded)" v={s.hsuc} step={0.1} set={(n) => setS({ ...s, hsuc: n })} /><Num l="Vapour head (m)" v={s.hvap} step={0.1} set={(n) => setS({ ...s, hvap: n })} /><Num l="NPSHr (m)" v={s.npshr} step={0.1} set={(n) => setS({ ...s, npshr: n })} /></div>
    <Chart h={230}><LineChart data={r.curve}>{grid}<XAxis dataKey="q" fontSize={10} unit=" m³/h" /><YAxis fontSize={10} unit=" m" /><Tooltip {...tt} /><Line dataKey="pump" stroke={G} strokeWidth={2.5} dot={false} name="Pump" /><Line dataKey="sys" stroke={B} strokeWidth={2.5} dot={false} name="System" /><ReferenceDot x={r.op.q} y={r.op.h} r={7} fill={A} stroke="none" /></LineChart></Chart>
    <div className="grid grid-cols-2 gap-2 md:grid-cols-5"><Out k="Operating point" v={`${r.op.q} m³/h @ ${r.op.h} m`} c={A} /><Out k="Velocity" v={`${r.vel} m/s`} c={r.vel > 3 ? A : G} /><Out k="Friction @ duty" v={`${r.hf} m`} /><Out k="NPSHa" v={`${r.npsha} m`} c={r.npshOk ? G : R} /><Out k="Hydraulic power" v={`${r.kw} kW`} c={B} /></div>
  </Card>;
}

function Megger() {
  const [s, setS] = useState({ r1: 800, r10: 1900, t: 30, kv: 0.4 }); const m = megger(s.r1, s.r10, s.t, s.kv);
  const data = useMemo(() => L.irCurve(s.r1, s.r10), [s.r1, s.r10]);
  return <Card title="Motor megger — absorption curve" sub="IEEE 43: IR vs time, PI and 40 °C correction" right={<How t="PI ≥ 2 good; < 1 dangerous. Low IR: dry out and clean windings before energising." />}>
    <div className="grid grid-cols-4 gap-3"><Num l="IR 1 min (MΩ)" v={s.r1} set={(n) => setS({ ...s, r1: n })} /><Num l="IR 10 min (MΩ)" v={s.r10} set={(n) => setS({ ...s, r10: n })} /><Num l="Temp (°C)" v={s.t} set={(n) => setS({ ...s, t: n })} /><Num l="kV" v={s.kv} step={0.1} set={(n) => setS({ ...s, kv: n })} /></div>
    <Chart><LineChart data={data}>{grid}<XAxis dataKey="t" fontSize={10} unit=" min" /><YAxis fontSize={10} /><Tooltip {...tt} /><ReferenceLine y={m.minMOhm} stroke={R} strokeDasharray="4 4" /><Line dataKey="ir" stroke={G} strokeWidth={2.5} dot={{ r: 3 }} name="MΩ" /></LineChart></Chart>
    <div className="grid grid-cols-3 gap-2"><Out k="R40" v={`${m.r40} MΩ`} /><Out k="PI" v={`${m.pi}`} c={m.pi >= 2 ? G : m.pi >= 1 ? A : R} /><Out k="Verdict" v={m.verdict} c={B} /></div>
  </Card>;
}

function Fault() {
  const [s, setS] = useState({ kva: 1000, z: 5.75, v: 415, len: 30, mm2: 240 });
  const r = useMemo(() => L.faultCurrent(s), [s]);
  return <Card title="Short-circuit fault current" sub="Infinite-bus transformer + cable impedance (IEC 60909 simplified)" right={<How t="Breaker breaking capacity (Icu) must exceed prospective fault current at its terminals. Also drives arc-flash PPE category." />}>
    <div className="grid grid-cols-3 gap-3 md:grid-cols-5"><Num l="Transformer kVA" v={s.kva} set={(n) => setS({ ...s, kva: n })} /><Num l="%Z" v={s.z} step={0.05} set={(n) => setS({ ...s, z: n })} /><Num l="Voltage (V)" v={s.v} set={(n) => setS({ ...s, v: n })} /><Num l="Cable length (m)" v={s.len} set={(n) => setS({ ...s, len: n })} /><Field label="Cable (mm²)"><NeonSelect value={s.mm2} onChange={(e) => setS({ ...s, mm2: +e.target.value })}>{L.SIZES.map((x) => <option key={x} value={x}>{x}</option>)}</NeonSelect></Field></div>
    <Chart><BarChart data={r.bars} layout="vertical" margin={{ left: 30 }}>{grid}<XAxis type="number" fontSize={10} unit=" kA" /><YAxis type="category" dataKey="n" fontSize={10} width={110} /><Tooltip {...tt} /><Bar dataKey="ka" radius={[0, 12, 12, 0]}>{r.bars.map((_, i) => <Cell key={i} fill={[R, A, G][i]} />)}</Bar></BarChart></Chart>
    <div className="grid grid-cols-3 gap-2"><Out k="FLC" v={`${r.flc} A`} /><Out k="Isc @ LV bus" v={`${r.bus} kA`} c={R} /><Out k="Min breaker Icu" v={`${r.icu} kA`} c={B} /></div>
  </Card>;
}

function Hvac() {
  const [s, setS] = useState({ area: 80, h: 3, people: 6, sun: "medium" as "low" | "medium" | "high", equipW: 1500, climate: "hot" as "temperate" | "hot" | "tropical" });
  const r = useMemo(() => L.coolingLoad(s), [s]);
  return <Card title="HVAC cooling load" sub="Quick room sizing: envelope + people + equipment + air changes" right={<How t="Rule-of-thumb sizing for split/package units. For final design use ASHRAE CLTD/RTS or a load software." />}>
    <div className="grid grid-cols-3 gap-3"><Num l="Floor area (m²)" v={s.area} set={(n) => setS({ ...s, area: n })} /><Num l="Ceiling (m)" v={s.h} step={0.1} set={(n) => setS({ ...s, h: n })} /><Num l="Occupants" v={s.people} set={(n) => setS({ ...s, people: n })} /><Field label="Sun exposure"><NeonSelect value={s.sun} onChange={(e) => setS({ ...s, sun: e.target.value as "low" })}><option value="low">Low / shaded</option><option value="medium">Medium</option><option value="high">High / west glass</option></NeonSelect></Field><Num l="Equipment (W)" v={s.equipW} set={(n) => setS({ ...s, equipW: n })} /><Field label="Climate"><NeonSelect value={s.climate} onChange={(e) => setS({ ...s, climate: e.target.value as "hot" })}><option value="temperate">Temperate</option><option value="hot">Hot / dry</option><option value="tropical">Tropical / humid</option></NeonSelect></Field></div>
    <div className="flex flex-wrap items-center gap-4"><Ring pct={r.kw / Math.max(r.kw, 30)} label={`${r.tons} TR`} c={G} />
      <div className="min-w-0 flex-1"><Chart h={150}><BarChart data={r.parts}>{grid}<XAxis dataKey="n" fontSize={10} /><YAxis fontSize={10} unit=" kW" /><Tooltip {...tt} /><Bar dataKey="kw" radius={[10, 10, 4, 4]} fill={B} /></BarChart></Chart></div></div>
    <div className="grid grid-cols-3 gap-2"><Out k="Total" v={`${r.kw} kW`} /><Out k="BTU/h" v={r.btu.toLocaleString()} c={B} /><Out k="Airflow" v={`${r.cfm} CFM`} /></div>
  </Card>;
}

function Material() {
  const [s, setS] = useState({ service: "sour" as L.Service, t: 120, p: 40 });
  const r = useMemo(() => L.materials(s), [s]);
  return <Card title="Material selection" sub="Ranks common alloys for your service, temperature and pressure (NACE MR0175, ASME II-D)" right={<How t="Score blends corrosion resistance, temperature limit and cost. Always confirm with corrosion engineer and code allowable stress." />}>
    <div className="grid grid-cols-3 gap-3"><Field label="Service"><NeonSelect value={s.service} onChange={(e) => setS({ ...s, service: e.target.value as L.Service })}>{L.SERVICES.map(([k, l]) => <option key={k} value={k}>{l}</option>)}</NeonSelect></Field><Num l="Temp (°C)" v={s.t} set={(n) => setS({ ...s, t: n })} /><Num l="Pressure (bar)" v={s.p} set={(n) => setS({ ...s, p: n })} /></div>
    <Chart h={220}><BarChart data={r} layout="vertical" margin={{ left: 40 }}>{grid}<XAxis type="number" domain={[0, 100]} fontSize={10} /><YAxis type="category" dataKey="n" fontSize={10} width={130} /><Tooltip {...tt} /><Bar dataKey="score" radius={[0, 12, 12, 0]}>{r.map((m, i) => <Cell key={i} fill={!m.ok ? R : i === 0 ? G : B} />)}</Bar></BarChart></Chart>
    <p className="m-0 text-sm">Best fit: <b className="neon">{r[0]?.n}</b> — {r[0]?.why}</p>
  </Card>;
}

function Weld() {
  const [s, setS] = useState({ v: 24, a: 140, speed: 150, eff: 0.8, wall: 9.5, ce: 0.42 });
  const r = useMemo(() => L.weldHeat(s), [s]);
  return <Card title="Weld heat input & preheat" sub="EN 1011 / ASME IX heat input, carbon-equivalent preheat guidance" right={<How t="Too low heat input + high CE = hydrogen cracking risk → preheat. Too high = loss of toughness. Keep within the qualified PQR range." />}>
    <div className="grid grid-cols-3 gap-3"><Num l="Voltage (V)" v={s.v} set={(n) => setS({ ...s, v: n })} /><Num l="Current (A)" v={s.a} set={(n) => setS({ ...s, a: n })} /><Num l="Travel (mm/min)" v={s.speed} set={(n) => setS({ ...s, speed: n })} /><Num l="Process efficiency" v={s.eff} step={0.05} set={(n) => setS({ ...s, eff: n })} /><Num l="Wall (mm)" v={s.wall} step={0.5} set={(n) => setS({ ...s, wall: n })} /><Num l="Carbon equiv. CE" v={s.ce} step={0.01} set={(n) => setS({ ...s, ce: n })} /></div>
    <div className="relative h-8 overflow-hidden rounded-3xl" style={{ background: `linear-gradient(90deg,${B}33 0%,${G}33 30%,${G}33 70%,${R}33 100%)`, border: "1px solid rgba(57,255,20,.3)" }}><motion.span className="absolute top-0 h-full w-1.5 rounded-full" style={{ background: "#fff", boxShadow: "0 0 10px #fff" }} animate={{ left: `${Math.min(98, (r.hi / 3.5) * 100)}%` }} /><span className="absolute left-2 top-1.5 text-[10px] muted">0.5 kJ/mm</span><span className="absolute right-2 top-1.5 text-[10px] muted">3.5</span></div>
    <div className="grid grid-cols-3 gap-2"><Out k="Heat input" v={`${r.hi} kJ/mm`} c={r.band === "ok" ? G : A} /><Out k="Preheat" v={`${r.preheat} °C`} c={B} /><Out k="Risk" v={r.note} c={r.band === "ok" ? G : A} /></div>
  </Card>;
}

function Bolt() {
  const [s, setS] = useState({ d: 20, grade: "8.8", k: 0.18, pct: 75 });
  const r = useMemo(() => L.boltTorque(s), [s]);
  return <Card title="Bolt torque & preload" sub="T = K·F·d (ISO 898-1 proof load)" right={<How t="Lubricated: K≈0.12–0.15; dry: 0.18–0.2. Tighten in 3 passes, cross pattern (30/70/100%)." />}>
    <div className="grid grid-cols-4 gap-3"><Field label="Size"><NeonSelect value={s.d} onChange={(e) => setS({ ...s, d: +e.target.value })}>{L.BOLTS.map((d) => <option key={d} value={d}>M{d}</option>)}</NeonSelect></Field><Field label="Grade"><NeonSelect value={s.grade} onChange={(e) => setS({ ...s, grade: e.target.value })}>{["8.8", "10.9", "12.9", "B7"].map((g) => <option key={g}>{g}</option>)}</NeonSelect></Field><Num l="Nut factor K" v={s.k} step={0.01} set={(n) => setS({ ...s, k: n })} /><Num l="% of proof" v={s.pct} set={(n) => setS({ ...s, pct: n })} /></div>
    <div className="flex items-center gap-4"><Ring pct={s.pct / 100} label={`${r.torque} N·m`} c={s.pct > 90 ? R : G} /><div className="grid flex-1 grid-cols-1 gap-2"><Out k="Preload" v={`${r.kn} kN`} /><Out k="Passes 30/70/100%" v={r.passes.join(" → ") + " N·m"} c={B} /></div></div>
  </Card>;
}

function Pid() {
  const [k, setK] = useState({ kp: 2, ki: 0.4, kd: 0.1 }); const sim = useMemo(() => simulatePid(k), [k]);
  return <Card title="PID loop — live step response" sub="First-order process; sliders redraw the response instantly" right={<How t="Oscillating: cut Kp. Sluggish: raise Ki. Overshoot: add a little Kd. Full tuning helper in Tuning tab." />}>
    <div className="grid grid-cols-3 gap-3">{(["kp", "ki", "kd"] as const).map((x) => <Field key={x} label={`${x.toUpperCase()} = ${k[x]}`}><input type="range" min={0} max={x === "kp" ? 10 : x === "ki" ? 3 : 2} step={0.05} value={k[x]} onChange={(e) => setK({ ...k, [x]: +e.target.value })} /></Field>)}</div>
    <Chart><LineChart data={sim.data.filter((_, i) => i % 3 === 0)}>{grid}<XAxis dataKey="t" fontSize={10} /><YAxis fontSize={10} /><Tooltip {...tt} /><ReferenceLine y={1} stroke={B} strokeDasharray="4 4" /><Line dataKey="y" stroke={G} strokeWidth={2.5} dot={false} name="PV" /></LineChart></Chart>
    <div className="grid grid-cols-3 gap-2"><Out k="Overshoot" v={`${sim.overshootPct}%`} c={sim.overshootPct > 20 ? A : G} /><Out k="Settling" v={`${sim.settlingS} s`} /><Out k="Final error" v={`${sim.finalError}`} c={B} /></div>
  </Card>;
}

/** Engineering lab: in-demand field calculations with live, input-driven visuals. */
export default function EngineeringLab() {
  return <section className="lg:col-span-2 flex flex-col gap-4" aria-label="Engineering lab" data-testid="eng-lab">
    <div><h2 className="m-0 text-xl font-extrabold"><span className="neon">⚡ Engineering lab</span> <span className="muted text-sm font-normal">· 10 live calculators · every chart redraws as you type</span></h2></div>
    <div className="grid gap-4 lg:grid-cols-2"><Vibration /><Cable /><Pump /><Megger /><Fault /><Hvac /><Material /><Weld /><Bolt /><Pid /></div>
  </section>;
}
