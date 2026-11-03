/** Schedule math for the Projects Gantt: critical path, status, costing notes, NL edits.
 * Dates are UTC date-only strings (YYYY-MM-DD), matching the rest of the planner. */
export type GanttTask = { id: string; name: string; phase?: string; start: string; end: string; owner: string; cost: number; done: number; dep?: string };
export type CpmRow = { id: string; name: string; duration: number; es: number; ef: number; ls: number; lf: number; float: number; critical: boolean; conflict: boolean };
export type BarStatus = "completed" | "in-progress" | "pending";
const DAY = 86400000;
export const dayNum = (iso: string) => Math.round(Date.parse(iso.slice(0, 10) + "T00:00:00Z") / DAY);
export const isoFrom = (n: number) => new Date(n * DAY).toISOString().slice(0, 10);
export const addDays = (iso: string, n: number) => isoFrom(dayNum(iso) + n);
export const spanDays = (a: string, b: string) => dayNum(b) - dayNum(a);
export const durationDays = (t: { start: string; end: string }) => Math.max(1, dayNum(t.end) - dayNum(t.start) + 1);

/** CPM on the bars as drawn. Float is calendar slack before a successor (or the project finish). A logic conflict is a start that begins before its predecessor finishes. */
export function analyseSchedule(tasks: GanttTask[]): { rows: CpmRow[]; path: string[]; projectDays: number; criticalIds: string[] } {
  if (!tasks.length) return { rows: [], path: [], projectDays: 0, criticalIds: [] };
  const byId = new Map(tasks.map((t) => [t.id, t]));
  const succs = new Map<string, string[]>(tasks.map((t) => [t.id, []]));
  for (const t of tasks) if (t.dep && byId.has(t.dep) && t.dep !== t.id) succs.get(t.dep)!.push(t.id);
  const indeg = new Map(tasks.map((t) => [t.id, t.dep && byId.has(t.dep) && t.dep !== t.id ? 1 : 0]));
  const q = tasks.filter((t) => indeg.get(t.id) === 0).map((t) => t.id);
  const order: string[] = []; const seen = new Set<string>();
  while (q.length) {
    const id = q.shift()!; if (seen.has(id)) continue; seen.add(id); order.push(id);
    for (const s of succs.get(id) ?? []) { indeg.set(s, (indeg.get(s) ?? 1) - 1); if ((indeg.get(s) ?? 0) <= 0) q.push(s); }
  }
  for (const t of tasks) if (!seen.has(t.id)) order.push(t.id);
  const anchor = Math.min(...tasks.map((t) => dayNum(t.start)));
  const es = new Map<string, number>(); const ef = new Map<string, number>(); const conflict = new Set<string>();
  for (const id of order) {
    const t = byId.get(id)!; const pred = t.dep && byId.has(t.dep) && t.dep !== t.id ? t.dep : undefined;
    const start = dayNum(t.start); const finish = dayNum(t.end) + 1;
    if (pred && start < ef.get(pred)!) conflict.add(id);
    es.set(id, start); ef.set(id, Math.max(finish, start + 1));
  }
  const projectEf = Math.max(...[...ef.values()]);
  const ls = new Map<string, number>(); const lf = new Map<string, number>();
  for (const id of [...order].reverse()) {
    const d = ef.get(id)! - es.get(id)!;
    const succ = (succs.get(id) ?? []).filter((s) => byId.get(s)?.dep === id);
    const lateF = succ.length ? Math.min(...succ.map((s) => ls.get(s) ?? projectEf)) : projectEf;
    lf.set(id, lateF); ls.set(id, lateF - d);
  }
  const rows: CpmRow[] = order.map((id) => {
    const t = byId.get(id)!; const float = (ls.get(id) ?? 0) - (es.get(id) ?? 0);
    return { id, name: t.name, duration: (ef.get(id) ?? 0) - (es.get(id) ?? 0), es: (es.get(id) ?? anchor) - anchor, ef: (ef.get(id) ?? anchor) - anchor, ls: (ls.get(id) ?? anchor) - anchor, lf: (lf.get(id) ?? anchor) - anchor, float, critical: float <= 0, conflict: conflict.has(id) };
  });
  const crit = new Set(rows.filter((r) => r.critical).map((r) => r.id));
  const starts = rows.filter((r) => r.critical && !(byId.get(r.id)?.dep && crit.has(byId.get(r.id)!.dep!))).sort((a, b) => a.es - b.es);
  const path: string[] = []; const guard = new Set<string>();
  let cursor = starts[0];
  while (cursor && !guard.has(cursor.id)) {
    guard.add(cursor.id); path.push(cursor.id);
    const nexts = (succs.get(cursor.id) ?? []).map((id) => rows.find((r) => r.id === id)).filter((r): r is CpmRow => !!r && r.critical).sort((a, b) => a.es - b.es);
    cursor = nexts[0];
  }
  return { rows, path, projectDays: projectEf - anchor, criticalIds: [...crit] };
}

export function scheduleWindow(tasks: { start: string; end: string }[]) {
  const a = Math.min(...tasks.map((t) => dayNum(t.start)));
  const b = Math.max(...tasks.map((t) => dayNum(t.end)));
  const span = Math.max(1, b - a + 1);
  return { a, b, span };
}
/** Bar left/width as fractions of the timeline. */
export function barBox(tasks: { start: string; end: string }[], t: { start: string; end: string }) {
  const { a, span } = scheduleWindow(tasks);
  const x = (dayNum(t.start) - a) / span;
  const w = Math.max(durationDays(t) / span, 0.012);
  return { x: Math.max(0, Math.min(1, x)), w: Math.min(1 - Math.max(0, x), w) };
}
export function barStatus(t: { done: number; start: string; end: string }, today: string): BarStatus {
  if (t.done >= 100) return "completed";
  if (t.done > 0 || (today >= t.start && today <= t.end) || today > t.end) return "in-progress";
  return "pending";
}

export type TimeCol = { label: string; days: number };
/** Vertical grid columns. Long jobs use the reference style (months 1–3, 4–6, …) so labels never collide. */
export function timeColumns(tasks: { start: string; end: string }[]): TimeCol[] {
  if (!tasks.length) return [{ label: "1", days: 7 }];
  const a = Math.min(...tasks.map((t) => dayNum(t.start)));
  const b = Math.max(...tasks.map((t) => dayNum(t.end)));
  const span = Math.max(1, b - a + 1);
  if (span <= 21) return Array.from({ length: span }, (_, i) => ({ label: isoFrom(a + i).slice(5), days: 1 }));
  if (span <= 120) { const cols: TimeCol[] = []; for (let d = 0; d < span; d += 7) cols.push({ label: isoFrom(a + d).slice(5), days: Math.min(7, span - d) }); return cols; }
  const months = Math.max(1, Math.ceil(span / 30.437));
  const group = months > 16 ? 3 : 1;
  const cols: TimeCol[] = [];
  for (let m = 1; m <= months; m += group) {
    const last = Math.min(months, m + group - 1);
    const startD = Math.round((m - 1) * 30.437);
    const endD = Math.min(span, Math.round(last * 30.437));
    cols.push({ label: group === 1 ? `M${m}` : `${m}–${last}`, days: Math.max(1, endD - startD) });
  }
  const used = cols.reduce((s, c) => s + c.days, 0);
  if (cols.length && used < span) cols[cols.length - 1].days += span - used;
  if (cols.length && used > span) cols[cols.length - 1].days = Math.max(1, cols[cols.length - 1].days - (used - span));
  return cols;
}

export function nextBestAction(tasks: GanttTask[], today: string, criticalIds: string[] = []): string {
  if (!tasks.length) return "Describe the job and build a plan — the critical path appears as soon as tasks exist.";
  const crit = new Set(criticalIds);
  const overdue = tasks.filter((t) => t.done < 100 && t.end < today).sort((a, b) => a.end.localeCompare(b.end));
  if (overdue.length) { const t = overdue[0]; return `Recover “${t.name}” — finish was ${t.end} and it is ${t.done}% complete${crit.has(t.id) ? " (critical path)" : ""}.`; }
  const active = tasks.filter((t) => t.done < 100 && t.start <= today && t.end >= today);
  const hot = active.find((t) => crit.has(t.id)) ?? active[0];
  if (hot) return `Advance “${hot.name}” (${hot.done}% · ${hot.owner || "unassigned"})${crit.has(hot.id) ? " — it is on the critical path" : ""}.`;
  const next = tasks.filter((t) => t.done < 100).sort((a, b) => a.start.localeCompare(b.start) || a.id.localeCompare(b.id))[0];
  if (next) return `Next up: “${next.name}” starts ${next.start}${next.owner ? `, owner ${next.owner}` : ""}.`;
  return "Every task is complete. Issue the handover pack and lessons learned.";
}

/** 2026 indicative rates — not a vendor quote. USD before FX display conversion. */
export const COST_BASIS = "Indicative 2026 US Gulf Coast / international EPC ranges (labor, equipment, construction). Not a tender. Contingency is separate.";
export const RATE_USD_2026 = { technicianDay: 480, engineerDay: 980, superintendentDay: 760, sealKit: 1900, bearingSet: 720, laserAlignCrew: 1400, ccgtUsdPerKw: 1120 };

export type CommandPatch = { tasks?: GanttTask[]; contingency?: number; switchTo?: string; note: string; handled: boolean };
const norm = (s: string) => s.toLowerCase().replace(/[^a-z0-9% ]+/g, " ").replace(/\s+/g, " ").trim();
function findTask(tasks: GanttTask[], hint: string) {
  const h = norm(hint);
  if (!h) return undefined;
  const byNum = h.match(/^(?:task\s*)?(\d{1,2})$/);
  if (byNum) return tasks[Number(byNum[1]) - 1];
  return tasks.find((t) => norm(t.name).includes(h)) ?? tasks.find((t) => h.includes(norm(t.name).slice(0, 12)));
}
/** Deterministic project edits so voice/text follow-ups work with no model key. */
export function applyProjectCommand(command: string, tasks: GanttTask[], contingency = 10): CommandPatch {
  const raw = command.trim(); const s = norm(raw);
  if (!s) return { note: "Say what to change.", handled: false };
  const sw = s.match(/^(?:open|switch to|show|go to)\s+(?:the\s+)?(?:project\s+)?(.+)$/);
  if (sw && /project|ccgt|pump|gantt|plant|overhaul/.test(s)) return { note: `Switching to “${sw[1]}”.`, switchTo: sw[1], handled: true };
  if (/next|what should|what next|best action/.test(s)) return { note: "Next best action is shown from the live schedule.", handled: true };
  const cont = s.match(/contingency(?:\s+to)?\s+(\d{1,2})/);
  if (cont) return { contingency: Math.max(0, Math.min(50, Number(cont[1]))), note: `Contingency set to ${cont[1]}%.`, handled: true };
  const disc = s.match(/(?:disconnect|remove|unlink)(?:\s+dependency|\s+link)?(?:\s+of|\s+on|\s+for)?\s+(.+)/);
  if (disc) { const t = findTask(tasks, disc[1]); if (!t) return { note: `No task matching “${disc[1]}”.`, handled: true }; return { tasks: tasks.map((x) => x.id === t.id ? { ...x, dep: undefined } : x), note: `Disconnected predecessor of “${t.name}”.`, handled: true }; }
  const link = s.match(/(?:connect|link)\s+(.+?)\s+(?:after|to|depends on)\s+(.+)/);
  if (link) {
    const child = findTask(tasks, link[1]); const parent = findTask(tasks, link[2]);
    if (!child || !parent || child.id === parent.id) return { note: "Name both tasks to connect.", handled: true };
    return { tasks: tasks.map((x) => x.id === child.id ? { ...x, dep: parent.id } : x), note: `“${child.name}” now depends on “${parent.name}”.`, handled: true };
  }
  const slip = s.match(/(?:slip|delay|push|move)\s+(.+?)\s+(?:by\s+)?(\d{1,3})\s+days?/);
  if (slip) { const t = findTask(tasks, slip[1]); const n = Number(slip[2]); if (!t) return { note: `No task matching “${slip[1]}”.`, handled: true }; return { tasks: tasks.map((x) => x.id === t.id ? { ...x, start: addDays(x.start, n), end: addDays(x.end, n) } : x), note: `Moved “${t.name}” by ${n} day(s).`, handled: true }; }
  const pct = s.match(/(?:set|mark|put|make)\s+(.+?)\s+(?:to\s+)?(\d{1,3})\s*(?:%|percent)\s*(?:complete|done)?/);
  if (pct) { const t = findTask(tasks, pct[1]); const n = Math.max(0, Math.min(100, Number(pct[2]))); if (!t) return { note: `No task matching “${pct[1]}”.`, handled: true }; return { tasks: tasks.map((x) => x.id === t.id ? { ...x, done: n } : x), note: `“${t.name}” set to ${n}%.`, handled: true }; }
  const done = s.match(/(?:complete|finish|close)\s+(.+)/);
  if (done) { const t = findTask(tasks, done[1].replace(/\s+(task|please)$/, "")); if (!t) return { note: `No task matching “${done[1]}”.`, handled: true }; return { tasks: tasks.map((x) => x.id === t.id ? { ...x, done: 100 } : x), note: `“${t.name}” marked complete.`, handled: true }; }
  if (/contingency/.test(s)) return { note: `Contingency is ${contingency}%. Say “set contingency to 12”.`, handled: true };
  return { note: "I can mark a task %, slip it by N days, connect/disconnect a dependency, set contingency, or switch project.", handled: false };
}

export type Showcase = { name: string; location: string; subtitle: string; capacity: string; timeline: string; summary: string; startISO: string; deliverables: string[]; impact: string[]; tasks: GanttTask[] };
const CCGT_ROWS: [string, string, number, number, string, number, number, number][] = [
  ["Finalize contracts & project team", "Mobilize", 0, 45, "PM", 2400000, 50, -1],
  ["Detailed engineering & design", "Mobilize", 20, 110, "Engineering", 8500000, 80, 0],
  ["Approvals & permits (Nigerian regs)", "Mobilize", 15, 100, "HSE", 1200000, 60, 0],
  ["Gas receiving & metering station", "Gas", 100, 80, "Process", 6800000, 100, 1],
  ["Gas processing & conditioning", "Gas", 140, 90, "Process", 14500000, 70, 3],
  ["Gas pipeline (onsite connection)", "Gas", 170, 100, "Pipeline", 18000000, 40, 4],
  ["Turbine hall & auxiliary systems", "Power", 200, 110, "Civil/Mech", 22000000, 30, 3],
  ["HRSG (Heat Recovery Steam Generator)", "Power", 240, 130, "HRSG", 28000000, 50, 4],
  ["Gas turbine installation & testing", "Power", 280, 120, "OEM", 31000000, 20, 6],
  ["Steam turbine & generator", "Steam", 360, 120, "OEM", 24000000, 10, 7],
  ["Condensers & balance of plant", "Steam", 420, 100, "Mechanical", 9500000, 0, 9],
  ["Cooling towers & water treatment", "Cooling", 390, 110, "Utilities", 7200000, 40, 7],
  ["Make-up & cooling water systems", "Cooling", 470, 90, "Utilities", 3400000, 0, 11],
  ["Switchyard & substation", "Electrical", 450, 120, "E&I", 11000000, 60, 6],
  ["Transmission lines to local grid", "Electrical", 520, 110, "E&I", 8600000, 30, 13],
  ["Site preparation & earthworks", "Civil", 80, 140, "Civil", 4800000, 80, 2],
  ["Buildings & foundations", "Civil", 160, 160, "Civil", 6200000, 70, 15],
  ["Mechanical & electrical installation", "Commission", 640, 120, "Construction", 12000000, 0, 8],
  ["Testing, commissioning & performance run", "Commission", 750, 90, "Commissioning", 4500000, 0, 17],
  ["Power, water & air utilities", "Utilities", 660, 100, "Utilities", 3100000, 50, 13],
  ["Access roads, drainage & fencing", "Utilities", 700, 80, "Civil", 2200000, 70, 15],
  ["Training of local personnel", "Handover", 820, 40, "PM", 800000, 0, 18],
  ["Project handover & first power to community", "Handover", 860, 30, "PM", 400000, 0, 21],
];
/** 150 MW CCGT showcase aligned with the reference chart. Costs are 2026 indicative EPC (about $1,120/kW order of magnitude). */
export function ccgtShowcase(startISO = "2026-08-03"): Showcase {
  const tasks: GanttTask[] = CCGT_ROWS.map(([name, phase, off, days, owner, cost, done, dep], k) => ({
    id: `c${k + 1}`, name, phase, start: addDays(startISO, off), end: addDays(startISO, off + days - 1), owner, cost, done, dep: dep >= 0 ? `c${dep + 1}` : undefined,
  }));
  return {
    name: "150 MW Combined-Cycle Gas Turbine Power Plant", location: "Oguta LGA, Imo State, Nigeria",
    subtitle: "Full EPC — From Design to First Power in 30 Months", capacity: "150 MW", timeline: "30 Months",
    summary: "EPC of a 150 MW CCGT at Oguta: gas supply, HRSG, steam cycle, cooling, grid connection, civil works and commissioning. Indicative 2026 costs, not a tender.",
    startISO, deliverables: ["150 MW reliable power", "Grid integration", "Economic growth"],
    impact: ["Power for Oguta & Imo State", "Job creation", "Energy security"], tasks,
  };
}
export const PHASE_ICON: Record<string, string> = { Mobilize: "📋", Gas: "🔥", Power: "⚡", Steam: "⚙", Cooling: "❄", Electrical: "🔌", Civil: "🏗", Commission: "🛠", Utilities: "💧", Handover: "🤝", Initiate: "📋", Plan: "📐", Execute: "🔧", Control: "✔", Close: "🤝" };
