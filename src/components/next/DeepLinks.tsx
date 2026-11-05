"use client";
import { motion } from "framer-motion";
import { Tip } from "../ui";
const LINKS: [string, string, string, RegExp][] = [
  ["repair", "🔧 Repair", "Guided repair with camera + manual", /repair|replace|bearing|seal|fix|motor|pump|gearbox/i],
  ["safety", "⛑ Safety", "Hazards, PTW / LOTO / JSA documents", /safety|loto|permit|hazard|fire|ppe|lock/i],
  ["eng", "📐 Engineering", "Machine, cable, piping, WPS calculators", /cable|pipe|weld|wps|flange|schedule|size/i],
  ["scada", "📟 SCADA", "Live tags, alarms, AI advisor", /scada|alarm|pressure|level|flow|plc|tag|trip/i],
  ["quality", "✔ Quality", "Visual inspector and shift report", /quality|inspect|defect|weld|crack|ncr/i],
  ["tuning", "🎛 Tuning", "Alignment, PID, megger, vibration", /align|vibration|pid|megger|tune|shim|coupling/i],
  ["projects", "📊 Projects", "Project-management stage deliverables (PMP, PRINCE2, …) + Gantt", /project|plan|schedule|cost|install|layout/i],
];
export const go = (m: string) => window.dispatchEvent(new CustomEvent("fixline:go", { detail: m }));
/** Deep-link chips into the structured pages that hold the accurate data for this answer. */
export function DeepLinks({ text }: { text: string }) {
  const hits = LINKS.filter((l) => l[3].test(text)); const show = hits.length ? hits : LINKS.slice(0, 3);
  return <nav aria-label="Open related tools" className="row">
    <span className="text-xs muted">Continue in →</span>
    {show.map(([m, l, tip], i) => <Tip key={m} label={tip}><motion.button initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * .05 }} whileHover={{ scale: 1.05 }} type="button" className="btn text-sm" onClick={() => go(m)}>{l}</motion.button></Tip>)}
  </nav>;
}
