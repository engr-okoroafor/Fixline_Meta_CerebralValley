"use client";
import { useEffect, useState } from "react";
import { Card, Field, Btn, Tip } from "../ui";
import { langLabel } from "@/lib/langs";
import { useListen } from "./Voice";
import { speechTag } from "@/lib/i18n";
import { prefs, savePrefs, DEFAULT_PREFS, type Prefs } from "./shared";
import { NeonCheck } from "../next/Chrome";
import { RegionSelect } from "../next/VoiceDock";
import { McpSettings } from "../next/AdminNext";
import { NeonSelect } from "../NeonSelect";
function VoiceRegion() {
  const [p, setP] = useState<Prefs>(DEFAULT_PREFS); useEffect(() => { setP(prefs()); const on = () => setP(prefs()); window.addEventListener("fixline:prefs", on); return () => window.removeEventListener("fixline:prefs", on); }, []);
  return <Card title="Voice, language & region" sub="Voice is off by default; replies are spoken in the active language.">
    <NeonCheck checked={p.voiceOn} onChange={(v) => savePrefs({ voiceOn: v })} label="Voice conversation" tip="Speak replies aloud and enable the floating mic" />
    <NeonCheck checked={p.autoDetect} onChange={(v) => savePrefs({ autoDetect: v })} label="Auto-detect spoken/typed language" />
    <Field label="Safety & engineering jurisdiction"><RegionSelect /></Field>
    <p className="m-0 text-xs muted">Language lives in the top bar (one control for the whole app).</p></Card>;
}
/** Settings → Speech: one-tap mic test showing which engine heard you (browser Web Speech first, server STT if configured). */
function SpeechTest() {
  const [heard, setHeard] = useState(""); const [st, setSt] = useState("idle"); const [note, setNote] = useState(""); const [lang, setLang] = useState("en-US");
  useEffect(() => { setLang(prefs().voiceLang || "en-US"); }, []);
  const mic = useListen((x) => setHeard(x), (s, n) => { setSt(s); setNote(n ?? ""); });
  const sr = typeof window !== "undefined" && !!((window as any).SpeechRecognition || (window as any).webkitSpeechRecognition); // eslint-disable-line @typescript-eslint/no-explicit-any
  return <div data-tour="speech" className="rounded-2xl p-3" style={{ border: "1px solid rgba(57,255,20,.3)" }}>
    <div className="row" style={{ justifyContent: "space-between" }}><b className="text-sm">🎙 Microphone test · {langLabel(lang)}</b><span className="pill text-xs">{sr ? "Web Speech ✓" : "Web Speech ✗"}</span></div>
    <div className="row"><Btn tip="Say a short sentence; the transcript appears here" className="btn-primary btn-sm" onClick={() => (st === "listening" || st === "recording" ? mic.stop() : mic.start(speechTag(lang)))}>{st === "listening" || st === "recording" ? "● Stop" : "Test mic"}</Btn>
      <span className="text-sm" aria-live="polite">{heard ? <>Heard: <b className="neon">“{heard}”</b></> : note || "Not tested yet"}</span></div></div>;
}
export function useStatus() { const [s, setS] = useState<{ meta: boolean; nvidia: boolean; nvidiaModel: string } | null>(null); useEffect(() => { fetch("/api/status").then((r) => r.json()).then(setS).catch(() => null); }, []); return s; }
const FLAG_HELP: Record<string, string> = { autonomousAdvisor: "SCADA advisor re-diagnoses every 10 s (still never writes without you)", serverSpeech: "Use server ASR/TTS when the browser lacks a voice or recogniser", memory: "Remember conversations, documents and facts (PGlite)", offlineCatalog: "Keep the equipment catalogue cached for offline use", xr: "Show the Enter AR button" };
type Audit = { id: number; action: string; detail: unknown; createdAt: string };
export default function Settings() {
  const s = useStatus(); const [p, setP] = useState<Prefs>(DEFAULT_PREFS); const [msg, setMsg] = useState(""); const [audit, setAudit] = useState<Audit[] | null>(null); const [auditNote, setAuditNote] = useState(""); const [sessions, setSessions] = useState<number | null>(null); const [scada, setScada] = useState<Record<string, boolean> | null>(null); const [speech, setSpeech] = useState<string>("…");
  useEffect(() => { setP(prefs()); fetch("/api/memory").then((r) => r.json()).then((j) => setSessions(j.sessions?.length ?? 0)).catch(() => null); fetch("/api/scada").then((r) => r.json()).then((j) => setScada(j.connectors)).catch(() => null); fetch("/api/speech").then((r) => r.json()).then((j) => setSpeech(j.server ? "server ASR/TTS configured + browser" : "browser Web Speech (server not configured)")).catch(() => setSpeech("browser only")); }, []);
  const set = <K extends keyof Prefs>(k: K, v: Prefs[K]) => { const n = { ...p, [k]: v }; setP(n); savePrefs({ [k]: v } as Partial<Prefs>); setMsg("Saved ✓"); if (k === "notifications" && v && "Notification" in window) Notification.requestPermission().catch(() => null); };
  async function forget(days: number) { if (!confirm(days ? `Delete memory older than ${days} days?` : "Delete ALL memory (sessions, documents, facts)?")) return; await fetch(`/api/memory?olderThanDays=${days}`, { method: "DELETE" }); setSessions(days ? sessions : 0); setMsg("Memory cleared ✓"); }
  async function loadAudit() { const j = await fetch("/api/audit").then((r) => r.json()); setAudit(j.entries); setAuditNote(j.note ?? ""); }
  function exportAudit() { const b = new Blob([JSON.stringify(audit ?? [], null, 2)], { type: "application/json" }); const a = document.createElement("a"); a.href = URL.createObjectURL(b); a.download = "fixline-audit.json"; a.click(); }
  async function cacheCatalog() { const { EQUIPMENT } = await import("@/lib/equipment"); localStorage.setItem("fixline.catalog", JSON.stringify({ at: Date.now(), n: EQUIPMENT.length })); if ("caches" in window) { const c = await caches.open("fixline-offline"); await c.addAll(["/", "/xr"]).catch(() => null); } setMsg(`Offline catalogue ready: ${EQUIPMENT.length} entries bundled + pages cached ✓`); }
  return <div className="grid gap-4 lg:grid-cols-2">
    <VoiceRegion /><McpSettings />
    <Card title="AI providers" sub="Meta is primary; NVIDIA is the fallback (or primary if you choose)"><ul className="grid gap-2 text-sm"><li>Meta (voice, vision, repair, copilot): <b className={s?.meta ? "neon" : ""}>{s ? (s.meta ? "✓ connected — muse-spark-1.3, sam-3.1" : "✗ no key") : "…"}</b></li><li>NVIDIA (grounded safety, jobs, SCADA agent): <b className={s?.nvidia ? "neon" : ""}>{s ? (s.nvidia ? `✓ ${s.nvidiaModel}` : "✗ no key") : "…"}</b></li></ul>
      <div data-tour="ai-order"><Field label="Provider order" tip="Which provider answers first in Ask AI / Repair copilot. The other is the automatic fallback."><NeonSelect value={p.aiOrder} onChange={(e) => set("aiOrder", e.target.value as Prefs["aiOrder"])}><option value="meta-first">Meta first → NVIDIA fallback</option><option value="nvidia-first">NVIDIA first → Meta fallback</option></NeonSelect></Field>
      </div><p className="m-0 text-xs muted">Keys are server-only: Vercel → Project → Settings → Environment Variables → <code>MODEL_API_KEY</code>, <code>NVIDIA_API_KEY</code> → Redeploy.</p></Card>
    <Card title="Speech & units" sub={`Speech: ${speech}`}>
      <SpeechTest />
      <div className="grid grid-cols-2 gap-3"><Field label="Units"><NeonSelect value={p.units} onChange={(e) => set("units", e.target.value as Prefs["units"])}><option value="metric">Metric</option><option value="imperial">Imperial</option></NeonSelect></Field><Field label="Default export"><NeonSelect value={p.exportFormat} onChange={(e) => set("exportFormat", e.target.value as Prefs["exportFormat"])}><option value="pdf">PDF</option><option value="docx">DOCX</option><option value="png">PNG</option></NeonSelect></Field></div></Card>
    <Card title="Memory" sub={sessions === null ? "…" : `${sessions} conversation(s) stored (short-term = last turns, long-term = facts & documents)`}>
      <Field label="Retention (days)" tip="Older memory is deleted when you press Apply"><input type="number" min={1} max={3650} value={p.retentionDays} onChange={(e) => set("retentionDays", Math.max(1, +e.target.value))} /></Field>
      <div className="row"><Btn tip="Delete memory older than the retention period" onClick={() => forget(p.retentionDays)}>Apply retention</Btn><Btn tip="Delete all of your stored memory" className="btn-danger" onClick={() => forget(0)}>Forget everything</Btn></div></Card>
    <Card title="SCADA & MCP" sub="Server connectors are configured with env vars; these are your client endpoints">
      <div className="row text-sm">{scada ? Object.entries(scada).map(([k, v]) => <span key={k} className="pill" style={{ color: v ? "var(--neon)" : undefined }}>{k} {v ? "●" : "○"}</span>) : "…"}</div>
      <Field label="MCP endpoint" tip="Point Claude/Cursor/any MCP client here"><input value={p.scadaMcpUrl} onChange={(e) => set("scadaMcpUrl", e.target.value)} /></Field>
      <Field label="MQTT broker (reference)" tip="Server reads MQTT_URL; recorded here for your crew"><input value={p.mqttUrl} onChange={(e) => set("mqttUrl", e.target.value)} placeholder="mqtts://broker:8883" /></Field>
      <Field label="OPC UA gateway (reference)"><input value={p.opcuaUrl} onChange={(e) => set("opcuaUrl", e.target.value)} placeholder="https://gateway/api" /></Field></Card>
    <Card title="Features & notifications">
      <NeonCheck checked={p.notifications} onChange={(v) => set("notifications", v)} label="Desktop notifications for critical alarms" />
      <NeonCheck checked={p.homeMode} onChange={(v) => set("homeMode", v)} label="Home safety mode by default" />
      {Object.entries(p.flags).map(([k, v]) => <NeonCheck key={k} tip={FLAG_HELP[k] ?? k} checked={v} onChange={(x) => set("flags", { ...p.flags, [k]: x })} label={k.replace(/([A-Z])/g, " $1").toLowerCase()} />)}
      <div className="row"><Btn tip="Bundle the equipment catalogue and cache pages for offline use" onClick={cacheCatalog}>Prepare offline catalogue</Btn><Btn tip="Reset all preferences" onClick={() => { localStorage.removeItem("fixline.prefs"); setP(DEFAULT_PREFS); savePrefs(DEFAULT_PREFS); setMsg("Reset ✓"); }}>Reset</Btn></div></Card>
    <Card title="Audit log" sub="Your SCADA writes, safety documents and inspections">
      <div className="row"><Btn tip="Load your audit trail" onClick={loadAudit}>Load audit log</Btn>{audit?.length ? <Btn tip="Download as JSON" onClick={exportAudit}>Export JSON</Btn> : null}</div>{auditNote && <p className="m-0 muted text-sm">{auditNote}</p>}
      {audit && <div style={{ maxHeight: 260, overflow: "auto" }}><table className="text-xs"><thead><tr><th>When</th><th>Action</th><th>Detail</th></tr></thead><tbody>{audit.map((a) => <tr key={a.id}><td>{new Date(a.createdAt).toLocaleString()}</td><td>{a.action}</td><td>{JSON.stringify(a.detail).slice(0, 120)}</td></tr>)}</tbody></table></div>}</Card>
    {msg && <p role="status" className="neon m-0 lg:col-span-2">{msg}</p>}
  </div>;
}
