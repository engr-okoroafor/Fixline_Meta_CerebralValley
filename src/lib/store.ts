"use client";
import { useEffect, useState } from "react";
export type Job = { loto: boolean[]; confirmed: boolean[]; quality: boolean[]; readings: { torque?: number; vibration?: number }; log: string[]; lang: string; closedAt?: string | null };
const init: Job = { loto: [], confirmed: [], quality: [], readings: {}, log: [], lang: "en" };
export function useJob() {
  const [job, setJob] = useState<Job>(init);
  useEffect(() => { try { const s = localStorage.getItem("fixline-job"); if (s) setJob({ ...init, ...JSON.parse(s) }); } catch {} }, []);
  const update = (f: (j: Job) => Job) => setJob((j) => { const n = f(j); localStorage.setItem("fixline-job", JSON.stringify(n)); return n; });
  return { job, update, reset: () => update(() => init) };
}
export function speak(text: string, lang = "en") {
  if (typeof window === "undefined" || !("speechSynthesis" in window)) return;
  const u = new SpeechSynthesisUtterance(text); u.lang = lang === "pcm" ? "en-NG" : lang; u.rate = 1.02;
  speechSynthesis.cancel(); speechSynthesis.speak(u);
}
