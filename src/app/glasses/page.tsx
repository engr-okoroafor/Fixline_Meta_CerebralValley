"use client";
import Banner, { Empty } from "@/components/Banner";
import { useRef, useState } from "react"; import Camera, { CamHandle } from "@/components/Camera"; import type { Box } from "@/lib/ai"; import { speak, useJob } from "@/lib/store"; import { LANGS } from "@/lib/demo"; import Link from "next/link";
type Seg = { speaker: string; text: string; lang: string };
export default function Glasses() {
  const cam = useRef<CamHandle>(null); const { job, update } = useJob();
  const [boxes, setBoxes] = useState<Box[]>([]); const [q, setQ] = useState("What's wrong with this pump?"); const [ans, setAns] = useState(""); const [eng, setEng] = useState(""); const [busy, setBusy] = useState(false);
  const [segs, setSegs] = useState<Seg[]>([]); const [sup, setSup] = useState<string[]>([]);
  async function ask() {
    setBusy(true);
    const v = await fetch("/api/vision", { method: "POST", body: JSON.stringify({ image: cam.current?.snap(), prompt: "mechanical seal" }) }).then((r) => r.json()); setBoxes(v.boxes);
    const c = await fetch("/api/chat", { method: "POST", body: JSON.stringify({ question: q, part: v.boxes[0]?.label, lang: job.lang }) }).then((r) => r.json());
    setAns(c.text); setEng(`${v.engine} → ${c.engine}`); speak(c.text, job.lang); setBusy(false);
  }
  function listen() {
    const SR = (window as unknown as { webkitSpeechRecognition?: new () => { lang: string; onresult: (e: { results: { 0: { transcript: string } }[] }) => void; start: () => void } }).webkitSpeechRecognition;
    if (!SR) { transcribe(""); return; } const r = new SR(); r.lang = "en-NG"; r.onresult = (e) => { const t = e.results[0][0].transcript; setQ(t); transcribe(t); }; r.start();
  }
  async function transcribe(text: string) {
    const v = await fetch("/api/voice", { method: "POST", body: JSON.stringify({ text }) }).then((r) => r.json()); setSegs(v.segments);
    const tr = await Promise.all(v.segments.map((s: Seg) => fetch("/api/translate", { method: "POST", body: JSON.stringify({ text: s.text, to: "en" }) }).then((r) => r.json()))); setSup(tr.map((t) => t.text));
  }
  return <div className="flex flex-col gap-4"><Banner tag="Step 1 · Diagnose" title="Glasses HUD" sub="Point the camera at the machine and ask. SAM 3.1 finds the part, Muse Spark 1.3 explains what is wrong — out loud, in your language." /><div className="grid g2">
    <div><Camera ref={cam} boxes={boxes} hud={ans ? <><b style={{ color: "var(--cyan)" }}>FixLine:</b> {ans.slice(0, 260)}</> : <span className="mute">Look at the machine and ask. Tracking: {boxes[0]?.label ?? "—"}</span>} />
      <div className="row" style={{ marginTop: 14, flexWrap: "nowrap" }}><input value={q} onChange={(e) => setQ(e.target.value)} /><button className="btn btn-primary" onClick={ask} disabled={busy}>{busy ? "Analysing…" : "Ask FixLine"}</button><button className="btn" onClick={listen} title="Speak your question">🎙 Speak</button></div>
      <p className="mute" style={{ fontSize: 12 }}>Pipeline: {eng || "idle"} · Language: <select style={{ width: "auto" }} value={job.lang} onChange={(e) => update((j) => ({ ...j, lang: e.target.value }))}>{LANGS.map((l) => <option key={l.code} value={l.code}>{l.name}</option>)}</select></p>
    </div>
    <div className="grid">
      <div className="glass card"><h2>Diagnosis</h2>{ans ? <><p style={{ lineHeight: 1.55 }}>{ans}</p><Link className="btn btn-primary" href="/repair">Start camera-gated repair →</Link></> : <Empty e="🎯" t="No diagnosis yet" d="Type or speak a question, then press Ask FixLine." />}</div>
      <div className="glass card"><h2>Multilingual crew voice</h2><p className="mute" style={{ fontSize: 14, marginTop: 0 }}>Muse Voice Transcribe splits speakers and code-switching; supervisor sees English.</p><button className="btn" onClick={() => transcribe("")}>Run code-switch demo</button>
        {segs.map((s, i) => <div key={i} className="chk" style={{ display: "block" }}><span className="pill">{s.speaker}</span> <span className="pill">{s.lang}</span><div>{s.text}</div>{sup[i] && <div className="ok" style={{ fontSize: 13 }}>Supervisor (EN): {sup[i]}</div>}</div>)}</div>
    </div>
  </div></div>;
}
