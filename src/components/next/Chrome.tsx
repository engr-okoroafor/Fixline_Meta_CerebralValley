"use client";
import { useRef, useState } from "react";
import { motion } from "framer-motion";
import { Tip } from "../ui";
/** Futuristic neon checkbox (accessible native input underneath). */
export function NeonCheck({ checked, onChange, label, tip }: { checked: boolean; onChange: (v: boolean) => void; label: string; tip?: string }) {
  const el = <label className="row" style={{ cursor: "pointer", gap: 8, minHeight: 34 }}>
    <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} className="sr-only" style={{ position: "absolute", opacity: 0, width: 1, height: 1 }} />
    <motion.span aria-hidden animate={{ background: checked ? "#39FF14" : "rgba(57,255,20,.06)", boxShadow: checked ? "0 0 10px #39FF14" : "0 0 0 transparent" }} style={{ width: 18, height: 18, borderRadius: 6, border: "1.5px solid #39FF14", flexShrink: 0, display: "grid", placeItems: "center" }}>
      <svg width="11" height="11" viewBox="0 0 24 24"><motion.path d="M4 12l5 5L20 6" fill="none" stroke="#021006" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round" initial={false} animate={{ pathLength: checked ? 1 : 0 }} /></svg>
    </motion.span><span className="text-sm font-semibold">{label}</span></label>;
  return tip ? <Tip label={tip}>{el}</Tip> : el;
}
export const CameraIcon = ({ size = 22 }: { size?: number }) => <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden><path d="M3 8.5A2.5 2.5 0 0 1 5.5 6H8l1.5-2h5L16 6h2.5A2.5 2.5 0 0 1 21 8.5v9a2.5 2.5 0 0 1-2.5 2.5h-13A2.5 2.5 0 0 1 3 17.5z" /><circle cx="12" cy="13" r="4" /><circle cx="12" cy="13" r="1.4" fill="currentColor" /><path d="M18 9h.01" strokeWidth="3" /></svg>;
export const VideoIcon = ({ size = 22 }: { size?: number }) => <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden><rect x="2.5" y="6" width="13" height="12" rx="3" /><path d="M15.5 10.5 21 7.5v9l-5.5-3" /><circle cx="6.5" cy="9.5" r="1.2" fill="#ff4d6d" stroke="none" /></svg>;
export const UploadIcon = ({ kind = "doc", size = 22 }: { kind?: "doc" | "image" | "manual"; size?: number }) => <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
  {kind === "image" ? <><rect x="3" y="4" width="18" height="16" rx="4" /><path d="m3 16 5-5 4 4 3-3 6 6" /><circle cx="15.5" cy="8.5" r="1.5" /></> : <><path d="M7 3h7l5 5v11a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2z" /><path d="M14 3v5h5" />{kind === "manual" ? <path d="M8.5 12h7M8.5 15h5" /> : null}</>}
  <path d="M12 20v-6m-2.5 2.5L12 14l2.5 2.5" stroke="#39FF14" strokeWidth="2.2" /></svg>;
/** Camera capture buttons: photo + video, using device camera on mobile/headset or file picker on desktop. */
export function CameraCapture({ onPhoto, onVideo, label = "Camera" }: { onPhoto: (f: File) => void; onVideo?: (f: File) => void; label?: string }) {
  const p = useRef<HTMLInputElement>(null); const v = useRef<HTMLInputElement>(null);
  return <div className="row" role="group" aria-label={label}>
    <Tip label="Take a photo (rear camera on phones/headsets)"><motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: .95 }} type="button" className="btn btn-primary" onClick={() => p.current?.click()}><CameraIcon /> Photo</motion.button></Tip>
    {onVideo && <Tip label="Record a short video (≤200 MB); a frame is analysed"><motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: .95 }} type="button" className="btn" onClick={() => v.current?.click()}><VideoIcon /> Video</motion.button></Tip>}
    <input ref={p} type="file" accept="image/png,image/jpeg,image/webp" capture="environment" hidden onChange={(e) => { const f = e.target.files?.[0]; if (f) onPhoto(f); e.target.value = ""; }} />
    {onVideo && <input ref={v} type="file" accept="video/*" capture="environment" hidden onChange={(e) => { const f = e.target.files?.[0]; if (f) onVideo(f); e.target.value = ""; }} />}
  </div>;
}
export const REPAIR_EXT = ["txt", "md", "pdf", "docx", "png", "jpg", "jpeg"];
export function checkFile(f: File, exts = REPAIR_EXT, max = 15e6) {
  const ext = f.name.split(".").pop()?.toLowerCase() ?? "";
  if (!exts.includes(ext)) return `${f.name}: .${ext} not allowed (use ${exts.map((x) => "." + x).join(" ")})`;
  if (f.size > max) return `${f.name}: larger than ${Math.round(max / 1e6)} MB`; if (!f.size) return `${f.name}: empty`;
  return null;
}
/** Descriptive drop zone with icon + validation. */
export function UploadZone({ title, hint, accept, exts, kind = "doc", onFiles, multiple = true }: { title: string; hint: string; accept: string; exts: string[]; kind?: "doc" | "image" | "manual"; onFiles: (f: File[]) => void; multiple?: boolean }) {
  const r = useRef<HTMLInputElement>(null); const [over, setOver] = useState(false); const [err, setErr] = useState("");
  const add = (l: FileList | null) => { if (!l) return; const fs = Array.from(l); const errs = fs.map((f) => checkFile(f, exts)).filter(Boolean) as string[]; setErr(errs.join(" · ")); const ok = fs.filter((f) => !checkFile(f, exts)); if (ok.length) onFiles(ok); };
  return <div className="flex flex-col gap-2"><Tip label={`${hint}. Validated in your browser and again on the server.`}>
    <motion.button type="button" whileHover={{ scale: 1.01 }} onClick={() => r.current?.click()} onDragOver={(e) => { e.preventDefault(); setOver(true); }} onDragLeave={() => setOver(false)} onDrop={(e) => { e.preventDefault(); setOver(false); add(e.dataTransfer.files); }}
      className="glass flex w-full items-center gap-4 rounded-3xl p-4 text-left" style={{ border: `1.5px dashed ${over ? "#39FF14" : "color-mix(in oklab,#39FF14 45%,transparent)"}`, boxShadow: over ? "0 0 24px rgba(57,255,20,.35) inset" : undefined, cursor: "pointer" }}>
      <motion.span animate={{ y: [0, -3, 0] }} transition={{ repeat: Infinity, duration: 2 }} className="neon grid place-items-center rounded-2xl" style={{ width: 52, height: 52, background: "rgba(57,255,20,.1)", border: "1px solid rgba(57,255,20,.4)" }}><UploadIcon kind={kind} size={28} /></motion.span>
      <span className="flex flex-col"><b>{title}</b><span className="muted text-xs">{hint}</span><span className="text-xs neon">{exts.map((x) => "." + x).join("  ")}</span></span></motion.button></Tip>
    <input ref={r} type="file" hidden multiple={multiple} accept={accept} onChange={(e) => { add(e.target.files); e.target.value = ""; }} />
    {err && <p role="alert" className="m-0 text-xs" style={{ color: "var(--danger)" }}>{err}</p>}</div>;
}
