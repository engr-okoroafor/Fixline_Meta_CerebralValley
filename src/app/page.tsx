"use client";
import Link from "next/link"; import { motion } from "framer-motion";
const F = [
  ["👓 Look & ask", "Technician looks at the machine on Ray-Ban Meta glasses and asks “what's wrong?” — hands stay on the tools."],
  ["🎯 SAM 3.1 finds & tracks", "Segments the exact part (seal, coupling, bearing) and keeps tracking as the tech moves."],
  ["🧠 Muse Spark 1.3 reasons", "Fuses the part, service manual and repair history into a cited diagnosis and a spoken step plan."],
  ["📸 Confirm-gate", "Every step must be re-confirmed by camera before the next one unlocks. No assuming it worked."],
  ["🗣 Speaks your language", "Muse Voice Transcribe with diarization + code-switching across English, Pidgin, Yorùbá, Igbo, Hausa; supervisor hears it translated."],
  ["🔒 Enforces safety", "LOTO, pre/post inspection and tolerance checks — the job literally cannot close until they're recorded."],
  ["🏭 Line QA", "Mounted over a line, SAM 3.1 flags surface defects, Muse Spark correlates with telemetry and writes the shift report."],
  ["📱 Mock Device Kit", "Runs today on a phone/webcam feed; the same loop drops onto Ray-Ban Meta glasses."],
];
export default function Home() {
  return <main className="wrap">
    <motion.section initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} style={{ padding: "60px 0 30px" }}>
      <span className="pill">Meta Global AI Developer Hackathon 2026 · Push the Frontier · Indie</span>
      <h1>The repair agent that <span style={{ color: "var(--cyan)" }}>sees the machine</span> — and won&apos;t let you skip a step.</h1>
      <p className="mute" style={{ fontSize: 19, maxWidth: 760 }}>FixLine puts SAM 3.1 perception and Muse Spark 1.3 reasoning onto Ray-Ban Meta glasses for factory floors and field service. One pipeline: camera in → SAM segments → Muse Spark reasons over the manual → the agent speaks → the technician confirms on camera.</p>
      <div style={{ display: "flex", gap: 12, marginTop: 20, flexWrap: "wrap" }}><Link className="btn" href="/glasses">Launch glasses demo →</Link><Link className="btn ghost" href="/qa">Line QA mode</Link><Link className="btn ghost" href="/safety">Safety gate</Link></div>
    </motion.section>
    <section className="grid g3">{F.map(([t, d], i) => <motion.div key={t} className="card" initial={{ opacity: 0, y: 16 }} whileInView={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}><h3 style={{ margin: "0 0 6px" }}>{t}</h3><p className="mute" style={{ margin: 0 }}>{d}</p></motion.div>)}</section>
    <section className="card" style={{ marginTop: 24 }}><h2>Why it pushes the frontier</h2><p className="mute">Most AI stays on a screen. FixLine closes the loop in the physical world: perception (SAM 3.1) → grounded reasoning (Muse Spark 1.3 + manuals + history) → action (spoken steps) → verification (camera re-confirm) → enforcement (LOTO/QA gate). It works guest-mode with zero keys, falls back from Muse Spark to an NVIDIA engine, and is built for multilingual crews where English-only tools fail.</p></section>
  </main>;
}
