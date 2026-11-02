"use client";
import * as T from "@radix-ui/react-tooltip";
import { motion } from "framer-motion";
import { useEffect, useRef } from "react";
export function Tip({ label, children, side = "top", align = "center" }: { label: string; children: React.ReactNode; side?: "top" | "right" | "bottom" | "left"; align?: "start" | "center" | "end" }) {
  return <T.Provider delayDuration={250}><T.Root><T.Trigger asChild>{children}</T.Trigger><T.Portal><T.Content className="tip" side={side} align={align} sideOffset={10} collisionPadding={8}>{label}<T.Arrow fill="#39FF14" /></T.Content></T.Portal></T.Root></T.Provider>;
}
export const TipProvider = ({ children }: { children: React.ReactNode }) => <T.Provider>{children}</T.Provider>;
export function Btn({ tip, className = "", ...p }: React.ButtonHTMLAttributes<HTMLButtonElement> & { tip: string }) {
  return <Tip label={tip}><button type="button" aria-label={p["aria-label"] ?? (typeof p.children === "string" && p.children.length > 3 ? undefined : tip)} className={`btn ${className}`} {...p} /></Tip>;
}
export function Card({ title, sub, children, className = "", right }: { title?: string; sub?: string; children: React.ReactNode; className?: string; right?: React.ReactNode }) {
  return <motion.section initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: .3 }} className={`glass card ${className}`}>
    {title && <header className="row" style={{ justifyContent: "space-between" }}><div><h2 className="m-0 text-lg font-bold">{title}</h2>{sub && <p className="m-0 text-sm muted">{sub}</p>}</div>{right}</header>}{children}</motion.section>;
}
export function Field({ label, tip, children }: { label: string; tip?: string; children: React.ReactNode }) {
  return <label className="field"><span className="row" style={{ gap: 4 }}>{label}{tip && <Tip label={tip}><span tabIndex={0} role="img" aria-label={`Help: ${tip}`} className="pill" style={{ padding: "0 6px" }}>?</span></Tip>}</span>{children}</label>;
}
export function Gauge({ value, max, label, unit, warn, crit }: { value: number; max: number; label: string; unit: string; warn?: number; crit?: number }) {
  const f = Math.max(0, Math.min(1, value / max)); const c = crit !== undefined && value >= crit ? "var(--danger)" : warn !== undefined && value >= warn ? "var(--warn)" : "var(--neon)";
  const R = 42, L = Math.PI * R;
  return <figure className="m-0 flex flex-col items-center" aria-label={`${label} ${value.toFixed(1)} ${unit}`}>
    <svg viewBox="0 0 100 60" width="100%" style={{ maxWidth: 160 }}><path d="M8 54a42 42 0 0 1 84 0" fill="none" stroke="var(--line)" strokeWidth="8" strokeLinecap="round" />
      <motion.path d="M8 54a42 42 0 0 1 84 0" fill="none" stroke={c} strokeWidth="8" strokeLinecap="round" strokeDasharray={L} animate={{ strokeDashoffset: L * (1 - f) }} transition={{ type: "spring", stiffness: 60 }} style={{ filter: `drop-shadow(0 0 4px ${c})` }} />
      <text x="50" y="50" textAnchor="middle" fontSize="15" fontWeight="700" fill="currentColor">{value.toFixed(1)}</text></svg>
    <figcaption className="text-xs muted text-center">{label} ({unit})</figcaption></figure>;
}
export function Particles() {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => { const c = ref.current!; const g = c.getContext("2d")!; let raf = 0; const P = Array.from({ length: 50 }, () => ({ x: Math.random(), y: Math.random(), v: 0.0005 + Math.random() * 0.0015, r: 1 + Math.random() * 2 }));
    const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
    const draw = () => { c.width = c.clientWidth; c.height = c.clientHeight; g.clearRect(0, 0, c.width, c.height); for (const p of P) { if (!reduce) p.y -= p.v; if (p.y < 0) p.y = 1; g.fillStyle = "rgba(57,255,20,.55)"; g.beginPath(); g.arc(p.x * c.width, p.y * c.height, p.r, 0, 7); g.fill(); } raf = requestAnimationFrame(draw); };
    draw(); return () => cancelAnimationFrame(raf); }, []);
  return <canvas ref={ref} aria-hidden className="pointer-events-none absolute inset-0 h-full w-full" />;
}
/** Original generated hero illustration: plant skyline + turbine + headset wireframe (no photos, no logos). */
export function HeroArt() {
  return <svg viewBox="0 0 600 260" width="100%" role="img" aria-label="Illustration of an industrial plant with pipes, tanks and a turbine" style={{ display: "block" }}>
    <defs><linearGradient id="hg" x1="0" x2="0" y1="0" y2="1"><stop offset="0" stopColor="#39FF14" stopOpacity=".5" /><stop offset="1" stopColor="#00FF9C" stopOpacity="0" /></linearGradient></defs>
    <g stroke="#39FF14" strokeWidth="2" fill="none" opacity=".9">
      <rect x="40" y="120" width="70" height="110" rx="10" /><rect x="40" y="170" width="70" height="60" fill="url(#hg)" stroke="none" />
      <ellipse cx="200" cy="175" rx="60" ry="30" /><path d="M140 175v40h120v-40" /><rect x="320" y="90" width="18" height="140" /><path d="M329 90l-12-40h24z" /><path d="M329 50c8-18 4-30 0-40" className="flow" stroke="#ff8a3d" />
      <circle cx="470" cy="150" r="46" /><g style={{ transformOrigin: "470px 150px", animation: "spin 6s linear infinite" }}><path d="M470 150l0-40M470 150l35 20M470 150l-35 20" strokeWidth="4" /></g>
      <path className="flow" d="M110 200h30M260 200h60M338 200h86" stroke="#00FF9C" strokeWidth="3" /><path d="M0 232h600" opacity=".4" />
    </g><style>{"@keyframes spin{to{transform:rotate(360deg)}}"}</style></svg>;
}
