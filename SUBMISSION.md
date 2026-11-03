> **Live (no login, click-through demo):** https://fixline-meta-cerebralvalley.vercel.app · **Repo:** https://github.com/engr-okoroafor/Fixline_Meta_CerebralValley

# FixLine — paste-ready submission answers
*Meta Global AI Developer Hackathon 2026 · Indie Dev Track · Push the Frontier*

**Team Name:** FixLine

**Team Members:** Chuks Okoroafor (engr.okoroafor@gmail.com) — solo builder: product, engineering and demo

**Track:** Indie Dev Track

**Problem statement:** Push the Frontier

**Project Description:**
A conveyor bearing fails at 2 a.m. in a plant in Lagos or Port Harcourt. The technician on shift is alone. The senior engineer is asleep. The manual is a PDF on someone's laptop. He does his best. Nobody checks that each step was actually done. Sometimes he skips lockout/tagout to save time. Lockout/tagout means locking the machine so it cannot start while someone is working on it. The machine runs again. It fails again a week later. The line loses hours of output, or someone gets hurt. The same plant is also trying to run a 30-month power project in a spreadsheet.

FixLine is a hands-free AI agent for plant workers. It covers repair, safety, quality, and project management. An agent here means a helper that can see, plan, check, and block unsafe work. It runs on Ray-Ban Meta glasses, or on any phone or screen. The loop is **perceive → reason → confirm → enforce**:

- **Perceive.** Meta SAM 3.1 finds the part in view and outlines it.
- **Reason.** Muse Spark 1.3 reads the manual, the machine history, and the live trends. It speaks the repair one step at a time.
- **Confirm.** SAM 3.1 looks again after each step. The step does not count until the camera check passes. If the model is unsure which part it sees, the technician must confirm the highlight.
- **Enforce.** Work cannot start until lockout is confirmed. Fire guidance names the fire class, the extinguisher, and where to aim. A quality check must pass before the machine is signed off.

The technician can talk instead of type. That uses Muse Voice Transcribe. SeamlessM4T translates, so a technician who speaks Pidgin or Igbo can still follow an English manual.

What you can use around that loop:

- **Repair.** Ask by text or voice how to fix a pump, robot, CNC machine, compressor, conveyor, motor, turbine, or valve. A CNC machine is a computer-controlled cutter. Steps stay numbered, with the tools and a “done when.” Uploaded manuals still feed the repair guide.
- **Tuning.** Shaft alignment uses the seven field readings. A live view shows which number moves which picture. You can drag the motor until it snaps near the right spot. A correct-versus-wrong pair teaches the idea. AI auto-align explains the shims. Shims are the thin spacers under the machine feet.
- **SCADA.** These are the plant control screens. You get a flow-station diagram (pipes, valves, and instruments), plus labeled demo boards for electrical, manufacturing, and other factories. MQTT, OPC UA, Modbus, and MCP stay available. Those are common ways plants share sensor data, plus a tool link for assistants. A valve, or the target number that controls it, changes only after someone approves it on screen. This app never changes a real valve. The plant’s own safety system stays in charge.
- **Safety.** Meta writes every permit type. If the key is missing, an offline template does it instead. The fire plan names the class, the agent (what puts the fire out), and “aim at the base.”
- **Quality.** Photo inspection, plus an inspection plan, a defect report, visual and size reports, and a structured shift report.
- **Projects — method.** PMP is the default. PMP is a standard way to run a project. You can switch to PRINCE2, Agile, Waterfall, CPM, or Lean Six Sigma. The stages and the document list rebuild when you switch.
- **Projects — papers.** It writes the charter (why the project exists), the stakeholder register (who is involved), the WBS (the task list), the schedule baseline (the agreed dates), the cost baseline (the agreed budget), the risk register, the change log, the status report, the earned value report (progress against the budget), an A3 summary (one page), the closure report, and lessons learned. Or it writes the matching pack for the method you picked.
- **Projects — timeline.** The Gantt chart is the timeline. It shows total cost, total duration, full activity names, a month grid, links between tasks, a Today line, and the critical path. The critical path is the chain of tasks that sets the finish date. Colors are plant green with a light yellow accent. Download an A3 PDF, a photo, or the whole folder as a zip.
- **Projects — talk and save.** Say “mark gas pipeline 55%” or “switch to the pump project.” Several projects stay saved in PGlite, a small database inside the app, or in Postgres when that is connected.
- **Chat.** The panel at the bottom right is easy to read. It shows a typing animation while Muse Spark answers. It closes when you click outside.

It works today with no login. If `MODEL_API_KEY` is missing, the same screens answer from labeled stand-ins: `catalog (mock)`, `template`, and `rules`. A judge is never shown a fake live answer. The Mock Device Kit stands in for Ray-Ban Meta glasses.

**Public GitHub Repository:** https://github.com/engr-okoroafor/Fixline_Meta_CerebralValley

**3-Minute Demo Video:** https://www.youtube.com/watch?v=Zc3FuSNBxUg

This is the official walkthrough for the Indie Dev Track, Push the Frontier entry. Muse Spark 1.3 plans the repair and the project. SAM 3.1 confirms the part before the next step unlocks. NVIDIA Nemotron answers only when Meta is unavailable. The same build is clickable with no login.

**Live demo:** https://fixline-meta-cerebralvalley.vercel.app (Glasses view: /glasses)

**Describe your use of Meta products to build the submitted project:**
- **SAM 3.1 (`sam-3.1`) — the eyes and the check.** It outlines the part in view and keeps track of it. It looks again after every repair step. If the box is missing, or the model is not sure, the next step stays locked until the technician confirms the highlight. The screen labels a stand-in box when the key is missing.
- **Muse Spark 1.3 (`muse-spark-1.3`) via Meta Model API — the planner.** It plans repairs from a spoken fault or a manual. It drafts every safety document, including the fire plan. It writes project plans and the project papers. It updates a live Gantt chart from a follow-up sentence. It explains alignment moves, reads plant alarms, and writes the shift quality report. Calls use an OpenAI-compatible chat endpoint. That means the same request style many chat apps already use. NVIDIA is the backup.
- **Muse Voice Transcribe (`muse-voice-transcribe`).** Hands-free fault questions, project edits (“slip commissioning by 14 days” — move the startup date), and page changes (“open projects”). Hands stay on the tools.
- **SeamlessM4T (Meta open weights).** It translates speech and text, so instructions reach the technician in his own language. Open weights means the model files can be run outside Meta’s hosted API.
- **Ray-Ban Meta glasses + Mock Device Kit.** The glasses view (`/glasses`) is built for that screen. The Mock Device Kit lets judges and developers run the full experience in a browser, with no glasses in the room.

**Why are Meta's models important to your solution?**
FixLine needs an AI that can see what the technician sees, and that can show the work was done. SAM 3.1 outlines the part precisely enough to use as a pass or fail check. Muse Spark 1.3 is fast enough to talk someone through a repair, one step at a time. It also follows strict safety instructions well. Meta’s voice and translation models make the guide hands-free, and usable in local languages. Ray-Ban Meta glasses put that guide where the work happens. Together, these models make FixLine a second pair of expert eyes on the job.

**Feedback from your experience using partner technologies:**
Meta Model API is the primary path. The live demo calls it first. NVIDIA Nemotron is the automatic backup. Nemotron runs on NVIDIA NIM, NVIDIA’s hosted model service. It answers when Meta has no key, returns an error, or takes too long. If neither can answer, the app uses a labeled offline template. The screen shows which system answered, so the technician still gets a reply.

Vercel hosts the app. Putting a new version online was simple. Both APIs are OpenAI-compatible. They take the same style of chat request, so the backup code stayed small.

For later production, a partner stack is available and planned. It is for a backup way to run the models, and for a higher TPM. TPM means how much text the model can handle each minute. Meta Model API stays first. None of these three is connected in this build:

- **Baseten.** $100 in credits, and a high TPM for Muse Spark Open. That is a fast path for Meta open weights, the model files you can host yourself.
- **Modal.** $100 in credits for Meta open-weight Endpoints, hosted copies of those models. If we connect Modal, we can also use serverless GPUs and sandboxes. A serverless GPU is a cloud chip that turns on only for a job. A sandbox is a closed space for running code.
- **Fireworks.** $100 in credits for Meta open weights. Same planned role: a production backup and a higher TPM, with Meta Model API still first.

What I still want from the tools already in use: published rate limits, and more SAM examples in the docs for factory parts.

**How likely are you to build with Meta Model API?** Very likely (5/5)

**Overall opinion of Meta Model API:** Very positive. It was easy to add. Replies come back quickly. Muse Spark follows tight instructions well. Tip: leave extra room in `max_tokens`, the reply-length limit. The model uses some of that room for reasoning tokens, the thinking it does before the answer you see.

**How likely to recommend Meta Model API to another developer:** 9/10

**Biggest obstacle:**
The hard part was turning “the AI suggests a step” into “the step was actually done.” I solved it with the SAM check. Each step needs a camera look before the next one unlocks. Lockout must be confirmed before any work starts. The second obstacle was hardware. I could not count on glasses for every judge. I built against the Mock Device Kit, so the whole demo runs in a browser.

**Meta's models vs other models you've used:**
Muse Spark 1.3 followed the step-by-step and safety rules more consistently than my NVIDIA backup. It also wrote clearer spoken instructions. The backup was a little faster on very short prompts, so it stays as the backup. For seeing and confirming parts, SAM 3.1 was the main reason to build on Meta.

**What matters most when choosing an AI model or coding tool:** Quality / accuracy

**Please specify:**
In a plant, a wrong instruction can hurt someone. I need the model to follow instructions. I need strong vision, so the app can confirm the work. I need a short enough wait for spoken guidance. I need fair pricing. I also need an OpenAI-compatible API, the same request style many chat apps use, so I can keep a backup.

**What makes it hardest to switch:**
The safety instructions and the camera check are tuned to how these models behave. Switching means testing every risky safety case again. A similar way to outline the parts is hard to find.

**What would most likely stop you from using Meta's models in production:**
I would need clear promises on uptime, price, and support, and real availability for customers in Africa. Some plants cannot send camera footage to the cloud. They need a way to run the models on their own computers, and clear rules for how long that footage is kept.

---
**Impact in one line:** If a plant avoids even one repeat breakdown a week — often several hours of lost output — FixLine pays for itself quickly. Every skipped lockout it blocks is an injury that does not happen. *(An illustration, not a measured result.)*
