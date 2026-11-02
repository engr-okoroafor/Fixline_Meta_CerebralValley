# FixLine — hands-free AI repair & quality on Ray-Ban Meta glasses

*Meta Global AI Developer Hackathon 2026 · Indie Dev Track · Push the Frontier*

**Live demo (no login):** https://fixline-meta-cerebralvalley.vercel.app · **Glasses HUD:** [/glasses](https://fixline-meta-cerebralvalley.vercel.app/glasses) · **Status:** [/api/status](https://fixline-meta-cerebralvalley.vercel.app/api/status)

FixLine helps factory technicians fix machines right the first time. It runs a **perceive → reason → confirm → enforce** loop:

1. **Perceive** — SAM 3.1 segments the part in the camera / glasses view.
2. **Reason** — Muse Spark 1.3 plans the repair from the manual, history and live trends.
3. **Confirm** — SAM 3.1 re-checks each step on camera; a step only counts when it is visually verified.
4. **Enforce** — LOTO / permit-to-work and quality gates block unsafe or unverified work, and log it.

**Meta models:** `muse-spark-1.3`, `sam-3.1`, `muse-voice-transcribe`, SeamlessM4T (open weights) · **Device:** Ray-Ban Meta via the Mock Device Kit · **Fallback:** NVIDIA NIM, then offline templates · **Hosting:** Vercel.

Demo path: Home → 👓 Glasses HUD → 🔧 Repair → ⛑ Safety LOTO → ✔ Quality inspector → 🎙 Voice & Vision.

## Run locally
```bash
npm install
MODEL_API_KEY=... NVIDIA_API_KEY=... npm run dev   # both optional; mock mode without keys
```

See [SUBMISSION.md](SUBMISSION.md) for the hackathon write-up.
