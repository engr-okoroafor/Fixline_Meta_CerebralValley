"use client";
import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Tip } from "../ui";
function B({ up, show }: { up: boolean; show: boolean }) {
  return <AnimatePresence>{show && <Tip label={up ? "Back to top" : "Jump to bottom"} side={up ? "right" : "top"}><motion.button key={String(up)} initial={{ opacity: 0, scale: .6, y: up ? 10 : -10 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: .6 }} whileHover={{ scale: 1.12, y: up ? -3 : 3 }} whileTap={{ scale: .9 }}
    className="scroll-fab" aria-label={up ? "Back to top" : "Jump to bottom"} onClick={() => window.scrollTo({ top: up ? 0 : document.documentElement.scrollHeight, behavior: "smooth" })}>
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#39FF14" strokeWidth="2.4" strokeLinecap="round" style={{ transform: up ? "none" : "rotate(180deg)" }} aria-hidden><path d="M6 14l6-6 6 6" /><path d="M6 19l6-6 6 6" opacity=".45" /></svg></motion.button></Tip>}</AnimatePresence>;
}
/** All scroll controls live bottom-left; the chat FAB owns the lower-right corner alone. */
export function ScrollFabs() {
  const [y, setY] = useState(0); const [max, setMax] = useState(1);
  useEffect(() => { const f = () => { setY(window.scrollY); setMax(document.documentElement.scrollHeight - window.innerHeight); }; f(); window.addEventListener("scroll", f, { passive: true }); window.addEventListener("resize", f); return () => { window.removeEventListener("scroll", f); window.removeEventListener("resize", f); }; }, []);
  const pct = max > 0 ? Math.min(1, y / max) : 0;
  return <>
    <div className="fixed bottom-5 left-4 z-40 flex flex-col gap-2">
      <B up show={y > 300} />
      <B up={false} show={max > 400 && pct < .95 && y <= 300} />
      {max > 400 && <div aria-hidden className="h-1 w-10 overflow-hidden rounded-full" style={{ background: "rgba(57,255,20,.15)" }}><div style={{ width: `${pct * 100}%`, height: "100%", background: "#39FF14" }} /></div>}
    </div>
  </>;
}
