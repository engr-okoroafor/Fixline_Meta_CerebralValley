"use client";
import Link from "next/link"; import { usePathname } from "next/navigation"; import { motion } from "framer-motion";
const L = [["/glasses", "👓 Glasses"], ["/repair", "🔧 Repair"], ["/safety", "🔒 Safety"], ["/qa", "🏭 Line QA"], ["/admin", "📋 Jobs"], ["/settings", "⚙️ Settings"]];
export default function Nav() {
  const p = usePathname();
  return <nav className="nav"><Link href="/" className="brand"><span className="logo" aria-hidden>●</span>FixLine <span className="mute" style={{ fontWeight: 500, letterSpacing: 0 }}>Guardian</span></Link>
    {L.map(([h, t]) => <Link key={h} href={h} className={`lnk ${p === h ? "on" : ""}`}>{p === h && <motion.span layoutId="nav-act" className="act" transition={{ type: "spring", stiffness: 380, damping: 32 }} />}{t}</Link>)}
    <span className="pill blue" style={{ marginLeft: "auto" }}>Muse Spark 1.3 · SAM 3.1</span></nav>;
}
