"use client";
import { motion } from "framer-motion";
import { ResponsiveContainer, AreaChart, Area, RadialBarChart, RadialBar } from "recharts";
import { useEffect, useState } from "react";
const gen = (b: number, n = 20) => Array.from({ length: n }, (_, i) => ({ i, v: +(b + Math.sin(i / 2) * b * .1 + Math.abs(Math.cos(i * 3)) * b * .05).toFixed(1) }));
const CARDS = [{ k: "Plant health", v: 92, u: "%", b: 90 }, { k: "Open work orders", v: 14, u: "", b: 14 }, { k: "MTBF", v: 412, u: "h", b: 400 }, { k: "Safety streak", v: 128, u: "days", b: 120 }];
/** Animated home insights strip. */
export function Insights() {
  const [t, setT] = useState(0); useEffect(() => { const id = setInterval(() => setT((x) => x + 1), 2500); return () => clearInterval(id); }, []);
  return <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4 lg:col-span-2" data-walk="insights">{CARDS.map((c, i) => { const d = gen(c.b); return <motion.div key={c.k} initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * .08, type: "spring" }} whileHover={{ y: -4, boxShadow: "0 0 26px rgba(57,255,20,.35)" }} className="glass relative overflow-hidden rounded-3xl p-4">
    <p className="muted m-0 text-sm">{c.k}</p><motion.p key={t} initial={{ opacity: .4 }} animate={{ opacity: 1 }} className="neon m-0 text-3xl font-black">{i === 0 ? c.v : Math.round(d[(t + i) % d.length].v)}<span className="text-sm"> {c.u}</span></motion.p>
    <div style={{ height: 50 }}>{i === 0 ? <ResponsiveContainer><RadialBarChart innerRadius="70%" outerRadius="100%" data={[{ v: c.v, fill: "#39FF14" }]} startAngle={180} endAngle={0}><RadialBar dataKey="v" cornerRadius={10} background /></RadialBarChart></ResponsiveContainer>
      : <ResponsiveContainer><AreaChart data={d}><Area dataKey="v" stroke="#39FF14" fill="rgba(57,255,20,.15)" strokeWidth={2} isAnimationActive /></AreaChart></ResponsiveContainer>}</div></motion.div>; })}</div>;
}
