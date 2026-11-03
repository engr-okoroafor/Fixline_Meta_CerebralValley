import { PHASE_ICON, analyseSchedule, barBox, barStatus, dayNum, timeColumns, type GanttTask } from "./schedule";
export type PaintSpec = {
  name: string; location?: string; subtitle?: string; capacity?: string; timeline?: string;
  tasks: GanttTask[]; deliverables?: string[]; impact?: string[]; today: string; showLinks: boolean; slogan?: string;
};
const GREEN = "#39FF14"; const GOLD = "#FFE56A"; const DIM = "#9fb3a8";
function round(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath(); ctx.moveTo(x + r, y); ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r); ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.closePath();
}
function wrap(ctx: CanvasRenderingContext2D, text: string, max: number) {
  const words = text.split(/\s+/); const lines: string[] = []; let cur = "";
  for (const w of words) { const n = cur ? `${cur} ${w}` : w; if (ctx.measureText(n).width > max && cur) { lines.push(cur); cur = w; } else cur = n; }
  if (cur) lines.push(cur); return lines.slice(0, 3);
}
/** Draw the futuristic Gantt (A3 landscape canvas). No truncation: activity names wrap. */
export function paintGantt(ctx: CanvasRenderingContext2D, W: number, H: number, spec: PaintSpec) {
  const tasks = spec.tasks;
  ctx.fillStyle = "#031208"; ctx.fillRect(0, 0, W, H);
  ctx.strokeStyle = "rgba(57,255,20,.08)"; ctx.lineWidth = 1;
  for (let x = 0; x < W; x += 48) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, H); ctx.stroke(); }
  for (let y = 0; y < H; y += 48) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke(); }
  const pad = Math.round(W * 0.018);
  const headerH = Math.round(H * 0.2);
  round(ctx, pad, pad, W - pad * 2, headerH, 28); ctx.fillStyle = "rgba(8,28,16,.92)"; ctx.fill(); ctx.strokeStyle = "rgba(57,255,20,.45)"; ctx.lineWidth = 2; ctx.stroke();
  const photoW = Math.round(W * 0.22); const photoX = W - pad - 18 - photoW; const photoY = pad + 16; const photoH = headerH - 32;
  round(ctx, photoX, photoY, photoW, photoH, 18); ctx.save(); ctx.clip();
  const g = ctx.createLinearGradient(photoX, photoY, photoX, photoY + photoH); g.addColorStop(0, "#1a3a6a"); g.addColorStop(0.45, "#0c2418"); g.addColorStop(1, "#f0a020"); ctx.fillStyle = g; ctx.fillRect(photoX, photoY, photoW, photoH);
  ctx.fillStyle = "rgba(0,0,0,.35)"; ctx.fillRect(photoX, photoY + photoH * 0.62, photoW, photoH * 0.38);
  ctx.fillStyle = "#123"; ctx.fillRect(photoX + photoW * 0.18, photoY + photoH * 0.42, photoW * 0.16, photoH * 0.28);
  ctx.fillRect(photoX + photoW * 0.4, photoY + photoH * 0.28, photoW * 0.12, photoH * 0.42);
  ctx.fillStyle = GOLD; ctx.fillRect(photoX + photoW * 0.62, photoY + photoH * 0.18, 8, photoH * 0.5);
  ctx.fillStyle = "rgba(255,180,60,.9)"; ctx.beginPath(); ctx.arc(photoX + photoW * 0.78, photoY + photoH * 0.22, 16, 0, Math.PI * 2); ctx.fill();
  ctx.restore(); ctx.strokeStyle = "rgba(57,255,20,.6)"; ctx.stroke();
  ctx.fillStyle = GOLD; ctx.font = `700 ${Math.round(H * 0.032)}px sans-serif`; ctx.textBaseline = "top";
  const titleLines = wrap(ctx, spec.name, photoX - pad - 80);
  titleLines.forEach((l, i) => ctx.fillText(l, pad + 28, pad + 22 + i * Math.round(H * 0.038)));
  ctx.fillStyle = "#e8fff0"; ctx.font = `${Math.round(H * 0.018)}px sans-serif`;
  ctx.fillText(spec.location || "Project site", pad + 28, pad + 28 + titleLines.length * Math.round(H * 0.038));
  ctx.fillStyle = GREEN; ctx.font = `${Math.round(H * 0.016)}px sans-serif`;
  ctx.fillText(spec.subtitle || "Full plan — design to handover", pad + 28, pad + 56 + titleLines.length * Math.round(H * 0.034));
  const pills: [string, string][] = [[spec.capacity || `${tasks.length} tasks`, "Capacity"], [spec.timeline || "Schedule", "Timeline"], [spec.location?.split(",")[0] || "Site", "Location"]];
  pills.forEach(([v, k], i) => {
    const x = pad + 28 + i * Math.round(W * 0.13); const y = pad + headerH - Math.round(H * 0.055);
    round(ctx, x, y, Math.round(W * 0.12), Math.round(H * 0.04), 16); ctx.fillStyle = "rgba(57,255,20,.12)"; ctx.fill(); ctx.strokeStyle = "rgba(57,255,20,.5)"; ctx.stroke();
    ctx.fillStyle = GREEN; ctx.font = `700 ${Math.round(H * 0.016)}px sans-serif`; ctx.fillText(v.slice(0, 22), x + 14, y + 8);
    ctx.fillStyle = DIM; ctx.font = `${Math.round(H * 0.011)}px sans-serif`; ctx.fillText(k, x + 14, y + Math.round(H * 0.024));
  });
  const analysis = analyseSchedule(tasks);
  const footerH = Math.round(H * 0.16);
  const top = pad + headerH + 16; const chartH = H - top - footerH - pad;
  const labelW = Math.round(W * 0.3);
  const chartX = pad + labelW; const chartW = W - chartX - pad;
  round(ctx, pad, top, W - pad * 2, chartH, 22); ctx.fillStyle = "rgba(2,12,8,.88)"; ctx.fill(); ctx.strokeStyle = "rgba(57,255,20,.28)"; ctx.stroke();
  const head = 36; const rows = Math.max(tasks.length, 1); const rowH = (chartH - head - 12) / rows;
  const cols = timeColumns(tasks); const spanDays = cols.reduce((s, c) => s + c.days, 0) || 1;
  ctx.font = `${Math.round(rowH * 0.28)}px sans-serif`; ctx.fillStyle = DIM; ctx.textBaseline = "middle";
  let acc = 0;
  cols.forEach((c) => {
    const x = chartX + (acc / spanDays) * chartW; acc += c.days;
    ctx.strokeStyle = "rgba(57,255,20,.22)"; ctx.beginPath(); ctx.moveTo(x, top + head); ctx.lineTo(x, top + chartH - 8); ctx.stroke();
    ctx.fillStyle = GOLD; ctx.textAlign = "center"; ctx.fillText(c.label, x + ((c.days / spanDays) * chartW) / 2, top + head / 2 + 4);
  });
  ctx.textAlign = "left";
  const today = spec.today;
  if (tasks.length) {
    const a = Math.min(...tasks.map((t) => dayNum(t.start))); const b = Math.max(...tasks.map((t) => dayNum(t.end)));
    const span = Math.max(1, b - a + 1); const td = dayNum(today);
    if (td >= a && td <= b) {
      const x = chartX + ((td - a) / span) * chartW;
      ctx.save(); ctx.strokeStyle = "#ff4d4d"; ctx.setLineDash([8, 6]); ctx.beginPath(); ctx.moveTo(x, top + 8); ctx.lineTo(x, top + chartH - 8); ctx.stroke(); ctx.restore();
      ctx.fillStyle = "#ff4d4d"; ctx.font = `700 ${Math.round(rowH * 0.28)}px sans-serif`; ctx.fillText("TODAY", x + 6, top + 16);
    }
  }
  const crit = new Set(analysis.criticalIds);
  tasks.forEach((t, i) => {
    const y = top + head + i * rowH;
    ctx.fillStyle = i % 2 ? "rgba(57,255,20,.04)" : "transparent"; ctx.fillRect(pad + 8, y, W - pad * 2 - 16, rowH);
    const icon = PHASE_ICON[t.phase ?? ""] ?? "▸";
    ctx.fillStyle = GOLD; ctx.font = `${Math.round(rowH * 0.34)}px sans-serif`; ctx.textBaseline = "middle";
    const lines = wrap(ctx, `${i + 1}. ${icon} ${t.name}`, labelW - 28);
    lines.forEach((l, li) => ctx.fillText(l, pad + 16, y + rowH * (0.34 + li * 0.28)));
    const box = tasks.length ? barBox(tasks, t) : { x: 0, w: 0.1 };
    const x = chartX + box.x * chartW; const bw = Math.max(8, box.w * chartW); const by = y + rowH * 0.22; const bh = rowH * 0.5;
    const st = barStatus(t, today);
    ctx.beginPath(); round(ctx, x, by, bw, bh, bh / 2);
    if (st === "pending") { ctx.strokeStyle = "rgba(57,255,20,.75)"; ctx.setLineDash([5, 4]); ctx.stroke(); ctx.setLineDash([]); }
    else {
      const grd = ctx.createLinearGradient(x, by, x + bw, by); grd.addColorStop(0, "#b6ff5c"); grd.addColorStop(1, GREEN);
      ctx.fillStyle = grd; ctx.shadowColor = GREEN; ctx.shadowBlur = st === "completed" ? 16 : 8; ctx.fill(); ctx.shadowBlur = 0;
      if (st === "in-progress" && t.done < 100) { ctx.fillStyle = "rgba(3,18,8,.45)"; ctx.fillRect(x + bw * Math.max(0.08, t.done / 100), by, bw * (1 - Math.max(0.08, t.done / 100)), bh); }
    }
    if (crit.has(t.id)) { ctx.strokeStyle = GOLD; ctx.lineWidth = 2; round(ctx, x - 1, by - 1, bw + 2, bh + 2, bh / 2); ctx.stroke(); ctx.lineWidth = 1; }
    ctx.fillStyle = GOLD; ctx.font = `700 ${Math.round(rowH * 0.28)}px sans-serif`; ctx.fillText(`${t.done}%`, x + bw + 8, y + rowH / 2);
    if (spec.showLinks && t.dep) {
      const pi = tasks.findIndex((z) => z.id === t.dep); if (pi >= 0) {
        const pb = barBox(tasks, tasks[pi]); const x1 = chartX + (pb.x + pb.w) * chartW; const y1 = top + head + pi * rowH + rowH / 2; const y2 = y + rowH / 2;
        ctx.save(); ctx.strokeStyle = "rgba(180,255,190,.7)"; ctx.setLineDash([4, 4]); ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x1 + 10, y1); ctx.lineTo(x1 + 10, y2); ctx.lineTo(x, y2); ctx.stroke(); ctx.restore();
      }
    }
  });
  const fy = top + chartH + 12; const gap = 16; const fw = (W - pad * 2 - gap * 2) / 3;
  const cards: [string, string[]][] = [
    ["Key Deliverables", spec.deliverables?.length ? spec.deliverables : ["Scope signed off", "Commissioning complete", "Handover dossier"]],
    ["Project Impact", spec.impact?.length ? spec.impact : ["Safer maintenance", "Less repeat failure", "Clear ownership"]],
    ["Legend", ["Completed", "In progress", "Pending", spec.slogan || "Powering Progress."]],
  ];
  cards.forEach(([title, lines], i) => {
    const x = pad + i * (fw + gap); round(ctx, x, fy, fw, footerH - 20, 18); ctx.fillStyle = "rgba(8,28,16,.92)"; ctx.fill(); ctx.strokeStyle = "rgba(57,255,20,.4)"; ctx.stroke();
    ctx.fillStyle = GOLD; ctx.font = `700 ${Math.round(H * 0.018)}px sans-serif`; ctx.textBaseline = "top"; ctx.fillText(title, x + 16, fy + 12);
    ctx.fillStyle = "#e7ffe8"; ctx.font = `${Math.round(H * 0.015)}px sans-serif`;
    lines.slice(0, 5).forEach((l, li) => ctx.fillText((title === "Legend" ? "" : "✓ ") + l, x + 16, fy + 40 + li * Math.round(H * 0.022)));
  });
}
