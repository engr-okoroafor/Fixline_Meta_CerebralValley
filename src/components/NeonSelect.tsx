"use client";
import React, { useMemo, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";

type Opt = { value: string; label: React.ReactNode; group?: string; disabled?: boolean };
type Props = { value?: string | number; onChange?: (e: { target: { value: string }; currentTarget: { value: string } }) => void; children?: React.ReactNode; disabled?: boolean; style?: React.CSSProperties; className?: string; id?: string; name?: string; "aria-label"?: string; title?: string };

const text = (n: React.ReactNode): string => typeof n === "string" || typeof n === "number" ? String(n) : Array.isArray(n) ? n.map(text).join("") : React.isValidElement(n) ? text((n.props as { children?: React.ReactNode }).children) : "";
function collect(children: React.ReactNode, group?: string, out: Opt[] = []): Opt[] {
  React.Children.forEach(children, (c) => {
    if (!React.isValidElement(c)) return;
    const p = c.props as { value?: string | number; children?: React.ReactNode; label?: string; disabled?: boolean };
    if (c.type === "optgroup") collect(p.children, p.label, out);
    else if (c.type === "option") out.push({ value: p.value !== undefined ? String(p.value) : text(p.children), label: p.children, group, disabled: p.disabled });
    else if (c.type === React.Fragment) collect(p.children, group, out);
  });
  return out;
}
/** Drop-in neon/glass replacement for a native select, sharing the floating-menu language dropdown design (.lang-pill / .lang-menu). */
export function NeonSelect({ value, onChange, children, disabled, style, className = "", id, "aria-label": aria, title }: Props) {
  const opts = useMemo(() => collect(children), [children]);
  const [open, setOpen] = useState(false); const [hi, setHi] = useState(-1); const uid = useRef(`ns-${Math.random().toString(36).slice(2, 8)}`).current;
  const cur = opts.find((o) => o.value === String(value ?? "")) ?? opts[0];
  const pick = (v: string) => { onChange?.({ target: { value: v }, currentTarget: { value: v } }); setOpen(false); };
  const move = (d: number) => { const i = opts.findIndex((o) => o.value === cur?.value); const n = opts[Math.max(0, Math.min(opts.length - 1, i + d))]; if (n) pick(n.value); };
  let lastGroup: string | undefined;
  return <div className={`lang-dd neon-select ${className}`} style={style} onKeyDown={(e) => { if (e.key === "Escape") setOpen(false); }} onBlur={(e) => { if (!e.currentTarget.contains(e.relatedTarget as Node)) setOpen(false); }}>
    <button type="button" id={id} title={title} disabled={disabled} className="lang-pill neon-select-btn" aria-haspopup="listbox" aria-expanded={open} aria-label={aria} onClick={() => setOpen(!open)}
      onKeyDown={(e) => { if (e.key === "ArrowDown") { e.preventDefault(); if (open) move(1); else setOpen(true); } if (e.key === "ArrowUp") { e.preventDefault(); move(-1); } }}>
      <span className="truncate text-sm">{cur?.label ?? "—"}</span>
      <motion.svg animate={{ rotate: open ? 180 : 0 }} width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#39FF14" strokeWidth="3" aria-hidden style={{ flexShrink: 0 }}><path d="M6 9l6 6 6-6" /></motion.svg>
    </button>
    <AnimatePresence>{open && <motion.ul role="listbox" aria-label={aria} initial={{ opacity: 0, y: -8, scale: .96, filter: "blur(4px)" }} animate={{ opacity: 1, y: 0, scale: 1, filter: "blur(0px)" }} exit={{ opacity: 0, y: -6, scale: .97 }} transition={{ duration: .18 }} className="lang-menu neon-select-menu">
      {opts.map((o, i) => { const head = o.group && o.group !== lastGroup ? o.group : null; lastGroup = o.group; const on = o.value === cur?.value;
        return <React.Fragment key={`${o.group ?? ""}-${o.value}-${i}`}>{head && <li role="presentation" className="neon-select-group">{head}</li>}
          <li role="option" aria-selected={on} aria-disabled={o.disabled} tabIndex={0} onMouseEnter={() => setHi(i)} onMouseLeave={() => setHi(-1)} onClick={() => !o.disabled && pick(o.value)} onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); if (!o.disabled) pick(o.value); } }} className={`lang-opt ${on ? "on" : ""}`}>
            {hi === i && <motion.span layoutId={`${uid}-hi`} className="lang-hi" transition={{ type: "spring", stiffness: 500, damping: 34 }} />}<span className="relative">{o.label}</span>{on && <span className="relative neon">✓</span>}</li></React.Fragment>; })}
    </motion.ul>}</AnimatePresence></div>;
}
export default NeonSelect;
