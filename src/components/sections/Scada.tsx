"use client";
import { useEffect, useRef, useState } from "react";
import { TAGS, initSim, stepSim, alarmLevel, drift, activeTrips, guardWrite, guardValve, PRIORITY, type SimState, type TagId, type ValveId } from "@/lib/scada/model";
import { Card, Btn, Field, Tip } from "../ui";
import Trend from "../Trend";
import { post, fileToDataUrl, videoFrame, prefs } from "./shared";
import { UploadZone } from "../next/Chrome";
import { motion } from "framer-motion";
import { NeonSelect } from "../NeonSelect";
type Hist = Record<TagId, number[]>;
type Replica = { title: string; tags: { id: string; label: string; value: number | string; unit: string; x: number; y: number; kind: string }[]; mock?: boolean };
export const REPLICA_KEY = "fixline.replica.v1";
/* ISA-5.1 / ISO 10628 style P&ID symbols */
const G = "#39FF14", W = "#d7ffe9", M = "#8fb9a1", Y = "#fbbf24";
/** Instrument bubble. shared = DCS (circle in square), field = plain circle; line = control-room mounted. */
function Bubble({ x, y, fn, loop, shared = false, alarm }: { x: number; y: number; fn: string; loop: string; shared?: boolean; alarm?: boolean }) {
  const c = alarm ? "#ff4d6d" : G;
  return <g transform={`translate(${x} ${y})`}>{shared && <rect x="-17" y="-17" width="34" height="34" fill="none" stroke={c} strokeWidth="1.2" />}<circle r="16" fill="#030a06" stroke={c} strokeWidth="1.5" />{shared && <line x1="-16" x2="16" y1="0" y2="0" stroke={c} strokeWidth="1" />}<text y={shared ? -4 : 3} textAnchor="middle" fontSize="9" fontWeight="700" fill={W}>{fn}</text><text y={shared ? 10 : 13} textAnchor="middle" fontSize="8" fill={M}>{loop}</text></g>;
}
/** Gate valve (bow-tie); control valve adds a diaphragm actuator; ESDV adds a solenoid S. */
function Valve({ x, y, open, kind = "gate", tag, vertical = false }: { x: number; y: number; open: number; kind?: "gate" | "control" | "esdv"; tag: string; vertical?: boolean }) {
  const fill = open > 2 ? "rgba(57,255,20,.35)" : "#030a06";
  return <g transform={`translate(${x} ${y}) rotate(${vertical ? 90 : 0})`}><path d="M-10 -7L10 7V-7L-10 7Z" fill={fill} stroke={G} strokeWidth="1.5" />
    {kind !== "gate" && <><line x1="0" x2="0" y1="0" y2="-14" stroke={G} />{kind === "control" ? <path d="M-9 -14a9 7 0 0 1 18 0Z" fill="#030a06" stroke={G} /> : <><rect x="-7" y="-26" width="14" height="12" fill="#030a06" stroke={G} /><text y="-17" textAnchor="middle" fontSize="8" fill={W}>S</text></>}</>}
    <text y="20" textAnchor="middle" fontSize="8" fill={M} transform={vertical ? "rotate(-90)" : undefined}>{tag}</text><title>{`${tag}: ${open.toFixed(0)}% open`}</title></g>;
}
function V({ s, id, x, y }: { s: SimState; id: TagId; x: number; y: number }) {
  const t = TAGS.find((q) => q.id === id)!; const a = alarmLevel(s.v[id], t.limits);
  return <g transform={`translate(${x} ${y})`}><rect x="-38" y="-10" width="76" height="20" rx="4" fill="#021006" stroke={a ? "#ff4d6d" : "#1f5f3a"} /><text textAnchor="middle" y="4" fontSize="10.5" fill={a ? "#ff4d6d" : W} fontWeight="700" fontFamily="ui-monospace,monospace">{s.v[id].toFixed(1)} {t.unit}</text><title>{`${t.id}: ${t.desc}${a ? ` (${a})` : ""}`}</title></g>;
}
export function Hmi({ s }: { s: SimState }) {
  const lv = (p: number, h: number) => (h * Math.max(0, Math.min(100, p))) / 100; const al = (id: TagId) => !!alarmLevel(s.v[id], TAGS.find((q) => q.id === id)!.limits);
  const run = s.v.P101_FLOW > 1;
  return <svg viewBox="0 0 900 380" width="100%" role="img" aria-label="P&ID (ISA-5.1): well inlet, ESDV-1001, V-100 HP separator with PIC/LIC loops, P-101 export pump, TK-1 storage, flare" data-testid="pid" style={{ background: "#030a06", borderRadius: 24, fontFamily: "ui-sans-serif,system-ui" }}>
    <defs><marker id="arr" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="7" markerHeight="7" orient="auto"><path d="M0 0L10 5L0 10z" fill={G} /></marker>
      <pattern id="pidgrid" width="25" height="25" patternUnits="userSpaceOnUse"><path d="M25 0H0V25" fill="none" stroke={G} strokeOpacity=".05" /></pattern></defs>
    <rect width="900" height="380" fill="url(#pidgrid)" />
    {/* process lines (solid) with line numbers */}
    <g fill="none" strokeWidth="2.4" markerEnd="url(#arr)">
      <path className="flow" stroke="#00FF9C" d="M10 220H95" /><path className="flow" stroke="#00FF9C" d="M125 220H175" />
      <path className={s.valves.gasOut > 2 ? "flow" : ""} stroke={Y} d="M260 150V80H500" /><path className={s.valves.gasOut > 2 ? "flow" : ""} stroke={Y} d="M530 80H690V120" />
      <path className={run ? "flow" : ""} stroke={G} d="M300 280H360" /><path className={run ? "flow" : ""} stroke={G} d="M390 280H440" /><path className={run ? "flow" : ""} stroke={G} d="M500 280H600" />
      <path className="flow" stroke={G} d="M700 300H890" />
    </g>
    <g fontSize="8" fill={M} fontFamily="ui-monospace,monospace"><text x="14" y="212">8&quot;-P-1001-A1A</text><text x="330" y="74">6&quot;-G-1002-B1A</text><text x="510" y="272">4&quot;-P-1003-A1A</text><text x="760" y="292">6&quot;-P-1004-A1A</text></g>
    <text x="14" y="256" fontSize="10" fill={W}>FROM WELL PAD</text><text x="800" y="318" fontSize="10" fill={W}>TO EXPORT</text>
    {/* ESDV-1001 */}
    <Valve x={110} y={220} open={s.valves.inlet} kind="esdv" tag="ESDV-1001" />
    {/* V-100 horizontal 3-phase separator */}
    <g><path d="M200 165h120a35 55 0 0 1 0 110h-120a35 55 0 0 1 0-110z" fill="#07130d" stroke={G} strokeWidth="2" /><clipPath id="sepclip"><path d="M200 165h120a35 55 0 0 1 0 110h-120a35 55 0 0 1 0-110z" /></clipPath><rect clipPath="url(#sepclip)" x="160" y={275 - lv(s.v.SEP1_L, 110)} width="200" height={lv(s.v.SEP1_L, 110)} fill="rgba(57,255,20,.22)" /><line x1="255" x2="255" y1="200" y2="275" stroke={G} strokeOpacity=".5" strokeDasharray="3 3" /><text x="260" y="160" textAnchor="middle" fontSize="11" fontWeight="700" fill={W}>V-100</text><text x="200" y="312" textAnchor="middle" fontSize="9" fill={M}>HP 3-PHASE SEPARATOR · 20 barg DP</text></g>
    {/* PSV on separator */}
    <g transform="translate(320 150)"><path d="M0 15V5M-7 5L7 -5V5L-7 -5Z" fill="#030a06" stroke={Y} strokeWidth="1.5" /><text x="10" y="-6" fontSize="8" fill={Y}>PSV-1001</text></g>
    <Valve x={300} y={280} open={s.valves.liqOut} kind="control" tag="LV-1001" />
    <Valve x={515} y={80} open={s.valves.gasOut} kind="control" tag="PV-1001" />
    {/* P-101 centrifugal pump */}
    <g transform="translate(375 280)"><circle r="18" fill="#07130d" stroke={G} strokeWidth="2" /><path d="M0 -18H22V-10" fill="none" stroke={G} strokeWidth="2" /><path d="M-10 14L-16 24H16L10 14" fill="none" stroke={G} strokeWidth="1.5" /><path d="M0 0l9-9M0 0l-9 9" stroke={G} strokeWidth="2.5" style={{ transformOrigin: "0px 0px", animation: run ? "spin 1.2s linear infinite" : "none" }} /><text y="40" textAnchor="middle" fontSize="11" fontWeight="700" fill={W}>P-101</text><text y="51" textAnchor="middle" fontSize="8" fill={M}>EXPORT PUMP</text></g>
    <Valve x={470} y={280} open={run ? 100 : 0} tag="XV-1003" />
    {/* TK-1 cone-roof tank */}
    <g><path d="M600 200L650 180L700 200V320H600Z" fill="#07130d" stroke={G} strokeWidth="2" /><rect x="602" y={318 - lv(s.v.TK1_L, 116)} width="96" height={lv(s.v.TK1_L, 116)} fill="rgba(0,255,156,.22)" /><text x="650" y="174" textAnchor="middle" fontSize="11" fontWeight="700" fill={W}>TK-1</text><text x="650" y="336" textAnchor="middle" fontSize="8" fill={M}>CRUDE STORAGE · API 650</text></g>
    {/* flare stack */}
    <g><rect x="685" y="120" width="10" height="60" fill="#07130d" stroke={Y} /><path d={`M690 120c${6 + s.v.FLARE_FLOW},-${10 + s.v.FLARE_FLOW * 2} -6,-20 0,-${18 + s.v.FLARE_FLOW * 2}`} fill="#ff8a3d" opacity=".85" /><text x="705" y="160" fontSize="10" fontWeight="700" fill={W}>FL-1</text><text x="705" y="172" fontSize="8" fill={M}>FLARE</text></g>
    {/* signal lines (dashed = electrical) from transmitters to controllers to valves */}
    <g fill="none" stroke={G} strokeOpacity=".7" strokeDasharray="5 3" strokeWidth="1.1"><path d="M320 120V110H418" /><path d="M450 110H515V65" /><path d="M200 165V130H150V110" /><path d="M150 78V50H60V70" /><path d="M60 102V312H300V295" /><path d="M700 230H760" /></g>
    {/* instrument bubbles */}
    <Bubble x={320} y={110} fn="PT" loop="1001" alarm={al("SEP1_P")} /><Bubble x={434} y={110} fn="PIC" loop="1001" shared alarm={al("SEP1_P")} />
    <Bubble x={150} y={94} fn="LT" loop="1001" alarm={al("SEP1_L")} /><Bubble x={60} y={86} fn="LIC" loop="1001" shared alarm={al("SEP1_L")} />
    <Bubble x={420} y={240} fn="FT" loop="1003" alarm={al("P101_FLOW")} /><Bubble x={776} y={230} fn="LT" loop="1004" alarm={al("TK1_L")} />
    <Bubble x={210} y={330} fn="TT" loop="1002" alarm={al("SEP1_T")} /><Bubble x={850} y={270} fn="PT" loop="1005" alarm={al("EXPORT_P")} />
    {/* live values */}
    <V s={s} id="SEP1_P" x={434} y={142} /><V s={s} id="SEP1_L" x={260} y={250} /><V s={s} id="SEP1_T" x={210} y={362} /><V s={s} id="P101_FLOW" x={420} y={208} /><V s={s} id="TK1_L" x={650} y={260} /><V s={s} id="FLARE_FLOW" x={760} y={110} /><V s={s} id="EXPORT_P" x={850} y={340} />
    {/* title block + legend */}
    <g fontSize="8" fill={M} fontFamily="ui-monospace,monospace"><rect x="600" y="8" width="292" height="44" fill="#030a06" stroke={G} strokeOpacity=".5" /><text x="608" y="21" fill={W} fontWeight="700">FLOW STATION FS-1 · P&amp;ID PID-FS1-001 REV C</text><text x="608" y="33">Symbols ISA-5.1-2024 / ISO 10628-2 · DCS ◯▢ · field ◯</text><text x="608" y="45">— process  - - electrical signal  ⋈ valve  ◠ actuator</text></g>
    <style>{"@keyframes spin{to{transform:rotate(360deg)}}"}</style></svg>;
}
export default function Scada({ loggedIn }: { loggedIn: boolean }) {
  const [s, setS] = useState(initSim); const hist = useRef<Hist>(Object.fromEntries(TAGS.map((t) => [t.id, []])) as unknown as Hist);
  const [industry, setIndustry] = useState<"oil-gas" | "electrical" | "manufacturing" | "factory">("oil-gas");
  const [ask, setAsk] = useState<null | { title: string; detail: string; run: () => void }>(null);
  const [series, setSeries] = useState<Record<string, number>[]>([]); const [target, setTarget] = useState<"sim" | "real">("sim");
  const [agent, setAgent] = useState<{ summary: string; steps: { phase: string; tool?: string; note?: string; result?: unknown }[]; proposals: { proposal: { tag: TagId; sp: number }; guard: { ok: boolean; reason: string } }[] } | null>(null);
  const [msg, setMsg] = useState(""); const [busy, setBusy] = useState(false); const [replica, setReplica] = useState<Replica | null>(null);
  useEffect(() => { const id = setInterval(() => setS((p) => { const n = stepSim(p); for (const t of TAGS) { const h = hist.current[t.id]; h.push(n.v[t.id]); if (h.length > 120) h.shift(); } setSeries((d) => [...d.slice(-89), { t: n.t, P: +n.v.SEP1_P.toFixed(2), L: +n.v.SEP1_L.toFixed(1), F: +(n.v.P101_FLOW / 10).toFixed(1) }]); return n; }), 1000); return () => clearInterval(id); }, []);
  useEffect(() => { try { const r = localStorage.getItem(REPLICA_KEY); if (r) setReplica(JSON.parse(r)); } catch { /* ignore */ } }, []);
  const alarms = TAGS.map((t) => ({ t, a: alarmLevel(s.v[t.id], t.limits), d: drift(hist.current[t.id], t.kind === "level" ? 3 : 2) })).filter((x) => x.a || x.d.rocAlarm || x.d.devAlarm);
  const trips = activeTrips(s.v);
  type Adv = { advice: { tag: TagId; desc: string; value: number; unit: string; level: string; priority: string; causes: string[]; checks: string[]; next: string; standards: string[]; proposal?: { tag: TagId; sp: number; why: string } }[]; trips: string[]; summary: string };
  const [adv, setAdv] = useState<Adv | null>(null); const [autoAdv, setAutoAdv] = useState(() => typeof window === "undefined" || prefs().flags.autonomousAdvisor !== false); const [conn, setConn] = useState<Record<string, boolean> | null>(null); const [liveMsg, setLiveMsg] = useState("");
  const sv = useRef(s.v); useEffect(() => { sv.current = s.v; }, [s.v]);
  async function runAdvisor() { try { const r = await post("/api/scada", { op: "advise", values: sv.current        , history: Object.fromEntries(TAGS.map((t) => [t.id, hist.current[t.id].slice(-60)])) }); setAdv(r);
      const crit = r.advice?.find((a: { priority: string }) => a.priority === "critical"); if (crit && prefs().notifications && "Notification" in window && Notification.permission === "granted") new Notification(`FixLine: ${crit.tag} ${crit.level}`, { body: crit.next, tag: crit.tag }); } catch (e) { setLiveMsg((e as Error).message); } }
  useEffect(() => { fetch("/api/scada").then((r) => r.json()).then((j) => setConn(j.connectors)).catch(() => null); }, []);
  useEffect(() => { if (!autoAdv) return; runAdvisor(); const id = setInterval(runAdvisor, 10000); return () => clearInterval(id); }, [autoAdv]); // eslint-disable-line react-hooks/exhaustive-deps
  async function readLive(source: "mqtt" | "opcua" | "modbus") { setLiveMsg("Reading…"); try { const r = await post("/api/scada", { op: "live", source }); setLiveMsg(`${source}: ${Object.entries(r.values ?? {}).map(([k, v]) => `${k}=${v}`).join(", ") || "no tags mapped"}`); } catch (e) { setLiveMsg(`${source}: ${(e as Error).message}`); } }
  async function diagnose() { setBusy(true); setMsg(""); try { setAgent(await post("/api/agent", { goal: alarms.length ? `Diagnose alarm on ${alarms[0].t.id}` : "Health check of flow station", target, estop: s.estop, values: s.v, history: Object.fromEntries(TAGS.map((t) => [t.id, hist.current[t.id].slice(-120)])) })); } catch (e) { setMsg((e as Error).message); } finally { setBusy(false); } }
  function approve(title: string, detail: string, run: () => void) { setAsk({ title, detail, run }); }
  function requestValve(valve: ValveId, open: boolean) {
    approve(`${open ? "Open" : "Close"} ${valve}`, "Nothing moves until you press approve. A real plant valve is never written from this app.", () => {
      const g = guardValve({ valve, open, target, confirmed: true, actor: "operator", estop: s.estop });
      if (g.ok) setS((p) => ({ ...p, auto: false, valves: { ...p.valves, [valve]: open ? 100 : 0 } }));
      setMsg(`${valve}: ${g.reason}`); setAsk(null);
    });
  }
  async function applySp(tag: TagId, sp: number, fromProposal = false) {
    if (target === "sim") { const g = guardWrite({ tag, sp, target: "sim", confirmed: true, actor: "operator", estop: s.estop }); if (g.ok) setS((p) => ({ ...p, sp: { ...p.sp, [tag]: sp } })); setMsg(`${tag} → ${sp}: ${g.reason}`); return; }
    if (!loggedIn) return setMsg("Sign in to send operator-confirmed writes to a real connector.");
    if (!confirm(`Operator confirmation: write ${tag} setpoint = ${sp} to the REAL plant connector?`)) return;
    try { const r = await post("/api/scada", { op: "write", tag, sp, target: "real", confirmed: true, estop: s.estop, fromProposal }); setMsg(`${r.reason} (audit logged)`); } catch (e) { setMsg((e as Error).message); }
  }
  async function upload(f?: File) { if (!f) return; setBusy(true); setMsg(""); try { const image = f.type.startsWith("video/") ? await videoFrame(f) : await fileToDataUrl(f, 1400); const r = await post("/api/scada", { op: "extract", image }); setReplica(r); localStorage.setItem(REPLICA_KEY, JSON.stringify(r)); } catch (e) { setMsg((e as Error).message); } finally { setBusy(false); } }
  return <div className="flex flex-col gap-4">
    <ConnBar conn={conn} />
    <Card title="Flow station HMI" sub="Simulated oil & gas station. Closed-loop PID acts only on the simulator." right={<div className="row">
      <Tip label="Simulator: PID and AI may act. Real: advisory only, operator confirms each write."><NeonSelect aria-label="Data source" value={target} onChange={(e) => setTarget(e.target.value as "sim")} style={{ width: "auto" }}><option value="sim">Simulator</option><option value="real">Real connector (advisory)</option></NeonSelect></Tip>
      <Btn tip="Toggle closed-loop control (simulator only)" aria-pressed={s.auto} onClick={() => setS({ ...s, auto: !s.auto })}>Auto {s.auto ? "ON" : "OFF"}</Btn>
      <Btn tip="Emergency stop: shuts inlet, trips pump, blocks all writes" className="btn-danger" aria-pressed={s.estop} onClick={() => setS({ ...s, estop: !s.estop })}>{s.estop ? "Reset E-STOP" : "E-STOP"}</Btn></div>}>
      <Hmi s={s} />
      {industry === "oil-gas" && <div className="row" data-testid="valve-controls"><span className="text-sm muted">Valves (approval required):</span>{(["inlet", "gasOut", "liqOut"] as const).map((v) => <span key={v} className="row" style={{ gap: 4 }}><Btn tip={`Close ${v} after an explicit approval`} onClick={() => requestValve(v, false)}>Close {v}</Btn><Btn tip={`Open ${v} after an explicit approval`} onClick={() => requestValve(v, true)}>Open {v}</Btn></span>)}</div>}
      {ask && <div role="dialog" aria-label="Approve write" className="rounded-3xl p-3" style={{ border: "1px solid #f5b301", background: "rgba(245,179,1,.08)" }}><b>{ask.title}</b><p className="m-0 text-sm">{ask.detail}</p><div className="row"><Btn tip="This is the approval gate. Nothing is written before this click." className="btn-primary" onClick={ask.run}>I approve this write</Btn><Btn tip="Leave the plant as it is" onClick={() => setAsk(null)}>Cancel</Btn></div></div>}
      <IndustryBoard industry={industry} setIndustry={setIndustry} />
      <div className="row"><span className="text-sm muted">Inject fault:</span>{(["gas-valve-stuck", "level-sensor-drift", "pump-degraded"] as const).map((f) => <Btn key={f} tip={`Simulate ${f.replace(/-/g, " ")}`} aria-pressed={s.fault === f} onClick={() => setS({ ...s, fault: s.fault === f ? null : f })}>{f.replace(/-/g, " ")}</Btn>)}</div>
    </Card>
    <div className="grid gap-4 lg:grid-cols-2">
      <Card title="Alarms (ISA-18.2 style)" sub="HI/HIHI/LO/LOLO + rate-of-change + statistical deviation">
        {trips.length > 0 && <p className="m-0 rounded-3xl p-4 text-sm font-bold" style={{ background: "color-mix(in oklab, var(--danger) 20%, transparent)" }}>Interlock tripped (not overridable): {trips.map((t) => `${t.id}: ${t.action}`).join("; ")}</p>}
        {alarms.length ? <table className="text-sm"><thead><tr><th>Tag</th><th>State</th><th>Value</th><th>Drift</th></tr></thead><tbody>{alarms.map(({ t, a, d }) => <tr key={t.id}><td>{t.id}</td><td><span className="pill" style={{ color: a ? "var(--danger)" : "var(--warn)" }}>{a ? `${a} · ${PRIORITY[a]}` : "DRIFT"}</span></td><td>{s.v[t.id].toFixed(1)} {t.unit}</td><td>roc {d.roc} · z {d.zscore}</td></tr>)}</tbody></table> : <p className="m-0 muted">No active alarms.</p>}
        <Btn tip="Agent plans tool calls, reads tags/history, proposes a fix" className={alarms.length ? "btn-primary" : ""} onClick={diagnose} disabled={busy}>{busy ? "Diagnosing…" : "Diagnose with AI agent"}</Btn>
        {agent && <div className="flex flex-col gap-2 text-sm" data-testid="agent"><p className="m-0 whitespace-pre-wrap">{agent.summary}</p>
          <ol className="m-0 pl-5">{agent.steps.map((st, i) => <li key={i}><b>{st.phase}</b> {st.tool ?? ""} {st.note ?? ""}</li>)}</ol>
          {agent.proposals.map((p, i) => <div key={i} className="row"><span>Proposal: {p.proposal.tag} → {p.proposal.sp} ({p.guard.reason})</span>{p.guard.ok || target === "real" ? <Btn tip="Apply this AI proposal (you are the approver)" onClick={() => applySp(p.proposal.tag, p.proposal.sp, true)}>Approve</Btn> : null}</div>)}</div>}
      </Card>
      <Card title="Setpoints & trends" sub="Writes pass the safety guard; real-plant writes need login + confirmation and are audit-logged.">
        <div className="grid grid-cols-2 gap-4">{(["SEP1_P", "SEP1_L"] as TagId[]).map((id) => { const t = TAGS.find((x) => x.id === id)!; return <form key={id} className="flex flex-col gap-2" onSubmit={(e) => { e.preventDefault(); const sp = Number(new FormData(e.currentTarget).get("sp")); approve(`Set ${id} to ${sp} ${t.unit}`, "Setpoint changes wait for this approval. Real-plant writes also need a signed-in operator.", () => { setAsk(null); void applySp(id, sp); }); }}><Field label={`${t.desc} SP (${t.unit})`} tip={`Safe window ${t.limits.lo}–${t.limits.hi} ${t.unit}`}><input name="sp" type="number" step="0.1" defaultValue={s.sp[id]} /></Field><button className="btn">Request approval</button></form>; })}</div>
        {msg && <p role="status" className="m-0 text-sm">{msg}</p>}
        <Trend data={series} keys={[{ k: "P", c: "#39FF14", name: "SEP1_P barg" }, { k: "L", c: "#00FF9C", name: "SEP1_L %" }, { k: "F", c: "#60a5fa", name: "P101 flow /10" }]} refs={[{ y: 15, label: "P HI" }]} />
      </Card>
    </div>
    <Card title="Autonomous advisor: alarm → diagnose → advise" sub="Runs every 10 s on live values. Proposals never auto-apply: you approve each write (IEC 61511 — the SIS stays authoritative)." right={<Btn tip="Pause or resume the autonomous advisor" aria-pressed={autoAdv} onClick={() => setAutoAdv(!autoAdv)}>{autoAdv ? "Advisor ON" : "Advisor OFF"}</Btn>}>
      {adv && <div className="flex flex-col gap-2 text-sm" data-testid="advisor"><p className="m-0 font-bold">{adv.summary}</p>{adv.trips.length > 0 && <p className="m-0" style={{ color: "var(--danger)" }}>Trips: {adv.trips.join("; ")}</p>}
        <div className="grid gap-3 md:grid-cols-2">{adv.advice.map((a, i) => <div key={i} className="rounded-3xl p-3" style={{ background: "var(--bg2)", borderLeft: `4px solid ${a.priority === "critical" ? "var(--danger)" : "var(--warn)"}` }}>
          <b>{a.tag} · {a.level}</b> <span className="muted">{a.desc} = {a.value.toFixed(2)} {a.unit}</span><p className="m-0">Causes: {a.causes.join("; ")}</p><p className="m-0">Checks: {a.checks.join("; ")}</p><p className="m-0 neon">Next: {a.next}</p><p className="m-0 text-xs muted">{a.standards.join(" · ")}</p>
          {a.proposal && <div className="row"><span>Proposal {a.proposal.tag} → {a.proposal.sp} ({a.proposal.why})</span><Btn tip="Operator approval: apply this setpoint (audit-logged)" className="btn-primary" data-tour="scada-approve" onClick={() => applySp(a.proposal!.tag, a.proposal!.sp, true)}>✅ Operator approve write</Btn></div>}</div>)}</div></div>}
      <div className="row text-sm"><span className="muted">Connectors:</span>{conn ? (["mqtt", "opcua", "modbus"] as const).map((k) => <Btn key={k} tip={conn[k] ? `Read mapped tags from ${k} now (read-only)` : `${k} not configured — set its env vars on the server`} disabled={!conn[k]} onClick={() => readLive(k)}>{k.toUpperCase()} {conn[k] ? "●" : "○"}</Btn>) : "…"}<span className="pill">writes {conn?.writes ? "enabled (confirm each)" : "disabled"}</span><Tip label="MCP server: tools list_equipment, get_equipment, read_tags, diagnose, sim_step, scada_advise, find_standards, piping_spec — point an MCP client at /api/mcp"><span className="pill" tabIndex={0}>MCP /api/mcp</span></Tip></div>
      {liveMsg && <p className="m-0 text-xs" role="status">{liveMsg}</p>}
    </Card>
    <Card title="SCADA screen replication" sub="Upload a screenshot/photo (or a video: a frame is sampled in your browser). The vision model extracts tags as JSON; edit them below. Also shown in 3D in /xr.">
      <div className="grid gap-3 md:grid-cols-[1fr_auto] items-start" data-tour="scada-upload"><UploadZone title="⬆ Upload HMI screenshot, photo or video" hint="PNG/JPG/WEBP screenshot or photo, or MP4/WEBM video → vision extracts tags as JSON" accept="image/png,image/jpeg,image/webp,video/mp4,video/webm,video/quicktime" exts={["png", "jpg", "jpeg", "webp", "mp4", "webm", "mov"]} kind="image" multiple={false} onFiles={(f) => upload(f[0])} />
        <Tip label="See the replicated tags in 3D / on your headset"><motion.a whileHover={{ scale: 1.05 }} className="btn" href="/xr?from=scada">🥽 View in XR</motion.a></Tip></div>
      {busy && <p className="m-0 text-sm neon" role="status">Vision model reading the screen…</p>}
      {replica && <details><summary className="text-sm muted">Vision JSON tags</summary><pre className="text-xs" style={{ maxHeight: 200, overflow: "auto" }}>{JSON.stringify(replica.tags, null, 2)}</pre></details>}
      {replica && <div className="grid gap-4 lg:grid-cols-2">
        <svg viewBox="0 0 400 240" width="100%" style={{ background: "#030a06", borderRadius: 24 }} role="img" aria-label="Editable replica">{replica.tags.map((t, i) => <g key={i} transform={`translate(${20 + t.x * 360} ${20 + t.y * 200})`}><rect x="-40" y="-14" width="80" height="28" rx="8" fill="#07130d" stroke="#39FF14" /><text textAnchor="middle" y="-18" fontSize="9" fill="#8fb9a1">{t.label.slice(0, 18)}</text><text textAnchor="middle" y="4" fontSize="11" fill="#d7ffe9">{String(t.value)} {t.unit}</text></g>)}</svg>
        <div className="flex flex-col gap-2" style={{ maxHeight: 320, overflow: "auto" }}>{replica.tags.map((t, i) => <div key={i} className="grid grid-cols-3 gap-2"><input aria-label="Label" value={t.label} onChange={(e) => { const r = structuredClone(replica); r.tags[i].label = e.target.value; setReplica(r); localStorage.setItem(REPLICA_KEY, JSON.stringify(r)); }} /><input aria-label="Value" value={String(t.value)} onChange={(e) => { const r = structuredClone(replica); r.tags[i].value = e.target.value; setReplica(r); localStorage.setItem(REPLICA_KEY, JSON.stringify(r)); }} /><input aria-label="Unit" value={t.unit} onChange={(e) => { const r = structuredClone(replica); r.tags[i].unit = e.target.value; setReplica(r); localStorage.setItem(REPLICA_KEY, JSON.stringify(r)); }} /></div>)}</div></div>}
      <p className="m-0 text-xs muted">Real connectors (MQTT / OPC UA gateway / Modbus TCP) read when configured; writes need SCADA_ALLOW_WRITES=1 plus operator confirmation. Autonomous writes to a real plant require SIL-rated safety systems (IEC 61511); this app only advises.</p>
    </Card>
  </div>;
}

const DEMOS: Record<"electrical" | "manufacturing" | "factory", { title: string; note: string; tags: { id: string; desc: string; unit: string; value: number; lo: number; hi: number }[] }> = {
  electrical: { title: "Electrical substation (demo)", note: "Breaker and bus symbols are a simulator. A live substation would be OPC UA or IEC 61850 via your gateway — credentials stay on the server.", tags: [{ id: "BUS_V", desc: "Bus voltage", unit: "kV", value: 11.2, lo: 10, hi: 12 }, { id: "XFMR_T", desc: "Transformer temp", unit: "°C", value: 68, lo: 20, hi: 95 }, { id: "BKR", desc: "Incomer breaker", unit: "% closed", value: 100, lo: 1, hi: 101 }] },
  manufacturing: { title: "Manufacturing cell (demo)", note: "Robot cell and conveyor are simulated. A live line is typically MQTT or OPC UA from the PLC, read-only until an operator approves a write.", tags: [{ id: "CONV", desc: "Conveyor speed", unit: "m/min", value: 18, lo: 5, hi: 30 }, { id: "ROBOT", desc: "Robot current", unit: "A", value: 12, lo: 2, hi: 22 }, { id: "CELL_T", desc: "Spindle temp", unit: "°C", value: 54, lo: 15, hi: 80 }] },
  factory: { title: "Factory utilities (demo)", note: "Boiler and compressed air are simulated. Modbus TCP stays on a plant gateway, never exposed to the internet.", tags: [{ id: "BLR_P", desc: "Boiler pressure", unit: "barg", value: 8.4, lo: 4, hi: 12 }, { id: "AIR_P", desc: "Header air", unit: "barg", value: 6.8, lo: 5, hi: 8 }, { id: "STM_T", desc: "Steam temperature", unit: "°C", value: 175, lo: 120, hi: 210 }] },
};
function IndustryBoard({ industry, setIndustry }: { industry: "oil-gas" | "electrical" | "manufacturing" | "factory"; setIndustry: (v: "oil-gas" | "electrical" | "manufacturing" | "factory") => void }) {
  const demo = industry === "oil-gas" ? null : DEMOS[industry];
  return <div className="flex flex-col gap-2">
    <div className="row" data-testid="industry">{(["oil-gas", "electrical", "manufacturing", "factory"] as const).map((k) => <Btn key={k} tip={`Show the ${k} demo. Live connectors are unchanged.`} aria-pressed={industry === k} onClick={() => setIndustry(k)}>{k}</Btn>)}</div>
    {demo && <div className="rounded-3xl p-3" style={{ border: "1px solid rgba(57,255,20,.35)" }}><b className="neon">{demo.title}</b><p className="m-0 text-xs muted">{demo.note}</p>
      <svg viewBox="0 0 640 120" width="100%" role="img" aria-label={demo.title} style={{ background: "#030a06", borderRadius: 16 }}>{demo.tags.map((t, i) => { const x = 70 + i * 190; const alarm = t.value >= t.hi || t.value <= t.lo; return <g key={t.id} transform={`translate(${x} 60)`}><rect x="-70" y="-36" width="140" height="72" rx="10" fill="#07130d" stroke={alarm ? "#ff4d6d" : "#39FF14"} /><text y="-12" textAnchor="middle" fontSize="11" fill="#ffe56a">{t.id}</text><text y="8" textAnchor="middle" fontSize="14" fontWeight="700" fill="#d7ffe9">{t.value} {t.unit}</text><text y="26" textAnchor="middle" fontSize="9" fill="#9fb3a8">{t.desc}</text></g>; })}</svg>
      <ul className="m-0 pl-5 text-sm">{demo.tags.map((t) => <li key={t.id}>{t.id} {t.desc}: {t.value} {t.unit} {t.value >= t.hi || t.value <= t.lo ? "— ALARM" : "— normal"} (band {t.lo}–{t.hi})</li>)}</ul>
    </div>}
  </div>;
}
type Conn = Record<string, boolean> | null;
/** Protocol status strip: MQTT / OPC UA / Modbus TCP / MCP (/api/mcp, read-only) + write lock. */
function ConnBar({ conn }: { conn: Conn }) {
  const [mcp, setMcp] = useState<{ ok: boolean; tools: number } | null>(null);
  useEffect(() => { fetch("/api/mcp").then((r) => r.json()).then((j) => setMcp({ ok: true, tools: (j.tools ?? []).length })).catch(() => setMcp({ ok: false, tools: 0 })); }, []);
  const items: [string, string, boolean | undefined, string][] = [["SIM", "Simulator", true, "Live flow-station simulator"], ["MQTT", "MQTT", conn?.mqtt, conn?.mqtt ? "Broker connected (MQTT_URL)" : "Not configured — set MQTT_URL"], ["OPC UA", "OPC UA", conn?.opcua, conn?.opcua ? "Gateway connected" : "Not configured — set OPCUA_GATEWAY_URL"], ["MODBUS", "Modbus TCP", conn?.modbus, conn?.modbus ? "Modbus host connected" : "Not configured — set MODBUS_HOST"], ["MCP", "MCP /api/mcp", mcp?.ok, mcp?.ok ? `MCP server online · ${mcp.tools} read-only tools` : "MCP checking…"]];
  return <section className="glass card" data-tour="scada-conn" aria-label="Connections" style={{ padding: 12 }}><div className="row" style={{ gap: 8 }}>
    {items.map(([k, l, on, tip], i) => <Tip key={k} label={tip}><motion.span initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * .06 }} className="pill text-xs" style={{ display: "inline-flex", gap: 6, alignItems: "center", borderColor: on ? "#39FF14" : "var(--line)" }}>
      <motion.span animate={on ? { opacity: [1, .35, 1] } : {}} transition={{ repeat: Infinity, duration: 1.6 }} style={{ width: 8, height: 8, borderRadius: 99, background: on ? "#39FF14" : on === undefined ? "#888" : "#ff5a5a", boxShadow: on ? "0 0 8px #39FF14" : "none" }} />{l} {on ? "online" : on === undefined ? "…" : "offline"}</motion.span></Tip>)}
    <Tip label="Real-plant writes are locked unless SCADA_ALLOW_WRITES=1 AND an operator approves each one"><span className="pill text-xs" style={{ borderColor: "#f5b301", color: "#f5b301" }}>🔒 Writes {conn?.writes ? "operator-approval only" : "disabled"}</span></Tip>
  </div></section>;
}
