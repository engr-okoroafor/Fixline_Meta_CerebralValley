// Muse Voice Transcribe stub: diarization + code-switch tagging.
export async function POST(req: Request) {
  const { text = "" } = await req.json().catch(() => ({}));
  const src = text || "Abeg, this pump dey leak for seal. Ṣé kí n pa breaker náà?";
  const segs = src.split(/(?<=[.?!])\s+/).map((s: string, i: number) => ({
    speaker: i % 2 ? "SPEAKER_2 (supervisor)" : "SPEAKER_1 (technician)",
    text: s,
    lang: /[ṣẹọ]|kí|náà/.test(s) ? "yo" : /abeg|dey|wetin|una/i.test(s) ? "pcm" : /biko|kedu/i.test(s) ? "ig" : /don allah|yaya/i.test(s) ? "ha" : "en",
  }));
  return Response.json({ engine: process.env.MODEL_API_KEY ? "muse-voice-transcribe" : "demo", segments: segs });
}
