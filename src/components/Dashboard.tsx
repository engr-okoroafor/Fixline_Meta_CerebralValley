"use client";
/* eslint-disable @typescript-eslint/no-explicit-any */
import { useEffect, useRef, useState } from "react";
import dynamic from "next/dynamic";
import { motion, AnimatePresence } from "framer-motion";
import { callAi } from "@/lib/api";
import { HAZARDS, FIRE_CLASSES, DISCLAIMER, EMERGENCY } from "@/lib/hazards";
import { authClient } from "@/lib/auth-client";
import { TipProvider, Btn, Card, Field, Tip, HeroArt, Particles, Gauge } from "./ui";
const load = <T,>(f: () => Promise<{ default: T }>) => dynamic(f as any, { ssr: false, loading: () => <Loader /> }) as any;
const DocCopilot = load(() => import("./sections/Copilot")); const Inspector = load(() => import("./sections/Inspector"));
const Machines = load(() => import("./sections/Machines")); const Tuning = load(() => import("./sections/Tuning")); const AskAI = load(() => import("./sections/AskAI")); const Scada = load(() => import("./sections/Scada")); const Voice = load(() => import("./sections/Voice")); const Engineering = load(() => import("./sections/Engineering")); const Settings = load(() => import("./sections/Settings"));
import { SafetyDocs, EmergencyCard, HomeToggle } from "./sections/SafetyDocs";
import { prefs, fileToDataUrl, videoFrame } from "./sections/shared";
import { useListen } from "./sections/Voice";
import { useStatus } from "./sections/Settings";
import { VoiceDock, LangSwitch, RegionSelect } from "./next/VoiceDock";
import { GeoLocale, PageTranslator } from "./next/PageTranslator";
import { ScrollFabs } from "./next/ScrollFabs";
import { Loader } from "./next/Loader";
import { useLocale } from "./next/useLocale";
import { t as tr, isRtl } from "@/lib/i18n";
import { UploadZone, CameraCapture, REPAIR_EXT } from "./next/Chrome";
import { Insights } from "./next/Insights";
import { FireGuidance } from "./next/SafetyVisuals";
import { ModelBadge } from "./next/ModelBadge";
import { gateAllowsNext } from "@/lib/repair-guide";
const Projects = load(() => import("./next/Projects").then((m) => ({ default: m.Projects })));
const EngineeringNL = load(() => import("./next/EngineeringNL").then((m) => ({ default: m.EngineeringNL })));
type Mode = "projects" | "voice" | "eng" | "settings" | "overview" | "repair" | "tuning" | "ask" | "scada" | "safety" | "quality";
const TABS: [Mode, string, string][] = [["overview", "Overview", "Start here"], ["repair", "Repair", "Hands-free guided repair with a camera confirm-gate"], ["tuning", "Tuning", "Alignment moves, PID, megger, ISO 10816"], ["projects", "Projects", "PMP by default: Gantt, total cost and duration, charter, WBS, schedule, risk register, change log, status report, A3"], ["ask", "Ask AI", "Any problem, photo diagnosis, diagrams"], ["scada", "SCADA", "Flow station HMI, alarms, AI agent"], ["safety", "Safety", "PTW, HAZOP, JSA, LOTO, fire plan and every other safety document"], ["quality", "Quality", "Autonomous visual inspector and shift report"], ["voice", "Voice & Vision", "Hands-free conversation, translation and live camera"], ["eng", "Engineering", "How to size cable, pipe, WPS and workflows"], ["settings", "Settings", "AI (Meta → NVIDIA), speech, memory, SCADA, export, features"]];
const ICON: Record<Mode, string> = { projects: "📊", overview: "⌂", repair: "🔧", tuning: "🎛", ask: "✦", scada: "📟", safety: "⛑", quality: "✔", voice: "🎙", eng: "📐", settings: "⚙" };
function snap(v: HTMLVideoElement | null) { if (!v || !v.videoWidth) return undefined; const c = document.createElement("canvas"); c.width = 480; c.height = Math.round(480 * v.videoHeight / v.videoWidth); c.getContext("2d")!.drawImage(v, 0, 0, c.width, c.height); return c.toDataURL("image/jpeg", 0.7); }
function speak(t: string, lang = "en") { if ("speechSynthesis" in window) { const u = new SpeechSynthesisUtterance(t); u.lang = lang; speechSynthesis.cancel(); speechSynthesis.speak(u); } }
export default function Dashboard({ user }: { user: { name: string; role: string } }) {
  const [mode, setMode] = useState<Mode>("overview"); const [dark, setDark] = useState(true); const [mini, setMini] = useState(false); const status = useStatus(); const loc = useLocale();
  // Usage-time heartbeat (1/min while the tab is visible) → Admin analytics.
  useEffect(() => { const beat = () => { if (document.visibilityState !== "visible") return; let d = localStorage.getItem("fixline.device"); if (!d) { d = crypto.randomUUID(); localStorage.setItem("fixline.device", d); } fetch("/api/track", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ mode, device: d }), keepalive: true }).catch(() => {}); }; const t = setInterval(beat, 60_000); return () => clearInterval(t); }, [mode]);
  useEffect(() => { document.documentElement.lang = loc; document.documentElement.dir = isRtl(loc) ? "rtl" : "ltr"; }, [loc]);
  useEffect(() => { const on = (e: Event) => { const m = (e as CustomEvent).detail as Mode; if (TABS.some(([k]) => k === m)) { setMode(m); window.scrollTo({ top: 0, behavior: "smooth" }); } }; window.addEventListener("fixline:go", on); return () => window.removeEventListener("fixline:go", on); }, []);
  useEffect(() => { setMini(localStorage.getItem("fixline.sidebar") === "mini"); }, []);
  useEffect(() => { const pre = () => { [() => import("./sections/Copilot"), () => import("./sections/Machines"), () => import("./sections/Tuning"), () => import("./sections/AskAI"), () => import("./sections/Scada"), () => import("./sections/Voice"), () => import("./sections/Engineering"), () => import("./sections/Settings"), () => import("./sections/Inspector"), () => import("./next/Projects"), () => import("./next/EngineeringNL")].forEach((f) => f().catch(() => {})); }; const w = window as unknown as { requestIdleCallback?: (f: () => void) => void }; if (w.requestIdleCallback) w.requestIdleCallback(pre); else setTimeout(pre, 1500); }, []);
  useEffect(() => { localStorage.setItem("fixline.sidebar", mini ? "mini" : "full"); }, [mini]);
  useEffect(() => { const t = localStorage.getItem("fixline.theme"); if (t) setDark(t === "dark"); }, []);
  useEffect(() => { document.documentElement.classList.toggle("dark", dark); localStorage.setItem("fixline.theme", dark ? "dark" : "light"); }, [dark]);
  return <TipProvider><div id="app-root" className="mx-auto flex max-w-[1440px] flex-col gap-4 p-4 pt-3 md:p-6 md:pt-3 lg:p-8 lg:pt-3">
    <GeoLocale /><PageTranslator />
    <motion.header initial={{ y: -30, opacity: 0 }} animate={{ y: 0, opacity: 1 }} className="topbar">
      <div className="min-w-0 flex items-center gap-3"><span className="logo-dot" aria-hidden /><div className="min-w-0"><h1 className="neon m-0 text-lg font-extrabold leading-tight md:text-xl">FixLine Guardian</h1><p className="muted m-0 truncate text-[11px] leading-tight">A hands-free AI repair, safety, quality & project management agent for plant workers · {user.role === "guest" ? "guest demo" : user.name}</p></div></div>
      <nav className="row" style={{ gap: 6 }} aria-label="Account">
        <LangSwitch />
        <Tip label="Open the mixed-reality view (headset browser)" side="bottom"><motion.a whileHover={{ scale: 1.05 }} className="btn btn-primary btn-sm" href="/xr">{tr(loc, "enterAr")}</motion.a></Tip>
        {user.role === "admin" ? <Tip label="Admin console: users, sessions, settings, audit, integrations, vendors, catalog"><a className="btn btn-sm" href="/admin">Admin</a></Tip> : <Tip label="Read-only Admin console demo (masked data)"><a className="btn btn-sm" href="/admin/demo">Admin demo</a></Tip>}
        <Btn tip={dark ? "Switch to light theme" : "Switch to dark theme"} className="btn-sm" onClick={() => setDark(!dark)}>{dark ? "☀" : "☾"}</Btn>
        {user.role === "guest" ? <Tip label="Sign in for control writes and admin"><a className="btn btn-sm" href="/login">Sign in</a></Tip> : <Btn tip="Sign out" className="btn-sm" onClick={async () => { await authClient.signOut(); location.href = "/login"; }}>Sign out</Btn>}
      </nav>
    </motion.header>
    <div className="flex flex-col gap-4 lg:flex-row">
      <nav role="tablist" aria-label="Sections" className={`glass flex gap-2 overflow-x-auto p-2 lg:shrink-0 lg:flex-col lg:self-start lg:sticky lg:top-20 ${mini ? "lg:w-[68px]" : "lg:w-56"}`} style={{ transition: "width .2s" }}>
        <Tip label={mini ? "Expand sidebar" : "Collapse sidebar"}><button aria-label={mini ? "Expand sidebar" : "Collapse sidebar"} aria-expanded={!mini} className="collapse-chip hidden lg:inline-flex" onClick={() => setMini(!mini)}><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden style={{ transform: mini ? "rotate(180deg)" : "none", transition: "transform .3s" }}><path d="M15 6l-6 6 6 6" /><path d="M20 6l-6 6 6 6" opacity=".45" /></svg></button></Tip>
        {TABS.map(([m, l, tip]) => <Tip key={m} side="right" align="center" label={mini ? `${l} — ${tip}` : tip}><motion.button whileHover={{ x: 3 }} whileTap={{ scale: .96 }} data-tour={`tab-${m}`} role="tab" aria-label={l} aria-selected={mode === m} className={`btn shrink-0 gap-2 ${mini ? "lg:justify-center" : "lg:justify-start"}`} onClick={() => setMode(m)}><span aria-hidden>{ICON[m]}</span><span className={mini ? "lg:hidden" : ""}>{tr(loc, m)}</span></motion.button></Tip>)}
      </nav>
      <main className="min-w-0 flex-1">{status && !status.meta && <div role="status" className="glass mb-4 p-3"><b className="neon">Add Meta key in Settings</b> — live voice/vision answers use Meta; NVIDIA and the safety catalog still work. <button className="btn" onClick={() => setMode("settings")}>Settings</button></div>}<AnimatePresence mode="wait"><motion.div key={mode} initial={{ opacity: 0, y: 14, filter: "blur(4px)" }} animate={{ opacity: 1, y: 0, filter: "blur(0px)" }} exit={{ opacity: 0, y: -10, filter: "blur(4px)" }} transition={{ duration: .28, ease: [0.22, 1, 0.36, 1] }} className="flex flex-col gap-4">
        {mode === "overview" && <Overview go={setMode} />}
        {mode === "repair" && <><Machines /><Repair /></>}
        {mode === "tuning" && <Tuning />}{mode === "ask" && <AskAI />}{mode === "scada" && <Scada loggedIn={user.role !== "guest"} />}
        {mode === "safety" && <Safety />}{mode === "quality" && <Quality />}{mode === "voice" && <Voice go={(m: string) => setMode(m as Mode)} />}{mode === "eng" && <div className="grid gap-4 lg:grid-cols-2"><div className="lg:col-span-2 row" style={{ justifyContent: "flex-end" }}><RegionSelect /></div><EngineeringNL /><div className="lg:col-span-2"><Engineering /></div></div>}{mode === "projects" && <Projects />}{mode === "settings" && <Settings />}
      </motion.div></AnimatePresence></main>
    </div><VoiceDock /><ScrollFabs /></div></TipProvider>;
}
const BENEFITS: [string, string, string][] = [
  ["Downtime", "$10k–$250k / hour", "Typical cost of unplanned downtime in process plants (industry surveys). FixLine targets 1–3 h faster first-time fixes per event."],
  ["Callouts", "20–40% fewer", "Guided how-to steps let junior staff fix routine faults instead of flying in a consultant ($1.5k–$5k per visit incl. travel)."],
  ["Early detection", "Hours earlier", "Rate-of-change and drift alarms catch a stuck valve before trip, flaring or lost product ($5k–$50k per event)."],
  ["Translation", "$300–$800 / day saved", "Typical on-site interpreter day rate avoided for mixed-language crews."],
  ["Scrap & rework", "5–15% less", "Cable and pipe sizing from cited IEC / ASME tables avoids wrong orders and rework."],
  ["Safety", "Fewer incidents & fines", "LOTO-first, cited checklists. OSHA serious-violation penalties exceed $16k each (2025)."],
];
function Benefits() {
  return <section className="glass card" aria-labelledby="benefits-h"><h3 id="benefits-h" className="neon m-0 text-lg">What FixLine can save</h3>
    <p className="m-0 text-xs muted">Illustrative estimates from typical industry ranges, not guarantees. Your savings depend on your plant.</p>
    <div className="grid-auto" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 220px), 1fr))" }}>{BENEFITS.map(([k, v, d]) => <div key={k} className="rounded-3xl p-4" style={{ border: "1px solid color-mix(in oklab, #39FF14 30%, transparent)" }}><div className="text-xs muted">{k}</div><div className="neon text-xl font-extrabold">{v}</div><p className="m-0 text-xs muted">{d}</p></div>)}</div></section>;
}
function Overview({ go }: { go: (m: Mode) => void }) {
  const [t, setT] = useState(0); useEffect(() => { const id = setInterval(() => setT((x) => x + 1), 1200); return () => clearInterval(id); }, []);
  return <><section className="glass relative overflow-hidden"><Particles /><div className="relative grid items-center gap-6 p-6 md:grid-cols-2 md:p-8">
    <div className="flex flex-col gap-4"><span className="pill" style={{ alignSelf: "flex-start" }}>Meta Global AI Hackathon 2026 · Push the Frontier</span><h1 className="m-0 text-3xl font-extrabold md:text-4xl">A hands-free AI repair, safety, quality &amp; project management agent <span className="neon">for plant workers.</span></h1>
      <p className="muted m-0">FixLine runs a <b className="neon">perceive → reason → confirm → enforce</b> loop on the factory floor: SAM 3.1 segments the part, Muse Spark 1.3 plans the fix, SAM re-checks each step on camera before it counts, and LOTO, quality and project gates keep the job honest.</p>
      <p className="muted m-0 text-sm">Meta models: muse-spark-1.3 · sam-3.1 · muse-voice-transcribe · SeamlessM4T (open weights) · Ray-Ban Meta via Mock Device Kit. Live demo, no login needed.</p>
      <div className="row"><a className="btn btn-primary" href="/glasses" style={{ minHeight: 56, fontSize: "1.1rem", padding: "0 24px" }}>👓 Glasses HUD</a><Btn tip="Guided repair with SAM confirm-gate" onClick={() => go("repair")}>🔧 Repair</Btn><Btn tip="Hazards, LOTO, permits" onClick={() => go("safety")}>⛑ Safety LOTO</Btn><Btn tip="Autonomous visual inspector" onClick={() => go("quality")}>✔ Quality</Btn><Btn tip="Hands-free voice + translation" onClick={() => go("voice")}>🎙 Voice</Btn><a className="btn" href="/xr">Enter AR</a></div></div>
    <HeroArt /></div></section>
    <Insights />
    <Benefits />
    <div className="grid-auto">{[["Vibration", 2.4 + Math.sin(t) * 0.6, 12, "mm/s"], ["Separator P", 12 + Math.sin(t / 2), 20, "barg"], ["Tank level", 40 + Math.cos(t / 3) * 6, 100, "%"], ["Bearing temp", 58 + Math.sin(t / 4) * 4, 120, "°C"]].map(([l, v, m, u]) => <div key={l as string} className="glass card"><Gauge label={l as string} value={v as number} max={m as number} unit={u as string} /></div>)}</div>
    <div className="grid-auto">{TABS.slice(1).map(([m, l, tip]) => <button key={m} className="glass card btn" style={{ height: "auto", alignItems: "flex-start", flexDirection: "column", whiteSpace: "normal", textAlign: "left" }} onClick={() => go(m)}><b className="neon">{l}</b><span className="muted text-sm">{tip}</span></button>)}</div></>;
}
function useRun() { const [out, setOut] = useState<any>(null); const [err, setErr] = useState(""); const [busy, setBusy] = useState(false);
  const run = async (body: any) => { setBusy(true); setErr(""); try { const r = await callAi(body); setOut(r); return r; } catch (e: any) { setErr(e.message); } finally { setBusy(false); } };
  return { out, err, busy, run }; }
const Status = ({ busy, err }: { busy: boolean; err: string }) => <>{busy && <p className="m-0 muted" role="status">Working…</p>}{err && <p role="alert" className="m-0" style={{ color: "var(--danger)" }}>{err}</p>}</>;
function Repair() {
  const { out, err, busy, run } = useRun(); const video = useRef<HTMLVideoElement>(null); const [cam, setCam] = useState(false);
  const [part, setPart] = useState("conveyor drive bearing"); const [manual, setManual] = useState(""); const [shot, setShot] = useState<string>(); const [history, setHistory] = useState(""); const step = out?.current ?? -1;
  const [seen, setSeen] = useState(false); const [gate, setGate] = useState<{ ok: boolean; reason: string } | null>(null); const [hands, setHands] = useState(false);
  async function startCam() { try { const s = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "environment" } }); if (video.current) { video.current.srcObject = s; await video.current.play(); setCam(true); } } catch { alert("Camera unavailable"); } }
  const go = async (s: number) => { const image = snap(video.current) ?? shot; const r = await run({ mode: "repair", part, manual, history, step: s, image }); if (r) { setGate(null); setSeen(false); speak(`${r.instruction}. ${r.verify}`); const d = localStorage.getItem("fixline.device") || crypto.randomUUID(); localStorage.setItem("fixline.device", d); fetch(`/api/repair-sessions?device=${d}`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ id: "live", machine: part, fault: history.slice(0, 200), steps: r.steps, stepIndex: r.current }) }).catch(() => null); } return r; };
  async function recheck() { const image = snap(video.current) ?? shot; const r = await run({ mode: "repair", part, manual, history, step: Math.max(step, 0), image }); const g = gateAllowsNext({ hasFrame: !!image, confidence: Number(r?.segmentation?.confidence ?? 0), userConfirmsView: seen }); setGate(g); if (g.ok) speak("Step confirmed. Say next to continue."); }
  const mic = useListen((t) => { if (!/\b(next|done|verified|confirm)\b/i.test(t)) return; if (gate?.ok && step >= 0 && !out?.done) void go(step + 1); else if (step >= 0) void recheck(); }, () => {});
  return <div className="grid gap-4 lg:grid-cols-2">
    <Card title="Camera" sub="Part is segmented and tracked; re-check each step on camera.">
      <div className="relative overflow-hidden rounded-3xl" style={{ aspectRatio: "16/9", background: "#000" }}><video ref={video} playsInline muted className="h-full w-full object-cover" />
        {out?.segmentation && <div aria-hidden className="pointer-events-none absolute rounded-2xl" style={{ border: "2px solid #39FF14", boxShadow: "0 0 18px #39FF14", left: `${out.segmentation.mask.x * 100}%`, top: `${out.segmentation.mask.y * 100}%`, width: `${out.segmentation.mask.w * 100}%`, height: `${out.segmentation.mask.h * 100}%` }} />}</div>
      {!cam && <div className="row"><Btn tip="Allow camera access to segment the part" onClick={startCam}>📷 Live camera</Btn><CameraCapture label="Photo / video" onPhoto={async (f) => setShot(await fileToDataUrl(f))} onVideo={async (f) => setShot(await videoFrame(f))} />{shot && <img src={shot} alt="Captured part" className="h-16 rounded-2xl" />}</div>}
    </Card>
    <Card title="Guided repair" sub={out ? (out.mock ? "AI: MOCK" : "AI: live") : "Upload a manual and plan the job"}>
      <Field label="Part"><input value={part} onChange={(e) => setPart(e.target.value)} /></Field>
      <UploadZone title="Service manual or photo" hint="TXT, MD, PDF, DOCX, PNG or JPG · max 15 MB" accept={REPAIR_EXT.map((x) => `.${x}`).join(",")} exts={REPAIR_EXT} kind="manual" multiple={false} onFiles={async ([f]) => { if (/\.(txt|md)$/i.test(f.name)) return setManual((await f.text()).slice(0, 20000)); const fd = new FormData(); fd.append("files", f); fd.append("question", `Extract the repair procedure, torques and safety notes for the ${part}`); fd.append("lang", prefs().lang); const r = await fetch("/api/docs", { method: "POST", body: fd }); const j = await r.json().catch(() => ({})); setManual(String(j.error ? `(${j.error})` : [j.summary, ...(j.steps ?? [])].filter(Boolean).join("\n")).slice(0, 20000)); }} />
      {manual && <p className="m-0 text-xs neon">✓ Manual loaded ({manual.length.toLocaleString()} chars)</p>}
      <Field label="Repair history"><textarea rows={2} value={history} onChange={(e) => setHistory(e.target.value)} /></Field>
      <div className="row"><Btn tip="Segment the part and plan steps" className="btn-primary" onClick={() => go(0)}>Segment & plan</Btn>{step >= 0 && !out?.done && <Btn tip="Re-check this step on camera before it counts" onClick={recheck}>Re-check on camera</Btn>}{step >= 0 && !out?.done && <Btn tip="Next step unlocks only after the confirm gate" className="btn-primary" disabled={!gate?.ok} onClick={() => go(step + 1)}>Verified → next</Btn>}<Btn tip="Say next, done, or verified to advance without tapping" aria-pressed={hands} onClick={() => { const v = !hands; setHands(v); if (v) mic.start("en-US"); else mic.stop(); }}>{hands ? "Hands-free on" : "Hands-free"}</Btn></div>
      <label className="row text-sm"><input type="checkbox" checked={seen} onChange={(e) => setSeen(e.target.checked)} /> I can see the highlighted part and it matches this step</label>
      {gate && <p role="status" className="m-0 text-sm" style={{ color: gate.ok ? "var(--neon)" : "var(--warn, #f5b301)" }}>{gate.reason}</p>}
      <Status busy={busy} err={err} />
      {out?.steps && <><p className="m-0 text-sm">Machine: <b>{part}</b> · SAM {out.segmentation?.mock ? "mock box" : out.segmentation?.model} · confidence {Math.round((out.segmentation?.confidence ?? 0) * 100)}%</p><ol className="m-0 pl-5 flex flex-col gap-3">{out.steps.map((s: string, i: number) => { const [what, rest = ""] = String(s).split(/\s+[—–]\s+/); const bits = rest.split(/\s*(?=How:|Tools:|Done when:|Camera:)/).map((x: string) => x.trim()).filter(Boolean); const done = i < out.current || !!out.done; return <li key={i} className={i === out.current && !out.done ? "neon" : done ? "opacity-70" : ""}><b>{done ? "✓ " : `${i + 1}. `}{what}</b>{(i === out.current || done) && bits.length > 0 && <ul className="m-0 mt-1 pl-4 font-normal text-sm">{bits.map((b) => <li key={b}>{b}</li>)}</ul>}</li>; })}</ol></>}
      {out?.verify && <p className="m-0">📷 {out.verify}</p>}{out?.done && <p className="neon m-0">✓ Repair complete — every step passed the camera gate.</p>}
    </Card><div className="lg:col-span-2"><DocCopilot scope="repair" title="Repair copilot · manuals, photos & data" sub="Drop PDFs, DOCX, XLSX/CSV, TXT or photos — get insights, follow-up Q&A and memory of past jobs" defaultQ={`Plan the repair of the ${part}`} machine={prefs().machine || undefined} /></div></div>;
}
function Quality() {
  const { out, err, busy, run } = useRun(); const [t, setT] = useState({ temp: 72, vibration: 4.2, rpm: 1450 });
  return <div className="grid gap-4 lg:grid-cols-2"><Inspector /><Card title="Quality report" sub="Telemetry → supervisor shift report">
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">{(["temp", "vibration", "rpm"] as const).map((k) => <Field key={k} label={k}><input type="number" value={t[k]} onChange={(e) => setT({ ...t, [k]: Number(e.target.value) })} /></Field>)}</div>
    <div className="row"><Btn tip="Run defect check and generate report" className="btn-primary" onClick={() => run({ mode: "quality", telemetry: t })}>Inspect & report</Btn></div><Status busy={busy} err={err} />
    {out?.report && <><p className="m-0 font-bold" style={{ color: out.status === "FAIL" ? "var(--danger)" : "var(--neon)" }}>{out.status}</p><pre className="m-0 whitespace-pre-wrap rounded-3xl p-4 text-sm" style={{ background: "var(--bg2)" }}>{out.report}</pre></>}
  </Card></div>;
}
function Safety() {
  const { out, err, busy, run } = useRun(); const [ctx, setCtx] = useState<"industrial" | "home">("industrial"); useEffect(() => { if (prefs().homeMode) setCtx("home"); }, []);
  return <div className="grid gap-4 lg:grid-cols-2">
    <div className="lg:col-span-2 row" style={{ justifyContent: "space-between" }}><b className="neon">⛑ Safety</b><RegionSelect /></div>
    <div id="safety-docs" data-tour="safety-docs" className="lg:col-span-2 grid gap-4 lg:grid-cols-2"><SafetyDocs /></div>
    <Card title="Safety" sub="Pick a hazard or ask a question. Answers cite published standards.">
      <p className="m-0 rounded-3xl p-4 text-sm font-bold" style={{ background: "color-mix(in oklab, var(--danger) 18%, transparent)" }}>{EMERGENCY}</p>
      <div className="row">{(["industrial", "home"] as const).map((c) => <Btn key={c} tip={`Show ${c} hazards`} aria-pressed={ctx === c} onClick={() => setCtx(c)}>{c}</Btn>)}</div>
      <form className="flex gap-2" onSubmit={(e) => { e.preventDefault(); run({ mode: "ask", question: String(new FormData(e.currentTarget).get("q")) }); }}><input name="q" aria-label="Ask a safety question" placeholder="Ask a safety question" /><button className="btn btn-primary">Ask</button></form>
      <div className="grid-auto" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 160px), 1fr))" }}>{HAZARDS.filter((h) => h.context.includes(ctx)).map((h) => <Tip key={h.id} label={h.detect}><button className={`btn ${h.emergency ? "btn-danger" : ""}`} style={{ whiteSpace: "normal", height: "auto", padding: "8px 12px" }} onClick={() => run({ mode: "safety", hazard: h.id, context: ctx })}>{h.title}</button></Tip>)}</div>
    </Card>
    <Card title="Guidance" right={out?.model ? <ModelBadge model={out.mock ? "offline" : out.model} /> : undefined}><Status busy={busy} err={err} />{out ? <Result out={out} /> : <p className="m-0 muted">Select a hazard.</p>}<p className="m-0 text-xs muted">{DISCLAIMER}</p></Card>
    <EmergencyCard /><Card title="Home safety mode" sub="Default the hazard list to household risks"><HomeToggle on={ctx === "home"} set={(v) => setCtx(v ? "home" : "industrial")} /></Card>
    <FireGuidance />
    </div>;
}
function Cpr() {
  const [on, setOn] = useState(false); const [n, setN] = useState(0);
  useEffect(() => { if (!on) return; const ctx = new AudioContext(); const id = setInterval(() => { const o = ctx.createOscillator(); o.connect(ctx.destination); o.start(); o.stop(ctx.currentTime + 0.05); setN((x) => (x % 30) + 1); }, 545); return () => { clearInterval(id); ctx.close(); }; }, [on]);
  return <div className="row"><Btn tip="Audible 110/min compression pacing" className="btn-danger" onClick={() => setOn(!on)}>{on ? "Stop" : "Start"} 110/min metronome</Btn>{on && <motion.span key={n} initial={{ scale: 1.6 }} animate={{ scale: 1 }} className="neon text-3xl font-bold">{n}</motion.span>}</div>;
}
function HazardSteps({ steps }: { steps: string[] }) {
  const [i, setI] = useState(0); useEffect(() => setI(0), [steps]);
  return <><ol className="m-0 pl-5 flex flex-col gap-1">{steps.map((s, k) => <li key={s} data-testid={k === i ? "current-step" : undefined} style={{ opacity: k < i ? .55 : 1, fontWeight: k === i ? 700 : 400, color: k === i ? "var(--neon, #39FF14)" : undefined }}>{k < i ? "✓ " : ""}{s}</li>)}</ol>
    <div className="row"><Btn tip="Read this step aloud" onClick={() => speak(`Step ${i + 1}. ${steps[i]}`)}>🔊 Read step</Btn><Btn tip="Mark this step done and move to the next" className="btn-primary" onClick={() => { const n = Math.min(i + 1, steps.length - 1); setI(n); speak(`Step ${n + 1}. ${steps[n]}`); }} disabled={i >= steps.length - 1}>{i >= steps.length - 1 ? "All steps done" : `Step ${i + 1} done → next`}</Btn></div></>;
}
function Result({ out }: { out: any }) {
  if (out.answer) return <div className="flex flex-col gap-2 text-sm"><p className="m-0 whitespace-pre-wrap" data-testid="answer">{out.answer}</p><p className="m-0 text-xs muted">{out.refused ? "Refused: outside cited references." : `Sources: ${out.citations.flatMap((c: any) => c.sources).join("; ")}`} · {out.disclaimer}</p></div>;
  const h = out.hazard; if (!h) return null;
  return <div className="flex flex-col gap-2 text-sm">
    {out.emergency && <p className="m-0 rounded-3xl p-4 font-bold" style={{ background: "color-mix(in oklab, var(--danger) 25%, transparent)" }}>{out.emergency}</p>}
    <h3 className="neon m-0 text-lg">{h.title}</h3><HazardSteps steps={h.steps} />
    {h.never && <p className="m-0" style={{ color: "var(--danger)" }}>⛔ {h.never.join(" ")}</p>}{h.id === "firstaid-cpr" && <Cpr />}
    {out.fireClasses && <div style={{ overflowX: "auto" }}><table className="text-xs"><thead><tr><th>Class</th><th>Fuel</th><th>Use</th><th>Never</th></tr></thead><tbody>{FIRE_CLASSES.map((f) => <tr key={f.cls}><td>{f.cls}</td><td>{f.fuel}</td><td>{f.use}</td><td style={{ color: "var(--danger)" }}>{f.never}</td></tr>)}</tbody></table></div>}
    {out.evacuate && <p className="m-0 font-semibold">🚪 Evacuate to the assembly point if not controlled.</p>}{out.supervisorAlert && <p className="m-0">📣 Supervisor alert logged.</p>}
    <p className="m-0 muted">Sources: {h.sources.join("; ")}</p><p className="m-0 text-xs muted">{out.disclaimer}</p></div>;
}
