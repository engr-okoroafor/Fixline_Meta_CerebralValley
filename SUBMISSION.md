# Cerebral Valley submission — FixLine

**Project name:** FixLine
**Tagline:** The repair agent that sees the machine — and won't let you skip a step.
**Track:** Indie developer · **Theme:** Push the Frontier
**Models:** SAM 3.1, Muse Spark 1.3, Muse Voice Transcribe (Meta Model API)

## Description
FixLine is a hands-free repair and quality assistant for factory floors and field service, built for Ray-Ban Meta glasses. A technician looks at a machine and asks what's wrong. SAM 3.1 segments and tracks the exact part in view. Muse Spark 1.3 reasons over that part plus the machine's service manual, repair history and live telemetry, produces a cited diagnosis, and talks the technician through the fix step by step. Before advancing, it asks the technician to point the camera at the part again and verifies the step actually worked.

It speaks the crew's language: Muse Voice Transcribe diarizes speakers and follows code-switching between English, Nigerian Pidgin, Yorùbá, Igbo and Hausa, while a translation layer lets a remote supervisor follow in their own language. And it enforces: lockout-tagout and post-repair inspection checklists, tolerance checks on torque and vibration, and a server-side gate that refuses to close a job until the inspection is recorded.

The same agent runs Line QA: mounted over a production line, SAM 3.1 flags surface defects and Muse Spark lines them up against machine telemetry to write a shift report telling the supervisor what to change before the next batch.

## Why Push the Frontier
Most AI stays on a screen. FixLine closes a full perception → reasoning → action → verification → enforcement loop in a physical industrial setting, on hardware Meta is opening up. The camera confirm-gate turns a chatbot into an agent that checks its own work in the real world.

## How it's built
Next.js App Router + TypeScript, Framer Motion HUD. `/api/vision` calls sam-3.1 and parses boxes from any of JSON arrays, `{boxes}` objects or line formats; `/api/chat` calls muse-spark-1.3 with a grounded system prompt (manual sections, history, telemetry) and falls back to an NVIDIA engine, then to deterministic demo output so it always runs. `/api/job` is the safety gate (HTTP 409 with the list of missing items). Mock Device Kit = phone/webcam via getUserMedia; same endpoints receive glasses frames.

## Challenges
Making the agent verify instead of assume; handling code-switched speech; keeping it usable offline/without keys for judges.

## What's next
Pilot on a Lagos bottling line, Wearables Device Access Toolkit streaming, CMMS (SAP PM/Maximo) write-back, per-site procedure upload.

**Repo:** https://github.com/engr-okoroafor/Fixline_Meta_CerebralValley
**Demo:** (Vercel URL) · **Video:** (YouTube URL)
