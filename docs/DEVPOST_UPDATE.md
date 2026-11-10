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

`/benchmark` runs the same twenty seeded faults four ways. Model-only sees the symptom alone. Hybrid uses a short retrieved list. Two-stage, the path this write-up ships, shows the full compact plant catalog (no household appliances), then the failures of the chosen class only. Confidence under 0.5 becomes “needs technician review” and is not an exact hit. Catalog-only makes no model call.

## How we built it

The Devpost production site https://fixline-guardian.vercel.app is still `engr-okoroafor/fixline` on `main` at `1b24bdab` (“UI overhaul A–I”). This update is in `Fixline_Meta_CerebralValley`, which already had `/xr`, `/glasses`, and `/admin/demo`.

- WebXR with `@react-three/xr`. Hand tracking is requested. Controllers are not required. A detected table anchors the step card. If no plane is found, the card stays in front of the user.
- The 3D scene is not loaded until “Preview 3D” or “Enter AR”. On a Quest browser the canvas pixel ratio is capped at 1.
- Meta `muse-spark-1.3` is called first with `MODEL_API_KEY`. NVIDIA NIM (`NVIDIA_API_KEY`, `integrate.api.nvidia.com`) runs only when Meta has no key, returns an error, times out, or sends an empty completion. Both keys stay on the server.
- The benchmark asks for a short JSON diagnosis, times the call, and prices it with the rate of the provider that answered.
- Hybrid passes the top four rows from the full equipment search, which is how a CNC lathe, a clothes dryer, and a cooling tower got into earlier held-out prompts.
- Two-stage is the shipped diagnosis path. Stage 1 picks an id from the twenty generic plant classes, ordered by BM25 plus a fixed synonym list, with every class still on the page. Stage 2 may copy only that class’s failures. Confidence under 0.5, a missing confidence, an id that is not on the list, or a failure that is not on that class, is “needs technician review”. An abstention is not an exact hit and is not a near-miss. The threshold was set before this run and was not moved after it.
- Catalog-only emits the first failure whose words appear in the symptom, or the first listed failure if none do. It makes no model call.
- Exact scoring is unchanged: every word of the expected equipment name and every word of the expected failure must appear. Near-miss is separate: at least half of the words on both labels. An exact hit is also a near-miss. Near-miss does not replace the exact count.
- Eight of the twenty symptoms are marked `heldOut` in `data/benchmark/faults.json`. They were written so the catalog word-match does not already land on the expected equipment and failure. Those labels were not edited after the model run.

## Challenges

Muse Spark spends part of `max_tokens` on reasoning before the JSON. A 500-token cap cut answers off on an early preview. Model-only allows 4,000 tokens. Hybrid allows 2,500. Each two-stage call allows 2,000. The table below is one fresh run of all four paths.

The exact scorer is lexical on purpose: every expected word must appear. Near-miss (at least half the words on both labels) is a second number. It does not turn a miss into an exact hit. Expected labels were not edited after the model run.

Preview hostnames on the `fixline-meta-cerebralvalley` project sit behind Vercel Authentication. The benchmark was run through a short-lived share link. That link is not pasted here.

## Accomplishments

Earlier runs, kept so the new table is not the only record: eight-case model-only on commit `e14face` was 4/8 exact at an estimated $0.003174 per report. The first twenty-case run on commit `6f9b30b` was model-only 5/20 exact, catalog-only 12/20, hybrid 13/20, and hybrid held-out exact 1/8, with lathe, dryer, and cooling-tower retrieval misses.

This run, 10 November 2026, 14:01:11 UTC, commit `9f885f2`, same twenty labels. Not a plant trial. Every model call was `muse-spark-1.3`. NVIDIA was not used. Two-stage abstained on 0 of 20.

| | Model-only | Catalog-only | Hybrid | Two-stage |
| --- | --- | --- | --- | --- |
| Exact | 10/20 (50%) | 12/20 (60%) | 13/20 (65%) | 19/20 (95%) |
| Near-miss, includes exact | 17/20 (85%) | 12/20 (60%) | 15/20 (75%) | 19/20 (95%) |
| Direct cases, exact | 9/12 | 11/12 | 12/12 | 12/12 |
| Held-out exact | 1/8 | 1/8 | 1/8 | 7/8 |
| Held-out near-miss | 7/8 | 1/8 | 3/8 | 7/8 |
| Abstained | 0 | 0 | 0 | 0 |
| Mean time | 4,762 ms | 8.0 ms | 5,089 ms | 6,634 ms |
| Median time | 3,800 ms | 7.9 ms | 4,044 ms | 6,144 ms |
| Prompt tokens (cached) | 2,942 (904) | 0 | 12,231 (610) | 9,748 (0) |
| Completion tokens | 14,457 | 0 | 16,728 | 22,550 |
| Estimated set cost | $0.064125 | $0.00 | $0.085712 | $0.108023 |
| Estimated cost per report | $0.003206 | $0.00 | $0.004286 | $0.005401 |

Dollar figures are estimates: Muse Spark standard rates from https://dev.meta.ai/docs/pricing-rate-limits (checked 10 November 2026), $1.25 / 1M input, $0.15 / 1M cached input, $4.25 / 1M output, times each response’s `usage`, summed, then divided by 20. They are not an invoice. Two-stage cost is two calls per case.

**Shipped path: two-stage.** It has the highest exact score on this run, 19/20, including 7/8 held-out. It did not abstain. The one miss is `ho-cubicle-pop`: it cited `mcc` / “Hot spot” at confidence 0.85 instead of “Breaker trip”. That stays a miss. Catalog-only is still the cheap baseline at $0.00 and 12/20. Hybrid remains 13/20 on this run and is not the path to ship.

Shaft job, from the seeded card, not from a laser: as-found vertical offset −0.56 mm is outside ±0.07 mm at 2,980 rpm. As-left +0.04 mm is inside that tolerance. A person has to approve each step before it is marked done.

## What we learned

One checkable job is easier to judge than a tour of every module. The held-out misses were retrieval, not the wording of the labels. Taking household and vendor rows out of the choice list, then asking for a failure only from that class, moved held-out exact from 1/8 to 7/8. Abstaining at 0.5 did not fire on this run, including the one wrong failure, which was stated at 0.85. Exact score stays the number a judge should read. Near-miss does not replace it.

## What's next

- Keep the approve step in front of any SCADA write. This build still does not move a real valve.
- Replace the seeded P-101 readings with a laser the technician is looking at, and keep the same approve gate.
- The cubicle case still prefers “Hot spot” over “Breaker trip” at high confidence. A second look at that failure list is the next measurement, not a quieter scorer.
- Point the public Devpost URL at this build only after someone promotes it. This document does not do that.

## Built with

Next.js, React, TypeScript, WebXR, three.js, @react-three/xr, Meta Model API (muse-spark-1.3), NVIDIA NIM (fallback only), Vercel, PGlite, jspdf

## Try it

Preview that produced the four-path table (Vercel Authentication is on for this hostname; production was not updated):

- https://fixline-meta-cerebralvalley-3ccuy9hml-lulu-bird-technologies.vercel.app/
- https://fixline-meta-cerebralvalley-3ccuy9hml-lulu-bird-technologies.vercel.app/xr?job=shaft
- https://fixline-meta-cerebralvalley-3ccuy9hml-lulu-bird-technologies.vercel.app/benchmark
- https://fixline-meta-cerebralvalley-3ccuy9hml-lulu-bird-technologies.vercel.app/glasses
- https://fixline-meta-cerebralvalley-3ccuy9hml-lulu-bird-technologies.vercel.app/admin/demo

Pull request: https://github.com/engr-okoroafor/Fixline_Meta_CerebralValley/pull/10

Still the previous production builds, unchanged by this work:

- https://fixline-guardian.vercel.app — `engr-okoroafor/fixline` `main` @ `1b24bdab`
- https://fixline-meta-cerebralvalley.vercel.app — this repo’s `main`, before this pull request
