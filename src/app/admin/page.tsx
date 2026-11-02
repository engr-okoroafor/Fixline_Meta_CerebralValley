"use client";
import Banner, { Empty } from "@/components/Banner";
import { ASSET } from "@/lib/demo"; import { useJob } from "@/lib/store";
export default function Admin() {
  const { job } = useJob(); const done = job.confirmed.filter(Boolean).length;
  return <main className="wrap"><Banner img="/img/factory.jpg" tag="Supervisor" title="Jobs & audit" sub="Live status of the active job, the asset manual and every camera-confirmed event." /><div className="grid">
    <div className="grid g4">{[["Active job", ASSET.id], ["Steps confirmed", `${done}/5`], ["Status", job.closedAt ? "Closed ✓" : "Open"], ["Crew language", job.lang]].map(([k, v]) => <div key={k} className="card"><div className="mute">{k}</div><h2>{v}</h2></div>)}</div>
    <div className="card"><h2>Asset: {ASSET.name}</h2><p className="mute">{ASSET.site}</p>{ASSET.manual.map((m) => <div key={m.id} className="chk" style={{ display: "block" }}><b>[{m.id}] {m.title}</b><div className="mute">{m.text}</div></div>)}<h3>Repair history</h3>{ASSET.history.map((h) => <div key={h.date} className="mute">{h.date} — {h.note}</div>)}</div>
    <div className="card"><h2>Audit trail</h2>{job.log.length ? job.log.map((l, i) => <div key={i} className="mute">{l}</div>) : <Empty e="🗂" t="No events yet" d="Events appear here as steps are confirmed on camera." />}</div>
  </div></main>;
}
