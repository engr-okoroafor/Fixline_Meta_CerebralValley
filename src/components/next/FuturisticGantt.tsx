"use client";
import { useMemo, useRef, useState } from "react";
import { motion } from "framer-motion";
import { PHASE_ICON, analyseSchedule, addDays, barBox, barStatus, dayNum, durationDays, nextBestAction, timeColumns, type GanttTask } from "@/lib/schedule";
export type GanttModel = { name: string; location?: string; subtitle?: string; capacity?: string; timeline?: string; tasks: GanttTask[]; deliverables?: string[]; impact?: string[]; heroPhoto?: string; slogan?: string };
const todayIso = () => new Date().toISOString().slice(0, 10);
/** Night-plant mark: slate and cyan only. No sunset fill — that read as a broken brown patch. */
function PlantMark() {
  return <svg className="fgantt-mark" viewBox="0 0 320 180" aria-hidden>
    <defs>
      <linearGradient id="fgantt-sky" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#071422" /><stop offset="1" stopColor="#0a242c" /></linearGradient>
      <linearGradient id="fgantt-steel" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#1a3a48" /><stop offset="1" stopColor="#071018" /></linearGradient>
    </defs>
    <rect width="320" height="180" fill="url(#fgantt-sky)" />
    <g stroke="#39e7ff" strokeOpacity=".35" fill="none">{[40, 80, 120, 160].map((y) => <line key={y} x1="0" x2="320" y1={y} y2={y} />)}{[40, 80, 120, 160, 200, 240, 280].map((x) => <line key={x} y1="0" y2="180" x1={x} x2={x} />)}</g>
    <rect y="132" width="320" height="48" fill="#050d12" />
    <g fill="url(#fgantt-steel)" stroke="#39e7ff" strokeWidth="1.4">
      <rect x="28" y="78" width="70" height="54" rx="2" />
      <rect x="108" y="58" width="46" height="74" rx="2" />
      <rect x="164" y="88" width="78" height="44" rx="2" />
      <polygon points="250,132 262,46 274,132" />
    </g>
    <g fill="#39FF14">
      <rect x="40" y="92" width="8" height="6" /><rect x="54" y="92" width="8" height="6" /><rect x="68" y="92" width="8" height="6" />
      <rect x="118" y="72" width="8" height="6" /><rect x="132" y="72" width="8" height="6" />
      <rect x="176" y="100" width="10" height="5" /><rect x="192" y="100" width="10" height="5" /><rect x="208" y="100" width="10" height="5" />
    </g>
    <circle cx="268" cy="36" r="5" fill="#7af6ff" opacity=".9" />
    <path d="M268 44 v18" stroke="#7af6ff" strokeWidth="2" />
  </svg>;
}
const STATUS_COLOR = { completed: "#39FF14", "in-progress": "#b6ff4a", pending: "transparent" } as const;
/** Reference-style Gantt: full activity text, month grid, dependency connectors, today line, critical path, footer. */
export function FuturisticGantt({ model, showLinks, onPatch }: { model: GanttModel; showLinks: boolean; onPatch?: (id: string, patch: Partial<GanttTask>) => void }) {
  const tasks = model.tasks;
  const today = todayIso();
  const analysis = useMemo(() => analyseSchedule(tasks), [tasks]);
  const cols = useMemo(() => timeColumns(tasks), [tasks]);
  const crit = useMemo(() => new Set(analysis.criticalIds), [analysis]);
  const nba = nextBestAction(tasks, today, analysis.criticalIds);
  const host = useRef<HTMLDivElement>(null);
  const [drag, setDrag] = useState<null | { id: string; edge: "start" | "end" | "move"; x0: number; start: string; end: string }>(null);
  const [tip, setTip] = useState<null | { t: GanttTask; x: number; y: number }>(null);
  const span = tasks.length ? Math.max(...tasks.map((t) => dayNum(t.end))) - Math.min(...tasks.map((t) => dayNum(t.start))) + 1 : 1;
  function daysAt(clientX: number) {
    const el = host.current; if (!el) return 0;
    const r = el.getBoundingClientRect();
    return ((clientX - r.left) / Math.max(1, r.width)) * span;
  }
  function move(e: React.PointerEvent) {
    if (!drag || !onPatch) return;
    const delta = Math.round(daysAt(e.clientX) - drag.x0);
    if (drag.edge === "move") onPatch(drag.id, { start: addDays(drag.start, delta), end: addDays(drag.end, delta) });
    else if (drag.edge === "start") { const start = addDays(drag.start, delta); if (start <= drag.end) onPatch(drag.id, { start }); }
    else { const end = addDays(drag.end, delta); if (end >= drag.start) onPatch(drag.id, { end }); }
  }
  const rows: ({ kind: "phase"; phase: string } | { kind: "task"; task: GanttTask; n: number })[] = [];
  let n = 0; let prev = "";
  for (const t of tasks) {
    const phase = t.phase || "Activities";
    if (phase !== prev) { rows.push({ kind: "phase", phase }); prev = phase; }
    n += 1; rows.push({ kind: "task", task: t, n });
  }
  const yMid = new Map<string, number>();
  let yAcc = 0;
  for (const r of rows) { const h = r.kind === "phase" ? 32 : 52; if (r.kind === "task") yMid.set(r.task.id, yAcc + h / 2); yAcc += h; }
  return <div className="fgantt" data-testid="fgantt" data-notranslate onPointerMove={move} onPointerUp={() => setDrag(null)} onPointerLeave={() => { setDrag(null); setTip(null); }}>
    <header className="fgantt-head">
      <div className="fgantt-title">
        <h3 data-testid="gantt-title">{model.name}</h3>
        <p>{model.location || "Project location"}</p>
        <p className="fgantt-sub">{model.subtitle || "Full plan — design through handover"}</p>
        <div className="fgantt-pills">
          <span><b>{model.capacity || `${tasks.length} tasks`}</b><small>Capacity</small></span>
          <span><b>{model.timeline || `${analysis.projectDays} days`}</b><small>Timeline</small></span>
          <span><b>{(model.location || "Site").split(",")[0]}</b><small>Location</small></span>
        </div>
      </div>
      <div className="fgantt-photo" aria-hidden>{model.heroPhoto ? <img src={model.heroPhoto} alt="" /> : <PlantMark />}</div>
    </header>
    <div className="fgantt-chart">
      <div className="fgantt-labels">
        <div className="fgantt-monthspace" />
        {rows.map((r) => r.kind === "phase" ? <div key={r.phase} className="fgantt-phase">{PHASE_ICON[r.phase] ?? "▸"} {r.phase}</div> : <div key={r.task.id} className={`fgantt-name st-${barStatus(r.task, today)}`} title={r.task.name}><span>{r.n}. {r.task.name}</span>{crit.has(r.task.id) && <em>CP</em>}</div>)}
      </div>
      <div className="fgantt-time" ref={host}>
        <div className="fgantt-months">{cols.map((c) => <div key={c.label} style={{ flex: c.days }}>{c.label}</div>)}</div>
        <div className="fgantt-rows">
          {cols.map((c, i) => <i key={c.label + i} className="fgantt-vline" style={{ left: `${(cols.slice(0, i).reduce((s, x) => s + x.days, 0) / Math.max(1, cols.reduce((s, x) => s + x.days, 0))) * 100}%` }} />)}
          {tasks.length > 0 && (() => { const a = Math.min(...tasks.map((t) => dayNum(t.start))); const b = Math.max(...tasks.map((t) => dayNum(t.end))); const td = dayNum(today); if (td < a || td > b) return null; return <div className="fgantt-today" style={{ left: `${((td - a) / Math.max(1, b - a + 1)) * 100}%` }}><span>TODAY</span></div>; })()}
          {showLinks && <svg className="fgantt-links" viewBox={`0 0 1000 ${Math.max(yAcc, 1)}`} preserveAspectRatio="none" aria-hidden>{tasks.map((t) => {
            if (!t.dep) return null; const p = tasks.find((z) => z.id === t.dep); if (!p) return null;
            const a = barBox(tasks, p); const b = barBox(tasks, t);
            const y1 = yMid.get(p.id) ?? 0; const y2 = yMid.get(t.id) ?? 0;
            const x1 = (a.x + a.w) * 1000; const x2 = b.x * 1000;
            return <path key={t.id} d={`M${x1} ${y1} H${Math.min(990, x1 + 14)} V${y2} H${x2}`} fill="none" stroke="rgba(190,255,200,.9)" strokeDasharray="6 4" vectorEffect="non-scaling-stroke" strokeWidth={1.6} />;
          })}</svg>}
          {rows.map((r) => r.kind === "phase" ? <div key={r.phase} className="fgantt-phasegap" /> : (() => {
            const t = r.task; const box = barBox(tasks, t); const st = barStatus(t, today);
            const grab = (edge: "start" | "end" | "move") => (e: React.PointerEvent) => { if (!onPatch) return; e.stopPropagation(); e.currentTarget.setPointerCapture(e.pointerId); setTip(null); setDrag({ id: t.id, edge, x0: daysAt(e.clientX), start: t.start, end: t.end }); };
            return <div key={t.id} className="fgantt-row" data-testid="gantt-bar">
              <motion.div className={`fgantt-bar st-${st}${crit.has(t.id) ? " is-cp" : ""}`} initial={false} animate={{ left: `${box.x * 100}%`, width: `${box.w * 100}%` }} transition={{ type: "spring", stiffness: 260, damping: 28, duration: drag ? 0.01 : undefined }}
                onPointerDown={grab("move")} onPointerEnter={(e) => !drag && setTip({ t, x: e.clientX, y: e.clientY })} onPointerLeave={() => setTip(null)} role="img" aria-label={`${t.name}, ${t.done}% ${st}`}>
                <i style={{ width: `${st === "pending" ? 0 : Math.max(8, t.done)}%`, background: STATUS_COLOR[st] }} />
                <b onPointerDown={grab("start")} /><b className="end" onPointerDown={grab("end")} />
              </motion.div>
              <span className="fgantt-pct" style={{ left: `calc(${(box.x + box.w) * 100}% + 8px)` }}>{t.done}%</span>
            </div>;
          })())}
        </div>
        {tip && host.current && <div className="fgantt-tip" role="tooltip" data-testid="gantt-tip" style={{ left: tip.x - host.current.getBoundingClientRect().left + 12, top: tip.y - host.current.getBoundingClientRect().top + 12 }}><b>{tip.t.name}</b><div>{tip.t.start} → {tip.t.end} · {durationDays(tip.t)}d · {tip.t.owner || "unassigned"}</div><div>{barStatus(tip.t, today)} · {tip.t.done}% · float {analysis.rows.find((r) => r.id === tip.t.id)?.float ?? 0}d{crit.has(tip.t.id) ? " · critical" : ""}{analysis.rows.find((r) => r.id === tip.t.id)?.conflict ? " · overlaps predecessor" : ""}</div></div>}
      </div>
    </div>
    <footer className="fgantt-foot">
      <section><h4>Key Deliverables</h4><ul>{(model.deliverables?.length ? model.deliverables : ["Signed baseline", "Commissioning record", "Handover dossier"]).map((d) => <li key={d}>{d}</li>)}</ul></section>
      <section><h4>Project Impact</h4><ul>{(model.impact?.length ? model.impact : ["Clear ownership", "Fewer repeat failures", "A schedule the crew can run"]).map((d) => <li key={d}>{d}</li>)}</ul></section>
      <section className="fgantt-legend"><p>{model.slogan || "Powering Progress. Lighting Our Community"}</p>
        <span><i className="sw done" /> Completed</span><span><i className="sw run" /> In progress</span><span><i className="sw wait" /> Pending</span>
        <span><i className="sw cp" /> Critical path</span></section>
    </footer>
    <p className="fgantt-nba" data-testid="next-best">{nba}{analysis.path.length > 0 && <span> Critical path: {analysis.path.map((id) => tasks.find((t) => t.id === id)?.name).filter(Boolean).join(" → ")} ({analysis.projectDays} days).</span>}</p>
  </div>;
}
export function criticalSummary(tasks: GanttTask[]) {
  const a = analyseSchedule(tasks);
  return { ...a, text: a.path.length ? a.path.map((id) => tasks.find((t) => t.id === id)?.name).filter(Boolean).join(" → ") : "No critical path yet" };
}
