"use client";
import Link from "next/link"; import { usePathname } from "next/navigation";
import { useEffect, useState } from "react"; import { motion, AnimatePresence } from "framer-motion";
import { TipProvider, Tip, Btn } from "./ui"; import { ScrollFabs } from "./next/ScrollFabs";
const TABS: [string, string, string, string][] = [["/", "⌂", "Overview", "Start here"], ["/glasses", "👓", "Glasses HUD", "Diagnose: SAM 3.1 finds the part, Muse Spark explains"], ["/safety", "⛑", "Safety", "LOTO gate and post-repair inspection"], ["/repair", "🔧", "Repair", "Camera-confirmed guided steps"], ["/qa", "✔", "Quality", "Line QA scan and shift report"], ["/admin", "📋", "Jobs", "Supervisor: job status and audit trail"], ["/settings", "⚙", "Settings", "Crew language, Meta engines, device"]];
export default function Shell({ children }: { children: React.ReactNode }) {
  const p = usePathname(); const [dark, setDark] = useState(true); const [mini, setMini] = useState(false);
  useEffect(() => { setMini(localStorage.getItem("fixline.sidebar") === "mini"); const t = localStorage.getItem("fixline.theme"); if (t) setDark(t === "dark"); }, []);
  useEffect(() => { localStorage.setItem("fixline.sidebar", mini ? "mini" : "full"); }, [mini]);
  useEffect(() => { document.documentElement.classList.toggle("dark", dark); localStorage.setItem("fixline.theme", dark ? "dark" : "light"); }, [dark]);
  return <TipProvider><div id="app-root" className="mx-auto flex max-w-[1440px] flex-col gap-4 p-4 pt-3 md:p-6 md:pt-3 lg:p-8 lg:pt-3">
    <motion.header initial={{ y: -30, opacity: 0 }} animate={{ y: 0, opacity: 1 }} className="topbar">
      <div className="min-w-0 flex items-center gap-3"><span className="logo-dot" aria-hidden /><div className="min-w-0"><h1 className="neon m-0 text-lg font-extrabold leading-tight md:text-xl">FixLine</h1><p className="muted m-0 truncate text-[11px] leading-tight">Hands-free repair & quality agent · Ray-Ban Meta · guest demo</p></div></div>
      <nav className="row" style={{ gap: 6 }} aria-label="Account">
        <Tip label="Meta Model API engines in use" side="bottom"><span className="pill">Muse Spark 1.3 · SAM 3.1</span></Tip>
        <Tip label="Open the glasses view (Mock Device Kit)" side="bottom"><motion.span whileHover={{ scale: 1.05 }} style={{ display: "inline-flex" }}><Link className="btn btn-primary btn-sm" href="/glasses">Open glasses</Link></motion.span></Tip>
        <Btn tip={dark ? "Switch to light theme" : "Switch to dark theme"} className="btn-sm" onClick={() => setDark(!dark)}>{dark ? "☀" : "☾"}</Btn>
      </nav>
    </motion.header>
    <div className="flex flex-col gap-4 lg:flex-row">
      <nav role="tablist" aria-label="Sections" className={`glass flex gap-2 overflow-x-auto p-2 lg:shrink-0 lg:flex-col lg:self-start lg:sticky lg:top-20 ${mini ? "lg:w-[68px]" : "lg:w-56"}`} style={{ transition: "width .2s" }}>
        <Tip label={mini ? "Expand sidebar" : "Collapse sidebar"}><button aria-label={mini ? "Expand sidebar" : "Collapse sidebar"} aria-expanded={!mini} className="collapse-chip hidden lg:inline-flex" onClick={() => setMini(!mini)}><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden style={{ transform: mini ? "rotate(180deg)" : "none", transition: "transform .3s" }}><path d="M15 6l-6 6 6 6" /><path d="M20 6l-6 6 6 6" opacity=".45" /></svg></button></Tip>
        {TABS.map(([h, i, l, tip]) => <Tip key={h} side="right" align="center" label={mini ? `${l} — ${tip}` : tip}><motion.span whileHover={{ x: 3 }} whileTap={{ scale: .96 }} className="shrink-0" style={{ display: "flex" }}><Link role="tab" aria-label={l} aria-selected={p === h} href={h} className={`btn w-full shrink-0 gap-2 ${mini ? "lg:justify-center" : "lg:justify-start"}`}><span aria-hidden>{i}</span><span className={mini ? "lg:hidden" : ""}>{l}</span></Link></motion.span></Tip>)}
      </nav>
      <main className="min-w-0 flex-1"><AnimatePresence mode="wait"><motion.div key={p} initial={{ opacity: 0, y: 14, filter: "blur(4px)" }} animate={{ opacity: 1, y: 0, filter: "blur(0px)" }} exit={{ opacity: 0, y: -10, filter: "blur(4px)" }} transition={{ duration: .28, ease: [0.22, 1, 0.36, 1] }} className="flex flex-col gap-4">{children}</motion.div></AnimatePresence>
        <footer className="muted mt-6 text-xs">FixLine · MIT · Built by Chukwudifu Okoroafor for the Meta Global AI Developer Hackathon 2026 (Push the Frontier · Indie).</footer></main>
    </div><ScrollFabs /></div></TipProvider>;
}
