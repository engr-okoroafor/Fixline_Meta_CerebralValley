"use client";
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
  return <main className="wrap grid g2">
    <div><Camera ref={cam} boxes={boxes} hud={step ? <><b>Step {step.id}:</b> {step.say}<br /><span className="warn">📸 {step.confirm}</span></> : <span className="ok">All steps camera-confirmed ✓</span>} />
      {!lotoDone && cur > 0 && <p className="bad">LOTO incomplete — <Link href="/safety">finish lockout first</Link>.</p>}
      <div style={{ display: "flex", gap: 8, marginTop: 12 }}>{step && <><button className="btn ghost" onClick={() => speak(step.say, job.lang)}>🔊 Speak step</button><button className="btn" onClick={confirm} disabled={cur > 0 && !lotoDone}>📸 Confirm with camera</button></>}</div>
      <p className="ok">{msg}</p></div>
    <div className="card"><h2>Confirm-gated plan</h2>{REPAIR_STEPS.map((s, i) => <motion.div key={s.id} className="chk" animate={{ opacity: i <= cur || cur < 0 ? 1 : 0.4 }}><b className={job.confirmed[i] ? "ok" : i === cur ? "warn" : "mute"}>{job.confirmed[i] ? "✓" : i === cur ? "▶" : "🔒"}</b><div>{s.say}<div className="mute" style={{ fontSize: 12 }}>Gate: {s.confirm}</div></div></motion.div>)}
      <h3>Audit log</h3>{job.log.map((l, i) => <div key={i} className="mute" style={{ fontSize: 12 }}>{l}</div>)}
      <div style={{ marginTop: 10, display: "flex", gap: 8 }}><Link className="btn ghost" href="/safety">Close job →</Link></div></div>
  </main>;
}
