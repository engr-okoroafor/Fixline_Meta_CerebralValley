# FixLine — a hands-free AI repair, safety, quality & project management agent for plant workers

*Meta Global AI Developer Hackathon 2026 · Indie Dev Track · Push the Frontier*

**Live demo (no login):** https://fixline-meta-cerebralvalley.vercel.app · **Official walkthrough:** https://www.youtube.com/watch?v=Zc3FuSNBxUg · **Glasses HUD:** [/glasses](https://fixline-meta-cerebralvalley.vercel.app/glasses) · **Status:** [/api/status](https://fixline-meta-cerebralvalley.vercel.app/api/status)

FixLine is a plant assistant for a technician who is alone on shift. It runs **perceive → reason → confirm → enforce**:

1. **Perceive** — SAM 3.1 segments the part in the camera or glasses view.
2. **Reason** — Muse Spark 1.3 plans the repair from the manual, the fault and the live trends. With no key, a labeled catalog mock answers so the demo still runs.
3. **Confirm** — the next step stays locked until a camera re-check passes (or the technician explicitly confirms a low-confidence box).
4. **Enforce** — LOTO, fire class and agent, and quality gates block unsafe or unverified work. SCADA writes do nothing until an operator approves them. Valves on a real plant are never written from this app.

**Meta models:** `muse-spark-1.3`, `sam-3.1`, `muse-voice-transcribe`, SeamlessM4T (open weights) · **Device:** Ray-Ban Meta via the Mock Device Kit · **Fallback:** NVIDIA NIM, then offline templates · **Data:** PGlite, or Postgres when `DATABASE_URL` is set · **Hosting:** Vercel.

## What you can demo

| Page | Try this |
| --- | --- |
| **Repair** | Ask “how do I fix a leaking seal on a centrifugal pump” by text or the mic. Steps are numbered, with tools and a “done when”. Open the camera, **Re-check on camera**, then **Verified → next**. The next step stays disabled until the gate passes. |
| **Tuning** | The seven alignment values sit in one row: H angularity, H offset, V angularity, V offset, speed, coupling→front feet, front→rear feet. Drag the motor (it snaps near zero). **Wrong (as found)** / **Correct** / **Snap** / **AI auto-align** animate which reading moves which view. |
| **SCADA** | Oil & gas P&ID, plus demo boards for electrical, manufacturing and other factories (labeled simulators, not live plants). Open/close a valve or change a setpoint only after **I approve this write**. MQTT, OPC UA, Modbus and MCP stay read-first; credentials stay in server env. |
| **Safety** | Every document type, including the fire plan (class, agent, aim at the base). Pick a class on the fire card to see which extinguisher and how to quench. |
| **Quality** | Inspect a photo. Download an ITP, NCR, visual report or dimensional report. The shift report is a structured quality note. |
| **Voice & Vision** | “open projects”, “open alignment”, “which extinguisher for an oil fire”. Hands-free listen → answer → speak. |
| **Engineering** | Say “shaft alignment” or “size cable for 60 A”. Widgets update; “why” questions go to Muse Spark. |
| **Projects** | Open the **150 MW CCGT** plan (Oguta). The Gantt keeps full activity names, a month grid, dashed dependency connectors, a Today line, critical path and the footer (deliverables, impact, legend). Download **A3 PDF**, a **photo**, or the **project folder (zip)**. Say “mark gas pipeline 55%” or “switch to the pump project”. Plans persist in the database. |
| **Settings** | Meta → NVIDIA order, and plant profiles (demo / MQTT / OPC UA / Modbus / MCP) with no secrets stored in the browser. |

## Run locally
```bash
npm install
MODEL_API_KEY=... NVIDIA_API_KEY=... npm run dev   # both optional; labeled mocks without keys
npm test
npm run build
```

Optional connectors (read-only until `SCADA_ALLOW_WRITES=1`, and even then every write needs a logged-in operator): `MQTT_URL`, `OPCUA_GATEWAY_URL`, `MODBUS_HOST`. Never put those secrets in client code.

See [SUBMISSION.md](SUBMISSION.md) for the hackathon write-up. The official walkthrough is https://www.youtube.com/watch?v=Zc3FuSNBxUg (Indie Dev Track, Push the Frontier: Muse Spark, SAM 3.1, NVIDIA Nemotron as fallback). Click through the same build at https://fixline-meta-cerebralvalley.vercel.app.
