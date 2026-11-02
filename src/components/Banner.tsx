"use client";
import { motion } from "framer-motion";
/** Guardian-style section header (glass card, no photo). */
export default function Banner({ tag, title, sub }: { img?: string; tag: string; title: string; sub: string }) {
  return <motion.section initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: .3 }} className="glass card">
    <span className="pill" style={{ alignSelf: "flex-start" }}>{tag}</span>
    <div><h2 className="m-0 text-2xl font-extrabold md:text-3xl">{title}</h2><p className="muted m-0 text-sm">{sub}</p></div></motion.section>;
}
export function Empty({ e, t, d }: { e: string; t: string; d?: string }) {
  return <div className="empty"><div className="e">{e}</div><b style={{ color: "var(--fg)" }}>{t}</b>{d && <span className="text-xs">{d}</span>}</div>;
}
