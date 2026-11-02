"use client";
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, Tooltip, CartesianGrid, ReferenceLine } from "recharts";
export default function Trend({ data, keys, height = 220, refs = [] }: { data: Record<string, number>[]; keys: { k: string; c: string; name: string }[]; height?: number; refs?: { y: number; label: string; c?: string }[] }) {
  return <div style={{ width: "100%", height }}><ResponsiveContainer><LineChart data={data} margin={{ top: 8, right: 16, bottom: 0, left: -8 }}>
    <CartesianGrid stroke="rgba(57,255,20,.12)" /><XAxis dataKey="t" tick={{ fontSize: 11, fill: "currentColor" }} /><YAxis tick={{ fontSize: 11, fill: "currentColor" }} width={44} />
    <Tooltip contentStyle={{ background: "#021006", border: "1px solid #39FF14", borderRadius: 12, color: "#d7ffe9" }} />
    {refs.map((r) => <ReferenceLine key={r.label} y={r.y} stroke={r.c ?? "#ff4d6d"} strokeDasharray="4 4" label={{ value: r.label, fill: r.c ?? "#ff4d6d", fontSize: 10 }} />)}
    {keys.map((x) => <Line key={x.k} type="monotone" dataKey={x.k} name={x.name} stroke={x.c} dot={false} strokeWidth={2} isAnimationActive={false} />)}
  </LineChart></ResponsiveContainer></div>;
}
