"use client";
import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Card, Btn, Field, Tip } from "../ui";
import { post, fileToDataUrl, prefs, sessionId, newSession } from "./shared";
import { langName } from "@/lib/langs";
import { speechTag } from "@/lib/i18n";
import { ModelBadge } from "../next/ModelBadge";
import { DeepLinks } from "../next/DeepLinks";
const ACCEPT = ".pdf,.docx,.xlsx,.csv,.txt,.md,.json,.log,image/png,image/jpeg,image/webp";
const KIND: Record<string, [string, string]> = { pdf: ["PDF", "#ff4d6d"], docx: ["DOCX", "#4da3ff"], xlsx: ["XLSX", "#39FF14"], csv: ["CSV", "#39FF14"], txt: ["TXT", "#cfd8dc"], md: ["MD", "#cfd8dc"], png: ["IMG", "#ffb020"], jpg: ["IMG", "#ffb020"], jpeg: ["IMG", "#ffb020"], webp: ["IMG", "#ffb020"] };
/** Futuristic holographic file glyph. */
export function FileGlyph({ ext, size = 44 }: { ext: string; size?: number }) {
  const [label, c] = KIND[ext] ?? ["FILE", "#39FF14"];
  return <svg width={size} height={size} viewBox="0 0 48 48" aria-hidden><defs><linearGradient id={`g-${label}`} x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor={c} stopOpacity=".9" /><stop offset="1" stopColor={c} stopOpacity=".15" /></linearGradient></defs>
    <path d="M12 4h17l9 9v27a4 4 0 0 1-4 4H12a4 4 0 0 1-4-4V8a4 4 0 0 1 4-4z" fill="rgba(7,19,13,.55)" stroke={`url(#g-${label})`} strokeWidth="2" /><path d="M29 4v9h9" fill="none" stroke={c} strokeWidth="2" />
    <path d="M13 20h18M13 25h22M13 30h14" stroke={c} strokeOpacity=".5" strokeWidth="1.5" strokeLinecap="round"><animate attributeName="stroke-opacity" values=".2;.8;.2" dur="2.4s" repeatCount="indefinite" /></path>
    <text x="24" y="41" textAnchor="middle" fontSize="8" fontWeight="800" fill={c} fontFamily="ui-monospace,monospace">{label}</text></svg>;
}
export function UploadOrb({ active }: { active: boolean }) {
  return <svg width="72" height="72" viewBox="0 0 72 72" aria-hidden><circle cx="36" cy="36" r="30" fill="none" stroke="#39FF14" strokeOpacity=".25" strokeWidth="2" /><circle cx="36" cy="36" r="30" fill="none" stroke="#39FF14" strokeWidth="2.5" strokeDasharray="30 160" strokeLinecap="round"><animateTransform attributeName="transform" type="rotate" from="0 36 36" to="360 36 36" dur={active ? ".9s" : "4s"} repeatCount="indefinite" /></circle>
    <circle cx="36" cy="36" r="20" fill="rgba(57,255,20,.08)" stroke="#39FF14" strokeOpacity=".5" /><path d="M36 46V26m-8 8 8-8 8 8" fill="none" stroke="#39FF14" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" /></svg>;
}
export function Uploader({ files, setFiles, hint }: { files: File[]; setFiles: (f: File[]) => void; hint?: string }) {
  const [over, setOver] = useState(false); const inp = useRef<HTMLInputElement>(null);
  const add = (l: FileList | null) => { if (!l) return; const n = [...files, ...Array.from(l)].filter((f) => f.size <= 15e6).slice(0, 6); setFiles(n); };
  return <div className="flex flex-col gap-3">
    <Tip label="Drop or browse: PDF, Word (DOCX), Excel (XLSX), CSV, TXT, photos. Up to 6 files, 15 MB total. Files are parsed on the server and stored in your long-term memory so you can ask follow-ups later.">
      <button type="button" onClick={() => inp.current?.click()} onDragOver={(e) => { e.preventDefault(); setOver(true); }} onDragLeave={() => setOver(false)} onDrop={(e) => { e.preventDefault(); setOver(false); add(e.dataTransfer.files); }}
        className="glass flex w-full flex-col items-center justify-center gap-2 rounded-3xl p-6" style={{ border: `1.5px dashed ${over ? "#39FF14" : "color-mix(in oklab, #39FF14 45%, transparent)"}`, boxShadow: over ? "0 0 28px rgba(57,255,20,.35) inset" : undefined, transition: "all .2s", minHeight: 150, cursor: "pointer" }}>
        <UploadOrb active={over} /><b>Drop manuals, datasheets, logs, photos</b><span className="muted text-sm">{hint ?? "PDF · DOCX · XLSX · CSV · TXT · PNG/JPG"}</span>
      </button></Tip>
    <input ref={inp} type="file" multiple accept={ACCEPT} hidden onChange={(e) => { add(e.target.files); e.target.value = ""; }} />
    <AnimatePresence>{files.length > 0 && <motion.ul initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="m-0 grid list-none gap-2 p-0" style={{ gridTemplateColumns: "repeat(auto-fill,minmax(150px,1fr))" }}>
      {files.map((f, i) => <motion.li key={f.name + i} layout initial={{ scale: .9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: .9, opacity: 0 }} className="glass flex items-center gap-2 rounded-3xl p-2"><FileGlyph ext={f.name.split(".").pop()!.toLowerCase()} /><span className="min-w-0 flex-1 truncate text-xs" title={f.name}>{f.name}<br /><span className="muted">{(f.size / 1024).toFixed(0)} KB</span></span><Btn tip={`Remove ${f.name}`} aria-label={`Remove ${f.name}`} onClick={() => setFiles(files.filter((_, k) => k !== i))}>✕</Btn></motion.li>)}
    </motion.ul>}</AnimatePresence></div>;
}
export type Rich = { title: string; summary: string; safety: string; steps: string[]; insights: string[]; risks: string[]; parts: string[]; standards: string[]; followUps: string[]; svg: string; model: string; mock: boolean; recalled?: { src: string; text: string }[]; files?: { name: string; kind: string; chars: number; chunks: number }[]; errors?: string[] };
function speak(t: string) { if (!("speechSynthesis" in window)) return; const u = new SpeechSynthesisUtterance(t); u.lang = speechTag(prefs().voiceLang || "en-US"); speechSynthesis.cancel(); speechSynthesis.speak(u); }
const List = ({ t, x, icon }: { t: string; x: string[]; icon: string }) => x.length ? <section><h4 className="neon m-0 mb-1 text-sm uppercase tracking-wider">{icon} {t}</h4><ul className="m-0 flex flex-col gap-1 pl-5 text-sm">{x.map((s, i) => <li key={i}>{s}</li>)}</ul></section> : null;
export function RichAnswer({ r, onAsk }: { r: Rich; onAsk?: (q: string) => void }) {
  return <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="flex flex-col gap-4">
    <div className="row" style={{ justifyContent: "space-between" }}><h3 className="m-0 text-xl font-bold">{r.title}</h3><ModelBadge model={r.mock ? "offline" : r.model} /></div>
    {r.summary && !/^\s*[{\[]|"\w+"\s*:\s*"/.test(r.summary) && <p className="m-0">{r.summary}</p>}
    <p className="m-0 rounded-3xl p-4 text-sm font-semibold" style={{ background: "color-mix(in oklab, var(--danger) 15%, transparent)" }}>⚠ {r.safety}</p>
    {r.steps.length > 0 && <section><h4 className="neon m-0 mb-1 text-sm uppercase tracking-wider">🛠 Steps</h4><ol className="m-0 flex flex-col gap-2 pl-5" data-testid="steps">{r.steps.map((s, i) => <li key={i}>{s}</li>)}</ol></section>}
    <div className="grid gap-4 md:grid-cols-2"><List t="Insights" x={r.insights} icon="💡" /><List t="Risks" x={r.risks} icon="⛔" /><List t="Parts & tools" x={r.parts} icon="🔩" /><List t="Standards" x={r.standards} icon="📘" /></div>
    {r.svg && <img alt={`Diagram: ${r.title}`} className="w-full rounded-3xl" src={`data:image/svg+xml;utf8,${encodeURIComponent(r.svg)}`} />}
    <DeepLinks text={`${r.title} ${r.summary} ${r.steps.join(" ")} ${r.standards.join(" ")}`} />
    {r.files?.length ? <p className="m-0 text-xs muted">Parsed: {r.files.map((f) => `${f.name} (${f.kind}, ${f.chars.toLocaleString()} chars, ${f.chunks} memory chunks)`).join(" · ")}</p> : null}
    {r.errors?.length ? <p role="alert" className="m-0 text-xs" style={{ color: "var(--danger)" }}>{r.errors.join(" · ")}</p> : null}
    {r.recalled?.length ? <details className="text-xs"><summary className="muted">🧠 Recalled from memory ({r.recalled.length})</summary><ul>{r.recalled.map((m, i) => <li key={i}><b>{m.src}</b>: {m.text}</li>)}</ul></details> : null}
    <div className="row"><Btn tip="Read the summary, safety and steps aloud" onClick={() => speak(`${r.title}. ${r.summary} ${r.safety}. ${r.steps.map((s, i) => `Step ${i + 1}. ${s}`).join(" ")}`)}>🔊 Read aloud</Btn>
      {onAsk && r.followUps.map((q) => <Btn key={q} tip="Ask this follow-up (uses the same memory)" onClick={() => onAsk(q)}>↳ {q}</Btn>)}</div>
  </motion.div>;
}
/** Multi-doc copilot with follow-up Q&A and PGlite memory. */
export default function DocCopilot({ scope, title, sub, defaultQ, machine }: { scope: string; title: string; sub: string; defaultQ: string; machine?: string }) {
  const [files, setFiles] = useState<File[]>([]); const [q, setQ] = useState(defaultQ); const [thread, setThread] = useState<{ q: string; r: Rich }[]>([]); const [busy, setBusy] = useState(false); const [err, setErr] = useState(""); const [session, setSession] = useState("");
  useEffect(() => setSession(sessionId(scope)), [scope]);
  async function ask(question = q) {
    setBusy(true); setErr("");
    try {
      const lang = langName(prefs().lang); let r: Rich;
      if (files.length) { const fd = new FormData(); files.forEach((f) => fd.append("files", f)); fd.append("question", question); fd.append("session", session); if (machine) fd.append("machine", machine); fd.append("lang", lang); fd.append("region", prefs().region); fd.append("prefer", prefs().aiOrder === "nvidia-first" ? "nvidia" : "meta"); const res = await fetch("/api/docs", { method: "POST", body: fd }); r = await res.json(); if (!res.ok) throw new Error((r as unknown as { error: string }).error); setFiles([]); }
      else r = await post("/api/copilot", { session, question, machine, lang, region: prefs().region, prefer: prefs().aiOrder === "nvidia-first" ? "nvidia" : "meta" });
      setThread((t) => [...t, { q: question, r }]); setQ("");
    } catch (e) { setErr((e as Error).message); } finally { setBusy(false); }
  }
  return <div className="grid gap-4 xl:grid-cols-[minmax(0,5fr)_minmax(0,7fr)]">
    <Card title={title} sub={sub} right={<Btn tip="Start a fresh conversation (long-term memory is kept; manage it in Settings)" onClick={() => { setSession(newSession(scope)); setThread([]); }}>＋ New</Btn>}>
      <Uploader files={files} setFiles={setFiles} />
      <Field label="Question" tip="Ask anything about the machine or the uploaded files. Follow-ups remember this session and your earlier documents."><textarea rows={3} value={q} onChange={(e) => setQ(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) ask(); }} /></Field>
      <div className="row"><Btn tip="Parse the files, extract insights, cite standards and draw a diagram (Ctrl+Enter)" className="btn-primary" disabled={busy || q.trim().length < 2} onClick={() => ask()}>{busy ? "Analysing…" : files.length ? `Analyse ${files.length} file(s)` : "Ask"}</Btn></div>
      {err && <p role="alert" className="m-0" style={{ color: "var(--danger)" }}>{err}</p>}
    </Card>
    <Card title="Answers" sub={thread.length ? `${thread.length} turn(s) · memory on` : "Rich answers with diagrams appear here"}>
      {busy && <motion.div className="h-1 rounded-full" style={{ background: "linear-gradient(90deg,transparent,#39FF14,transparent)" }} animate={{ x: ["-100%", "100%"] }} transition={{ repeat: Infinity, duration: 1.2 }} />}
      {thread.length ? [...thread].reverse().map((t, i) => <div key={thread.length - i} className="flex flex-col gap-2 border-b pb-4" style={{ borderColor: "color-mix(in oklab,#39FF14 20%,transparent)" }}><p className="m-0 text-sm muted">You: {t.q}</p><RichAnswer r={t.r} onAsk={i === 0 ? (x) => { setQ(x); ask(x); } : undefined} /></div>) : <p className="muted m-0">No answer yet.</p>}
    </Card></div>;
}
export { fileToDataUrl };
