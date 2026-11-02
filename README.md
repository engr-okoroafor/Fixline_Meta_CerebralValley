# FixLine — hands-free repair & quality agent for Ray-Ban Meta glasses

**SAM 3.1 + Muse Spark 1.3 · Push the Frontier · Meta Global AI Developer Hackathon 2026 (Indie)**

A technician wearing Ray-Ban Meta glasses looks at a machine and asks what's wrong. **SAM 3.1** finds and tracks the exact part; **Muse Spark 1.3** reasons over the service manual and repair history, diagnoses the fault with citations, and speaks the fix one step at a time — and **every step must be re-confirmed on camera** before the next unlocks. LOTO and inspection checklists are enforced server-side: the job cannot close until they're recorded and readings are in tolerance. The same agent runs **Line QA**: SAM 3.1 flags surface defects, Muse Spark correlates them with telemetry and writes the supervisor's shift report.

## Pipeline
`camera (Mock Device Kit / glasses) → SAM 3.1 segment+track → Muse Spark 1.3 (manual + history + telemetry) → spoken step → camera confirm-gate → LOTO/QA close gate`

## Routes
| Route | What |
|---|---|
| `/` | Landing |
| `/glasses` | Glasses HUD, live phone/webcam feed, SAM overlay, ask/voice, Muse Voice Transcribe diarization + code-switching (EN/Pidgin/Yorùbá/Igbo/Hausa) with supervisor translation |
| `/repair` | Camera confirm-gated step plan with audit log |
| `/safety` | LOTO + post-repair inspection, tolerance checks, job-close gate |
| `/qa` | Line inspection, telemetry correlation, shift report |
| `/admin` | Asset, manual, history, audit trail |
| `/settings` | Language, engines, device |

APIs: `/api/chat` (muse-spark-1.3 → NVIDIA fallback → deterministic demo), `/api/vision` (sam-3.1 with robust box parsing), `/api/voice`, `/api/translate`, `/api/job` (409 until gate passes), `/api/report`.

## Run
```bash
npm install && npm run dev   # works with zero keys (guest demo mode)
cp .env.example .env.local   # add MODEL_API_KEY for live Meta Model API
```
Open `/glasses` on your phone (HTTPS) to use its rear camera as the Mock Device Kit feed.

## License
MIT © 2026 Chukwudifu Okoroafor
