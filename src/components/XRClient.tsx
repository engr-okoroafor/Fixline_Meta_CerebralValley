"use client";
import { Loader } from "./next/Loader";
import dynamic from "next/dynamic";
import { useEffect, useState, useCallback } from "react";
import { SCENARIOS, loadProgress, saveProgress, startFlow, requestCheckpoint, resolveCheckpoint, voiceIntent, type Progress } from "@/lib/xr-logic";
import { EMERGENCY, DISCLAIMER } from "@/lib/hazards";
import { SHAFT_SAMPLE, inTolerance, shaftReport } from "@/lib/shaft-job";
import { corrections, tolFor } from "@/lib/alignment";
import Hud from "./Hud";
// three.js stays out of the first paint. Quest loads it only after Enter AR or Preview 3D.
const XRScene = dynamic(() => import("./XRScene"), { ssr: false, loading: () => <Loader label="Loading 3D scene" /> });

function listenOnce(onText: (t: string) => void) {
  const w = window as unknown as { SpeechRecognition?: new () => { lang: string; start: () => void; onresult: ((e: { results: { isFinal: boolean; 0: { transcript: string } }[] }) => void) | null }; webkitSpeechRecognition?: new () => { lang: string; start: () => void; onresult: ((e: { results: { isFinal: boolean; 0: { transcript: string } }[] }) => void) | null } };
  const SR = w.SpeechRecognition || w.webkitSpeechRecognition;
  if (!SR) return false;
  const r = new SR();
  r.lang = "en-US";
  r.onresult = (e) => { const res = e.results[e.results.length - 1]; if (res?.isFinal) onText(res[0].transcript); };
  try { r.start(); return true; } catch { return false; }
}

export default function XRClient() {
  const [flow, setFlow] = useState<Progress>(() => startFlow("shaft-align"));
  const [contrast, setContrast] = useState(false);
  const [spoken, setSpoken] = useState(true);
  const [load3d, setLoad3d] = useState(false);
  const [voiceNote, setVoiceNote] = useState("");
  const say = useCallback((t: string) => { if (spoken && t && "speechSynthesis" in window) { speechSynthesis.cancel(); speechSynthesis.speak(new SpeechSynthesisUtterance(t)); } }, [spoken]);
  useEffect(() => {
    const q = new URLSearchParams(location.search);
    if (q.get("job") === "shaft" || location.hash === "#shaft") { setFlow(startFlow("shaft-align")); return; }
    const p = loadProgress(localStorage);
    if (p) setFlow(p);
  }, []);
  useEffect(() => { saveProgress(localStorage, flow); }, [flow]);
  useEffect(() => { const f = () => { if (document.hidden) setFlow((p) => ({ ...p, paused: true })); }; document.addEventListener("visibilitychange", f); return () => document.removeEventListener("visibilitychange", f); }, []);
  const sc = SCENARIOS.find((s) => s.id === flow.scenario) ?? SCENARIOS[0];
  const done = flow.step >= sc.steps.length;
  const shaft = flow.scenario === "shaft-align";
  const tol = tolFor(SHAFT_SAMPLE.rpm);
  const move = corrections(SHAFT_SAMPLE.before, SHAFT_SAMPLE.cToF, SHAFT_SAMPLE.fToR);
  const detailLines = shaft ? [`V offset ${SHAFT_SAMPLE.before.vOff} mm as found`, `tol ±${tol.off} mm`] : [];

  function ask() { setFlow((p) => requestCheckpoint(p)); say("Approve or reject this step."); }
  function approve() {
    if (flow.phase !== "checkpoint") { say("Say done first. Then say approve."); return; }
    const n = resolveCheckpoint(flow, "approved", new Date().toISOString());
    const scn = SCENARIOS.find((s) => s.id === n.scenario)!;
    say(n.step >= scn.steps.length ? "Checklist complete." : scn.steps[n.step].text);
    setFlow(n);
  }
  function reject() {
    if (flow.phase !== "checkpoint") { say("Nothing is waiting for a decision."); return; }
    say("Rejected. The step stays open.");
    setFlow(resolveCheckpoint(flow, "rejected", new Date().toISOString()));
  }
  function restart() { setFlow((p) => startFlow(p.scenario)); say(sc.steps[0]?.text ?? ""); }
  function onVoice(t: string) {
    const intent = voiceIntent(t);
    if (intent === "read") say(done ? "Checklist complete." : sc.steps[flow.step].text);
    else if (intent === "report") say(shaft && done ? "The report is ready below." : "Finish every approved step, then ask for the report.");
    else if (intent === "checkpoint") ask();
    else if (intent === "approve") { if (flow.phase === "checkpoint") approve(); else say("Say done first. Then say approve."); }
    else if (intent === "reject") { if (flow.phase === "checkpoint") reject(); else say("Nothing is waiting for a decision."); }
    else setVoiceNote(`Heard “${t}”. Say done, then approve or reject.`);
  }

  async function download(kind: "md" | "pdf") {
    const md = shaftReport({ attempts: flow.attempts, completedAt: new Date().toISOString() });
    if (kind === "md") {
      const a = document.createElement("a"); a.href = URL.createObjectURL(new Blob([md], { type: "text/markdown" })); a.download = "fixline-p101-alignment.md"; a.click(); return;
    }
    const { jsPDF } = await import("jspdf");
    const pdf = new jsPDF({ unit: "pt", format: "a4" });
    pdf.setFontSize(11);
    let y = 48;
    for (const line of pdf.splitTextToSize(md, 520)) { if (y > 780) { pdf.addPage(); y = 48; } pdf.text(line, 40, y); y += 14; }
    pdf.save("fixline-p101-alignment.pdf");
  }

  async function enter() { const { xrStore } = await import("./XRScene"); setLoad3d(true); await xrStore.enterAR().catch(() => alert("Immersive AR is not available in this browser. Use the checklist, pinch targets appear after Enter AR on a Quest.")); }
  return <main className={`mx-auto flex min-h-screen max-w-[1440px] flex-col gap-4 p-4 md:p-6 ${contrast ? "bg-black text-yellow-300" : ""}`}>
    <header className="topbar"><div className="row" style={{ gap: 8 }}><button className="btn btn-sm" data-testid="xr-back" onClick={() => (history.length > 1 ? history.back() : (location.href = "/"))} aria-label="Back to previous page">← Back</button><b className="neon">FixLine XR</b><span className="text-xs muted">Hands first · pinch and voice</span></div>
      <nav className="row" style={{ gap: 6 }} aria-label="XR options"><a className="btn btn-sm" href="/">▦ 2D dashboard</a><a className="btn btn-sm" href="/benchmark">Benchmark</a>
        <button className="btn btn-sm" aria-pressed={contrast} onClick={() => setContrast(!contrast)}>◐ High contrast {contrast ? "ON" : "OFF"}</button>
        <button className="btn btn-sm" aria-pressed={spoken} onClick={() => setSpoken(!spoken)}>🔊 Spoken alerts {spoken ? "ON" : "OFF"}</button></nav></header>
    <section className="glass card" aria-label="AR heads-up display"><h2 className="m-0 text-lg font-bold">AR HUD <span className="text-xs muted font-normal">· panels sit on a detected surface when passthrough finds one</span></h2><Hud ar /></section>
    <div className="grid gap-4 lg:grid-cols-3">
    <section className="glass card lg:col-span-2" aria-live="polite">
      <h2 className="m-0 text-xl font-extrabold">1 · Enter AR</h2>
      <p className="m-0 text-sm muted">Quest browser: passthrough, hand tracking, pinch. The step card anchors to a table when a plane is found, and stays in front of you when it is not. The 3D scene loads only after you ask for it.</p>
      <div className="row">
        <button className="btn btn-primary" onClick={enter} style={{ minHeight: 64, fontSize: "1.2rem" }}>Enter AR</button>
        <button className="btn" onClick={() => setLoad3d(true)}>Preview 3D</button>
        <button className="btn" onClick={() => { const ok = listenOnce(onVoice); setVoiceNote(ok ? "Listening… say done, then approve or reject." : "This browser has no speech recognition. Use the buttons."); }}>Voice</button>
      </div>
      {voiceNote && <p role="status" className="m-0 text-sm neon">{voiceNote}</p>}
      <div role="alert" className="rounded-2xl p-3 text-sm font-semibold" style={{ background: "color-mix(in oklab, var(--danger) 20%, transparent)", border: "1px solid var(--danger)" }}>EMERGENCY: {EMERGENCY} <span className="muted font-normal">FixLine is guidance, not an emergency service.</span></div>
      <h2 className="m-0 text-lg font-bold">2 · Choose a guided flow</h2>
      <div className="grid gap-2 md:grid-cols-3">{SCENARIOS.map((s) => <button key={s.id} aria-pressed={s.id === flow.scenario} className="btn text-sm" style={{ justifyContent: "flex-start", borderColor: s.id === flow.scenario ? "#39FF14" : undefined }} onClick={() => setFlow(startFlow(s.id))}>{s.title}</button>)}</div>
      <h2 className="m-0 text-lg font-bold">3 · Follow the steps</h2>
      {flow.paused ? <button className="btn w-full" onClick={() => setFlow((p) => ({ ...p, paused: false }))}>Paused at step {Math.min(flow.step + 1, sc.steps.length)}. Resume</button>
        : <div data-testid="checklist" className="flex flex-col gap-2">
          <h3 className="neon m-0 text-lg font-bold">{sc.title}</h3>
          {shaft && <p className="m-0 text-sm">{SHAFT_SAMPLE.notice} As found V offset <b>{SHAFT_SAMPLE.before.vOff} mm</b> ({inTolerance(SHAFT_SAMPLE.before, SHAFT_SAMPLE.rpm) ? "in" : "outside"} ±{tol.off} mm). As left <b>{SHAFT_SAMPLE.after.vOff} mm</b> ({inTolerance(SHAFT_SAMPLE.after, SHAFT_SAMPLE.rpm) ? "inside" : "outside"}). Shim front {move.vFront} mm, rear {move.vRear} mm.</p>}
          <ol className="m-0 flex flex-col gap-1 pl-5 text-sm">{sc.steps.map((x, k) => <li key={k} style={{ opacity: k < flow.step ? .5 : 1, fontWeight: k === flow.step ? 800 : 400, color: k === flow.step ? "#39FF14" : undefined }}>{k < flow.step ? "✓ " : ""}{x.text}</li>)}</ol>
          {done ? <p className="neon m-0">Checklist complete ✓</p> : <p className="m-0 text-lg">Step {flow.step + 1}/{sc.steps.length}: {sc.steps[flow.step].text}</p>}
          {flow.phase === "checkpoint" && !done && <p className="m-0 font-bold" role="status">Checkpoint: mark step {flow.step + 1} done? A person has to approve. Reject leaves it open.</p>}
          <div className="row">
            {!done && flow.phase === "doing" && <button className="btn btn-primary" data-testid="step-ask" onClick={ask}>Done — ask approval</button>}
            {flow.phase === "checkpoint" && !done && <>
              <button className="btn btn-primary" data-testid="step-approve" onClick={approve}>Approve</button>
              <button className="btn btn-danger" data-testid="step-reject" onClick={reject}>Reject</button>
            </>}
            {(done || flow.step > 0) && <button className="btn" data-testid="step-restart" onClick={restart}>Restart</button>}
          </div>
          {shaft && done && <div className="row"><button className="btn btn-primary" onClick={() => download("pdf")}>Download PDF report</button><button className="btn" onClick={() => download("md")}>Download Markdown</button></div>}
          {flow.attempts.length > 0 && <ul className="m-0 pl-5 text-xs muted">{flow.attempts.slice(-6).map((a, i) => <li key={i}>Step {a.step + 1} {a.decision} at {a.at}</li>)}</ul>}
        </div>}
      <p className="m-0 text-xs muted">{DISCLAIMER}</p>
    </section>
    <section className="glass card" aria-label="How to test with Immersive Web Emulator">
      <h2 className="m-0 text-lg font-bold">Test without a headset</h2>
      <ol className="m-0 flex flex-col gap-2 pl-5 text-sm">
        <li>Install the free <b>Immersive Web Emulator</b> in desktop Chromium.</li>
        <li>DevTools → <b>WebXR</b>, pick a Quest 3 profile, switch input to <b>hands</b>.</li>
        <li>Pinch <b>Done — ask</b>, then pinch <b>Approve</b> or <b>Reject</b>. A step is not done on the first pinch.</li>
        <li>Say “done”, then “approve”. “Done” on its own does not advance.</li>
        <li>Enable room simulation to anchor the card. Turn it off to see the head-locked fallback.</li>
        <li>On a Quest, open this page in the headset browser and press Enter AR.</li>
      </ol>
    </section></div>
    <div className="glass min-h-[30vh] flex-1 overflow-hidden">{load3d ? <XRScene scenario={flow.scenario} step={flow.step} phase={flow.phase} detailLines={detailLines} paused={flow.paused} contrast={contrast} say={say} onAsk={ask} onApprove={approve} onReject={reject} onRestart={restart} onScenario={(id) => setFlow(startFlow(id))} setPaused={(paused) => setFlow((p) => ({ ...p, paused }))} /> : <p className="m-0 p-4 text-sm muted">3D is not loaded. The checklist above is the whole flow. Preview 3D or Enter AR when you want the passthrough scene.</p>}</div>
  </main>;
}
