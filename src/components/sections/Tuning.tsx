"use client";
import { useMemo, useState } from "react";
import { simulatePid, zieglerNichols, alignment, megger, isoZone, ZONE_TEXT } from "@/lib/eng";
import { Card, Field, Btn, Tip } from "../ui";
import Trend from "../Trend";
import { AlignmentPanel } from "../next/AlignmentPanel";
import { NeonSelect } from "../NeonSelect";
const N = ({ v, set, step = 0.01 }: { v: number; set: (n: number) => void; step?: number }) => <input type="number" step={step} value={v} onChange={(e) => set(Number(e.target.value))} />;
export default function Tuning() {
  const [k, setK] = useState({ kp: 2, ki: 0.4, kd: 0.1 }); const [zn, setZn] = useState({ ku: 6, tu: 8 });
  const sim = useMemo(() => simulatePid(k), [k]);
  const [a, setA] = useState({ offsetV: 0.12, angleV: 0.08, offsetH: -0.06, angleH: 0.03, couplingToFront: 200, frontToRear: 400 }); const al = alignment(a);
  const [mg, setMg] = useState({ r1: 800, r10: 1900, t: 30, kv: 0.4 }); const mr = megger(mg.r1, mg.r10, mg.t, mg.kv);
  const [vib, setVib] = useState({ v: 3.2, g: "II" as "I" | "II" | "III" | "IV" }); const z = isoZone(vib.v, vib.g);
  return <div className="grid gap-4 lg:grid-cols-2">
    <AlignmentPanel />
    <Card title="PID tuning helper" right={<Tip label="What: Suggests P/I/D gains from a step-test (process gain, dead time, time constant). · When: Loop oscillates, is sluggish, or after replacing a valve/transmitter. · Fix: Oscillating: cut Kc 30–50%; sluggish: shorten Ti; noisy: reduce Td or add filter. Re-test in manual first."><span tabIndex={0} className="pill" style={{ cursor: "help" }}>ⓘ how</span></Tip>} sub="First-order process K=1, τ=5 s. Adjust gains, watch the step response.">
      <div className="grid grid-cols-3 gap-4">{(["kp", "ki", "kd"] as const).map((x) => <Field key={x} label={x.toUpperCase()} tip={{ kp: "Proportional gain: reacts to present error", ki: "Integral gain: removes steady-state offset", kd: "Derivative gain: damps overshoot" }[x]}><N v={k[x]} set={(n) => setK({ ...k, [x]: n })} /></Field>)}</div>
      <Trend data={sim.data.filter((_, i) => i % 4 === 0)} keys={[{ k: "y", c: "#39FF14", name: "PV" }]} refs={[{ y: 1, label: "SP", c: "#00FF9C" }]} height={200} />
      <p className="m-0 text-sm">Overshoot <b>{sim.overshootPct}%</b> · settling <b>{sim.settlingS}s</b> · final error <b>{sim.finalError}</b></p>
      <div className="grid grid-cols-2 gap-4 items-end"><Field label="Ultimate gain Ku" tip="Gain at which a P-only loop oscillates steadily"><N v={zn.ku} set={(n) => setZn({ ...zn, ku: n })} /></Field><Field label="Period Tu (s)" tip="Oscillation period at Ku"><N v={zn.tu} set={(n) => setZn({ ...zn, tu: n })} /></Field></div>
      <Btn tip="Apply classic Ziegler–Nichols PID rules" onClick={() => setK(zieglerNichols(zn.ku, zn.tu))}>Apply Ziegler–Nichols</Btn>
    </Card>
    <Card title="Shaft laser alignment" right={<Tip label="What: Computes foot corrections from offset/angularity readings. · When: After any pump/motor change, coupling wear, or vibration at 2×. · Fix: Shim rear/front feet as shown, then move horizontally; re-measure until within tolerance; check soft foot first."><span tabIndex={0} className="pill" style={{ cursor: "help" }}>ⓘ how</span></Tip>} sub="Readings at coupling. Positive = movable machine high/right. Values in mm and mm/100 mm.">
      <div className="grid grid-cols-2 gap-4">{([["offsetV", "Vertical offset (mm)"], ["angleV", "Vertical angularity (mm/100)"], ["offsetH", "Horizontal offset (mm)"], ["angleH", "Horizontal angularity (mm/100)"], ["couplingToFront", "Coupling → front feet (mm)"], ["frontToRear", "Front → rear feet (mm)"]] as const).map(([x, l]) => <Field key={x} label={l}><N v={a[x]} set={(n) => setA({ ...a, [x]: n })} /></Field>)}</div>
      <table className="text-sm"><thead><tr><th>Correction</th><th>Front feet</th><th>Rear feet</th></tr></thead><tbody><tr><td>Shim (+add / −remove)</td><td>{al.shimFront} mm</td><td>{al.shimRear} mm</td></tr><tr><td>Lateral move</td><td>{al.moveFront} mm</td><td>{al.moveRear} mm</td></tr></tbody></table>
      <p className="m-0"><span className="pill">Status: {al.tolerance}</span></p>
    </Card>
    <Card title="Motor insulation (megger)" right={<Tip label="What: Checks insulation resistance and polarization index (IEEE 43). · When: Before energising a wet/stored motor, after trips, routine PM. · Fix: Low IR: dry out (heater/low-volt), clean windings, re-test; PI < 2: rewind/overhaul assessment."><span tabIndex={0} className="pill" style={{ cursor: "help" }}>ⓘ how</span></Tip>} sub="IEEE 43-2013: corrected to 40 °C, polarization index">
      <div className="grid grid-cols-2 gap-4"><Field label="IR at 1 min (MΩ)"><N v={mg.r1} set={(n) => setMg({ ...mg, r1: n })} step={1} /></Field><Field label="IR at 10 min (MΩ)"><N v={mg.r10} set={(n) => setMg({ ...mg, r10: n })} step={1} /></Field><Field label="Winding temp (°C)"><N v={mg.t} set={(n) => setMg({ ...mg, t: n })} step={1} /></Field><Field label="Rated voltage (kV)"><N v={mg.kv} set={(n) => setMg({ ...mg, kv: n })} /></Field></div>
      <p className="m-0 text-sm">R40 = <b>{mr.r40} MΩ</b> · PI = <b>{mr.pi}</b> · min {mr.minMOhm} MΩ</p><p className="m-0"><span className="pill">{mr.verdict}</span></p>
      <p className="m-0 text-xs muted">Isolate and lock out, discharge windings before and after test.</p>
    </Card>
    <Card title="Vibration severity (ISO 10816-3)" right={<Tip label="What: Classifies overall velocity into zones A–D. · When: Routine rounds, after repairs, alarm on vibration. · Fix: Zone C: plan repair (balance/align/bearing); Zone D: stop machine. Use spectrum to find cause."><span tabIndex={0} className="pill" style={{ cursor: "help" }}>ⓘ how</span></Tip>} sub="Velocity RMS, rigid foundation">
      <div className="grid grid-cols-2 gap-4"><Field label="Velocity (mm/s RMS)"><N v={vib.v} set={(n) => setVib({ ...vib, v: n })} step={0.1} /></Field><Field label="Machine group" tip="I: <15 kW, II: 15–300 kW, III/IV: large machines"><NeonSelect value={vib.g} onChange={(e) => setVib({ ...vib, g: e.target.value as "I" })}>{["I", "II", "III", "IV"].map((g) => <option key={g}>{g}</option>)}</NeonSelect></Field></div>
      <p className="m-0"><span className="pill">Zone {z}</span> {ZONE_TEXT[z as keyof typeof ZONE_TEXT]}</p>
    </Card>
  </div>;
}
