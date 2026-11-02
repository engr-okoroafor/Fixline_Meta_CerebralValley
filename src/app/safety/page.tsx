"use client";
import Banner, { Empty } from "@/components/Banner";
import { useState } from "react"; import { motion } from "framer-motion"; import { LOTO, QUALITY } from "@/lib/demo"; import { useJob } from "@/lib/store";
export default function Safety() {
  const { job, update, reset } = useJob(); const [res, setRes] = useState<{ canClose: boolean; missing: string[]; closedAt: string | null } | null>(null);
  const tog = (k: "loto" | "quality", i: number) => update((j) => { const a = [...j[k]]; a[i] = !a[i]; return { ...j, [k]: a }; });
  async function close() { const r = await fetch("/api/job", { method: "POST", body: JSON.stringify(job) }).then((r) => r.json()); setRes(r); if (r.canClose) update((j) => ({ ...j, closedAt: r.closedAt, log: [...j.log, `Job closed ${r.closedAt}`] })); }
  const lc = LOTO.filter((_, i) => job.loto[i]).length, qc = QUALITY.filter((_, i) => job.quality[i]).length;
  return <div className="flex flex-col gap-4"><Banner tag="Step 2 & 4 · Safety gate" title="Safety & job close-out" sub="Lock out before work. Inspect and record readings after. The job cannot close until every item is done." /><div className="grid g2">
    <div className="glass card"><div className="row" style={{ justifyContent: "space-between" }}><h2>🔒 Lockout-Tagout</h2><span className="pill blue">{lc}/{LOTO.length}</span></div><div className="bar" style={{ marginBottom: 10 }}><motion.div animate={{ width: `${lc / LOTO.length * 100}%` }} /></div>{LOTO.map((s, i) => <label key={s} className="chk"><input type="checkbox" checked={!!job.loto[i]} onChange={() => tog("loto", i)} />{s}</label>)}</div>
    <div className="glass card"><div className="row" style={{ justifyContent: "space-between" }}><h2>✅ Post-repair inspection</h2><span className="pill blue">{qc}/{QUALITY.length}</span></div><div className="bar" style={{ marginBottom: 10 }}><motion.div animate={{ width: `${qc / QUALITY.length * 100}%` }} /></div>{QUALITY.map((s, i) => <label key={s} className="chk"><input type="checkbox" checked={!!job.quality[i]} onChange={() => tog("quality", i)} />{s}</label>)}
      <div className="grid g2" style={{ marginTop: 10 }}><label>Torque (N·m)<input type="number" value={job.readings.torque ?? ""} onChange={(e) => update((j) => ({ ...j, readings: { ...j.readings, torque: +e.target.value } }))} /></label><label>Vibration (mm/s)<input type="number" step="0.1" value={job.readings.vibration ?? ""} onChange={(e) => update((j) => ({ ...j, readings: { ...j.readings, vibration: +e.target.value } }))} /></label></div>
      <div style={{ display: "flex", gap: 8, marginTop: 14 }}><button className="btn btn-primary" onClick={close}>Close job</button><button className="btn" onClick={reset}>Reset demo</button></div>
      {res && (res.canClose ? <p className="ok">Job closed & inspection recorded at {res.closedAt}.</p> : <div><p className="bad">Blocked — {res.missing.length} item(s) outstanding:</p>{res.missing.map((m) => <div key={m} className="bad" style={{ fontSize: 13 }}>• {m}</div>)}</div>)}</div>
  </div></div>;
}
