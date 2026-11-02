"use client";
import Banner, { Empty } from "@/components/Banner";
import { useRef, useState } from "react"; import Camera, { CamHandle } from "@/components/Camera"; import type { Box } from "@/lib/ai"; import { REPAIR_STEPS, LOTO } from "@/lib/demo"; import { speak, useJob } from "@/lib/store"; import { motion } from "framer-motion"; import Link from "next/link";
export default function Repair() {
  const cam = useRef<CamHandle>(null); const { job, update } = useJob(); const [boxes, setBoxes] = useState<Box[]>([]); const [msg, setMsg] = useState("");
  const cur = REPAIR_STEPS.findIndex((_, i) => !job.confirmed[i]); const step = REPAIR_STEPS[cur];
  const lotoDone = LOTO.every((_, i) => job.loto[i]);
  async function confirm() {
    const v = await fetch("/api/vision", { method: "POST", body: JSON.stringify({ image: cam.current?.snap(), prompt: step.target, step: cur }) }).then((r) => r.json());
    setBoxes(v.boxes);
    if (v.confirmed) { update((j) => { const c = [...j.confirmed]; c[cur] = true; return { ...j, confirmed: c, log: [...j.log, `${new Date().toLocaleTimeString()} Step ${step.id} confirmed by ${v.engine}`] }; }); const nx = REPAIR_STEPS[cur + 1]; const t = nx ? `Confirmed. Next: ${nx.say}` : "All steps confirmed. Complete the quality checklist to close the job."; setMsg(t); speak(t, job.lang); }
    else setMsg("Could not confirm — re-aim the camera at the part.");
  }
  const done = job.confirmed.filter(Boolean).length;
  return <div className="flex flex-col gap-4"><Banner tag="Step 3 · Repair" title="Guided repair" sub="Follow the spoken step, then confirm on camera. The next step stays locked until FixLine sees it done." />
    <div className="steps">{REPAIR_STEPS.map((s, i) => <span key={s.id} className={`step ${job.confirmed[i] ? "done" : i === cur ? "on" : ""}`}>{job.confirmed[i] ? "✓ " : ""}Step {s.id}</span>)}</div><div className="grid g2">
    <div><Camera ref={cam} boxes={boxes} hud={step ? <><b>Step {step.id}:</b> {step.say}<br /><span className="warn">📸 {step.confirm}</span></> : <span className="ok">All steps camera-confirmed ✓</span>} />
      {!lotoDone && cur > 0 && <div className="glass card" style={{ marginTop: 12, borderColor: "rgba(255,77,109,.5)" }}><b className="bad">🔒 Lockout required</b><p className="mute" style={{ margin: "6px 0 10px" }}>Finish LOTO before continuing this repair.</p><Link className="btn btn-primary" href="/safety">Go to Safety →</Link></div>}
      <div className="row" style={{ marginTop: 14 }}>{step && <><button className="btn" onClick={() => speak(step.say, job.lang)}>🔊 Speak step</button><button className="btn btn-primary" onClick={confirm} disabled={cur > 0 && !lotoDone}>📸 Confirm with camera</button></>}</div>
      {msg && <motion.p key={msg} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} className="ok">{msg}</motion.p>}</div>
    <div className="glass card"><h2>Confirm-gated plan</h2><div className="bar" style={{ marginBottom: 14 }}><motion.div animate={{ width: `${(done / REPAIR_STEPS.length) * 100}%` }} /></div>{REPAIR_STEPS.map((s, i) => <motion.div key={s.id} className="chk" animate={{ opacity: i <= cur || cur < 0 ? 1 : 0.4 }}><b className={job.confirmed[i] ? "ok" : i === cur ? "warn" : "mute"}>{job.confirmed[i] ? "✓" : i === cur ? "▶" : "🔒"}</b><div>{s.say}<div className="mute" style={{ fontSize: 12 }}>Gate: {s.confirm}</div></div></motion.div>)}
      <h3>Audit log</h3>{job.log.length ? job.log.map((l, i) => <div key={i} className="mute" style={{ fontSize: 12 }}>{l}</div>) : <Empty e="📸" t="No confirmations yet" d="Confirm the first step with the camera." />}
      <div style={{ marginTop: 10, display: "flex", gap: 8 }}><Link className="btn" href="/safety">Close job →</Link></div></div>
  </div></div>;
}
