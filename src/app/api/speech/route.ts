import { NextResponse } from "next/server";
import { currentUser } from "@/lib/auth";
import { rateLimit, clientKey } from "@/lib/security";
export const runtime = "nodejs"; export const maxDuration = 60;
// Server speech fallback for browsers without Web Speech (Firefox, some Android WebViews) and for Igbo/Yoruba/Hausa voices.
// Uses any OpenAI-compatible audio endpoint: SPEECH_API_URL (+ SPEECH_API_KEY, falls back to MODEL_API_KEY/NVIDIA_API_KEY).
// ASR: POST {url}/audio/transcriptions (multipart file, model=SPEECH_ASR_MODEL). TTS: POST {url}/audio/speech {model, voice, input}.
const base = () => process.env.SPEECH_API_URL?.replace(/\/$/, "");
const key = () => process.env.SPEECH_API_KEY ?? process.env.MODEL_API_KEY ?? process.env.NVIDIA_API_KEY;
// Optional secondary speech endpoint (e.g. NVIDIA NIM OpenAI-compatible audio). Used when the primary fails.
const fbBase = () => process.env.SPEECH_FALLBACK_URL?.replace(/\/$/, "");
const fbKey = () => process.env.SPEECH_FALLBACK_KEY ?? process.env.NVIDIA_API_KEY;
async function tryBoth(path: string, init: (k?: string) => RequestInit): Promise<Response> {
  let r: Response | null = null;
  try { r = await fetch(`${base()}${path}`, init(key())); if (r.ok) return r; } catch { /* try fallback */ }
  if (fbBase()) { try { const f = await fetch(`${fbBase()}${path}`, init(fbKey())); if (f.ok) return f; r = f; } catch { /* none */ } }
  return r ?? new Response(null, { status: 502 });
}
export function GET() { return NextResponse.json({ server: !!base(), asr: !!base(), tts: !!base(), fallback: !!fbBase(), browser: "Web Speech API used first when available" }); }
export async function POST(req: Request) {
  const u = await currentUser().catch(() => null); const who = clientKey(req, u?.id);
  if (!rateLimit(`sp:${who}`, u ? 30 : 10)) return NextResponse.json({ error: "rate limited" }, { status: 429 });
  if (!base()) return NextResponse.json({ error: "server speech not configured", fallback: "browser" }, { status: 501 });
  const ct = req.headers.get("content-type") ?? "";
  try {
    if (ct.startsWith("multipart/")) {
      const fd = await req.formData(); const f = fd.get("audio"); if (!(f instanceof File) || f.size > 10_000_000) return NextResponse.json({ error: "audio required (≤10 MB)" }, { status: 400 });
      const out = new FormData(); out.append("file", f, f.name || "speech.webm"); out.append("model", process.env.SPEECH_ASR_MODEL ?? "whisper-1"); const lang = String(fd.get("lang") ?? "").split("-")[0]; if (lang) out.append("language", lang);
      const r = await tryBoth("/audio/transcriptions", (k) => ({ method: "POST", headers: { authorization: `Bearer ${k}` }, body: out, signal: AbortSignal.timeout(45000) }));
      if (!r.ok) return NextResponse.json({ error: `ASR ${r.status}`, fallback: "type" }, { status: 502 });
      const j = await r.json(); return NextResponse.json({ text: String(j.text ?? "").slice(0, 4000) });
    }
    const j = await req.json(); const text = String(j.text ?? "").slice(0, 1500); if (!text) return NextResponse.json({ error: "text required" }, { status: 400 });
    const r = await tryBoth("/audio/speech", (k) => ({ method: "POST", headers: { authorization: `Bearer ${k}`, "content-type": "application/json" }, body: JSON.stringify({ model: process.env.SPEECH_TTS_MODEL ?? "tts-1", voice: process.env.SPEECH_VOICE ?? "alloy", input: text, response_format: "mp3" }), signal: AbortSignal.timeout(45000) }));
    if (!r.ok) return NextResponse.json({ error: `TTS ${r.status}`, fallback: "browser" }, { status: 502 });
    return new Response(r.body, { headers: { "content-type": "audio/mpeg", "cache-control": "no-store" } });
  } catch (e) { return NextResponse.json({ error: (e as Error).message, fallback: "browser" }, { status: 502 }); }
}
