"use client";
import { motion } from "framer-motion";
import { useEffect, useId, useSyncExternalStore } from "react";

/* One loader on screen at a time: when several lazy sections load together, the first mounted
   instance shows the holo panel and the rest collapse to a slim neon rail (no scattered boxes). */
let order: string[] = []; const subs = new Set<() => void>();
const emit = () => subs.forEach((f) => f());
const sub = (f: () => void) => { subs.add(f); return () => { subs.delete(f); }; };

function Core({ size = 28 }: { size?: number }) {
  return <div className="loader-core" style={{ width: size, height: size }} aria-hidden>
    <motion.span className="loader-ring" animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 1.1, ease: "linear" }} />
    <span className="loader-dot" />
  </div>;
}

/** Cohesive futuristic loader used by every lazy section. `full` = centered page-level variant. */
export function Loader({ label = "Loading module", full = false }: { label?: string; full?: boolean }) {
  const id = useId();
  useEffect(() => { order.push(id); emit(); return () => { order = order.filter((x) => x !== id); emit(); }; }, [id]);
  const primary = useSyncExternalStore(sub, () => full || order[0] === id || !order.includes(id), () => true);
  if (!primary) return <div role="presentation" className="loader-rail" aria-hidden><span className="loader-scan" /></div>;
  return <motion.div role="status" aria-live="polite" initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: .2 }}
    className={`glass loader-panel ${full ? "loader-full" : ""}`}>
    <Core size={full ? 40 : 28} />
    <div className="flex min-w-0 flex-1 flex-col gap-1.5">
      <span className="neon text-[10px] font-bold tracking-[.22em] uppercase notranslate">{label}</span>
      <span className="loader-bar" />
    </div>
  </motion.div>;
}

/** Full-screen centered variant for route-level loading. */
export function PageLoader({ label = "Booting FixLine Guardian" }: { label?: string }) {
  return <div className="loader-page"><Loader full label={label} /></div>;
}

/** Tiny inline neon spinner for buttons (document generation etc.). */
export function MiniSpin({ size = 14 }: { size?: number }) {
  return <motion.span aria-hidden className="inline-block rounded-full align-middle" style={{ width: size, height: size, border: "1.5px solid rgba(57,255,20,.2)", borderTopColor: "#39FF14", boxShadow: "0 0 8px rgba(57,255,20,.4)" }} animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: .9, ease: "linear" }} />;
}
