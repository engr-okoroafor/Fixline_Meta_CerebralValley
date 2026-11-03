"use client";
import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, Cell, PieChart, Pie } from "recharts";
import { Card } from "../ui";
const EXT: { agent: string; A: number; B: number; C: number; D: number; K: number; color: string }[] = [
  { agent: "Water", A: 3, B: 0, C: 0, D: 0, K: 0, color: "#4da3ff" }, { agent: "Foam", A: 3, B: 3, C: 0, D: 0, K: 1, color: "#fff3b0" }, { agent: "CO₂", A: 1, B: 3, C: 3, D: 0, K: 0, color: "#cfd8dc" },
  { agent: "ABC powder", A: 3, B: 3, C: 3, D: 0, K: 0, color: "#ff8a3d" }, { agent: "Class D", A: 0, B: 0, C: 0, D: 3, K: 0, color: "#ffd166" }, { agent: "Wet chem", A: 2, B: 0, C: 0, D: 0, K: 3, color: "#c39bff" },
];
const CLASSES = [["A", "Wood, paper, cloth", "#39FF14"], ["B", "Flammable liquids/gases", "#ff4d6d"], ["C", "Energised electrical", "#4da3ff"], ["D", "Combustible metals", "#ffd166"], ["K", "Cooking oils/fats", "#c39bff"]] as const;
const CAUSES = [{ n: "Electrical", v: 34 }, { n: "Hot work", v: 22 }, { n: "Smoking/ignition", v: 12 }, { n: "Static", v: 10 }, { n: "Overheating", v: 14 }, { n: "Other", v: 8 }];
const QUENCH: Record<string, { agent: string; how: string }> = {
  A: { agent: "Water, foam, or ABC powder", how: "Aim at the base of the material and soak it until the glow is gone. Stay low if there is smoke." },
  B: { agent: "Foam, CO₂, or ABC/BC powder — never a water jet", how: "Aim at the base and the near edge of the pool so the agent blankets the fuel. Do not splash it." },
  C: { agent: "CO₂ or dry powder. De-energise first if you can do it safely", how: "Aim at the base of the flames on the equipment. Water and foam conduct — do not use them while it is live." },
  D: { agent: "Class D powder only", how: "Cover the metal gently. Do not blast it. Water, CO₂ and foam can react violently." },
  K: { agent: "Wet chemical, then a lid or fire blanket", how: "Turn the heat off. Aim the wet chemical across the oil surface, not into the pan. Never use water." },
};
/** Fire guidance: class icons, extinguisher suitability chart, P.A.S.S. aim-point diagram, do's/don'ts. */
const PASS = ["1. Pull the pin", "2. Aim at the base", "3. Squeeze", "4. Sweep"];
export function FireGuidance() {
  const [cls, setCls] = useState<keyof typeof QUENCH>("A");
  const [step, setStep] = useState(0);
  useEffect(() => { const id = setInterval(() => setStep((n) => (n + 1) % PASS.length), 1400); return () => clearInterval(id); }, []);
  return <Card title="🔥 Fire guidance — classes, agents, aim point" sub="Illustrative; follow site fire plan and local code (NFPA 10 / EN 3 / ISO 7165)." className="lg:col-span-2">
    <div className="row" data-testid="fire-class">{(Object.keys(QUENCH) as (keyof typeof QUENCH)[]).map((c) => <button key={c} type="button" className={`btn ${cls === c ? "btn-primary" : ""}`} aria-pressed={cls === c} onClick={() => setCls(c)}>Class {c}</button>)}</div>
    <p className="m-0"><b className="neon">Use: {QUENCH[cls].agent}.</b> {QUENCH[cls].how}</p>
    <div className="row" aria-label="PASS sequence">{PASS.map((p, i) => <motion.span key={p} className="pill" animate={{ scale: step === i ? 1.08 : 1, opacity: step === i ? 1 : 0.55 }} transition={{ type: "spring", stiffness: 260, damping: 18 }} style={{ borderColor: step === i ? "#ffe56a" : undefined, color: step === i ? "#ffe56a" : undefined }}>{p}</motion.span>)}</div>
    <div className="grid gap-3 grid-cols-2 md:grid-cols-5">{CLASSES.map(([c, d, col], i) => <motion.div key={c} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * .06 }} className="glass flex flex-col items-center gap-1 rounded-3xl p-3 text-center">
      <svg width="56" height="56" viewBox="0 0 56 56" aria-hidden><motion.path d="M28 6c6 10 14 14 14 26a14 14 0 0 1-28 0c0-8 6-10 6-18 4 4 6 6 8 10 0-8 0-12 0-18z" fill={col} fillOpacity=".25" stroke={col} strokeWidth="2" animate={{ scale: [1, 1.06, 1] }} transition={{ repeat: Infinity, duration: 1.4 + i * .1 }} style={{ transformOrigin: "28px 40px" }} /><text x="28" y="42" textAnchor="middle" fontWeight="900" fontSize="16" fill={col}>{c}</text></svg>
      <span className="text-xs">{d}</span></motion.div>)}</div>
    <div className="grid gap-4 lg:grid-cols-2">
      <section><h4 className="neon m-0 mb-2 text-sm">Extinguisher suitability (0 = never · 3 = best)</h4><div style={{ height: 230 }}><ResponsiveContainer><BarChart data={EXT} layout="vertical" margin={{ left: 20 }}><XAxis type="number" domain={[0, 15]} hide /><YAxis type="category" dataKey="agent" tick={{ fontSize: 11, fill: "currentColor" }} width={80} /><Tooltip contentStyle={{ background: "#021006", border: "1px solid #39FF14", borderRadius: 12 }} />
        {CLASSES.map(([c, , col]) => <Bar key={c} dataKey={c} stackId="s" fill={col} radius={4} />)}</BarChart></ResponsiveContainer></div></section>
      <section><h4 className="neon m-0 mb-2 text-sm">P.A.S.S. — aim at the base of the fire</h4>
        <svg viewBox="0 0 320 200" width="100%" role="img" aria-label="Diagram: stand 2 to 3 meters back, aim nozzle at the base of the flames and sweep side to side">
          <rect x="20" y="96" width="34" height="80" rx="12" fill="#ff4d6d" fillOpacity=".3" stroke="#ff4d6d" /><path d="M54 110 Q 120 100 180 168" fill="none" stroke="#cfd8dc" strokeWidth="3" strokeDasharray="5 6"><animate attributeName="stroke-dashoffset" from="0" to="-22" dur=".6s" repeatCount="indefinite" /></path>
          <motion.g animate={{ x: [-10, 10, -10] }} transition={{ repeat: Infinity, duration: 1.6 }}><circle cx="190" cy="172" r="10" fill="none" stroke="#39FF14" strokeWidth="2.5" /><path d="M178 172h24M190 160v24" stroke="#39FF14" strokeWidth="2" /></motion.g>
          <motion.path d="M210 176c0-30 18-40 18-70 12 18 26 30 26 52 0 10-4 18-10 18z M240 176c0-18 10-26 10-40 8 14 14 22 14 32 0 4-2 8-4 8z" fill="#ff8a3d" fillOpacity=".6" animate={{ scaleY: [1, 1.1, 1] }} transition={{ repeat: Infinity, duration: .9 }} style={{ transformOrigin: "240px 176px" }} />
          <line x1="20" x2="300" y1="182" y2="182" stroke="#9fb3a8" /><text x="100" y="196" fontSize="11" fill="#9fb3a8">2–3 m back · exit behind you</text><text x="150" y="30" fontSize="12" fill="#39FF14" fontWeight="700">Pull · Aim · Squeeze · Sweep</text></svg></section>
    </div>
    <div className="grid gap-4 md:grid-cols-3">
      <section className="rounded-3xl p-4" style={{ background: "rgba(57,255,20,.07)" }}><h4 className="neon m-0 mb-1 text-sm">✓ Do</h4><ul className="m-0 pl-5 text-sm"><li>Raise the alarm & call emergency first</li><li>Isolate power/fuel only if safe</li><li>Keep exit behind you; stay low in smoke</li><li>Fire watch ≥ 60 min after hot work</li></ul></section>
      <section className="rounded-3xl p-4" style={{ background: "rgba(255,77,109,.1)" }}><h4 className="m-0 mb-1 text-sm" style={{ color: "#ff4d6d" }}>✕ Don&apos;t</h4><ul className="m-0 pl-5 text-sm"><li>Water on oil, fat or live electrics</li><li>Fight a fire bigger than a wastebasket</li><li>Re-enter for belongings</li><li>Use lifts during a fire</li></ul></section>
      <section><h4 className="neon m-0 mb-1 text-sm">Typical industrial fire causes (illustrative %)</h4><div style={{ height: 150 }}><ResponsiveContainer><PieChart><Pie data={CAUSES} dataKey="v" nameKey="n" innerRadius={35} outerRadius={60} paddingAngle={3}>{CAUSES.map((_, i) => <Cell key={i} fill={["#39FF14", "#ff8a3d", "#ff4d6d", "#4da3ff", "#ffd166", "#9fb3a8"][i]} />)}</Pie><Tooltip contentStyle={{ background: "#021006", border: "1px solid #39FF14", borderRadius: 12 }} /></PieChart></ResponsiveContainer></div></section>
    </div></Card>;
}
