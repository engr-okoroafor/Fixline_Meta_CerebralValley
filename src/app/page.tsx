"use client";
import Link from "next/link"; import { motion } from "framer-motion";
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
const FLOW = [["/glasses","👓","1. Diagnose","Point the camera, ask a question.","/img/glasses.jpg"],["/safety","🔒","2. Lock out","Complete LOTO before touching the machine.","/img/safety.jpg"],["/repair","🔧","3. Repair","Each step unlocks only after camera confirmation.","/img/repair.jpg"],["/qa","🏭","4. Line QA","Scan defects and write the shift report.","/img/line.jpg"]];
export default function Home() {
  return <main className="wrap">
    <motion.section className="hero" initial={{ opacity: 0, scale: .98 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: .6 }}>
      {/* eslint-disable-next-line @next/next/no-img-element */}<img src="/img/factory.jpg" alt="Technician working in an industrial facility" />
      <div><span className="pill blue">Meta Global AI Developer Hackathon 2026 · Push the Frontier</span>
      <h1>The repair agent that <span className="grad">sees the machine</span> — and won&apos;t let you skip a step.</h1>
      <p className="mute" style={{ fontSize: 18, lineHeight: 1.55 }}>SAM 3.1 perception + Muse Spark 1.3 reasoning on Ray-Ban Meta glasses. Camera in → part segmented → grounded diagnosis → spoken steps → camera-confirmed.</p>
      <div className="row" style={{ marginTop: 26 }}><Link className="btn lg" href="/glasses">Start a repair →</Link><Link className="btn ghost lg" href="/qa">Line QA mode</Link></div></div>
    </motion.section>
    <h2 style={{ margin: "40px 0 16px", fontSize: 26 }}>How a job flows</h2>
    <section className="grid g4">{FLOW.map(([h, e, t, d, img], i) => <motion.div key={h} initial={{ opacity: 0, y: 18 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: i * .08 }} whileHover={{ y: -6 }}>
      <Link href={h} className="card" style={{ display: "block", padding: 0, overflow: "hidden", color: "var(--text)" }}>
        {/* eslint-disable-next-line @next/next/no-img-element */}<img src={img} alt="" style={{ width: "100%", height: 140, objectFit: "cover", display: "block", opacity: .85 }} />
        <div style={{ padding: 18 }}><b style={{ fontSize: 17 }}>{e} {t}</b><p className="mute" style={{ margin: "6px 0 0", fontSize: 14 }}>{d}</p><span style={{ color: "var(--sky)", fontSize: 14, fontWeight: 600 }}>Open →</span></div></Link></motion.div>)}</section>
    <h2 style={{ margin: "40px 0 16px", fontSize: 26 }}>What&apos;s inside</h2>
    <section className="grid g3">{F.map(([e, t, d], i) => <motion.div key={t} className="card" initial={{ opacity: 0, y: 16 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: i * 0.05 }} whileHover={{ y: -4 }}><div className="icon">{e}</div><h3 style={{ margin: "0 0 6px" }}>{t}</h3><p className="mute" style={{ margin: 0, fontSize: 14, lineHeight: 1.5 }}>{d}</p></motion.div>)}</section>
    <section className="card" style={{ marginTop: 24 }}><h2>Why it pushes the frontier</h2><p className="mute" style={{ lineHeight: 1.6 }}>Most AI stays on a screen. FixLine closes the loop in the physical world: perception (SAM 3.1) → grounded reasoning (Muse Spark 1.3 + manuals + history) → action (spoken steps) → verification (camera re-confirm) → enforcement (LOTO/QA gate). It works guest-mode with zero keys, falls back from Muse Spark to an NVIDIA engine, and is built for multilingual crews where English-only tools fail.</p></section>
  </main>;
}
