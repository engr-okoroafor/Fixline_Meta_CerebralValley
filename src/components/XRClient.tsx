"use client";
import { Loader } from "./next/Loader";
import dynamic from "next/dynamic";
import { useEffect, useState, useCallback } from "react";
import { SCENARIOS, loadProgress, saveProgress } from "@/lib/xr-logic";
import { EMERGENCY, DISCLAIMER } from "@/lib/hazards";
import Hud from "./Hud";
// Heavy three.js/XR bundle is lazy-loaded so the checklist is usable in < 30 s cold start.
const XRScene = dynamic(() => import("./XRScene"), { ssr: false, loading: () => <Loader label="Loading 3D scene" /> });
export default function XRClient() {
  const [scenario, setScenario] = useState("gen-co"); const [step, setStep] = useState(0); const [paused, setPaused] = useState(false);
  const [contrast, setContrast] = useState(false); const [spoken, setSpoken] = useState(true); const [load3d, setLoad3d] = useState(false);
  const say = useCallback((t: string) => { if (spoken && t && "speechSynthesis" in window) { speechSynthesis.cancel(); speechSynthesis.speak(new SpeechSynthesisUtterance(t)); } }, [spoken]);
  useEffect(() => { const p = loadProgress(localStorage); if (p) { setScenario(p.scenario); setStep(p.step); setPaused(p.paused); } }, []);
  useEffect(() => { saveProgress(localStorage, { scenario, step, paused }); }, [scenario, step, paused]);
  useEffect(() => { const f = () => { if (document.hidden) setPaused(true); }; document.addEventListener("visibilitychange", f); return () => document.removeEventListener("visibilitychange", f); }, []);
  useEffect(() => { const t = setTimeout(() => setLoad3d(true), 300); return () => clearTimeout(t); }, []);
  async function enter() { const { xrStore } = await import("./XRScene"); setLoad3d(true); await xrStore.enterAR().catch(() => alert("Immersive AR not available on this device. Use the checklist below.")); }
  const sc = SCENARIOS.find((s) => s.id === scenario)!; const done = step >= sc.steps.length;
  return <main className={`mx-auto flex min-h-screen max-w-[1440px] flex-col gap-4 p-4 md:p-6 ${contrast ? "bg-black text-yellow-300" : ""}`}>
    <header className="topbar"><div className="row" style={{ gap: 8 }}><button className="btn btn-sm" data-testid="xr-back" onClick={() => (history.length > 1 ? history.back() : (location.href = "/"))} aria-label="Back to previous page">← Back</button><b className="neon">FixLine XR</b><span className="text-xs muted">Mixed reality · hands-free</span></div>
      <nav className="row" style={{ gap: 6 }} aria-label="XR options"><a className="btn btn-sm" href="/">▦ 2D dashboard</a>
        <button className="btn btn-sm" aria-pressed={contrast} onClick={() => setContrast(!contrast)}>◐ High contrast {contrast ? "ON" : "OFF"}</button>
        <button className="btn btn-sm" aria-pressed={spoken} onClick={() => setSpoken(!spoken)}>🔊 Spoken alerts {spoken ? "ON" : "OFF"}</button></nav></header>
    <section className="glass card" aria-label="AR heads-up display"><h2 className="m-0 text-lg font-bold">🥽 AR HUD <span className="text-xs muted font-normal">· edge-anchored panels, clear optical centre, high contrast</span></h2><Hud ar /></section>
    <div className="grid gap-4 lg:grid-cols-3">
    <section className="glass card lg:col-span-2" aria-live="polite" aria-labelledby="xr-enter-h">
      <h2 id="xr-enter-h" className="m-0 text-xl font-extrabold">1 · Enter AR</h2>
      <p className="m-0 text-sm muted">Passthrough + hand tracking on Quest 3 / Vision Pro / Android Chrome. Panels anchor to surfaces; if no planes are found they follow your head.</p>
      <button className="btn btn-primary" onClick={enter} style={{ minHeight: 64, fontSize: "1.3rem" }} title="Start immersive AR with passthrough and hand tracking">🥽 Enter AR</button>
      <div role="alert" className="rounded-2xl p-3 text-sm font-semibold" style={{ background: "color-mix(in oklab, var(--danger) 20%, transparent)", border: "1px solid var(--danger)" }}>🚨 EMERGENCY: {EMERGENCY} <span className="muted font-normal">FixLine is guidance, not an emergency service.</span></div>
      <h2 className="m-0 text-lg font-bold">2 · Choose a guided flow</h2>
      <div className="grid gap-2 md:grid-cols-3">{SCENARIOS.map((s) => <button key={s.id} aria-pressed={s.id === scenario} className="btn text-sm" style={{ justifyContent: "flex-start", borderColor: s.id === scenario ? "#39FF14" : undefined, boxShadow: s.id === scenario ? "0 0 14px rgba(57,255,20,.4)" : undefined }} onClick={() => { setScenario(s.id); setStep(0); }}>{/loto|lock/i.test(s.id + s.title) ? "🔒" : /co|gas/i.test(s.id) ? "☁" : "🛠"} {s.title}</button>)}</div>
      <h2 className="m-0 text-lg font-bold">3 · Follow the steps</h2>
      {paused ? <button className="btn w-full" onClick={() => setPaused(false)}>Paused at step {step + 1}. Resume</button>
        : <div data-testid="checklist" className="flex flex-col gap-2"><h3 className="neon m-0 text-lg font-bold">{sc.title}</h3>
          <ol className="m-0 flex flex-col gap-1 pl-5 text-sm">{sc.steps.map((x, k) => <li key={k} style={{ opacity: k < step ? .5 : 1, fontWeight: k === step ? 800 : 400, color: k === step ? "#39FF14" : undefined }}>{k < step ? "✓ " : ""}{x.text}</li>)}</ol>
          {done ? <p className="neon m-0">Checklist complete ✓</p> : <p className="m-0 text-lg">Step {step + 1}/{sc.steps.length}: {sc.steps[step].text}</p>}
          <div className="row"><button className="btn" disabled={step === 0} onClick={() => setStep(Math.max(0, step - 1))}>← Previous</button><button className="btn btn-primary" onClick={() => { const n = done ? 0 : step + 1; setStep(n); say(n < sc.steps.length ? sc.steps[n].text : "Checklist complete."); }}>{done ? "Restart" : "Done ✓ Next"}</button></div></div>}
      <p className="m-0 text-xs muted">{DISCLAIMER}</p>
    </section>
    <section className="glass card" aria-label="How to test with Immersive Web Emulator">
      <h2 className="m-0 text-lg font-bold">Test without a headset</h2>
      <ol className="m-0 flex flex-col gap-2 pl-5 text-sm">
        <li>Install the free <b>Immersive Web Emulator</b> extension in a desktop Chromium browser.</li>
        <li>Open DevTools → <b>WebXR</b> tab and choose a Quest 3 device profile.</li>
        <li>Switch input to <b>hands</b>; use the pinch pose to select panels.</li>
        <li>Enable <b>room / plane</b> simulation to test surface anchoring; disable it to see the head-locked fallback.</li>
        <li>Press <b>Enter AR</b>. Hide the tab to test pause/resume; your step is saved.</li>
        <li>On a headset: open this URL in the headset browser and press Enter AR.</li>
      </ol>
    </section></div>
    <div className="glass min-h-[50vh] flex-1 overflow-hidden">{load3d && <XRScene {...{ scenario, step, setStep, setScenario, paused, setPaused, contrast, say }} />}</div>
  </main>;
}
