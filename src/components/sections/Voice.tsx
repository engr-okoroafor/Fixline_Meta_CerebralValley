"use client";
import { useEffect, useRef, useState } from "react";
import { Btn, Card, Field } from "../ui";
import { LANGS, langLabel, langName, speechLocale, DEFAULT_LANG } from "@/lib/langs";
import { prefs } from "./shared";
import { callAi } from "@/lib/api";
import { NeonSelect } from "../NeonSelect";
type Box = { x: number; y: number; w: number; h: number; label: string };
/** Speak with a browser voice for the locale; if none exists (common for Igbo/Yoruba/Hausa) use server TTS when configured, else the closest browser voice. */
export async function speak(t: string, lang = DEFAULT_LANG, onEnd?: () => void) {
  const loc = lang.includes("-") ? lang : speechLocale(lang); const has = "speechSynthesis" in window;
  const voice = has ? speechSynthesis.getVoices().find((v) => v.lang.toLowerCase().startsWith(loc.split("-")[0].toLowerCase())) : undefined;
  if (!voice && prefs().flags.serverSpeech) { try { const r = await fetch("/api/speech", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ text: t, lang: loc }) }); if (r.ok) { const a = new Audio(URL.createObjectURL(await r.blob())); a.onended = () => onEnd?.(); await a.play(); return; } } catch { /* fall through */ } }
  if (!has) return onEnd?.(); const u = new SpeechSynthesisUtterance(t); u.lang = loc; if (voice) u.voice = voice; if (onEnd) u.onend = onEnd; speechSynthesis.cancel(); speechSynthesis.speak(u);
}
/** Speech-to-text: Web Speech API first; otherwise record with MediaRecorder and transcribe on the server (Meta/NVIDIA/OpenAI-compatible ASR). Never alerts: returns null so the UI falls back to typing quietly. */
export function useListen(onText: (t: string) => void, onState: (s: "idle" | "listening" | "recording" | "typing", note?: string) => void) {
  const rec = useRef<{ stop: () => void } | null>(null);
  return { stop: () => rec.current?.stop(), start: async (lang: string) => {
    const loc = lang.includes("-") ? lang : speechLocale(lang);
    const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    const server = async (why = "") => {
      const cfg = await fetch("/api/speech").then((r) => r.json()).catch(() => ({ server: false }));
      if (!cfg.server) return onState("typing", SR ? `Browser speech recognition ${why || "stopped"} — check mic permission / use Chrome, Edge or Safari, or type below.` : "This browser has no speech recognition (Firefox?) — use Chrome, Edge or Safari, or type below. Server STT is optional (SPEECH_API_URL).");
      if (!navigator.mediaDevices?.getUserMedia || typeof MediaRecorder === "undefined") return onState("typing", "Voice input isn't available in this browser — type below.");
      try { const st = await navigator.mediaDevices.getUserMedia({ audio: true }); const mr = new MediaRecorder(st); const chunks: Blob[] = []; mr.ondataavailable = (e) => chunks.push(e.data);
        mr.onstop = async () => { st.getTracks().forEach((t) => t.stop()); onState("idle"); const fd = new FormData(); fd.append("audio", new Blob(chunks, { type: mr.mimeType }), "speech.webm"); fd.append("lang", loc); const r = await fetch("/api/speech", { method: "POST", body: fd }); const j = await r.json().catch(() => ({})); if (r.ok && j.text) onText(j.text); else onState("typing", "Server speech-to-text failed — type below."); };
        rec.current = mr; mr.start(); onState("recording", "Recording… tap again to stop."); setTimeout(() => mr.state === "recording" && mr.stop(), 15000);
      } catch { onState("typing", "Microphone permission denied — type below."); }
    };
    if (!SR) return server();
    const r = new SR(); r.lang = loc; r.interimResults = true; r.maxAlternatives = 1; let got = false;
    r.onresult = (e: any) => { const res = e.results[e.results.length - 1]; if (res.isFinal) { got = true; onText(res[0].transcript); } else onState("listening", `“${res[0].transcript}…”`); };
    r.onerror = (e: any) => { if (e.error === "language-not-supported" || e.error === "network") { rec.current = null; server(e.error === "network" ? "is offline" : `doesn't support ${loc}`); } else onState("idle", e.error === "no-speech" ? "Didn't catch that — try again." : e.error === "not-allowed" ? "Microphone blocked — allow it in the browser address bar." : undefined); };
    r.onend = () => { if (!got) onState("idle"); else onState("idle"); };
    rec.current = r; onState("listening", "Listening… (browser Web Speech)"); try { r.start(); } catch { server(); }
  } };
}
function frame(v: HTMLVideoElement | null) { if (!v || !v.videoWidth) return undefined; const c = document.createElement("canvas"); c.width = 512; c.height = Math.round(512 * v.videoHeight / v.videoWidth); c.getContext("2d")!.drawImage(v, 0, 0, c.width, c.height); return c.toDataURL("image/jpeg", 0.7); }
const MEM = "fixline-memory";
/** Hands-free conversation (listen → Supervisor agent → speak) + live camera vision with overlay labels. */
export default function Voice({ go }: { go: (m: string) => void }) {
  const [log, setLog] = useState<{ who: string; text: string; meta?: string }[]>([]); const [hands, setHands] = useState(false); const [listening, setListening] = useState(false);
  const [lang, setLang] = useState<string>(DEFAULT_LANG); const [note, setNote] = useState(""); const typeRef = useRef<HTMLInputElement>(null);
  useEffect(() => { setLang(prefs().voiceLang || DEFAULT_LANG); const f = () => setLang(prefs().voiceLang || DEFAULT_LANG); window.addEventListener("fixline:prefs", f); return () => window.removeEventListener("fixline:prefs", f); }, []);
  const mic = useListen((t) => ask(t), (st, n) => { setListening(st === "listening" || st === "recording"); setNote(n ?? ""); if (st === "typing") typeRef.current?.focus(); }); const [cam, setCam] = useState(false); const [every, setEvery] = useState(5); const [boxes, setBoxes] = useState<Box[]>([]); const [target, setTarget] = useState("machine part");
  const video = useRef<HTMLVideoElement>(null); const rec = useRef<any>(null); const handsRef = useRef(false); const session = useRef(Math.random().toString(36).slice(2, 10));
  useEffect(() => { try { setLog(JSON.parse(localStorage.getItem(MEM) ?? "[]").slice(-20)); } catch { /* empty */ } }, []);
  useEffect(() => { localStorage.setItem(MEM, JSON.stringify(log.slice(-50))); }, [log]);
  async function ask(text: string) {
    setLog((l) => [...l, { who: "You", text }]);
    try { const r = await fetch("/api/assist", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ prefer: prefs().aiOrder === "nvidia-first" ? "nvidia" : "meta", text, session: session.current, image: cam ? frame(video.current) : undefined, lang: langName(lang) }) }); const j = await r.json();
      if (!r.ok) throw new Error(j.error); if (j.nav) go(j.nav);
      setLog((l) => [...l, { who: j.agent, text: j.answer, meta: `${j.model} · ${j.ms} ms${j.recovered ? " · recovered" : ""}` }]); speak(j.answer, lang, () => { if (handsRef.current) listen(); });
    } catch (e) { setLog((l) => [...l, { who: "system", text: `Error: ${(e as Error).message}` }]); }
  }
  function listen() { if (listening) return mic.stop(); mic.start(lang); }
  function toggleHands() { const v = !hands; setHands(v); handsRef.current = v; if (v) listen(); else mic.stop(); }
  async function startCam() { try { const s = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "environment" } }); if (video.current) { video.current.srcObject = s; await video.current.play(); setCam(true); } } catch { setNote("Camera unavailable — check permissions."); } }
  async function analyse(spoken = true) { const img = frame(video.current); if (!img) return; const r = await fetch("/api/vision", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ image: img, prompt: target }) }); const j = await r.json(); setBoxes(j.boxes ?? []); if (j.say) { setLog((l) => [...l, { who: "Vision", text: j.say, meta: `${j.model ?? "mock"} · ${j.ms ?? 0} ms` }]); if (spoken) speak(j.say, lang); } }
  useEffect(() => { if (!cam || !every) return; const id = setInterval(() => analyse(false), every * 1000); return () => clearInterval(id); }); // eslint-disable-line react-hooks/exhaustive-deps
  return <div className="grid gap-4 lg:grid-cols-2">
    <Card title="Voice conversation" sub="Igbo by default. Speak in your language; answers are spoken back.">
      <p className="m-0 text-xs muted">Speaking & replying in <b className="neon">{langLabel(lang)}</b> — change it in the top language bar.</p>
      <div className="row"><Btn tip="Hold-free push-to-talk: one question" className="btn-primary" onClick={listen}>{listening ? "■ Stop" : "🎙 Push to talk"}</Btn><Btn tip="Continuous: listen, answer, speak, repeat" aria-pressed={hands} onClick={toggleHands}>{hands ? "Hands-free ON" : "Hands-free OFF"}</Btn><Btn tip="Clear memory" onClick={() => { setLog([]); localStorage.removeItem(MEM); }}>Clear</Btn></div>
      {note && <p role="status" className="m-0 text-sm neon">{note}</p>}
      <p className="muted text-sm">Try: “open safety”, “pump is cavitating and noisy”, “separator pressure alarm”, “kitchen oil fire”.</p>
      <form className="row" onSubmit={(e) => { e.preventDefault(); const f = new FormData(e.currentTarget); const t = String(f.get("q") ?? ""); if (t) ask(t); e.currentTarget.reset(); }}><input ref={typeRef} name="q" aria-label="Type a question" placeholder="Or type…" className="flex-1" /><Btn tip="Send">Send</Btn></form>
      <ul aria-live="polite" className="grid gap-2 max-h-96 overflow-auto">{log.map((m, i) => <li key={i} className="glass p-2"><b className="neon">{m.who}</b> {m.text}{m.meta && <div className="muted text-xs">{m.meta}</div>}</li>)}</ul>
    </Card>
    <Translator />
    <Card title="Live vision">
      <div className="relative" style={{ aspectRatio: "4/3", background: "#000", borderRadius: 12, overflow: "hidden" }}>
        <video ref={video} muted playsInline className="h-full w-full object-cover" />
        {boxes.map((b, i) => <div key={i} style={{ position: "absolute", left: `${b.x * 100}%`, top: `${b.y * 100}%`, width: `${b.w * 100}%`, height: `${b.h * 100}%`, border: "2px solid #39ff88", boxShadow: "0 0 12px #39ff88" }}><span style={{ background: "#39ff88", color: "#000", fontSize: 12, padding: "0 4px" }}>{b.label}</span></div>)}
      </div>
      <div className="row"><Btn tip="Start camera" onClick={startCam}>📷 Camera</Btn><Btn tip="Analyse this frame and speak guidance" className="btn-primary" onClick={() => analyse()}>Analyse</Btn></div>
      <div className="grid grid-cols-2 gap-2"><Field label="Find"><input value={target} onChange={(e) => setTarget(e.target.value)} /></Field><Field label="Sample every (s, 0 = off)"><input type="number" min={0} max={60} value={every} onChange={(e) => setEvery(+e.target.value)} /></Field></div>
    </Card>
  </div>;
}

/** Speech translation (merged from the old Translate tab): speak or type, translate, speak back. */
function Translator() {
  const [src, setSrc] = useState("auto"); const [tgt, setTgt] = useState("en"); const [text, setText] = useState(""); const [out, setOut] = useState<{ text: string; detected?: string; mock?: boolean } | null>(null); const [busy, setBusy] = useState(false); const [note, setNote] = useState(""); const [on, setOn] = useState(false);
  useEffect(() => { const p = prefs(); setSrc(p.lang || DEFAULT_LANG); setTgt(p.lang?.startsWith("en") ? "fr" : "en-US"); }, []);
  const mic = useListen((t) => { setText(t); go(t); }, (st, n) => { setOn(st === "listening" || st === "recording"); setNote(n ?? ""); });
  async function go(t = text) { if (!t.trim()) return; setBusy(true); try { const r = await callAi({ mode: "translate", text: t, source: src, target: tgt }); setOut(r); speak(r.text, tgt); } catch (e) { setNote((e as Error).message); } finally { setBusy(false); } }
  const opts = LANGS.map(([c]) => <option key={c} value={c}>{langLabel(c)}</option>);
  return <Card title="Speech translation" sub="Crew talk across languages — speak, translate, hear it.">
    <div className="grid grid-cols-[1fr_auto_1fr] items-end gap-3"><Field label="From" tip="Auto-detect works for typed text"><NeonSelect value={src} onChange={(e) => setSrc(e.target.value)}><option value="auto">{langLabel("auto")}</option>{opts}</NeonSelect></Field>
      <Btn tip="Swap languages" onClick={() => { if (src !== "auto") { setSrc(tgt); setTgt(src); } }}>⇄</Btn><Field label="To"><NeonSelect value={tgt} onChange={(e) => setTgt(e.target.value)}>{opts}</NeonSelect></Field></div>
    <Field label="Text"><textarea rows={3} value={text} onChange={(e) => setText(e.target.value)} /></Field>
    <div className="row"><Btn tip="Dictate in the source language (browser speech, or server ASR when configured)" onClick={() => (on ? mic.stop() : mic.start(src === "auto" ? DEFAULT_LANG : src))}>{on ? "■ Stop" : "🎙 Speak"}</Btn><Btn tip="Translate and read aloud in the target language" className="btn-primary" disabled={busy} onClick={() => go()}>{busy ? "Translating…" : "Translate & speak"}</Btn></div>
    {note && <p role="status" className="m-0 text-sm neon">{note}</p>}
    {out?.text && <p className="m-0 text-lg">{out.text} <span className="pill">{out.mock ? "offline" : "live"}</span>{out.detected && <span className="muted text-sm"> · detected: {out.detected}</span>}</p>}
  </Card>;
}
