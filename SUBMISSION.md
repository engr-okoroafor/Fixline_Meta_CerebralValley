# Cerebral Valley submission — FixLine

> Codebase: this repo now ships the full **FixLine Guardian** app (Meta Model API via `MODEL_API_KEY`: muse-spark-1.3, sam-3.1, muse-voice-transcribe). Live: https://fixline-meta-cerebralvalley.vercel.app

**Project name:** FixLine
**Tagline:** The repair agent that sees the machine — and won't let you skip a step.
**Event:** Meta Global AI Developer Hackathon 2026
**Track:** Indie developer · **Theme:** Push the Frontier
**Meta products used:** Meta Model API — `muse-spark-1.3` (primary reasoning, image understanding, translation), `sam-3.1` (Segment Anything Model 3.1, vision), `muse-voice-transcribe-1.0` (diarized speech-to-text); open-weight **SeamlessM4T v2** (`facebook/seamless-m4t-v2-large`, self-hosted speech/text translation); Ray-Ban Meta glasses + Mock Device Kit. NVIDIA Nemotron is an automatic fallback only.

## Description
FixLine is a hands-free repair and quality assistant for factory floors and field service, built for Ray-Ban Meta glasses. A technician looks at a machine and asks what's wrong. SAM 3.1 segments and tracks the exact part in view. Muse Spark 1.3 reasons over that part plus the machine's service manual, repair history and live telemetry, produces a cited diagnosis, and talks the technician through the fix step by step. Before advancing, it asks the technician to point the camera at the part again and verifies the step actually worked.

It speaks the crew's language: Muse Voice Transcribe diarizes speakers and follows code-switching between English, Nigerian Pidgin, Yorùbá, Igbo and Hausa, while a translation layer lets a remote supervisor follow in their own language. And it enforces: lockout-tagout and post-repair inspection checklists, tolerance checks on torque and vibration, and a server-side gate that refuses to close a job until the inspection is recorded.

The same agent runs Line QA: mounted over a production line, SAM 3.1 flags surface defects and Muse Spark lines them up against machine telemetry to write a shift report telling the supervisor what to change before the next batch.

## Why Push the Frontier
Most AI stays on a screen. FixLine closes a full perception → reasoning → action → verification → enforcement loop in a physical industrial setting, on hardware Meta is opening up. The camera confirm-gate turns a chatbot into an agent that checks its own work in the real world.

## Why Meta
- **SAM 3.1 is the only model that can do the confirm gate.** It segments a named part ("mechanical seal") pixel-accurately and keeps a stable object id across frames, so FixLine can verify a physical step was completed rather than trusting the technician's word.
- **Muse Spark 1.3** is Meta's latest agentic model: 1M-token context fits the whole service manual + history + telemetry, so every instruction is grounded and cited ([M-4.2]).
- **Muse Voice Transcribe 1.0** gives diarized, hands-free input for noisy floors where touchscreens are unusable.
- **SeamlessM4T v2 (open weights)** runs on-prem for plants that can't send audio off-site, covering Yorùbá, Igbo, Hausa and English.
- **Ray-Ban Meta glasses** keep both hands on the machine — the whole point for repair work.

## Judging criteria
- **Impact:** unplanned downtime and skipped LOTO steps cause injuries and lost output; FixLine enforces safety and verifies work in African factories with multilingual crews.
- **Use of Meta AI tooling:** four Meta models, each doing the job it is best at (see `/api/models` on the live demo for the wired IDs and live/demo status).
- **Technical depth:** SAM 3.1 wire-token parser (`<|box;x1..|>` → normalized boxes), one-concept-per-request fan-out for QA, streamed Responses API, multipart ASR, layered fallback router, server-side 409 safety gate.
- **Demo:** runs fully without keys via deterministic mocks, so judges can click through every flow.

## How it's built
Next.js App Router + TypeScript, Framer Motion HUD. `/api/vision` streams `sam-3.1` over `POST /v1/responses` (one noun-phrase concept per request, confidence on) and parses the SAM wire tokens into boxes; the confirm-step gate only advances when the target is re-acquired at >0.6 confidence; `/api/voice` sends audio to `muse-voice-transcribe-1.0` at `POST /v1/asr/transcribe` in DIARIZATION mode and tags code-switched languages; `/api/translate` tries self-hosted SeamlessM4T v2 then Muse Spark 1.3; `/api/chat` calls muse-spark-1.3 with a grounded system prompt (manual sections, history, telemetry) and falls back to an NVIDIA engine, then to deterministic demo output so it always runs. `/api/job` is the safety gate: it refuses to close a job without LOTO + inspection (HTTP 409 with the list of missing items). `/api/report` writes the Line QA shift report. All model IDs live in one `MODELS` table in `src/lib/ai.ts` (env-overridable). Mock Device Kit = phone/webcam via getUserMedia; same endpoints receive glasses frames.

## Challenges
Making the agent verify instead of assume; handling code-switched speech; keeping it usable offline/without keys for judges.

## What's next
Pilot on a Lagos bottling line, Wearables Device Access Toolkit streaming, CMMS (SAP PM/Maximo) write-back, per-site procedure upload.

**Repo:** https://github.com/engr-okoroafor/Fixline_Meta_CerebralValley
**Demo:** https://fixline-meta-cerebralvalley.vercel.app · **Video:** (YouTube URL)
