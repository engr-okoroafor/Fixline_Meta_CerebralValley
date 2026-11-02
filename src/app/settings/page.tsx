"use client";
import { LANGS } from "@/lib/demo"; import { useJob } from "@/lib/store";
export default function Settings() {
  const { job, update } = useJob();
  return <main className="wrap grid g2">
    <div className="card"><h2>Crew language</h2><select value={job.lang} onChange={(e) => update((j) => ({ ...j, lang: e.target.value }))}>{LANGS.map((l) => <option key={l.code} value={l.code}>{l.name}</option>)}</select></div>
    <div className="card"><h2>Engines</h2><p className="mute">Primary: <b>muse-spark-1.3</b> (Meta Model API) · Vision: <b>sam-3.1</b> · Voice: <b>muse-voice-transcribe</b> · Fallback: NVIDIA. Keys are server-side env vars (MODEL_API_KEY, NVIDIA_API_KEY); with none set FixLine runs in guest demo mode.</p></div>
    <div className="card"><h2>Device</h2><p className="mute">Mock Device Kit: open /glasses on your phone to use its rear camera as the glasses feed. On Ray-Ban Meta, the same endpoints receive frames via the Wearables Device Access Toolkit.</p></div>
  </main>;
}
