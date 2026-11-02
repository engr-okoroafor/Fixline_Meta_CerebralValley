"use client";
import { motion } from "framer-motion";
export default function Banner({ img, tag, title, sub }: { img: string; tag: string; title: string; sub: string }) {
  return <motion.section className="banner" initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: .45 }}>
    {/* eslint-disable-next-line @next/next/no-img-element */}<img src={img} alt="" />
    <span className="pill blue">{tag}</span><h1>{title}</h1><p className="mute">{sub}</p></motion.section>;
}
export function Empty({ e, t, d }: { e: string; t: string; d?: string }) {
  return <div className="empty"><div className="e">{e}</div><b style={{ color: "var(--text)" }}>{t}</b>{d && <span style={{ fontSize: 13 }}>{d}</span>}</div>;
}
