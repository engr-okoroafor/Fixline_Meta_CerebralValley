# Devpost update — Meta VR Start Developer Competition 2026

Paste-ready text for https://devpost.com/software/fixline-guardian. Measured on 10 November 2026. Production was not changed.

## Tagline

On Quest, pinch to approve each step of a pump shaft alignment. The step counts only after a person says yes.

(109 characters)

## Inspiration

The $250k field-inspection winner was one job with a checkable result: 12 of 12 defects, a report in under five minutes, for $0.54. FixLine’s earlier entry tried to cover every industry, project management with frameworks such as PMP and PRINCE2, SCADA, and an admin console, and the benefit numbers were illustrative ranges. A technician on a Quest does not need all of that in the first ten seconds. They need one repair, a number they can check, and a person who approves the step before it is marked done.

## What it does

FixLine walks a pump shaft laser alignment on Meta Quest (and in a desktop browser when no headset is in the room).

1. The card shows seeded as-found readings for pump P-101: vertical offset −0.56 mm at 2,980 rpm, outside the ±0.07 mm tolerance.
2. Pinch, or say “done”, opens an approve/reject checkpoint. “Done” does not mark the step complete.
3. Approve records the time. Reject leaves the step open.
4. After the last approval, FixLine downloads a timestamped Markdown or PDF report with the as-found readings, the shim moves, and the seeded as-left readings (vertical offset +0.04 mm, inside tolerance).

The readings are sample data in the repo. FixLine does not read a laser. The same build still has the glasses HUD (`/glasses`), the admin demo (`/admin/demo`), repair, safety, and project management with frameworks such as PMP and PRINCE2.

`/benchmark` runs eight seeded fault sentences through the live model and prints accuracy, time to report, and estimated cost from the token usage the provider returned.

## How we built it

The Devpost production site https://fixline-guardian.vercel.app is still `engr-okoroafor/fixline` on `main` at `1b24bdab` (“UI overhaul A–I”). This update is in `Fixline_Meta_CerebralValley`, which already had `/xr`, `/glasses`, and `/admin/demo`.

- WebXR with `@react-three/xr`. Hand tracking is requested. Controllers are not required. A detected table anchors the step card. If no plane is found, the card stays in front of the user.
- The 3D scene is not loaded until “Preview 3D” or “Enter AR”. On a Quest browser the canvas pixel ratio is capped at 1.
- Meta `muse-spark-1.3` is called first with `MODEL_API_KEY`. NVIDIA NIM (`NVIDIA_API_KEY`, `integrate.api.nvidia.com`) runs only when Meta has no key, returns an error, times out, or sends an empty completion. Both keys stay on the server.
- The benchmark asks for a short JSON diagnosis, times the call, and prices it with the rate of the provider that answered.
- The catalog path (the equipment failure list, no model call) is scored on the same eight sentences and shown next to the model result.

## Challenges

Muse Spark spends part of `max_tokens` on reasoning before the JSON. A 500-token cap cut the answer off mid-object, so the first preview run mixed truncated Meta replies with NVIDIA fallbacks. The shipped benchmark allows 4,000 tokens. The numbers below are from the run after that change.

The scorer is lexical on purpose: a case is correct only when the report contains every word of the expected equipment name and every word of the expected failure. That makes near-misses count as misses. We did not edit the expected labels after seeing the model’s answers.

Preview hostnames on the `fixline-meta-cerebralvalley` project sit behind Vercel Authentication. The benchmark was run through a short-lived share link. That link is not pasted here.

## Accomplishments

One preview run, 10 November 2026, 13:44:58 UTC, deployment of commit `e14face`, eight seeded cases in `data/benchmark/faults.json`. Not a plant trial.

**Model path — all eight answers came from `muse-spark-1.3`. NVIDIA was not used on this run.**

| Measure | Result |
| --- | --- |
| Accuracy | 4/8 (50%) |
| Mean time to report | 6,261 ms |
| Median time to report | 5,186 ms |
| Prompt tokens | 1,183 (113 of them cached) |
| Completion tokens | 5,655 |
| Estimated cost, whole set | $0.025388 |
| Estimated cost per report | $0.003174 |

The dollar figures are estimates: Muse Spark standard rates from https://dev.meta.ai/docs/pricing-rate-limits (checked 10 November 2026), $1.25 / 1M input, $0.15 / 1M cached input, $4.25 / 1M output, multiplied by the `usage` object in each response. They are not an invoice.

Hits: P-101 seal leak, M-101 bearing noise, K-201 high discharge temperature, LV-220 stiction.

Misses, quoted from that run:

- CV-12 expected “Belt mistracking”. The model said “Tail pulley misaligned” on a belt conveyor. The equipment matched. The failure words did not.
- E-301 expected “Shell & tube heat exchanger” and “Tube leak”. The model said “Shell and tube exchanger” and “Leaking exchanger tube”. “heat” was missing, so the equipment check failed. The leak words matched.
- B-401 expected “Low water”. The model said “Feedwater supply failure” on a boiler.
- MCC-2 expected “MCC panel” and “Breaker trip”. The model said “pump starter” and “Shorted pump motor winding”.

**Catalog path on the same eight sentences, same response, no model call:** 8/8, mean 8.8 ms, median 7.4 ms, 0 tokens, $0.00. That row is the on-device failure list. It is not the model score.

Shaft job, from the seeded card, not from a laser: as-found vertical offset −0.56 mm is outside ±0.07 mm at 2,980 rpm. As-left +0.04 mm is inside that tolerance. A person has to approve each step before it is marked done.

## What we learned

One checkable job is easier to judge than a tour of every module. A hard number is only useful if the miss stays visible: 4/8 with the four wrong sentences written down is the result, not a rounded success. Token cost has to follow the provider that actually answered. On this run that was Meta for every case. An earlier run, before the token cap was raised, had fallen through to NVIDIA on six of eight because the Meta completion was cut off. Those earlier figures are not the ones in the table.

## What's next

- Keep the approve step in front of any SCADA write. This build still does not move a real valve.
- Replace the seeded P-101 readings with a laser the technician is looking at, and keep the same approve gate.
- Score near-misses separately from exact label matches, without deleting the exact score.
- Point the public Devpost URL at this build only after someone promotes it. This document does not do that.

## Built with

Next.js, React, TypeScript, WebXR, three.js, @react-three/xr, Meta Model API (muse-spark-1.3), NVIDIA NIM (fallback only), Vercel, PGlite, jspdf

## Try it

Preview of this branch (Vercel Authentication is on for this hostname; production was not updated):

- https://fixline-meta-cerebralvalley-ck088rtwl-lulu-bird-technologies.vercel.app/
- https://fixline-meta-cerebralvalley-ck088rtwl-lulu-bird-technologies.vercel.app/xr?job=shaft
- https://fixline-meta-cerebralvalley-ck088rtwl-lulu-bird-technologies.vercel.app/benchmark
- https://fixline-meta-cerebralvalley-ck088rtwl-lulu-bird-technologies.vercel.app/glasses
- https://fixline-meta-cerebralvalley-ck088rtwl-lulu-bird-technologies.vercel.app/admin/demo

Pull request: https://github.com/engr-okoroafor/Fixline_Meta_CerebralValley/pull/10

Still the previous production builds, unchanged by this work:

- https://fixline-guardian.vercel.app — `engr-okoroafor/fixline` `main` @ `1b24bdab`
- https://fixline-meta-cerebralvalley.vercel.app — this repo’s `main`, before this pull request
