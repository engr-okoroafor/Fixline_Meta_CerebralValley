"use client";
import { useMemo, useState } from "react";
import { motion } from "framer-motion";
import { Card, Field, Tip, Btn } from "../ui";
import { post, prefs } from "../sections/shared";
import { RichAnswer, type Rich } from "../sections/Copilot";
import { tolFor, corrections, type Reading } from "@/lib/alignment";
export { TOL, tolFor, corrections } from "@/lib/alignment";
const OK = ({ ok }: { ok: boolean }) => <motion.span initial={{ scale: 0 }} animate={{ scale: 1 }} aria-label={ok ? "within tolerance" : "out of tolerance"} className="grid place-items-center rounded-full font-black" style={{ width: 34, height: 34, background: ok ? "rgba(57,255,20,.18)" : "rgba(255,77,109,.18)", color: ok ? "#39FF14" : "#ff4d6d", boxShadow: `0 0 14px ${ok ? "#39FF14" : "#ff4d6d"}` }}>{ok ? "✓" : "✕"}</motion.span>;
function View({ title, off, ang, kind, tol, cToF, fToR, front, rear }: { title: string; off: number; ang: number; kind: "top" | "side"; tol: { off: number; ang: number }; cToF: number; fToR: number; front: number; rear: number }) {
  // Exaggerated but proportional: 1 mm offset ≈ 40 px, 0.1 mm/100 mm ≈ 6°. Driven live by the measured values.
  const y0 = 92; const dy = Math.max(-34, Math.min(34, off * 40)); const tilt = Math.max(-10, Math.min(10, ang * 60));
  const bad = Math.abs(off) > tol.off || Math.abs(ang) > tol.ang;
  const span = Math.max(1, cToF + fToR); const k = 200 / span; const xF = 262 + Math.max(10, cToF * k); const xR = Math.min(500, xF + Math.max(20, fToR * k)); const c = bad ? "#ffb020" : "#39FF14"; const id = `al-${kind}`;
  const fins = Array.from({ length: 11 }, (_, i) => i);
  return <svg viewBox="0 0 520 190" width="100%" role="img" aria-label={`${title}: offset ${off} mm, angularity ${ang} mm/100mm`} data-testid={`align-${kind}`}>
    <defs>
      <linearGradient id={`${id}-body`} x1="0" x2="0" y1="0" y2="1"><stop offset="0" stopColor="#2a4a38" /><stop offset=".45" stopColor="#12261b" /><stop offset="1" stopColor="#050d09" /></linearGradient>
      <linearGradient id={`${id}-steel`} x1="0" x2="0" y1="0" y2="1"><stop offset="0" stopColor="#e6f2ec" /><stop offset=".5" stopColor="#7d948a" /><stop offset="1" stopColor="#2c3a34" /></linearGradient>
      <filter id={`${id}-glow`}><feGaussianBlur stdDeviation="2.4" /><feMerge><feMergeNode /><feMergeNode in="SourceGraphic" /></feMerge></filter>
      <pattern id={`${id}-grid`} width="20" height="20" patternUnits="userSpaceOnUse"><path d="M20 0H0V20" fill="none" stroke="#39FF14" strokeOpacity=".06" /></pattern>
    </defs>
    <rect width="520" height="190" fill={`url(#${id}-grid)`} />
    {kind === "side" && <rect x="20" y={y0 + 46} width="480" height="10" rx="2" fill="#0b1a12" stroke="#39FF14" strokeOpacity=".35" />}
    {/* reference centreline */}
    <line x1="10" x2="510" y1={y0} y2={y0} stroke="#9fb3a8" strokeDasharray="12 4 2 4" strokeWidth="1.2" />
    {/* stationary machine: centrifugal pump */}
    <g>
      {kind === "side" ? <><path d={`M40 ${y0 + 46}v-12h70v12`} fill="#0b1f14" stroke="#39FF14" strokeOpacity=".5" /><circle cx="90" cy={y0} r="40" fill={`url(#${id}-body)`} stroke="#39FF14" strokeOpacity=".7" /><circle cx="90" cy={y0} r="16" fill="none" stroke="#39FF14" strokeOpacity=".4" /><rect x="78" y={y0 - 62} width="24" height="22" fill={`url(#${id}-body)`} stroke="#39FF14" strokeOpacity=".6" /></>
        : <><rect x="40" y={y0 - 40} width="96" height="80" rx="20" fill={`url(#${id}-body)`} stroke="#39FF14" strokeOpacity=".7" /><rect x="20" y={y0 - 12} width="22" height="24" fill="#0b1f14" stroke="#39FF14" strokeOpacity=".6" /></>}
      <rect x="130" y={y0 - 18} width="34" height="36" rx="6" fill="#0d2217" stroke="#39FF14" strokeOpacity=".5" />
      <text x="88" y={y0 + 76} textAnchor="middle" fontSize="10" fill="#9fb3a8" fontFamily="ui-monospace,monospace">PUMP (FIXED)</text>
    </g>
    {/* fixed shaft + coupling hub */}
    <rect x="164" y={y0 - 4} width="62" height="8" fill={`url(#${id}-steel)`} />
    <rect x="222" y={y0 - 22} width="18" height="44" rx="3" fill={`url(#${id}-steel)`} stroke="#0b1f14" />
    {/* movable machine: motor, moves with offset & angularity */}
    <g transform={`translate(0 ${dy}) rotate(${tilt} 246 ${y0})`} data-dy={dy.toFixed(1)} data-tilt={tilt.toFixed(2)}>
      <rect x="244" y={y0 - 22} width="18" height="44" rx="3" fill={`url(#${id}-steel)`} stroke="#0b1f14" />
      <rect x="262" y={y0 - 4} width="40" height="8" fill={`url(#${id}-steel)`} />
      <rect x="300" y={y0 - 44} width="150" height="88" rx="14" fill={`url(#${id}-body)`} stroke={c} strokeOpacity=".85" />
      {fins.map((i) => <line key={i} x1={312 + i * 12} x2={312 + i * 12} y1={y0 - 40} y2={y0 + 40} stroke={c} strokeOpacity=".25" strokeWidth="2" />)}
      <path d={`M450 ${y0 - 38}q30 4 30 38q0 34-30 38z`} fill="#0b1f14" stroke={c} strokeOpacity=".6" />
      {kind === "side" ? <><path d={`M318 ${y0 + 44}v14h34v-14M398 ${y0 + 44}v14h34v-14`} fill="#0b1f14" stroke={c} strokeOpacity=".7" /><rect x="350" y={y0 - 60} width="44" height="16" rx="3" fill="#0b1f14" stroke={c} strokeOpacity=".6" /></>
        : <rect x="352" y={y0 - 20} width="44" height="40" rx="5" fill="none" stroke={c} strokeOpacity=".6" />}
      <text x="375" y={y0 + 4} textAnchor="middle" fontSize="11" fontWeight="700" fill={c} fontFamily="ui-monospace,monospace">MOTOR</text>
      {/* motor shaft axis — visible lateral line */}
      <line x1="232" x2="500" y1={y0} y2={y0} stroke={c} strokeWidth="2.5" strokeDasharray="10 5" filter={`url(#${id}-glow)`}></line>
      {/* feet positions driven by Coupling→front / Front→rear distances */}
      {[[xF, "F", front], [xR, "R", rear]].map(([x, l, v]) => <g key={l as string}><line x1={x as number} x2={x as number} y1={y0 + 30} y2={y0 + 58} stroke="#00e5ff" strokeWidth="2" /><circle cx={x as number} cy={y0 + 58} r="4" fill="#00e5ff" /><text x={x as number} y={y0 + 74} textAnchor="middle" fontSize="9.5" fill="#00e5ff" fontFamily="ui-monospace,monospace">{l} {(v as number) > 0 ? "+" : ""}{(v as number).toFixed(2)}</text></g>)}
    </g>
    {/* fixed shaft axis — visible lateral line */}
    <line x1="10" x2="240" y1={y0} y2={y0} stroke="#00FF9C" strokeWidth="2.5" filter={`url(#${id}-glow)`} />
    {/* readouts */}
    <g fontFamily="ui-monospace,monospace" fontSize="11">
      <text x="14" y="18" fill="#9fb3a8">{title.toUpperCase()}</text>
      <text x="506" y="18" textAnchor="end" fill={c}>offset {off >= 0 ? "+" : ""}{off.toFixed(2)} mm · angle {ang >= 0 ? "+" : ""}{ang.toFixed(2)} /100</text>
      <text x="506" y="50" textAnchor="end" fill="#9fb3a8">tol ±{tol.off} mm · ±{tol.ang}/100 @ speed · feet {cToF}/{fToR} mm</text>
      <text x="506" y="34" textAnchor="end" fill={c}>{bad ? "▲ OUT OF TOLERANCE — correct the motor" : "● WITHIN TOLERANCE"}</text>
    </g>
  </svg>;
}
const Row = ({ sym, v, unit, good }: { sym: string; v: number; unit: string; good: boolean }) => <div className="flex items-center justify-between gap-3 rounded-2xl p-2" style={{ background: "rgba(57,255,20,.05)" }}><span className="neon font-mono text-lg" aria-hidden>{sym}</span><span className="text-right"><span className="font-mono text-2xl font-bold">{v.toFixed(2)}</span><br /><span className="muted text-xs">{unit}</span></span><OK ok={good} /></div>;
/** Next-gen "As Found" shaft laser alignment panel (inspired by SKF TKSA-style result screens). */
export function AlignmentPanel() {
  const [r, setR] = useState<Reading>({ hAng: 0.42, hOff: 0.32, vAng: 0.02, vOff: -0.56 });
  const [rpm, setRpm] = useState(1500); const [cToF, setCtoF] = useState(150); const [fToR, setFtoR] = useState(300); const [phase, setPhase] = useState<"As Found" | "As Corrected">("As Found");
  const [ai, setAi] = useState<Rich | null>(null); const [busy, setBusy] = useState(false);
  const tol = tolFor(rpm); const c = useMemo(() => corrections(r, cToF, fToR), [r, cToF, fToR]);
  const ok = { hA: Math.abs(r.hAng) <= tol.ang, hO: Math.abs(r.hOff) <= tol.off, vA: Math.abs(r.vAng) <= tol.ang, vO: Math.abs(r.vOff) <= tol.off };
  const all = Object.values(ok).every(Boolean);
  const todo = all ? ["All four values within tolerance — record 'As Corrected', torque feet, remove LOTO, run-in and re-check vibration."] : [
    "Check soft foot first (≤0.05 mm per foot) — correct before shimming.",
    !ok.vA || !ok.vO ? `Vertical: ${c.vFront >= 0 ? "add" : "remove"} ${Math.abs(c.vFront)} mm at FRONT feet, ${c.vRear >= 0 ? "add" : "remove"} ${Math.abs(c.vRear)} mm at REAR feet (use stainless pre-cut shims, max 3–4 per foot).` : "Vertical is within tolerance — don't touch shims.",
    !ok.hA || !ok.hO ? `Horizontal: move FRONT feet ${Math.abs(c.hFront)} mm and REAR feet ${Math.abs(c.hRear)} mm ${c.hRear >= 0 ? "toward +side" : "toward −side"} using jack bolts with dial indicators live.` : "Horizontal is within tolerance.",
    "Correct vertical first, then horizontal; tighten feet in a cross pattern and re-measure.",
  ];
  async function askAi() { setBusy(true); try { setAi(await post("/api/copilot", { session: `align-${Date.now()}`, question: `Shaft laser alignment ${phase} at ${rpm} rpm. Horizontal angularity ${r.hAng} mm/100mm, offset ${r.hOff} mm; vertical angularity ${r.vAng} mm/100mm, offset ${r.vOff} mm. Coupling to front feet ${cToF} mm, front to rear ${fToR} mm. Tell me exactly which shims and moves to make, soft-foot checks, and thermal growth considerations.`, lang: prefs().lang, region: prefs().region })); } catch { /* shown via rules */ } finally { setBusy(false); } }
  const N = (k: keyof Reading, l: string) => <Field label={l}><input type="number" step={0.01} value={r[k]} onChange={(e) => setR({ ...r, [k]: Number(e.target.value) || 0 })} onInput={(e) => setR({ ...r, [k]: Number((e.target as HTMLInputElement).value) || 0 })} /></Field>;
  return <Card title="Shaft laser alignment — insight panel" sub={`Result: ${phase} · tolerance @${rpm} rpm: offset ±${tol.off} mm, angularity ±${tol.ang} mm/100mm`} className="lg:col-span-2"
    right={<div className="row"><span className="pill" style={{ color: all ? "#39FF14" : "#ff4d6d", borderColor: all ? "#39FF14" : "#ff4d6d" }}>{all ? "IN TOLERANCE" : "CORRECTION NEEDED"}</span><Btn tip="Toggle As Found / As Corrected" onClick={() => setPhase(phase === "As Found" ? "As Corrected" : "As Found")}>⇄ {phase}</Btn></div>}>
    <div className="grid gap-4 lg:grid-cols-[3fr_2fr]">
      <div className="flex flex-col gap-2 rounded-3xl p-3" style={{ background: "linear-gradient(180deg,rgba(57,255,20,.06),transparent)", border: "1px solid rgba(57,255,20,.25)" }}><View title="Horizontal · top view" off={r.hOff} ang={r.hAng} kind="top" tol={tol} cToF={cToF} fToR={fToR} front={c.hFront} rear={c.hRear} /><View title="Vertical · side view" off={r.vOff} ang={r.vAng} kind="side" tol={tol} cToF={cToF} fToR={fToR} front={c.vFront} rear={c.vRear} /></div>
      <div className="flex flex-col gap-3">
        <section className="glass flex flex-col gap-2 rounded-3xl p-3"><b className="text-sm">Horizontal: Top view</b><Row sym="⊣⊢∠" v={r.hAng} unit="mm/100mm" good={ok.hA} /><Row sym="⊣⊢" v={r.hOff} unit="mm" good={ok.hO} /></section>
        <section className="glass flex flex-col gap-2 rounded-3xl p-3"><b className="text-sm">Vertical: Side view</b><Row sym="⊣⊢∠" v={r.vAng} unit="mm/100mm" good={ok.vA} /><Row sym="⊣⊢" v={r.vOff} unit="mm" good={ok.vO} /></section>
      </div></div>
    <div className="grid gap-3 grid-cols-2 md:grid-cols-4">{N("hAng", "H angularity (mm/100mm)")}{N("hOff", "H offset (mm)")}{N("vAng", "V angularity (mm/100mm)")}{N("vOff", "V offset (mm)")}
      <Field label="Speed (rpm)" tip="Tolerance tightens with speed"><input type="number" value={rpm} onChange={(e) => setRpm(Number(e.target.value))} /></Field>
      <Field label="Coupling → front feet (mm)"><input type="number" value={cToF} onChange={(e) => setCtoF(Number(e.target.value))} /></Field>
      <Field label="Front → rear feet (mm)"><input type="number" value={fToR} onChange={(e) => setFtoR(Number(e.target.value))} /></Field></div>
    <section className="rounded-3xl p-4" style={{ border: "1px solid rgba(57,255,20,.35)", background: "rgba(57,255,20,.05)" }}><h3 className="neon m-0 mb-2 text-base">✦ What to do</h3>
      <table className="text-sm mb-2"><thead><tr><th>Feet</th><th>Vertical shim</th><th>Horizontal move</th></tr></thead><tbody><tr><td>Front</td><td>{c.vFront > 0 ? "+" : ""}{c.vFront} mm</td><td>{c.hFront > 0 ? "+" : ""}{c.hFront} mm</td></tr><tr><td>Rear</td><td>{c.vRear > 0 ? "+" : ""}{c.vRear} mm</td><td>{c.hRear > 0 ? "+" : ""}{c.hRear} mm</td></tr></tbody></table>
      <ol className="m-0 flex flex-col gap-1 pl-5 text-sm">{todo.map((x) => <motion.li key={x} initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }}>{x}</motion.li>)}</ol>
      <div className="row mt-2"><Tip label="Get an AI deep-dive (Meta primary, NVIDIA fallback)"><button className="btn btn-primary" disabled={busy} onClick={askAi}>{busy ? "Thinking…" : "✦ AI deep-dive"}</button></Tip><span className="muted text-xs">Sign convention: + = add shim / move toward + side. Always LOTO the driver first.</span></div></section>
    {ai && <RichAnswer r={ai} />}
  </Card>;
}
