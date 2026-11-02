import { BASE, MODELS } from "@/lib/ai";
const tag = (s: string) => /[ṣẹọ]|kí|náà/.test(s) ? "yo" : /abeg|dey|wetin|una/i.test(s) ? "pcm" : /biko|kedu/i.test(s) ? "ig" : /don allah|yaya/i.test(s) ? "ha" : "en";
/** Muse Voice Transcribe 1.0 (POST /v1/asr/transcribe, DIARIZATION) when audio + key are present; demo segments otherwise. */
export async function POST(req: Request) {
  const { text = "", audio } = await req.json().catch(() => ({}));
  if (process.env.MODEL_API_KEY && audio) {
    try {
      const fd = new FormData();
      fd.append("request", new Blob([JSON.stringify({ model: MODELS.transcribe, audioEncoding: "WAV", mode: "DIARIZATION" })], { type: "application/json" }));
      fd.append("audio", new Blob([Buffer.from(String(audio).replace(/^data:[^,]+,/, ""), "base64")], { type: "audio/wav" }), "clip.wav");
      const r = await fetch(`${BASE}/asr/transcribe`, { method: "POST", headers: { Authorization: `Bearer ${process.env.MODEL_API_KEY}`, Accept: "text/plain" }, body: fd, signal: AbortSignal.timeout(20000) });
      if (r.ok) {
        const segments = (await r.text()).split("\n").filter(Boolean).map((l) => { const [spk, ...rest] = l.split(":"); const t = rest.join(":").trim(); return { speaker: `SPEAKER_${spk}`, text: t, lang: tag(t) }; });
        return Response.json({ engine: MODELS.transcribe, segments });
      }
    } catch {}
  }
  const src = text || "Abeg, this pump dey leak for seal. Ṣé kí n pa breaker náà?";
  const segs = src.split(/(?<=[.?!])\s+/).map((s: string, i: number) => ({ speaker: i % 2 ? "SPEAKER_2 (supervisor)" : "SPEAKER_1 (technician)", text: s, lang: tag(s) }));
  return Response.json({ engine: "demo", segments: segs });
}
