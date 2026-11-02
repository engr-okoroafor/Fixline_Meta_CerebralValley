"use client";
import { useRef, useState } from "react";
import { motion } from "framer-motion";
import { Card, Field, Btn } from "../ui";
import { post, fileToDataUrl, videoFrame } from "./shared";
type Insp = { verdict: "PASS" | "MONITOR" | "FAIL"; score: number; defects: { name: string; severity: string; where: string; action: string; standard?: string }[]; summary: string; model: string };
const KINDS = ["weld", "corrosion", "electrical", "rotating", "general", "product"] as const;
const CHECK: Record<string, string[]> = { weld: ["No cracks", "Porosity within ISO 5817 level", "Undercut ≤ 0.5 mm", "Full fusion at toes", "Reinforcement ≤ 3 mm"], corrosion: ["Coating intact", "No pitting > 1 mm", "No CUI staining under insulation", "UT wall ≥ t-min"], electrical: ["No discolouration", "Terminals tight", "Covers fitted", "Glands sealed", "IR scan ΔT < 10 °C"], rotating: ["No seal leak", "Guards fitted", "Coupling aligned", "Base bolts tight", "Vibration zone A/B"], general: ["Housekeeping", "Labels legible", "No leaks", "No damage"], product: ["Dimensions OK", "Surface finish OK", "No burrs", "Marking correct"] };
/** Autonomous visual inspector: live camera auto-scan or uploads → /api/inspect. */
import { CameraCapture, UploadZone, NeonCheck } from "../next/Chrome";
import { NeonSelect } from "../NeonSelect";
export default function Inspector() {
  const v = useRef<HTMLVideoElement>(null); const timer = useRef<ReturnType<typeof setInterval> | null>(null); const [kind, setKind] = useState<(typeof KINDS)[number]>("weld"); const [cam, setCam] = useState(false); const [auto, setAuto] = useState(false);
  const [res, setRes] = useState<Insp | null>(null); const [hist, setHist] = useState<Insp[]>([]); const [busy, setBusy] = useState(false); const [err, setErr] = useState(""); const [done, setDone] = useState<Record<string, boolean>>({});
  async function inspect(image: string) { setBusy(true); setErr(""); try { const r: Insp = await post("/api/inspect", { image, kind }); setRes(r); setHist((h) => [r, ...h].slice(0, 10)); } catch (e) { setErr((e as Error).message); } finally { setBusy(false); } }
  const grab = () => { const el = v.current; if (!el?.videoWidth) return null; const c = document.createElement("canvas"); const s = Math.min(1, 1024 / el.videoWidth); c.width = el.videoWidth * s; c.height = el.videoHeight * s; c.getContext("2d")!.drawImage(el, 0, 0, c.width, c.height); return c.toDataURL("image/jpeg", 0.8); };
  async function start() { try { const s = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "environment" } }); if (v.current) { v.current.srcObject = s; await v.current.play(); setCam(true); } } catch { setErr("Camera unavailable — upload a photo instead."); } }
  function toggleAuto() { if (auto) { if (timer.current) clearInterval(timer.current); setAuto(false); return; } setAuto(true); const f = grab(); if (f) inspect(f); timer.current = setInterval(() => { const g = grab(); if (g) inspect(g); }, 15000); }
  const col = res?.verdict === "FAIL" ? "var(--danger)" : res?.verdict === "PASS" ? "var(--neon)" : "var(--warn)";
  return <Card title="Autonomous visual inspector" sub="Camera auto-scan every 15 s, or upload photos. Criteria from ISO 5817/17637, API 571, NFPA 70B.">
    <div className="grid gap-3 md:grid-cols-2"><Field label="Inspection type"><NeonSelect value={kind} onChange={(e) => setKind(e.target.value as "weld")}>{KINDS.map((k) => <option key={k}>{k}</option>)}</NeonSelect></Field>
      <CameraCapture label="Capture part" onPhoto={async (f) => inspect(await fileToDataUrl(f))} onVideo={async (f) => inspect(await videoFrame(f))} /><UploadZone title="Upload inspection photos" hint="PNG, JPG or WEBP · up to 4 · max 15 MB each" accept=".png,.jpg,.jpeg,.webp" exts={["png", "jpg", "jpeg", "webp"]} kind="image" onFiles={async (fs) => { for (const f of fs.slice(0, 4)) await inspect(await fileToDataUrl(f)); }} /></div>
    <div className="relative overflow-hidden rounded-3xl" style={{ aspectRatio: "16/9", background: "#000", display: cam ? "block" : "none" }}><video ref={v} playsInline muted className="h-full w-full object-cover" />{auto && <motion.div aria-hidden className="absolute inset-x-0 h-1" style={{ background: "#39FF14", boxShadow: "0 0 18px #39FF14" }} animate={{ top: ["0%", "100%", "0%"] }} transition={{ duration: 3, repeat: Infinity }} />}</div>
    <div className="row">{!cam ? <Btn tip="Use the camera for live inspection" onClick={start}>Start camera</Btn> : <><Btn tip="Inspect this frame now" className="btn-primary" onClick={() => { const f = grab(); if (f) inspect(f); }}>Inspect frame</Btn><Btn tip="Re-inspect automatically every 15 seconds" aria-pressed={auto} onClick={toggleAuto}>{auto ? "Stop auto-scan" : "Auto-scan"}</Btn></>}</div>
    {busy && <p className="muted m-0" role="status">Inspecting…</p>}{err && <p role="alert" style={{ color: "var(--danger)" }}>{err}</p>}
    {res && <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} data-testid="inspection"><p className="m-0 text-xl font-bold" style={{ color: col }}>{res.verdict} · {res.score}/100 <span className="pill text-xs">{res.model}</span></p><p className="m-0 text-sm">{res.summary}</p>
      {res.defects.length > 0 && <div style={{ overflowX: "auto" }}><table className="text-xs"><thead><tr><th>Defect</th><th>Severity</th><th>Where</th><th>Action</th><th>Std</th></tr></thead><tbody>{res.defects.map((d, i) => <tr key={i}><td>{d.name}</td><td>{d.severity}</td><td>{d.where}</td><td>{d.action}</td><td>{d.standard}</td></tr>)}</tbody></table></div>}</motion.div>}
    <b className="text-sm">Manual checklist ({kind})</b><div className="grid gap-1 md:grid-cols-2">{CHECK[kind].map((c) => <NeonCheck key={c} checked={!!done[kind + c]} onChange={(v) => setDone({ ...done, [kind + c]: v })} label={c} />)}</div>
    {hist.length > 1 && <p className="m-0 text-xs muted">History: {hist.map((h) => `${h.verdict}(${h.score})`).join(" → ")}</p>}
  </Card>;
}
