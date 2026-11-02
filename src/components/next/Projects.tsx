"use client";
import { useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion, Reorder } from "framer-motion";
import { Card, Field, Btn, Tip } from "../ui";
import { post, prefs, fileToDataUrl } from "../sections/shared";
import { RichAnswer, type Rich } from "../sections/Copilot";
import { STAGES, METHODS, METHOD_LABEL, type Method, type Plan } from "@/lib/projectplan";
import { NeonSelect } from "../NeonSelect";
import { Loader, MiniSpin } from "./Loader";
type Task = { id: string; name: string; phase?: string; start: string; end: string; owner: string; cost: number; done: number; dep?: string };
type Stage = { name: string; gate: string; deliverables: string[] };
type Proj = { name: string; summary?: string; method: Method; startISO: string; currency: string; contingency: number; tasks: Task[]; memory: string[]; doneColor: string; stages: Stage[]; risks: { risk: string; owner: string; response: string }[]; company: string; contractor: string; companyLogo?: string; contractorLogo?: string };
/** Costs are stored in USD; display currency converts with indicative FX (editable later via live rates). */
export const FX: Record<string, [number, string]> = { USD: [1, "US dollar"], NGN: [1550, "Nigerian naira"], EUR: [0.92, "Euro"], GBP: [0.79, "British pound"], SAR: [3.75, "Saudi riyal"], AED: [3.67, "UAE dirham"], QAR: [3.64, "Qatari riyal"], KWD: [0.31, "Kuwaiti dinar"], GHS: [15.5, "Ghanaian cedi"], ZAR: [18.2, "South African rand"], EGP: [48.5, "Egyptian pound"], AOA: [910, "Angolan kwanza"] };
const D = 864e5; const iso = (d: Date) => d.toISOString().slice(0, 10); const addD = (s: string, n: number) => iso(new Date(new Date(s).getTime() + n * D));
const dd = (a: string, b: string) => Math.round((new Date(b).getTime() - new Date(a).getTime()) / D);
const today = () => iso(new Date());
const mk = (s: string, rows: [string, number, number, string, number, number][]): Task[] => rows.map(([name, off, days, owner, cost, done], k) => ({ id: `t${k + 1}`, name, start: addD(s, off), end: addD(s, off + days - 1), owner, cost, done, dep: k ? `t${k}` : undefined }));
const seed = (): Proj => { const s = today(); return { name: "Pump P-101 overhaul & realignment", method: "PMP", startISO: s, currency: "USD", contingency: 10, doneColor: "#39FF14", company: "FixLine Energy Ltd", contractor: "Delta Mechanical Services", stages: STAGES.PMP, risks: [], memory: ["Client requires PTW + LOTO sign-off before any mechanical work", "Last overhaul: seal kit arrived 3 days late — order early"],
  tasks: mk(s, [["Scope, PTW & risk assessment", 0, 2, "HSE", 800, 100], ["Procure seal + bearings", 1, 6, "Procurement", 4200, 60], ["LOTO & dismantle", 7, 2, "Mechanical", 1500, 0], ["Replace & laser-align", 9, 3, "Mechanical", 2600, 0], ["Commission & vibration baseline", 12, 2, "Reliability", 900, 0], ["Close-out & lessons learned", 14, 1, "PM", 300, 0]]) }; };
const KEY = "fixline.project.v2";
const money = (usd: number, c: string) => new Intl.NumberFormat("en-US", { style: "currency", currency: c, maximumFractionDigits: 0 }).format(usd * (FX[c]?.[0] ?? 1));
function Gantt({ p, upd }: { p: Proj; upd: (id: string, patch: Partial<Task>) => void }) {
  const s0 = p.tasks.reduce((m, t) => (t.start < m ? t.start : m), p.tasks[0]?.start ?? today()); const e0 = p.tasks.reduce((m, t) => (t.end > m ? t.end : m), s0);
  const span = Math.max(dd(s0, e0) + 4, 10); const W = 900, rowH = 30, left = 220, k = (W - left - 60) / span; const H = p.tasks.length * rowH + 40; const now = dd(s0, today());
  const tick = span > 60 ? 7 : span > 25 ? 3 : 1; const svg = useRef<SVGSVGElement>(null);
  const [drag, setDrag] = useState<null | { id: string; edge: "start" | "end" | "move"; x0: number; start: string; end: string }>(null);
  const [hov, setHov] = useState<null | { t: Task; x: number; y: number }>(null);
  const toDays = (clientX: number) => { const r = svg.current!.getBoundingClientRect(); return (clientX * W) / r.width; };
  const onMove = (e: React.PointerEvent) => { if (!drag) return; const delta = Math.round((toDays(e.clientX) - drag.x0) / k); if (drag.edge === "start") upd(drag.id, { start: addD(drag.start, Math.min(delta, dd(drag.start, drag.end))) }); else if (drag.edge === "end") upd(drag.id, { end: addD(drag.end, Math.max(delta, -dd(drag.start, drag.end))) }); else upd(drag.id, { start: addD(drag.start, delta), end: addD(drag.end, delta) }); };
  const insight = (t: Task) => { const len = dd(t.start, t.end) + 1; const el = Math.max(0, Math.min(len, dd(t.start, today()) + 1)); const exp = Math.round((el / len) * 100); const late = t.done < exp - 10; const dep = p.tasks.find((z) => z.id === t.dep);
    return [`${t.start} → ${t.end} · ${len} day${len > 1 ? "s" : ""}`, `Owner: ${t.owner || "unassigned"} · ${money(t.cost, p.currency)}`, `${t.done}% done vs ${exp}% expected — ${late ? "⚠ behind schedule" : t.done >= 100 ? "✓ complete" : "on track"}`, dep ? `Depends on: ${dep.name}${dep.done < 100 ? " (not finished)" : ""}` : "No predecessor", `Earned value: ${money((t.cost * t.done) / 100, p.currency)}`]; };
  return <div className="gantt-shell relative overflow-hidden rounded-3xl p-3" onPointerMove={onMove} onPointerUp={() => setDrag(null)} onPointerLeave={() => setDrag(null)}>
  <svg ref={svg} viewBox={`0 0 ${W} ${H}`} width="100%" role="img" aria-label="Gantt chart — drag bar edges to change dates" data-tour="pm-gantt" style={{ touchAction: "none", userSelect: "none" }}>
    <defs><linearGradient id="gbar" x1="0" x2="1"><stop offset="0" stopColor={p.doneColor} stopOpacity=".95" /><stop offset="1" stopColor="#00FF9C" stopOpacity=".7" /></linearGradient><filter id="gglow" x="-20%" y="-50%" width="140%" height="200%"><feGaussianBlur stdDeviation="2.2" /><feMerge><feMergeNode /><feMergeNode in="SourceGraphic" /></feMerge></filter></defs>
    {p.tasks.map((_, i) => <rect key={`r${i}`} x={0} y={24 + i * rowH} width={W} height={rowH} fill={i % 2 ? "rgba(57,255,20,.03)" : "transparent"} />)}
    {Array.from({ length: p.tasks.length + 1 }, (_, i) => <line key={`h${i}`} x1={0} x2={W} y1={24 + i * rowH} y2={24 + i * rowH} stroke="rgba(57,255,20,.16)" />)}
    {Array.from({ length: span }, (_, d) => <g key={d}><line x1={left + d * k} x2={left + d * k} y1={22} y2={H - 6} stroke="rgba(57,255,20,.08)" />{d % tick === 0 && <text x={left + d * k + 2} y={14} fontSize="9" fill="#9fb3a8">{new Date(new Date(s0).getTime() + d * D).toLocaleDateString("en-US", { month: "short", day: "numeric" })}</text>}</g>)}
    {now >= 0 && now <= span && <g><line x1={left + now * k} x2={left + now * k} y1={18} y2={H - 6} stroke="#ff5a5a" strokeDasharray="4 3" /><text x={left + now * k + 3} y={H - 8} fontSize="9" fill="#ff5a5a">today</text></g>}
    {p.tasks.map((t, i) => { const y = 26 + i * rowH; const x = left + dd(s0, t.start) * k; const w = Math.max(k, (dd(t.start, t.end) + 1) * k); const dep = p.tasks.find((z) => z.id === t.dep); const di = dep ? p.tasks.indexOf(dep) : -1;
      const grab = (edge: "start" | "end" | "move") => (e: React.PointerEvent) => { e.stopPropagation(); setHov(null); setDrag({ id: t.id, edge, x0: toDays(e.clientX), start: t.start, end: t.end }); };
      return <g key={t.id} data-testid="gantt-bar">
        <text x={4} y={y + 15} fontSize="11" fill="currentColor">{i + 1}. {t.name.slice(0, 30)}</text>
        {dep && <path d={`M${left + (dd(s0, dep.end) + 1) * k} ${26 + di * rowH + 11} h5 V${y + 11} H${x}`} fill="none" stroke="#9fb3a8" strokeDasharray="3 3" />}
        <motion.rect layout initial={false} animate={{ width: w, x }} transition={{ duration: drag ? 0 : .3 }} y={y + 1} height={20} rx={10} fill={`${p.doneColor}1a`} stroke={p.doneColor} strokeOpacity=".7" style={{ cursor: "grab" }} onPointerDown={grab("move")} onPointerEnter={(e) => !drag && setHov({ t, x: e.clientX, y: e.clientY })} onPointerLeave={() => setHov(null)} />
        <motion.rect initial={false} animate={{ width: (w * t.done) / 100, x }} transition={{ duration: drag ? 0 : .3 }} y={y + 1} height={20} rx={10} fill="url(#gbar)" filter="url(#gglow)" pointerEvents="none" />
        <rect x={x - 2} y={y + 3} width={6} height={16} rx={3} fill={p.doneColor} fillOpacity=".9" style={{ cursor: "ew-resize" }} onPointerDown={grab("start")} aria-label={`Resize start of ${t.name}`}><title>Drag to change start date</title></rect>
        <rect x={x + w - 4} y={y + 3} width={6} height={16} rx={3} fill={p.doneColor} fillOpacity=".9" style={{ cursor: "ew-resize" }} onPointerDown={grab("end")} aria-label={`Resize end of ${t.name}`}><title>Drag to change end date</title></rect>
        <text x={x + w + 8} y={y + 15} fontSize="10" fontWeight="700" fill={p.doneColor}>{t.done}%</text></g>; })}</svg>
  <AnimatePresence>{hov && !drag && (() => { const r = svg.current?.getBoundingClientRect(); return <motion.div initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} role="tooltip" data-testid="gantt-tip" className="pointer-events-none absolute z-20 rounded-2xl p-3 text-xs" style={{ left: Math.min((hov.x - (r?.left ?? 0)) + 12, (r?.width ?? 600) - 260), top: hov.y - (r?.top ?? 0) + 14, width: 250, background: "rgba(3,12,7,.95)", border: `1px solid ${p.doneColor}`, boxShadow: `0 0 18px ${p.doneColor}55` }}><b className="neon">{hov.t.name}</b><ul className="m-0 mt-1 pl-4">{insight(hov.t).map((l) => <li key={l}>{l}</li>)}</ul></motion.div>; })()}</AnimatePresence></div>;
}
function Calendar({ p }: { p: Proj }) {
  const base = new Date(p.tasks[0]?.start ?? p.startISO); const [off, setOff] = useState(0);
  const cur = new Date(base.getFullYear(), base.getMonth() + off, 1); const y = cur.getFullYear(), m = cur.getMonth(); const first = cur.getDay(); const days = new Date(y, m + 1, 0).getDate();
  const on = (d: number) => { const x = iso(new Date(Date.UTC(y, m, d))); return p.tasks.filter((t) => x >= t.start && x <= t.end); };
  const booked = Array.from({ length: days }, (_, i) => on(i + 1).length > 0).filter(Boolean).length; const td = today();
  return <div data-testid="pm-calendar"><div className="row" style={{ justifyContent: "space-between" }}><motion.button whileTap={{ scale: .9 }} className="btn btn-sm" aria-label="Previous month" onClick={() => setOff(off - 1)}>‹</motion.button>
    <AnimatePresence mode="wait"><motion.b key={off} initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 6 }} className="neon text-sm">{cur.toLocaleString("en-US", { month: "long", year: "numeric" })}</motion.b></AnimatePresence>
    <motion.button whileTap={{ scale: .9 }} className="btn btn-sm" aria-label="Next month" onClick={() => setOff(off + 1)}>›</motion.button></div>
    <div className="mt-1 flex gap-3 text-xs muted"><span><i className="inline-block h-2 w-2 rounded-full" style={{ background: p.doneColor }} /> booked {booked}</span><span><i className="inline-block h-2 w-2 rounded-full" style={{ border: "1px solid #9fb3a8" }} /> free {days - booked}</span>{off !== 0 && <button className="pill" onClick={() => setOff(0)}>Project month</button>}</div>
    <motion.div key={`g${off}`} initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }} className="mt-2 grid grid-cols-7 gap-1 text-center text-xs" onWheel={(e) => { if (Math.abs(e.deltaY) > 30) setOff(off + Math.sign(e.deltaY)); }}>{"SMTWTFS".split("").map((c, i) => <b key={i} className="muted">{c}</b>)}
    {Array.from({ length: first }, (_, i) => <span key={`b${i}`} />)}{Array.from({ length: days }, (_, i) => { const ts = on(i + 1); const isT = iso(new Date(Date.UTC(y, m, i + 1))) === td;
      const label = ts.length ? ts.map((t) => `${t.name} — ${t.owner || "unassigned"}, ${t.start}→${t.end}, ${t.done}% done`).join("\n") : "Free — no project work booked";
      return <Tip key={i} label={label}><span tabIndex={0} className="rounded-lg p-1" style={{ background: ts.length ? `${p.doneColor}${ts.length > 1 ? "66" : "2e"}` : "transparent", border: isT ? "1px solid #ff5a5a" : ts.length ? `1px solid ${p.doneColor}88` : "1px dashed rgba(159,179,168,.25)", boxShadow: ts.length ? `0 0 8px ${p.doneColor}44` : "none" }}>{i + 1}{ts.length > 1 && <sup>{ts.length}</sup>}</span></Tip>; })}</motion.div></div>;
}
function Logo({ label, src, set }: { label: string; src?: string; set: (v?: string) => void }) {
  const r = useRef<HTMLInputElement>(null);
  return <div className="flex items-center gap-2"><button type="button" className="btn btn-sm" onClick={() => r.current?.click()}>{src ? <img src={src} alt="" style={{ height: 24, maxWidth: 80, objectFit: "contain" }} /> : "⬆"} {label}</button>
    {src && <button type="button" className="pill text-xs" onClick={() => set(undefined)} aria-label={`Remove ${label}`}>✕</button>}
    <input ref={r} type="file" accept="image/png,image/jpeg" hidden onChange={async (e) => { const f = e.target.files?.[0]; if (f && f.size < 1_500_000) set(await fileToDataUrl(f, 400)); }} /></div>;
}
type Doc = { title: string; sections: { heading: string; bullets: string[] }[] };
async function exportDoc(p: Proj, stage: string, d: Doc, kind: "pdf" | "docx") {
  const name = `${p.name}-${stage}-${d.title}`.replace(/[^\w]+/g, "-").slice(0, 80);
  const save = (b: Blob, ext: string) => { const a = document.createElement("a"); a.href = URL.createObjectURL(b); a.download = `${name}.${ext}`; a.click(); };
  if (kind === "pdf") {
    const { jsPDF } = await import("jspdf"); const pdf = new jsPDF({ unit: "pt", format: "a4" }); const hex = (h: string) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16) || 0) as [number, number, number];
    const ac = hex(p.doneColor.length === 7 ? p.doneColor : "#39FF14"); const dark: [number, number, number] = [6, 20, 12];
    const header = () => { pdf.setFillColor(...dark); pdf.rect(0, 0, 595, 92, "F"); pdf.setFillColor(...ac); pdf.rect(0, 92, 595, 3, "F");
      if (p.companyLogo) pdf.addImage(p.companyLogo, 40, 22, 90, 44, undefined, "FAST"); else { pdf.setTextColor(...ac); pdf.setFontSize(18); pdf.text("FixLine", 40, 50); pdf.setFontSize(8); pdf.text("GUARDIAN", 40, 62); }
      if (p.contractorLogo) pdf.addImage(p.contractorLogo, 465, 22, 90, 44, undefined, "FAST"); else { pdf.setTextColor(220, 240, 230); pdf.setFontSize(9); pdf.text(p.contractor, 555, 48, { align: "right" }); }
      pdf.setTextColor(200, 230, 210); pdf.setFontSize(8); pdf.text(`${p.company}  ·  Contractor: ${p.contractor}`, 297, 82, { align: "center" }); pdf.setTextColor(20, 20, 20); };
    header(); let y = 125;
    pdf.setFontSize(18); pdf.setFont("helvetica", "bold"); const tl = pdf.splitTextToSize(d.title, 515); pdf.text(tl, 40, y); y += tl.length * 20; pdf.setFont("helvetica", "normal");
    pdf.setFontSize(9); pdf.setTextColor(90, 90, 90); pdf.text(`${METHOD_LABEL[p.method]} · Stage: ${stage} · Issued ${new Date().toLocaleDateString("en-US")} · Rev 0`, 40, y); y += 18;
    const done = p.tasks.length ? Math.round(p.tasks.reduce((a, t) => a + t.done * t.cost, 0) / Math.max(1, p.tasks.reduce((a, t) => a + t.cost, 0))) : 0;
    const kpi: [string, string][] = [["Tasks", String(p.tasks.length)], ["Budget", money(p.tasks.reduce((a, t) => a + t.cost, 0) * (1 + p.contingency / 100), p.currency)], ["Progress (EV)", `${done}%`], ["Risks", String(p.risks.length)]];
    kpi.forEach(([k2, v], i) => { const x0 = 40 + i * 130; pdf.setFillColor(240, 250, 244); pdf.setDrawColor(...ac); pdf.roundedRect(x0, y, 122, 40, 6, 6, "FD"); pdf.setTextColor(90, 90, 90); pdf.setFontSize(8); pdf.text(k2, x0 + 8, y + 14); pdf.setTextColor(10, 40, 20); pdf.setFontSize(12); pdf.setFont("helvetica", "bold"); pdf.text(v, x0 + 8, y + 31); pdf.setFont("helvetica", "normal"); }); y += 60;
    const brk = (h: number) => { if (y + h > 780) { pdf.addPage(); header(); y = 125; } };
    for (const s of d.sections) { brk(40); pdf.setFillColor(...ac); pdf.rect(40, y - 10, 4, 14, "F"); pdf.setTextColor(10, 40, 20); pdf.setFontSize(12); pdf.setFont("helvetica", "bold"); pdf.text(s.heading, 50, y); pdf.setFont("helvetica", "normal"); y += 16; pdf.setFontSize(10); pdf.setTextColor(30, 30, 30);
      for (const b of s.bullets) { const L = pdf.splitTextToSize(b, 490); brk(L.length * 13); pdf.setFillColor(...ac); pdf.circle(54, y - 3, 1.8, "F"); pdf.text(L, 62, y); y += L.length * 13 + 2; } y += 8; }
    brk(50); pdf.setDrawColor(160, 160, 160); [["Prepared by", 40], ["Contractor", 220], ["Approved (sponsor)", 400]].forEach(([l, x0]) => { pdf.line(x0 as number, y + 24, (x0 as number) + 150, y + 24); pdf.setFontSize(8); pdf.text(l as string, x0 as number, y + 36); });
    const n = pdf.getNumberOfPages(); for (let i = 1; i <= n; i++) { pdf.setPage(i); pdf.setFontSize(7); pdf.setTextColor(120, 120, 120); pdf.text(`${p.name} · ${d.title}`.slice(0, 110), 40, 820); pdf.text(`Page ${i} of ${n} · Generated by FixLine Guardian`, 555, 820, { align: "right" }); }
    return save(pdf.output("blob"), "pdf");
  }
  const x = await import("docx"); const img = (src?: string) => { if (!src) return null; const b = Uint8Array.from(atob(src.split(",")[1]), (c) => c.charCodeAt(0)); return new x.ImageRun({ data: b, type: src.includes("png") ? "png" : "jpg", transformation: { width: 120, height: 50 } }); };
  const logos = [img(p.companyLogo), img(p.contractorLogo)].filter(Boolean) as InstanceType<typeof x.ImageRun>[];
  const kids = [new x.Paragraph({ children: logos.length ? logos.flatMap((l, i) => (i ? [new x.TextRun("      "), l] : [l])) : [new x.TextRun({ text: "FixLine Guardian", bold: true, size: 36, color: "0A7A3A" })] }), new x.Paragraph({ children: [new x.TextRun({ text: `${p.company} · Contractor: ${p.contractor}`, size: 18 })] }),
    new x.Paragraph({ heading: x.HeadingLevel.TITLE, children: [new x.TextRun(d.title)] }), new x.Paragraph({ children: [new x.TextRun({ text: `${METHOD_LABEL[p.method]} · Stage: ${stage} · ${new Date().toLocaleDateString("en-US")}`, italics: true })] }),
    ...d.sections.flatMap((s) => [new x.Paragraph({ heading: x.HeadingLevel.HEADING_2, border: { bottom: { color: p.doneColor.replace("#", ""), size: 8, style: x.BorderStyle.SINGLE, space: 2 } }, children: [new x.TextRun({ text: s.heading, color: "0A3D1E", bold: true })] }), ...s.bullets.map((b) => new x.Paragraph({ bullet: { level: 0 }, children: [new x.TextRun(b)] }))]),
    new x.Paragraph({ children: [new x.TextRun("Prepared by: ____________   Contractor: ____________   Approved (sponsor): ____________")] })];
  save(await x.Packer.toBlob(new x.Document({ creator: "FixLine Guardian", title: d.title, sections: [{ footers: { default: new x.Footer({ children: [new x.Paragraph({ alignment: x.AlignmentType.RIGHT, children: [new x.TextRun({ text: `${p.name} · Generated by FixLine Guardian · Page `, size: 14 }), new x.TextRun({ children: [x.PageNumber.CURRENT], size: 14 })] })] }) }, children: kids }] })), "docx");
}
/** Projects: AI plan builder (PMP + PRINCE2), dated Gantt, drag-reorder, multi-currency costing, stage deliverables to PDF/DOCX with logos. */
export function Projects() {
  const [p, setP] = useState<Proj>(seed); const [note, setNote] = useState(""); const [ai, setAi] = useState<Rich | null>(null); const [busy, setBusy] = useState(""); const [brief, setBrief] = useState("Replace a 75 kW crude transfer pump and motor at a Niger Delta flow station, including new foundation, laser alignment and commissioning, in 6 weeks."); const [msg, setMsg] = useState("");
  useEffect(() => { try { const s = localStorage.getItem(KEY); if (s) setP({ ...seed(), ...JSON.parse(s) }); } catch { /* ignore */ } }, []);
  useEffect(() => { try { localStorage.setItem(KEY, JSON.stringify(p)); } catch { /* quota */ } }, [p]);
  const cost = useMemo(() => { const base = p.tasks.reduce((a, t) => a + t.cost, 0); const earned = p.tasks.reduce((a, t) => a + (t.cost * t.done) / 100, 0); const cont = (base * p.contingency) / 100; const days = p.tasks.length ? dd(p.tasks.reduce((m, t) => (t.start < m ? t.start : m), p.tasks[0].start), p.tasks.reduce((m, t) => (t.end > m ? t.end : m), p.tasks[0].end)) + 1 : 0; return { base, earned, cont, total: base + cont, pct: base ? Math.round((earned / base) * 100) : 0, days }; }, [p]);
  const upd = (id: string, patch: Partial<Task>) => setP((q) => ({ ...q, tasks: q.tasks.map((t) => { if (t.id !== id) return t; const n = { ...t, ...patch }; if (n.end < n.start) n.end = n.start; return n; }) }));
  async function build() {
    setBusy("plan"); setMsg("");
    try { const j = (await post("/api/project-plan", { op: "plan", brief, method: p.method, currency: "USD", startISO: p.startISO })) as Plan & { model: string };
      const s = p.startISO || today(); const tasks: Task[] = j.tasks.map((t, k) => ({ id: `t${k + 1}`, name: t.name, phase: t.phase, start: addD(s, Math.max(0, t.offset | 0)), end: addD(s, Math.max(0, t.offset | 0) + Math.max(1, t.days | 0) - 1), owner: t.owner, cost: Math.max(0, Number(t.cost) || 0), done: 0, dep: t.dep >= 0 && t.dep < k ? `t${t.dep + 1}` : undefined }));
      setP((q) => ({ ...q, name: j.name || q.name, summary: j.summary, tasks, stages: j.stages?.length ? j.stages : STAGES[q.method], risks: j.risks ?? [], contingency: j.contingency || q.contingency, memory: [...q.memory, `AI plan generated from brief (${j.model})`] }));
      setMsg(`✓ ${tasks.length}-task ${METHOD_LABEL[p.method]} plan built by ${j.model === "template" ? "the offline template" : j.model} — every cell is editable.`);
    } catch (e) { setMsg((e as Error).message); } finally { setBusy(""); }
  }
  async function deliverable(stage: string, doc: string, kind: "pdf" | "docx") {
    setBusy(`${stage}${doc}${kind}`);
    try { const ctx = `${p.summary ?? ""}\nTasks: ${p.tasks.map((t) => `${t.name} ${t.start}→${t.end} ${t.owner} ${money(t.cost, p.currency)} ${t.done}%`).join("; ")}\nBudget ${money(cost.total, p.currency)}\nRisks: ${p.risks.map((r) => r.risk).join("; ")}`;
      const d = (await post("/api/project-plan", { op: "deliverable", project: p.name, stage, doc, method: p.method, context: ctx.slice(0, 3900) })) as Doc; await exportDoc(p, stage, d, kind); setMsg(`✓ ${doc} exported as ${kind.toUpperCase()}`);
    } catch (e) { setMsg((e as Error).message); } finally { setBusy(""); }
  }
  async function askPm() { setBusy("review"); try { setAi(await post("/api/copilot", { session: `pm-${p.name}`.slice(0, 100), question: `Act as a ${METHOD_LABEL[p.method]} project manager. Project "${p.name}". Tasks: ${p.tasks.map((t) => `${t.name} (${t.start}→${t.end}, ${t.done}% done, ${money(t.cost, p.currency)})`).join("; ")}. Budget ${money(cost.total, p.currency)}. Memory: ${p.memory.join(" | ")}. Give critical path, top risks, schedule/cost recovery actions and the next ${METHOD_LABEL[p.method]} step.`.slice(0, 1500), lang: prefs().lang, region: prefs().region })); } catch { /* ignore */ } finally { setBusy(""); } }
  return <div className="grid gap-4 lg:grid-cols-2">
    <Card title="✦ AI project builder" sub="One-line brief → complete PMP · PRINCE2 · Agile/Scrum · Waterfall · CPM/CCPM · Lean Six Sigma plan: tasks, dates, owners, costs, stages, risks" className="lg:col-span-2" right={<div className="row" data-testid="pm-methods">{METHODS.map((m) => <motion.button whileTap={{ scale: .95 }} key={m} className={`btn btn-sm ${p.method === m ? "btn-primary" : ""}`} aria-pressed={p.method === m} onClick={() => setP({ ...p, method: m, stages: STAGES[m] })}>{METHOD_LABEL[m]}</motion.button>)}</div>}>
      <div data-tour="pm-ai" className="flex flex-col gap-2"><textarea aria-label="Project brief" rows={2} value={brief} onChange={(e) => setBrief(e.target.value)} />
        <div className="row"><motion.button whileHover={{ scale: 1.03 }} whileTap={{ scale: .97 }} className="btn btn-primary" disabled={!!busy} onClick={build} data-testid="pm-build">{busy === "plan" ? <span className="row" style={{ gap: 8 }}><MiniSpin /> Building plan…</span> : "✦ Build full plan with AI"}</motion.button>
          <span className="text-xs muted">Meta muse-spark first, NVIDIA failover, offline template last.</span></div>
        <AnimatePresence>{msg && <motion.p initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} role="status" className="m-0 text-sm neon">{msg}</motion.p>}</AnimatePresence></div>
    </Card>
    <Card title="📐 Project" sub={`${METHOD_LABEL[p.method]} lifecycle · ${cost.days} days · ${cost.pct}% complete`}>
      <Field label="Name"><input value={p.name} onChange={(e) => setP({ ...p, name: e.target.value })} /></Field>
      <div className="grid grid-cols-3 gap-2"><Field label="Start"><input type="date" value={p.startISO} onChange={(e) => { const sh = dd(p.startISO, e.target.value); setP({ ...p, startISO: e.target.value, tasks: p.tasks.map((t) => ({ ...t, start: addD(t.start, sh), end: addD(t.end, sh) })) }); }} /></Field>
        <div data-tour="pm-currency"><Field label="Currency"><NeonSelect value={p.currency} onChange={(e) => setP({ ...p, currency: e.target.value })}>{Object.entries(FX).map(([c, [, n]]) => <option key={c} value={c}>{c} · {n}</option>)}</NeonSelect></Field></div>
        <Field label="Contingency %"><input type="number" min={0} max={50} value={p.contingency} onChange={(e) => setP({ ...p, contingency: Number(e.target.value) })} /></Field></div>
      <div className="row">{(p.stages.length ? p.stages.map((s) => s.name) : STAGES[p.method].map((s) => s.name)).map((ph, i) => <motion.span key={ph + i} initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * .05 }} className="pill">{i + 1}. {ph}</motion.span>)}</div>
      <a className="btn" href="/xr" style={{ alignSelf: "flex-start" }}>🧊 Open 3D / XR plant layout</a></Card>
    <Card title="💰 Costing" sub={`Planned vs earned value · shown in ${p.currency}${p.currency !== "USD" ? ` (indicative FX 1 USD = ${FX[p.currency]?.[0]} ${p.currency})` : ""}`}>
      <div className="grid grid-cols-2 gap-2 text-sm">{([["Base", cost.base], ["Contingency", cost.cont], ["Total budget", cost.total], ["Earned value", cost.earned]] as const).map(([k, v]) => <motion.div layout key={k} className="rounded-2xl p-3" style={{ background: "var(--bg2)" }}><div className="muted text-xs">{k}</div><b className="neon text-lg">{money(v, p.currency)}</b></motion.div>)}</div>
      <div className="h-3 overflow-hidden rounded-full" style={{ background: `${p.doneColor}22` }}><motion.div className="h-full" style={{ background: p.doneColor }} animate={{ width: `${cost.pct}%` }} /></div>
      <p className="m-0 text-xs muted">{cost.pct}% earned · CPI/SPI tracked in the Earned Value Report deliverable.</p></Card>
    <Card title="📊 Gantt" sub="Drag bar edges to change start/end · drag bar to move · hover for insights · drag ⠿ to reorder · % complete in your colour" className="lg:col-span-2" right={<Tip label="Colour of the completed portion of each bar"><label className="row text-xs" style={{ cursor: "pointer" }}><span aria-hidden style={{ fontSize: 16, filter: `drop-shadow(0 0 4px ${p.doneColor})` }}>🖌</span> Done colour <input type="color" aria-label="Done colour" value={p.doneColor} onChange={(e) => setP({ ...p, doneColor: e.target.value })} style={{ width: 36, height: 28, padding: 0, minHeight: 0 }} /></label></Tip>}>
      <Gantt p={p} upd={upd} />
      <AnimatePresence>{busy && busy !== "review" && <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed bottom-24 left-1/2 z-50 w-[min(92vw,340px)] -translate-x-1/2" data-testid="doc-generating"><Loader full label={busy === "plan" ? "Generating plan" : "Generating document"} /></motion.div>}</AnimatePresence>
      <div className="overflow-x-auto"><div className="grid gap-1 text-xs muted" style={{ gridTemplateColumns: "28px minmax(180px,2fr) 130px 130px 110px 110px 170px 30px", minWidth: 900 }}><span /><span>Task</span><span>Start</span><span>End</span><span>Owner</span><span>Cost ({p.currency})</span><span>% complete</span><span /></div>
        <Reorder.Group axis="y" values={p.tasks} onReorder={(tasks) => setP({ ...p, tasks })} className="flex flex-col gap-1" style={{ minWidth: 900, listStyle: "none", padding: 0, margin: 0 }}>
          {p.tasks.map((t) => <Reorder.Item key={t.id} value={t} className="grid items-center gap-1 rounded-xl" whileDrag={{ scale: 1.02, boxShadow: `0 0 18px ${p.doneColor}66` }} style={{ gridTemplateColumns: "28px minmax(180px,2fr) 130px 130px 110px 110px 170px 30px", background: "var(--bg2)", padding: 2 }}>
            <span className="cursor-grab text-center" aria-label="Drag to reorder" title="Drag to reorder">⠿</span>
            <input aria-label="Task name" value={t.name} onChange={(e) => upd(t.id, { name: e.target.value })} />
            <input aria-label="Start date" type="date" value={t.start} onChange={(e) => { const len = dd(t.start, t.end); upd(t.id, { start: e.target.value, end: addD(e.target.value, len) }); }} />
            <input aria-label="End date" type="date" value={t.end} min={t.start} onChange={(e) => upd(t.id, { end: e.target.value })} />
            <input aria-label="Owner" value={t.owner} onChange={(e) => upd(t.id, { owner: e.target.value })} />
            <input aria-label="Cost" type="number" min={0} value={Math.round(t.cost * (FX[p.currency]?.[0] ?? 1))} onChange={(e) => upd(t.id, { cost: Number(e.target.value) / (FX[p.currency]?.[0] ?? 1) })} />
            <div className="flex items-center gap-1"><input aria-label="Percent complete" type="number" min={0} max={100} value={t.done} onChange={(e) => upd(t.id, { done: Math.max(0, Math.min(100, Number(e.target.value))) })} className="no-spin" style={{ width: 52, textAlign: "right", paddingRight: 4 }} /><span>%</span><input aria-label="Percent slider" type="range" min={0} max={100} value={t.done} onChange={(e) => upd(t.id, { done: Number(e.target.value) })} style={{ width: 60, accentColor: p.doneColor }} /></div>
            <button className="btn btn-sm" style={{ minWidth: 0, width: 26, height: 26, minHeight: 0, padding: 0, fontSize: 11, justifySelf: "center" }} aria-label={`Delete ${t.name}`} onClick={() => setP({ ...p, tasks: p.tasks.filter((x) => x.id !== t.id) })}>✕</button></Reorder.Item>)}
        </Reorder.Group></div>
      <Btn tip="Add a task after the last one" onClick={() => { const last = p.tasks.at(-1); const s = last ? addD(last.end, 1) : p.startISO; setP({ ...p, tasks: [...p.tasks, { id: `t${Date.now()}`, name: "New task", start: s, end: addD(s, 1), owner: "", cost: 0, done: 0, dep: last?.id }] }); }}>+ Task</Btn></Card>
    <Card title="📄 Stage deliverables" sub="AI writes each document from your live plan → PDF or DOCX with company & contractor logos" className="lg:col-span-2">
      <div data-tour="pm-docs" className="grid gap-2 md:grid-cols-2"><Field label="Company"><input value={p.company} onChange={(e) => setP({ ...p, company: e.target.value })} /></Field><Field label="Contractor"><input value={p.contractor} onChange={(e) => setP({ ...p, contractor: e.target.value })} /></Field>
        <Logo label="Company logo" src={p.companyLogo} set={(v) => setP({ ...p, companyLogo: v })} /><Logo label="Contractor logo" src={p.contractorLogo} set={(v) => setP({ ...p, contractorLogo: v })} /></div>
      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">{(p.stages.length ? p.stages : STAGES[p.method]).map((s, i) => <motion.div key={s.name + i} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * .05 }} className="rounded-2xl p-3" style={{ border: `1px solid ${p.doneColor}55` }}>
        <b className="neon text-sm">{i + 1}. {s.name}</b><div className="text-xs muted">Gate: {s.gate}</div>
        <ul className="m-0 mt-2 flex flex-col gap-1 p-0" style={{ listStyle: "none" }}>{s.deliverables.map((d) => <li key={d} className="row text-sm" style={{ justifyContent: "space-between" }}><span>{d}</span><span className="row" style={{ gap: 4 }}>{(["pdf", "docx"] as const).map((k) => <button key={k} className="btn btn-sm" disabled={!!busy} onClick={() => deliverable(s.name, d, k)}>{busy === `${s.name}${d}${k}` ? <MiniSpin /> : k.toUpperCase()}</button>)}</span></li>)}</ul></motion.div>)}</div>
      {p.risks.length > 0 && <div className="overflow-x-auto"><table className="text-sm"><thead><tr><th>Risk</th><th>Owner</th><th>Response</th></tr></thead><tbody>{p.risks.map((r, i) => <tr key={i}><td>{r.risk}</td><td>{r.owner}</td><td>{r.response}</td></tr>)}</tbody></table></div>}</Card>
    <Card title="🗓 Calendar"><Calendar p={p} /></Card>
    <Card title="🧠 AI project memory" sub="Facts the PM agent remembers (stored on this device)">
      <ul className="m-0 pl-5 text-sm">{p.memory.map((m, i) => <li key={i}>{m} <button className="pill" aria-label="Forget" onClick={() => setP({ ...p, memory: p.memory.filter((_, j) => j !== i) })}>✕</button></li>)}</ul>
      <form className="flex gap-2" onSubmit={(e) => { e.preventDefault(); if (note.trim()) { setP({ ...p, memory: [...p.memory, note.trim()] }); setNote(""); } }}><input value={note} onChange={(e) => setNote(e.target.value)} placeholder="Remember…" aria-label="Add memory" /><button className="btn">Add</button></form>
      <button className="btn btn-primary" disabled={!!busy} onClick={askPm}>{busy === "review" ? <span className="row" style={{ gap: 8 }}><MiniSpin /> Thinking…</span> : `✦ ${METHOD_LABEL[p.method]} AI review`}</button></Card>
    {ai && <Card title="PM agent" className="lg:col-span-2"><RichAnswer r={ai} /></Card>}
  </div>;
}
