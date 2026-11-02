"use client";
import { useEffect, useRef, useState } from "react";
import { speak } from "./sections/Voice";
import Hud from "./Hud";
/** Glanceable HUD: top status bar + bottom dock; the centre stays clear for the camera view. */
export default function Glasses() {
  const [now, setNow] = useState<Date | null>(null); const [w, setW] = useState<{ city: string; temp: number | null } | null>(null); const [bat, setBat] = useState(87); const [online, setOnline] = useState(true);
  const [voice, setVoice] = useState(false); const [panels, setPanels] = useState(false); const [msg, setMsg] = useState("Say “pump is noisy” or “open safety”."); const v = useRef<HTMLVideoElement>(null); const on = useRef(false);
  useEffect(() => { setNow(new Date()); const id = setInterval(() => { setNow(new Date()); setBat((b) => Math.max(5, b - 0.02)); }, 1000); fetch("/api/weather").then((r) => r.json()).then(setW).catch(() => null); const f = () => setOnline(navigator.onLine); addEventListener("online", f); addEventListener("offline", f); f(); navigator.mediaDevices?.getUserMedia({ video: { facingMode: "environment" } }).then((s) => { if (v.current) { v.current.srcObject = s; v.current.play(); } }).catch(() => null); return () => clearInterval(id); }, []);
  function listen() { const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition; if (!SR) { setMsg("Voice not supported in this browser."); return; } const r = new SR(); r.lang = "en-NG"; r.onresult = async (e: any) => { const text = e.results[0][0].transcript; setMsg(`“${text}”…`); const j = await fetch("/api/assist", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ text, session: "glasses" }) }).then((x) => x.json()).catch(() => ({ answer: "Network error." })); if (j.nav) location.href = `/#${j.nav}`; setMsg(j.answer); speak(j.answer, "en-NG", () => { if (on.current) listen(); }); }; r.start(); }
  const chip = "rounded-full px-3 py-1 text-sm backdrop-blur bg-black/40 border border-[#39ff88]/40";
  return <div className="fixed inset-0 text-white" style={{ background: "radial-gradient(circle at 50% 40%,#0b2a17,#000 70%)" }}>
    <video ref={v} muted playsInline className="absolute inset-0 h-full w-full object-cover opacity-90" aria-label="Camera view" />
    <header role="status" className="absolute inset-x-0 top-0 flex flex-wrap items-center justify-between gap-2 p-2 text-sm" style={{ background: "linear-gradient(#000a,#0000)" }}>
      <span className={chip}>🕒 {now?.toLocaleString([], { weekday: "short", hour: "2-digit", minute: "2-digit" }) ?? "…"}</span>
      <span className={chip}>{w ? `⛅ ${w.city} ${w.temp ?? "–"}°C` : "⛅ …"}</span>
      <span className={chip} aria-label={`Battery ${Math.round(bat)} percent (simulated)`}>🔋 {Math.round(bat)}%</span>
      <span className={chip}>{online ? "📶 Online" : "⚠ Offline"}</span>
    </header>
    {panels && <aside aria-label="HUD panels" className="glasses-panels absolute left-2 top-16 bottom-36 w-[min(18rem,46vw)] overflow-auto md:left-4"><Hud compact voice={voice} vision /></aside>}
    <footer className="absolute inset-x-0 bottom-0 flex flex-col items-center gap-2 p-3" style={{ background: "linear-gradient(#0000,#000b)" }}>
      <p aria-live="polite" className={`${chip} max-w-xl text-center`}>{msg}</p>
      <div className="flex gap-2"><a className={chip} href="/">⌂ Home</a><button className={`${chip} min-h-11 min-w-11`} aria-pressed={voice} onClick={() => { const n = !voice; setVoice(n); on.current = n; if (n) listen(); }}>{voice ? "🎙 Voice ON" : "🎙 Voice OFF"}</button><button className={`${chip} min-h-11`} aria-pressed={panels} onClick={() => setPanels((p) => !p)}>{panels ? "▤ Panels ON" : "▤ Panels"}</button><a className={chip} href="/xr">🥽 AR</a></div>
    </footer>
  </div>;
}
