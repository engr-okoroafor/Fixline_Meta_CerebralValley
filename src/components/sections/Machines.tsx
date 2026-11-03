"use client";
import { useEffect, useState } from "react";
import { MACHINES, isoZone, ZONE_TEXT, type Machine } from "@/lib/eng";
import { EQUIPMENT, searchEquipment, domainOf, criticalityOf, type Equipment } from "@/lib/equipment";
import { savePrefs } from "./shared";
const KW: Record<string, [number, number, Machine["group"]]> = { turbines: [5000, 3600, "IV"], compressors: [250, 2950, "III"], generators: [500, 1500, "III"], pumps: [37, 2950, "II"], motors: [55, 1480, "II"], hvac: [22, 1450, "I"], appliances: [1.5, 1200, "I"], conveyors: [30, 1480, "II"], "machine-tools": [25, 6000, "I"], boilers: [800, 0, "II"] };
const fromEq = (e: Equipment): Machine => { const [kw, rpm, g] = KW[e.category] ?? [15, 1480, "II"]; return { id: e.id, name: e.vendor ? `${e.vendor} ${e.family ?? e.name}` : e.name, kind: e.category, ratedKw: kw, rpm, group: g, checks: e.checks }; };
import { Card, Btn, Gauge } from "../ui";
import Trend from "../Trend";
import { NeonSelect } from "../NeonSelect";
import { post } from "./shared";
import { useListen } from "./Voice";
import type { GuideStep } from "@/lib/repair-guide";
function RepairAsk() {
  const [q, setQ] = useState(""); const [busy, setBusy] = useState(false); const [err, setErr] = useState(""); const [listening, setL] = useState(false); const [step, setStep] = useState(0);
  const [guide, setGuide] = useState<{ machine: string; modelHint: string; fault: string; steps: GuideStep[]; model: string; mock: boolean } | null>(null);
  async function ask(text = q) { const query = text.trim(); if (query.length < 3) return; setBusy(true); setErr(""); try { const r = await post("/api/repair", { query }); setGuide(r); setStep(0); } catch (e) { setErr((e as Error).message); } finally { setBusy(false); } }
  const mic = useListen((t) => { setQ(t); void ask(t); }, (s) => setL(s === "listening" || s === "recording"));
  function speak(i = step) { const s = guide?.steps[i]; if (!s || !("speechSynthesis" in window)) return; const u = new SpeechSynthesisUtterance(`Step ${i + 1}. ${s.what}. ${s.how} Done when ${s.done}`); u.lang = "en-US"; speechSynthesis.cancel(); speechSynthesis.speak(u); }
  const cur = guide?.steps[step];
  return <div className="flex flex-col gap-2" data-testid="repair-ask">
    <form className="flex gap-2" onSubmit={(e) => { e.preventDefault(); void ask(); }}><input aria-label="Ask how to fix a machine" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Ask: how do I fix a leaking seal on a centrifugal pump?" />
      <Btn tip="Ask with your voice" aria-pressed={listening} onClick={() => (listening ? mic.stop() : mic.start("en-US"))}>{listening ? "■" : "🎙"}</Btn><button className="btn btn-primary" disabled={busy}>{busy ? "Asking…" : "Ask AI"}</button></form>
    {err && <p role="alert" className="m-0 text-sm" style={{ color: "var(--danger)" }}>{err}</p>}
    {guide && <div className="rounded-3xl p-3" style={{ border: "1px solid rgba(57,255,20,.4)" }}>
      <p className="m-0"><b className="neon">{guide.machine}</b> · {guide.modelHint}<span className="pill" style={{ marginLeft: 8 }}>{guide.mock ? "catalog mock" : guide.model}</span></p>
      <p className="m-0 text-sm">Fault: {guide.fault}</p>
      <ol className="m-0 pl-5 text-sm">{guide.steps.map((s, i) => <li key={s.what} style={{ fontWeight: i === step ? 700 : 400 }}><b>{s.what}</b>{i === step && <ul className="m-0 pl-4 font-normal"><li>How: {s.how}</li><li>Tools: {s.tools}</li><li>Done when: {s.done}</li><li>Camera: {s.verify}</li></ul>}</li>)}</ol>
      <div className="row"><Btn tip="Read this step aloud" onClick={() => speak()}>🔊 Read step</Btn><Btn tip="Next spoken step" className="btn-primary" onClick={() => { const n = Math.min(step + 1, guide.steps.length - 1); setStep(n); speak(n); }}>{step >= guide.steps.length - 1 ? "Last step" : "Next step"}</Btn></div>
      {cur && <p className="m-0 text-xs muted">Hands-free: listen, do the step, then Next. Re-check it on the Repair camera below.</p>}
    </div>}
  </div>;
}
export default function Machines() {
  const [m, setM] = useState(MACHINES[0]); const [q, setQ] = useState(""); const [dom, setDom] = useState("");
  const [custom, setCustom] = useState<Equipment[]>([]);
  useEffect(() => { fetch("/api/catalog").then((r) => r.json()).then((j) => setCustom(j.machines ?? [])).catch(() => {}); }, []);
  const ql = q.trim().toLowerCase(); const hits = [...custom.filter((e) => !ql || `${e.name} ${e.category} ${e.vendor ?? ""}`.toLowerCase().includes(ql)), ...(ql.length > 1 ? searchEquipment(q) : EQUIPMENT)].filter((e) => !dom || domainOf(e) === dom).slice(0, 12); const [data, setData] = useState<Record<string, number>[]>([]);
  useEffect(() => { setData([]); let t = 0; const id = setInterval(() => { t++; setData((d) => [...d.slice(-59), { t, vib: +(2 + Math.sin(t / 6) * 0.8 + Math.random() * 0.6 + (m.group === "III" ? 2 : 0)).toFixed(2), temp: +(55 + Math.sin(t / 15) * 6 + Math.random() * 2).toFixed(1), cur: +(m.ratedKw * 1.8 * (0.8 + Math.random() * 0.1)).toFixed(1), pres: +(6 + Math.cos(t / 9) * 0.6 + Math.random() * 0.2).toFixed(2) }]); }, 1000); return () => clearInterval(id); }, [m]);
  const last = data[data.length - 1] ?? { vib: 0, temp: 0, cur: 0, pres: 0 }; const z = isoZone(last.vib, m.group);
  return <div className="flex flex-col gap-4">
    <Card title="Machine library" sub={`Ask how to fix a fault in plain language or by voice — not just a filter. ${EQUIPMENT.length}+ machine types still search below.`}>
      <RepairAsk />
      <div className="grid gap-3 md:grid-cols-[2fr_1fr]"><input aria-label="Search machines" data-testid="machine-search" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search: pump, chiller, CNC, elevator, boiler, washing machine, ABB ACS880…" />
        <NeonSelect aria-label="Domain" value={dom} onChange={(e) => setDom(e.target.value)}><option value="">All domains</option><option value="industrial">Industrial / plant</option><option value="building">Building / facilities</option><option value="home">Home / residential</option></NeonSelect></div>
      {(q || dom) && <div className="grid-auto" style={{ gridTemplateColumns: "repeat(auto-fill, minmax(min(100%, 220px), 1fr))" }}>{hits.map((e) => <Btn key={e.id} tip={`${e.category} · ${domainOf(e)} · criticality ${criticalityOf(e)} · ${e.standards.slice(0, 2).join(", ")}`} aria-pressed={e.id === m.id} onClick={() => { setM(fromEq(e)); savePrefs({ machine: e.id }); }} style={{ whiteSpace: "normal", height: "auto", padding: "8px 12px" }}>{e.vendor ? `${e.vendor} · ${e.family ?? e.name}` : e.name}</Btn>)}{!hits.length && <p className="m-0 muted text-sm">No match — try a broader word.</p>}</div>}
      <p className="m-0 text-xs muted">Quick picks</p>
      <div className="grid-auto">{MACHINES.map((x) => <Btn key={x.id} tip={`${x.kind} · ${x.ratedKw} kW · ${x.rpm} rpm · ISO group ${x.group}`} aria-pressed={x.id === m.id} onClick={() => setM(x)}>{x.name}</Btn>)}</div>
    </Card>
    <div className="grid gap-4 lg:grid-cols-3">
      <Card title={m.name} sub={`${m.ratedKw} kW · ${m.rpm} rpm`} className="lg:col-span-1">
        <div className="grid grid-cols-2 gap-4"><Gauge value={last.vib} max={12} label="Vibration" unit="mm/s" warn={4.5} crit={7.1} /><Gauge value={last.temp} max={120} label="Temperature" unit="°C" warn={80} crit={95} /><Gauge value={last.cur} max={m.ratedKw * 2.6} label="Current" unit="A" /><Gauge value={last.pres} max={10} label="Pressure" unit="bar" /></div>
        <p className="m-0"><span className="pill">ISO 10816 zone {z}</span> <span className="text-sm muted">{ZONE_TEXT[z as keyof typeof ZONE_TEXT]}</span></p>
        <ul className="m-0 pl-5 text-sm">{m.checks.map((c) => <li key={c}>{c}</li>)}</ul>
      </Card>
      <Card title="Live trends" sub="Last 60 s, simulated" className="lg:col-span-2">
        <Trend data={data} keys={[{ k: "vib", c: "#39FF14", name: "Vibration mm/s" }, { k: "pres", c: "#00FF9C", name: "Pressure bar" }]} refs={[{ y: 7.1, label: "Zone D" }]} />
        <Trend data={data} keys={[{ k: "temp", c: "#fbbf24", name: "Temp °C" }, { k: "cur", c: "#60a5fa", name: "Current A" }]} />
      </Card>
    </div></div>;
}
