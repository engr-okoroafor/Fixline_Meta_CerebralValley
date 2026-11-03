"use client";
import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip, CartesianGrid, ReferenceLine, BarChart, Bar } from "recharts";
import { Card, Btn } from "../ui";
import { cableSize, pipe } from "@/lib/calc";
import { post, prefs, fileToDataUrl } from "../sections/shared";
import { useListen } from "../sections/Voice";
import { speechTag } from "@/lib/i18n";
import { RichAnswer, type Rich } from "../sections/Copilot";
import { CameraCapture } from "./Chrome";
export type Widget = { id: string; kind: "trend" | "cable" | "pipe" | "photo" | "kpi" | "ai" | "calc"; title: string; data?: Record<string, number | string>[]; value?: number; unit?: string; limit?: number; img?: string; rich?: Rich; lines?: string[] };
const METRICS: [RegExp, string, string, number, number][] = [ // regex, name, unit, warn, typical
  [/vib/i, "Vibration", "mm/s", 7.1, 2.8], [/temp|bearing heat/i, "Temperature", "°C", 90, 60], [/press/i, "Pressure", "barg", 16, 10], [/flow/i, "Flow", "m³/h", 140, 100], [/current|amps?\b/i, "Current", "A", 110, 80], [/level/i, "Level", "%", 85, 50], [/speed|rpm/i, "Speed", "rpm", 3100, 1480],
];
const uid = () => Math.random().toString(36).slice(2, 9);
function series(base: number, last: number) { return Array.from({ length: 24 }, (_, i) => ({ t: `${i}h`, v: +(base + (last - base) * (i / 23) ** 2 + Math.sin(i) * base * 0.04).toFixed(2) })); }
/** Deterministic NL → dashboard actions (works offline). Returns null to defer to the AI. */
export function parseCommand(q: string): Widget[] | "clear" | null {
  const s = q.toLowerCase(); if (/^(clear|reset)\b/.test(s)) return "clear";
  const nums = [...s.matchAll(/(-?\d+(?:\.\d+)?)/g)].map((m) => Number(m[1])); const tag = q.match(/\b([A-Z]{1,3}-?\d{2,4}[A-Z]?)\b/)?.[1] ?? "";
  const out: Widget[] = [];
  const amps = s.match(/(\d+(?:\.\d+)?)\s*a(mps?)?\b/); if (/cable/.test(s) && amps) { const a = Number(amps[1]); const der = Number(s.match(/derat\w*\s*(0?\.\d+)/)?.[1] ?? 1); const c = cableSize(a, der); out.push({ id: uid(), kind: "cable", title: `Cable for ${a} A`, lines: c ? [`${c.mm2} mm² Cu`, `Ampacity ${c.ampacity} A (derated ${c.derated} A)`, c.source] : ["Above table range — use parallel runs"] }); }
  const nps = s.match(/(\d+(?:-\d\/\d)?|\d\/\d)\s*(?:"|in|inch)/); if (/pipe|schedule|sch/.test(s) && nps) { const p = pipe(nps[1], /80/.test(s) ? "80" : "40") as Record<string, unknown>; out.push({ id: uid(), kind: "pipe", title: `NPS ${nps[1]} Sch ${/80/.test(s) ? 80 : 40}`, lines: p.error ? [String(p.error)] : [`OD ${p.od}"`, `Wall ${p.wall}"`, `ID ${p.id}"`, `Bolts ${p.bolts ?? "—"}`, String(p.source)] }); }
  for (const [re, name, unit, warn, typ] of METRICS) if (re.test(s) && !(name === "Current" && /cable/.test(s))) { const v = nums.find((n) => n > 0 && n !== 101) ?? typ; out.push({ id: uid(), kind: /trend|chart|graph|history|plot|show/.test(s) ? "trend" : "kpi", title: `${name}${tag ? ` · ${tag}` : ""}`, value: v, unit, limit: warn, data: series(typ, v) }); }
  if (/align|angularity|soft foot|shaft/.test(s)) out.push({ id: uid(), kind: "calc", title: "Alignment assist", lines: ["H angularity tilts the top view. H offset shifts it.", "V angularity tilts the side view. V offset lifts it.", "Drag the motor — it snaps when you are within 0.03 mm.", "Correct shows the in-tolerance pose. Wrong shows the captured as-found pose.", "AI auto-align glides the machine in and explains the shim moves."] });
  if (/photo|picture|image|camera/.test(s)) out.push({ id: uid(), kind: "photo", title: "Field photo" });
  return out.length ? out : null;
}
function TrendW({ w }: { w: Widget }) {
  return <div style={{ height: 180 }}><ResponsiveContainer><AreaChart data={w.data}><defs><linearGradient id={`g${w.id}`} x1="0" x2="0" y1="0" y2="1"><stop offset="0" stopColor="#39FF14" stopOpacity=".6" /><stop offset="1" stopColor="#39FF14" stopOpacity="0" /></linearGradient></defs>
    <CartesianGrid stroke="rgba(57,255,20,.1)" /><XAxis dataKey="t" tick={{ fontSize: 10, fill: "currentColor" }} /><YAxis tick={{ fontSize: 10, fill: "currentColor" }} width={40} /><Tooltip contentStyle={{ background: "#021006", border: "1px solid #39FF14", borderRadius: 12 }} />
    {w.limit && <ReferenceLine y={w.limit} stroke="#ff4d6d" strokeDasharray="4 4" label={{ value: "alarm", fill: "#ff4d6d", fontSize: 10 }} />}<Area dataKey="v" stroke="#39FF14" fill={`url(#g${w.id})`} strokeWidth={2} /></AreaChart></ResponsiveContainer></div>;
}
function KpiW({ w }: { w: Widget }) { const bad = w.limit !== undefined && (w.value ?? 0) >= w.limit; return <div className="flex items-end gap-3"><motion.span key={w.value} initial={{ scale: 1.3 }} animate={{ scale: 1 }} className="text-4xl font-black" style={{ color: bad ? "#ff4d6d" : "#39FF14" }}>{w.value}</motion.span><span className="muted">{w.unit}</span>{bad && <span className="pill" style={{ color: "#ff4d6d" }}>above alarm {w.limit}</span>}
  <div style={{ width: 120, height: 50 }}><ResponsiveContainer><BarChart data={w.data?.slice(-8)}><Bar dataKey="v" fill={bad ? "#ff4d6d" : "#39FF14"} radius={6} /></BarChart></ResponsiveContainer></div></div>; }
/** Natural-language (typed or spoken) Engineering agent that adds/updates dashboard widgets. */
export function EngineeringNL() {
  const [ws, setWs] = useState<Widget[]>([]); const [q, setQ] = useState(""); const [busy, setBusy] = useState(false); const [listening, setL] = useState(false); const [note, setNote] = useState("");
  useEffect(() => { try { setWs(JSON.parse(localStorage.getItem("fixline.eng.widgets") ?? "[]")); } catch { /* ignore */ } }, []);
  useEffect(() => { localStorage.setItem("fixline.eng.widgets", JSON.stringify(ws.filter((w) => w.kind !== "photo").slice(0, 12))); }, [ws]);
  const mic = useListen((t) => { setQ(t); run(t); }, (s, n) => { setL(s === "listening" || s === "recording"); setNote(n ?? ""); });
  async function run(text = q) {
    if (!text.trim()) return; const p = parseCommand(text);
    if (p === "clear") { setWs([]); setQ(""); return; }
    if (p) setWs((w) => [...p, ...w.filter((x) => !p.some((n) => n.title === x.title))]);
    if (!p || /why|how|what|explain|recommend/i.test(text)) { setBusy(true); try { const r: Rich = await post("/api/copilot", { session: `eng-nl-${Date.now()}`, question: text, lang: prefs().lang, region: prefs().region, machine: prefs().machine || undefined }); setWs((w) => [{ id: uid(), kind: "ai", title: r.title, rich: r }, ...w]); } catch (e) { setNote((e as Error).message); } finally { setBusy(false); } }
    setQ("");
  }
  const EX = ["Show vibration trend for P-101 at 7.4 mm/s", "Size cable for 60 A derating 0.8", "Pipe 4 inch schedule 80", "Bearing temperature 95 on M-12", "Add a photo", "Why is my pump cavitating?"];
  return <Card title="✦ Engineering agent — talk to your dashboard" sub="Type or speak; widgets, charts and photos update live. Questions get an AI answer with model attribution." className="lg:col-span-2">
    <form className="flex gap-2" onSubmit={(e) => { e.preventDefault(); run(); }}><input value={q} onChange={(e) => setQ(e.target.value)} placeholder="e.g. show pressure trend for V-201 at 15 barg" aria-label="Engineering command" data-testid="eng-nl" />
      <Btn tip="Speak a command (auto language)" aria-pressed={listening} onClick={() => (listening ? mic.stop() : mic.start(speechTag(prefs().lang)))}>{listening ? "■" : "🎙"}</Btn><button className="btn btn-primary" disabled={busy}>{busy ? "…" : "Run"}</button></form>
    <div className="row">{EX.map((x) => <button key={x} type="button" className="pill" style={{ cursor: "pointer" }} onClick={() => run(x)}>{x}</button>)}{ws.length > 0 && <button type="button" className="pill" onClick={() => setWs([])}>✕ clear</button>}</div>
    {note && <p className="m-0 text-xs neon">{note}</p>}
    <motion.div layout className="grid gap-4 md:grid-cols-2"><AnimatePresence>{ws.map((w) => <motion.section layout key={w.id} initial={{ opacity: 0, scale: .9 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: .9 }} className={`glass flex flex-col gap-2 rounded-3xl p-4 ${w.kind === "ai" ? "md:col-span-2" : ""}`} data-testid="eng-widget">
      <div className="row" style={{ justifyContent: "space-between" }}><b className="neon">{w.title}</b><button className="btn text-xs" style={{ minHeight: 32 }} aria-label={`Remove ${w.title}`} onClick={() => setWs(ws.filter((x) => x.id !== w.id))}>✕</button></div>
      {w.kind === "trend" && <TrendW w={w} />}{w.kind === "kpi" && <KpiW w={w} />}
      {(w.kind === "cable" || w.kind === "pipe" || w.kind === "calc") && <ul className="m-0 pl-5 text-sm">{w.lines?.map((l) => <li key={l}>{l}</li>)}</ul>}
      {w.kind === "photo" && (w.img ? <img src={w.img} alt="Field photo" className="w-full rounded-3xl" /> : <CameraCapture onPhoto={async (f) => { const img = await fileToDataUrl(f); setWs((all) => all.map((x) => (x.id === w.id ? { ...x, img } : x))); }} />)}
      {w.kind === "ai" && w.rich && <RichAnswer r={w.rich} onAsk={(x) => run(x)} />}
    </motion.section>)}</AnimatePresence></motion.div>
  </Card>;
}
