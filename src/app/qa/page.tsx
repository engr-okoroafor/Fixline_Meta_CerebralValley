"use client";
import Banner, { Empty } from "@/components/Banner";
import { useRef, useState } from "react"; import Camera, { CamHandle } from "@/components/Camera"; import type { Box } from "@/lib/ai"; import { TELEMETRY } from "@/lib/demo";
export default function QA() {
  const cam = useRef<CamHandle>(null); const [boxes, setBoxes] = useState<Box[]>([]); const [all, setAll] = useState<Box[]>([]); const [rep, setRep] = useState("");
  async function scan() { const v = await fetch("/api/vision", { method: "POST", body: JSON.stringify({ image: cam.current?.snap(), prompt: "surface defects: scratch, dent, misprint", mode: "qa" }) }).then((r) => r.json()); setBoxes(v.boxes); setAll((a) => [...a, ...v.boxes]); }
  async function report() { const r = await fetch("/api/report", { method: "POST", body: JSON.stringify({ defects: all }) }).then((r) => r.json()); setRep(r.text); }
  const max = Math.max(...TELEMETRY.map((t) => t.vib));
  return <main className="wrap"><Banner img="/img/line.jpg" tag="Line QA" title="Production-line quality" sub="Scan the line with SAM 3.1 to flag defects, then let Muse Spark 1.3 correlate with telemetry and write the shift report." /><div className="grid g2">
    <div><Camera ref={cam} boxes={boxes} scene="line" hud={<>Defects this shift: <b className="warn">{all.length}</b></>} />
      <div className="row" style={{ marginTop: 14 }}><button className="btn lg" onClick={scan}>🔍 Scan line (SAM 3.1)</button><button className="btn ghost" onClick={report}>Write shift report (Muse Spark)</button><button className="btn ghost" onClick={() => rep && navigator.clipboard.writeText(rep)}>Copy</button></div></div>
    <div className="grid">
      <div className="card"><h2>Telemetry — P-101 vibration vs defects</h2><svg viewBox="0 0 480 140" width="100%">{TELEMETRY.map((t, i) => <g key={i}><rect x={i * 20} y={140 - (t.vib / max) * 120} width="12" height={(t.vib / max) * 120} rx="3" fill={t.vib > 7 ? "#ff5c6c" : "#0081FB"} opacity=".7" />{t.defects > 0 && <circle cx={i * 20 + 6} cy={10} r={2 + t.defects} fill="#ffb547" />}</g>)}</svg><p className="mute" style={{ fontSize: 12 }}>Bars: vibration mm/s · dots: defect count per hour</p></div>
      <div className="card"><h2>Shift report</h2>{rep ? <pre>{rep}</pre> : <Empty e="📝" t="No report yet" d="Scan the line, then press Write shift report." />}</div>
    </div>
  </div></main>;
}
