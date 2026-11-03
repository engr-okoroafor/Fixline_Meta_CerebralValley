> **Live (no login, click-through demo):** https://fixline-meta-cerebralvalley.vercel.app · **Repo:** https://github.com/engr-okoroafor/Fixline_Meta_CerebralValley

# FixLine — paste-ready submission answers
*Meta Global AI Developer Hackathon 2026 · Indie Dev Track · Push the Frontier*

**Team Name:** FixLine

**Team Members:** Chuks Okoroafor (engr.okoroafor@gmail.com) — solo builder: product, engineering and demo

**Track:** Indie Dev Track

**Problem statement:** Push the Frontier

**Project Description:**
On a factory floor in Lagos or Port Harcourt, a conveyor bearing fails at 2am. The technician on shift is alone, the senior engineer is asleep, and the manual is a PDF on someone's laptop. He does his best, but nobody checks whether each step was actually done right, and sometimes lockout/tagout gets skipped to save time. The machine runs again, fails again a week later, and the line loses hours of output — or someone gets hurt. The same plant is also trying to run a 30-month power project in a spreadsheet.

FixLine is a hands-free AI repair, safety, quality & project management agent for plant workers. It lives on Ray-Ban Meta glasses (or any phone or screen). It runs a simple loop: **perceive → reason → confirm → enforce.** SAM 3.1 finds and segments the part the technician is looking at. Muse Spark 1.3 reads the manual, the machine's history and live trends, and plans the repair one step at a time, spoken in the technician's ear. After each step, SAM 3.1 looks again — a step does not count until the camera gate passes, or the technician explicitly confirms a low-confidence box. FixLine enforces the rules: no work starts until LOTO is confirmed, fire guidance names the class, the extinguisher and the aim point, and a quality inspector checks the finished job before the machine is signed off.

The technician can talk instead of type (Muse Voice Transcribe), and SeamlessM4T translates so a Pidgin- or Igbo-speaking technician and an English manual can still work together. Around that loop:

- **Repair** — ask by text or voice how to fix a pump, robot, CNC, compressor, conveyor, motor, turbine or valve. Steps stay numbered, with tools and a “done when”. Manuals still feed the copilot.
- **Tuning** — shaft alignment with the seven field readings, a live machine that shows which value moves which view, drag-to-snap, and a correct-versus-wrong teaching pair. AI auto-align explains the shims.
- **SCADA** — the flow-station P&ID plus labeled demo boards for electrical, manufacturing and other factories. MQTT, OPC UA, Modbus and MCP stay available. Valves and setpoints move only after an on-screen approval. A real valve is never written from this app; the SIS stays in charge (IEC 61511).
- **Safety** — Meta (or the offline template) generates every permit type, including a fire plan: class, agent, and aim at the base.
- **Quality** — photo inspection plus ITP, NCR, visual and dimensional reports, and a structured shift report.
- **Projects** — PMP is the default. Switching to PRINCE2, Agile, Waterfall, CPM or Lean Six Sigma regenerates the stage set and the document list. Generate the charter, stakeholder register, WBS, schedule baseline, cost baseline, risk register, change log, status report, earned value report, A3 summary, closure report and lessons learned (or the equivalent pack for the method you picked). The Gantt shows total cost and total duration, full activity names, a month grid, dependency connectors, Today and the critical path, in plant green with a light yellow accent. Download an A3 PDF, a photo, or the whole folder as a zip. Say “mark gas pipeline 55%” or “switch to the pump project”. Several projects persist in PGlite or Postgres.
- **Chat** — the bottom-right panel is solid enough to read, shows a typing animation while Muse Spark answers, and closes when you click outside.

It works today with no login. Without `MODEL_API_KEY` the same screens answer from labeled mocks (`catalog (mock)`, `template`, `rules`) so a judge is never shown a fake live deployment. The Mock Device Kit stands in for Ray-Ban Meta glasses.

**Public GitHub Repository:** https://github.com/engr-okoroafor/Fixline_Meta_CerebralValley

**3-Minute Demo Video:** https://youtu.be/PRZU5jMbjU8

The video above is the existing walkthrough. This upgrade was not posted to YouTube. Please use the live app for the Gantt, alignment, valve-approval and fire-class flows.

**Live demo:** https://fixline-meta-cerebralvalley.vercel.app (Glasses HUD: /glasses)

**Describe your use of Meta products to build the submitted project:**
- **SAM 3.1 (`sam-3.1`) — the eyes and the confirm-gate.** Segments and tracks the part in view, then re-checks it after every repair step. If the box is missing or the confidence is low, the next step stays locked until the technician confirms the highlight. The UI labels a mock box when the key is absent.
- **Muse Spark 1.3 (`muse-spark-1.3`) via Meta Model API — the brain.** Plans repairs from a spoken fault or a manual, drafts every safety document including the fire plan, writes project plans and deliverables, adjusts a live Gantt from a follow-up sentence, explains alignment moves, diagnoses SCADA alarms and writes the shift quality report. Called through the OpenAI-compatible chat endpoint. NVIDIA is only the fallback.
- **Muse Voice Transcribe (`muse-voice-transcribe`).** Hands-free fault questions, project edits (“slip commissioning by 14 days”) and page changes (“open projects”). Hands stay on the tools.
- **SeamlessM4T (Meta open weights).** Speech and text translation so instructions reach the technician in his own language.
- **Ray-Ban Meta glasses + Mock Device Kit.** The HUD (`/glasses`) is built for the glasses view; the Mock Device Kit lets judges and developers run the full experience in a browser without hardware.

**Why are Meta's models important to your solution?**
FixLine only works if the AI can see what the technician sees and prove the work was done. SAM 3.1 gives me that — precise segmentation I can use as a gate, not just a pretty overlay. Muse Spark 1.3 is fast enough to talk someone through a repair step by step, and it follows strict safety instructions well. Meta's voice and translation models let it work hands-free and in local languages, and Ray-Ban Meta glasses put it where the work actually happens. Without Meta's models FixLine would be a chatbot next to the machine; with them it is a second pair of expert eyes on the job.

**Feedback from your experience using partner technologies:**
NVIDIA NIM sits behind Meta Model API as an automatic fallback, then offline templates, so a technician never gets silence; the app shows which provider answered. Vercel hosts the app and made redeploys painless. Because both inference APIs are OpenAI-compatible, the fallback layer was small. Wishes: published rate limits, and more vision examples for SAM on industrial parts in the docs.

**How likely are you to build with Meta Model API?** Very likely (5/5)

**Overall opinion of Meta Model API:** Very positive. Easy to drop in, quick responses, and Muse Spark respects tight system prompts. Tip: leave room in `max_tokens` for reasoning tokens.

**How likely to recommend Meta Model API to another developer:** 9/10

**Biggest obstacle:**
Turning "AI suggests a step" into "the step was actually done." I solved it with the SAM confirm-gate: each step needs a visual check before the next unlocks, and LOTO must be confirmed before any work starts. The second obstacle was hardware — I couldn't rely on having glasses for every judge — so I built against the Mock Device Kit and made the whole demo run in a browser.

**Meta's models vs other models you've used:**
Muse Spark 1.3 followed the step-by-step and safety rules more consistently than my NVIDIA fallback and wrote clearer spoken instructions. The fallback was a little faster on very short prompts, so it stays as backup. For seeing and confirming parts, SAM 3.1 was the main reason to build on Meta.

**What matters most when choosing an AI model or coding tool:** Quality / accuracy

**Please specify:**
In a plant, a wrong instruction can hurt someone. I need reliable instruction-following, strong vision for confirming work, low enough latency for spoken guidance, fair pricing, and OpenAI-compatible APIs so I can keep a fallback.

**What makes it hardest to switch:**
The safety prompts and the confirm-gate are tuned to how these models behave. Switching means re-testing every safety edge case, and comparable segmentation isn't easy to find.

**What would most likely stop you from using Meta's models in production:**
Clear SLAs, pricing and availability for African customers, plus on-prem or data-retention options for plants that can't send camera footage to the cloud.

---
**Impact in one line:** If a plant cuts even one repeat breakdown a week — often several hours of lost output — FixLine pays for itself quickly, and every skipped LOTO it blocks is an injury that doesn't happen. *(Illustrative estimate, not a measured result.)*
