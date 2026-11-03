"use client";
import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Tip } from "../ui";
import { savePrefs } from "../sections/shared";
import { speak, useListen } from "../sections/Voice";
import { UI_LOCALES, t, detectLang, speechTag } from "@/lib/i18n";
import { REGIONS } from "@/lib/regions";
import { langName } from "@/lib/langs";
import { usePrefs } from "./useLocale";
import { ModelBadge } from "./ModelBadge";
import { go } from "./DeepLinks";
import { NeonSelect } from "../NeonSelect";
const Globe = () => <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#39FF14" strokeWidth="2" aria-hidden><circle cx="12" cy="12" r="10" /><path d="M2 12h20M12 2a15 15 0 0 1 0 20M12 2a15 15 0 0 0 0 20" /></svg>;
/** The ONE language control (top bar). Changes UI copy, page data (AI page translator), answers, STT and TTS together. */
export function LangSwitch() {
  const p = usePrefs(); const loc = p?.lang ?? "en-US"; const [open, setOpen] = useState(false); const [hi, setHi] = useState(-1);
  const cur = UI_LOCALES.find(([c]) => c === loc) ?? UI_LOCALES[0];
  const pick = (c: string) => { savePrefs({ lang: c, voiceLang: c, langSet: true }); setOpen(false); };
  return <div className="lang-dd notranslate" data-tour="lang" onKeyDown={(e) => { if (e.key === "Escape") setOpen(false); }} onBlur={(e) => { if (!e.currentTarget.contains(e.relatedTarget as Node)) setOpen(false); }}>
    <Tip label={`${t(loc, "language")}: whole page, answers, speech recognition and voice`} side="bottom"><motion.button type="button" whileHover={{ scale: 1.04 }} whileTap={{ scale: .96 }} className="lang-pill" aria-haspopup="listbox" aria-expanded={open} aria-label={`${t(loc, "language")}: ${cur[1]}`} onClick={() => setOpen(!open)}>
      <Globe /><span className="text-xs font-bold">{cur[1]}</span><motion.svg animate={{ rotate: open ? 180 : 0 }} width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#39FF14" strokeWidth="3" aria-hidden><path d="M6 9l6 6 6-6" /></motion.svg></motion.button></Tip>
    <AnimatePresence>{open && <motion.ul role="listbox" aria-label={t(loc, "language")} initial={{ opacity: 0, y: -8, scale: .96, filter: "blur(4px)" }} animate={{ opacity: 1, y: 0, scale: 1, filter: "blur(0px)" }} exit={{ opacity: 0, y: -6, scale: .97 }} transition={{ duration: .18 }} className="lang-menu">
      {UI_LOCALES.map(([c, l], i) => <motion.li key={c} role="option" aria-selected={c === loc} tabIndex={0} initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * .02 }} onMouseEnter={() => setHi(i)} onMouseLeave={() => setHi(-1)} onClick={() => pick(c)} onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); pick(c); } }} className={`lang-opt ${c === loc ? "on" : ""}`}>
        {hi === i && <motion.span layoutId="lang-hi" className="lang-hi" transition={{ type: "spring", stiffness: 500, damping: 34 }} />}<span className="relative">{l}</span><span className="relative text-[10px] muted">{c}</span>{c === loc && <span className="relative neon">✓</span>}</motion.li>)}
    </motion.ul>}</AnimatePresence></div>;
}
/** Safety/engineering JURISDICTION (standards body), deliberately styled unlike the language pill: square, amber, scales icon, labelled. */
export function RegionSelect({ compact = false }: { compact?: boolean }) {
  const p = usePrefs(); const cur = REGIONS.find((r) => r.id === (p?.region ?? "US"));
  return <Tip label="Jurisdiction = which standards and regulators the safety documents and engineering checks cite (not the language)"><label className="juris" data-tour="jurisdiction">
    <span aria-hidden>⚖</span>{!compact && <span className="juris-k">Jurisdiction</span>}
    <NeonSelect aria-label="Safety & engineering jurisdiction" value={p?.region ?? "US"} onChange={(e) => savePrefs({ region: e.target.value, regionSet: true })}>
      <optgroup label="Americas & Europe">{REGIONS.filter((r) => ["US", "UK", "EU", "GLOBAL"].includes(r.id)).map((r) => <option key={r.id} value={r.id}>{r.label}</option>)}</optgroup>
      <optgroup label="Middle East">{REGIONS.filter((r) => ["SA", "AE", "QA", "KW", "OM", "IQ"].includes(r.id)).map((r) => <option key={r.id} value={r.id}>{r.label}</option>)}</optgroup>
      <optgroup label="Africa">{REGIONS.filter((r) => ["NG", "AO", "DZ", "LY", "EG", "GH"].includes(r.id)).map((r) => <option key={r.id} value={r.id}>{r.label}</option>)}</optgroup>
    </NeonSelect>{!compact && cur && <span className="juris-b">{cur.bodies.slice(0, 2).join(" · ")}</span>}</label></Tip>;
}
/** Futuristic chat glyph (speech bubble + waveform) replacing the old neon blob. */
export const ChatIcon = ({ state }: { state: string }) => <svg width="30" height="30" viewBox="0 0 32 32" fill="none" aria-hidden>
  <path d="M6 7h20a3 3 0 0 1 3 3v10a3 3 0 0 1-3 3H14l-6 5v-5H6a3 3 0 0 1-3-3V10a3 3 0 0 1 3-3z" stroke="#39FF14" strokeWidth="1.8" strokeLinejoin="round" />
  {[10, 13.5, 17, 20.5, 24].map((x, i) => <motion.line key={x} x1={x - 2} x2={x - 2} y1={15} y2={15} stroke="#39FF14" strokeWidth="2" strokeLinecap="round"
    animate={{ y1: state === "idle" ? [13.5, 12, 13.5] : [10, 13, 10], y2: state === "idle" ? [16.5, 18, 16.5] : [20, 17, 20] }} transition={{ repeat: Infinity, duration: state === "idle" ? 2.4 : .6, delay: i * .12 }} />)}
</svg>;
type Turn = { who: "you" | "ai"; text: string; model?: string; lang?: string };
/** Floating conversational voice dock. Voice output is OFF by default; when on, it listens → answers → speaks → listens again. */
export function VoiceDock() {
  const p = usePrefs(); const loc = p?.lang ?? "en-US"; const voiceOn = !!p?.voiceOn;
  const [open, setOpen] = useState(false); const [log, setLog] = useState<Turn[]>([]); const [state, setState] = useState("idle"); const [note, setNote] = useState(""); const [txt, setTxt] = useState("");
  const loop = useRef(false); const sess = useRef(Math.random().toString(36).slice(2, 10)); const panel = useRef<HTMLDivElement>(null);
  useEffect(() => { if (!open) return; const onDown = (e: MouseEvent) => { if (panel.current && !panel.current.contains(e.target as Node)) setOpen(false); }; document.addEventListener("mousedown", onDown); return () => document.removeEventListener("mousedown", onDown); }, [open]);
  const mic = useListen((x) => ask(x), (s, n) => { setState(s); setNote(n ?? ""); });
  async function ask(text: string) {
    if (!text.trim()) return; const heard = p?.autoDetect !== false ? detectLang(text) : null;
    setLog((l) => [...l, { who: "you", text, lang: heard ?? undefined }]); setTxt(""); setState("thinking");
    try {
      const r = await fetch("/api/assist", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ prefer: p?.aiOrder === "nvidia-first" ? "nvidia" : "meta", text, session: sess.current, lang: langName(loc === "en-US" ? "en-US" : loc) || loc }) });
      const j = await r.json(); if (!r.ok) throw new Error(j.error ?? "AI unavailable");
      setLog((l) => [...l, { who: "ai", text: j.answer, model: j.model }]); if (j.nav) go(j.nav);
      if (voiceOn) { setState("speaking"); await speak(j.answer, speechTag(loc), () => { setState("idle"); if (loop.current) mic.start(speechTag(loc)); }); } else setState("idle");
    } catch (e) { setNote((e as Error).message); setState("idle"); }
  }
  const talk = () => { if (state === "listening" || state === "recording") { loop.current = false; mic.stop(); return; } loop.current = voiceOn; mic.start(speechTag(loc)); };
  return <div ref={panel} className="fixed bottom-4 right-4 sm:right-5 z-40 flex flex-col items-end gap-2">
    <AnimatePresence>{open && <motion.section initial={{ opacity: 0, y: 16, scale: .98 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: 12 }} className="chat-panel card" style={{ width: "min(92vw, 400px)", maxHeight: "72vh", padding: 16 }} aria-label="Voice assistant">
      <div className="row" style={{ justifyContent: "space-between" }}><div><b className="neon">FixLine</b><div className="text-xs muted">Hands-free repair, safety, quality and projects</div></div>
        <button className="btn text-sm" aria-pressed={voiceOn} data-testid="voice-toggle" onClick={() => { const on = !voiceOn; savePrefs({ voiceOn: on }); if (!on) { loop.current = false; speechSynthesis?.cancel(); } }}>{voiceOn ? `🔊 ${t(loc, "voiceOn")}` : `🔇 ${t(loc, "voiceOff")}`}</button></div>
      {!voiceOn && <p className="m-0 text-xs muted">{t(loc, "voiceHint")} Click outside this panel to close it.</p>}
      <div className="flex flex-col gap-2 overflow-y-auto" style={{ maxHeight: "40vh" }} aria-live="polite">
        {log.length === 0 && <p className="m-0 text-sm muted">Try “open projects”, “how do I fix a pump seal”, or “which extinguisher for oil”.</p>}
        {log.slice(-12).map((m, i) => <motion.div key={i} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="rounded-2xl p-3 text-sm" style={{ alignSelf: m.who === "you" ? "flex-end" : "flex-start", background: m.who === "you" ? "rgba(57,255,20,.2)" : "#0c2416", border: "1px solid rgba(57,255,20,.25)", maxWidth: "92%" }}>
          <div className="text-[10px] uppercase tracking-wide muted">{m.who === "you" ? "You" : "FixLine"}</div>
          {m.text}{m.lang && m.lang !== loc && <div className="text-xs muted">detected: {m.lang} → replying in {loc}</div>}{m.model && <div className="mt-1"><ModelBadge model={m.model} /></div>}</motion.div>)}
        {state === "thinking" && <div className="chat-typing" role="status" aria-label="FixLine is typing"><span /><span /><span /> FixLine is writing…</div>}
      </div>
      {note && <p className="m-0 text-xs neon" role="status">{note}</p>}
      <form className="flex gap-2" onSubmit={(e) => { e.preventDefault(); ask(txt); }}><input value={txt} onChange={(e) => setTxt(e.target.value)} placeholder="Type a message…" aria-label="Message" /><button className="btn btn-primary" disabled={state === "thinking"}>↵</button></form>
    </motion.section>}</AnimatePresence>
    <div className="row">
      {open && <Tip label={voiceOn ? "Hands-free loop: talk, hear the answer, keep talking" : "Speak once (answers shown as text while voice output is off)"}><motion.button whileTap={{ scale: .9 }} className="btn btn-primary" style={{ minHeight: 56, borderRadius: 999 }} onClick={talk}>
        {state === "listening" || state === "recording" ? <motion.span animate={{ scale: [1, 1.3, 1] }} transition={{ repeat: Infinity, duration: .8 }}>● {t(loc, "stop")}</motion.span> : `🎙 ${t(loc, "listen")}`}</motion.button></Tip>}
      <Tip label="Voice & AI assistant"><motion.button whileHover={{ scale: 1.08 }} aria-expanded={open} aria-label="Open voice assistant" onClick={() => setOpen(!open)} className="chat-fab" data-tour="chat">
        <ChatIcon state={state} /></motion.button></Tip>
    </div></div>;
}
