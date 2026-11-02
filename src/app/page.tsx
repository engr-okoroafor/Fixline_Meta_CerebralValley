"use client";
import Link from "next/link"; import { motion } from "framer-motion"; import { useEffect, useState } from "react"; import { HeroArt, Particles, Gauge } from "@/components/ui";
const F = [
  ["👓","Look & ask", "Technician looks at the machine on Ray-Ban Meta glasses and asks “what's wrong?” — hands stay on the tools."],
  ["🎯","SAM 3.1 finds & tracks", "Segments the exact part (seal, coupling, bearing) and keeps tracking as the tech moves."],
  ["🧠","Muse Spark 1.3 reasons", "Fuses the part, service manual and repair history into a cited diagnosis and a spoken step plan."],
  ["📸","Confirm-gate", "Every step must be re-confirmed by camera before the next one unlocks. No assuming it worked."],
  ["🗣","Speaks your language", "Muse Voice Transcribe with diarization + code-switching across English, Pidgin, Yorùbá, Igbo, Hausa; supervisor hears it translated."],
  ["🔒","Enforces safety", "LOTO, pre/post inspection and tolerance checks — the job literally cannot close until they're recorded."],
  ["🏭","Line QA", "Mounted over a line, SAM 3.1 flags surface defects, Muse Spark correlates with telemetry and writes the shift report."],
  ["📱","Mock Device Kit", "Runs today on a phone/webcam feed; the same loop drops onto Ray-Ban Meta glasses."],
];
const FLOW = [["/glasses","👓","1. Diagnose","Point the camera, ask a question."],["/safety","⛑","2. Lock out","Complete LOTO before touching the machine."],["/repair","🔧","3. Repair","Each step unlocks only after camera confirmation."],["/qa","✔","4. Line QA","Scan defects and write the shift report."]];
export default function Home() {
  const [t, setT] = useState(0); useEffect(() => { const id = setInterval(() => setT((x) => x + 1), 1200); return () => clearInterval(id); }, []);
  return <>
    <section className="glass relative overflow-hidden"><Particles /><div className="relative grid items-center gap-6 p-6 md:grid-cols-2 md:p-8">
      <div className="flex flex-col gap-4"><span className="pill" style={{ alignSelf: "flex-start" }}>Meta Global AI Developer Hackathon 2026 · Push the Frontier</span>
        <h2 className="m-0 text-3xl font-extrabold md:text-4xl">The repair agent that sees the machine, <span className="neon">and won&apos;t let you skip a step.</span></h2>
        <p className="muted m-0">SAM 3.1 perception + Muse Spark 1.3 reasoning on Ray-Ban Meta glasses. Camera in → part segmented → grounded diagnosis → spoken steps → camera-confirmed.</p>
        <div className="row"><Link className="btn btn-primary" href="/glasses" style={{ minHeight: 56, fontSize: "1.1rem", padding: "0 24px" }}>Start a repair</Link><Link className="btn" href="/qa">Line QA mode</Link><Link className="btn" href="/safety">LOTO gate</Link></div></div>
      <HeroArt /></div></section>
    <div className="grid-auto">{([["Vibration", 2.4 + Math.sin(t) * 0.6, 12, "mm/s", 4.5, 7], ["Bearing temp", 58 + Math.sin(t / 4) * 4, 120, "°C", 80, 95], ["Seal leak", 0.4 + Math.abs(Math.sin(t / 3)) * 0.5, 5, "ml/min", 2, 4], ["Line defects", 1 + Math.abs(Math.cos(t / 2)) * 2, 20, "/h", 8, 14]] as [string, number, number, string, number, number][]).map(([l, v, m, u, w, c]) => <div key={l} className="glass card"><Gauge label={l} value={v} max={m} unit={u} warn={w} crit={c} /></div>)}</div>
    <section className="glass card"><h3 className="neon m-0 text-lg">How a job flows</h3><div className="grid-auto">{FLOW.map(([h, e, t, d]) => <Link key={h} href={h} className="glass card btn" style={{ height: "auto", alignItems: "flex-start", flexDirection: "column", whiteSpace: "normal", textAlign: "left" }}><b className="neon">{e} {t}</b><span className="muted text-sm">{d}</span></Link>)}</div></section>
    <section className="glass card"><h3 className="neon m-0 text-lg">What&apos;s inside</h3><div className="grid-auto">{F.map(([e, t, d]) => <div key={t} className="rounded-3xl p-4" style={{ border: "1px solid color-mix(in oklab, #39FF14 30%, transparent)" }}><div className="text-xs muted">{e}</div><div className="neon text-base font-extrabold">{t}</div><p className="m-0 text-xs muted">{d}</p></div>)}</div></section>
    <section className="glass card"><h3 className="neon m-0 text-lg">Why it pushes the frontier</h3><p className="muted m-0">Most AI stays on a screen. FixLine closes the loop in the physical world: perception (SAM 3.1) → grounded reasoning (Muse Spark 1.3 + manuals + history) → action (spoken steps) → verification (camera re-confirm) → enforcement (LOTO/QA gate). It works guest-mode with zero keys, falls back from Muse Spark to an NVIDIA engine, and is built for multilingual crews where English-only tools fail.</p></section>
  </>;
}
