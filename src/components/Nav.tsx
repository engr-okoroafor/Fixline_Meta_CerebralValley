"use client";
import Link from "next/link"; import { usePathname } from "next/navigation";
const L = [["/glasses","Glasses HUD"],["/repair","Guided Repair"],["/safety","Safety / LOTO"],["/qa","Line QA"],["/admin","Admin"],["/settings","Settings"]];
export default function Nav() {
  const p = usePathname();
  return <nav className="nav"><Link href="/" className="brand">◉ FIXLINE</Link>{L.map(([h, t]) => <Link key={h} href={h} className={p === h ? "on" : ""}>{t}</Link>)}<span className="pill" style={{ marginLeft: "auto" }}>Muse Spark 1.3 · SAM 3.1</span></nav>;
}
