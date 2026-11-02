"use client";
import { useEffect, useRef, useState, forwardRef, useImperativeHandle } from "react";
import { motion, AnimatePresence } from "framer-motion";
import type { Box } from "@/lib/ai";
export type CamHandle = { snap: () => string | undefined };
/** Mock Device Kit feed: phone/webcam via getUserMedia, or a synthetic pump scene when no camera. */
const Camera = forwardRef<CamHandle, { boxes: Box[]; hud?: React.ReactNode; scene?: "pump" | "line" }>(function Camera({ boxes, hud, scene = "pump" }, ref) {
  const v = useRef<HTMLVideoElement>(null); const c = useRef<HTMLCanvasElement>(null); const [live, setLive] = useState(false);
  useEffect(() => {
    let stream: MediaStream | undefined;
    navigator.mediaDevices?.getUserMedia({ video: { facingMode: "environment" } }).then((s) => { stream = s; if (v.current) { v.current.srcObject = s; setLive(true); } }).catch(() => setLive(false));
    return () => stream?.getTracks().forEach((t) => t.stop());
  }, []);
  useEffect(() => {
    if (live) return; let f = 0, raf = 0; const ctx = c.current?.getContext("2d"); if (!ctx) return;
    const draw = () => { f++; const W = 800, H = 500; ctx.fillStyle = "#0a1018"; ctx.fillRect(0, 0, W, H);
      if (scene === "pump") { ctx.fillStyle = "#284a63"; ctx.fillRect(120, 200, 200, 140); ctx.fillStyle = "#3b6a8a"; ctx.beginPath(); ctx.arc(390, 270, 85, 0, 7); ctx.fill(); ctx.fillStyle = "#555f6b"; ctx.fillRect(520, 190, 170, 150); ctx.fillStyle = "#22e3ff"; const d = (f * 3) % 120; ctx.fillRect(388, 330 + d, 4, 8); ctx.fillStyle = "#8aa0b8"; ctx.font = "14px sans-serif"; ctx.fillText("P-101", 360, 180); }
      else { for (let i = 0; i < 5; i++) { const x = ((f * 2 + i * 180) % 1000) - 150; ctx.fillStyle = "#c9d3dc"; ctx.fillRect(x, 170, 130, 150); ctx.fillStyle = "#ff4d5e"; if (i % 2) ctx.fillRect(x + 30, 220, 40, 6); } ctx.fillStyle = "#1b2a3a"; ctx.fillRect(0, 330, 800, 30); }
      raf = requestAnimationFrame(draw); };
    draw(); return () => cancelAnimationFrame(raf);
  }, [live, scene]);
  useImperativeHandle(ref, () => ({ snap: () => { const cv = document.createElement("canvas"); cv.width = 640; cv.height = 400; const x = cv.getContext("2d"); if (live && v.current) x?.drawImage(v.current, 0, 0, 640, 400); else if (c.current) x?.drawImage(c.current, 0, 0, 640, 400); return cv.toDataURL("image/jpeg", 0.7); } }));
  return <div className="cam">
    <video ref={v} autoPlay playsInline muted style={{ display: live ? "block" : "none" }} />
    {!live && <canvas ref={c} width={800} height={500} />}
    <AnimatePresence>{boxes.map((b, i) => <motion.div key={b.label + i} className="box" initial={{ opacity: 0, scale: 1.2 }} animate={{ opacity: 1, scale: 1, left: `${b.x * 100}%`, top: `${b.y * 100}%`, width: `${b.w * 100}%`, height: `${b.h * 100}%` }} exit={{ opacity: 0 }} transition={{ type: "spring", stiffness: 120, damping: 18 }}><span>{b.label} · {(b.score * 100) | 0}%</span></motion.div>)}</AnimatePresence>
    <span className="pill" style={{ position: "absolute", top: 10, right: 10, background: "#000a" }}>{live ? "● Mock Device Kit · live camera" : "◌ Simulated feed (no camera)"}</span>
    {hud && <div className="hud">{hud}</div>}
  </div>;
});
export default Camera;
