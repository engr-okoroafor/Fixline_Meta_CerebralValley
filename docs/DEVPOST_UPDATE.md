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

`/benchmark` runs twenty seeded fault sentences three ways and prints exact accuracy, a separate near-miss score, time to report, and estimated cost from the token usage the provider returned. Model-only sees the symptom alone. Hybrid is what the repair path ships: the top catalog rows and a short manual snippet are the only choices, and the model must copy one failure from that list. Catalog-only makes no model call.

## How we built it

The Devpost production site https://fixline-guardian.vercel.app is still `engr-okoroafor/fixline` on `main` at `1b24bdab` (“UI overhaul A–I”). This update is in `Fixline_Meta_CerebralValley`, which already had `/xr`, `/glasses`, and `/admin/demo`.

- WebXR with `@react-three/xr`. Hand tracking is requested. Controllers are not required. A detected table anchors the step card. If no plane is found, the card stays in front of the user.
- The 3D scene is not loaded until “Preview 3D” or “Enter AR”. On a Quest browser the canvas pixel ratio is capped at 1.
- Meta `muse-spark-1.3` is called first with `MODEL_API_KEY`. NVIDIA NIM (`NVIDIA_API_KEY`, `integrate.api.nvidia.com`) runs only when Meta has no key, returns an error, times out, or sends an empty completion. Both keys stay on the server.
- The benchmark asks for a short JSON diagnosis, times the call, and prices it with the rate of the provider that answered.
- Hybrid passes the top four catalog rows (id, name, failure list, one manual line) and, when the repair guide matches, two procedure lines. The model must copy `equipment`, `failure`, and `catalogId` from that list and add a confidence and a next safe step.
- Catalog-only emits the first failure whose words appear in the symptom, or the first listed failure if none do. It makes no model call.
- Exact scoring is unchanged: every word of the expected equipment name and every word of the expected failure must appear. Near-miss is separate: at least half of the words on both labels. An exact hit is also a near-miss. Near-miss does not replace the exact count.
- Eight of the twenty symptoms are marked `heldOut` in `data/benchmark/faults.json`. They were written so the catalog word-match does not already land on the expected equipment and failure. Those labels were not edited after the model run.

## Challenges

Muse Spark spends part of `max_tokens` on reasoning before the JSON. A 500-token cap cut answers off mid-object on an earlier preview, so that run mixed truncated Meta replies with NVIDIA fallbacks. Model-only now allows 4,000 tokens and hybrid allows 2,500. The table below is the twenty-case run, not that earlier one.

The exact scorer is lexical on purpose: every expected word must appear. Near-miss (at least half the words on both labels) is a second number. It does not turn a miss into an exact hit. Expected labels were not edited after the model run.

Preview hostnames on the `fixline-meta-cerebralvalley` project sit behind Vercel Authentication. The benchmark was run through a short-lived share link. That link is not pasted here.

## Accomplishments

An earlier eight-case model-only run on 10 November 2026 at 13:44:58 UTC (commit `e14face`) scored 4/8 exact, mean 6,261 ms, estimated $0.003174 per report, all from `muse-spark-1.3`. That set had no held-out paraphrases. The table below replaces it. It is not deleted from the record.

New run, 10 November 2026, 13:54:20 UTC, commit `6f9b30b`, twenty seeded cases. Not a plant trial. All forty model calls (model-only and hybrid) were answered by `muse-spark-1.3`. NVIDIA was not used.

| | Model-only | Catalog-only | Hybrid |
| --- | --- | --- | --- |
| Exact | 5/20 (25%) | 12/20 (60%) | 13/20 (65%) |
| Near-miss, includes exact | 16/20 (80%) | 12/20 (60%) | 15/20 (75%) |
| Direct cases, exact | 3/12 | 11/12 | 12/12 |
| Held-out cases, exact | 2/8 | 1/8 | 1/8 |
| Held-out cases, near-miss | 7/8 | 1/8 | 3/8 |
| Mean time | 5,335 ms | 8.4 ms | 5,678 ms |
| Median time | 4,042 ms | 6.8 ms | 4,375 ms |
| Prompt tokens | 2,942 (791 cached) | 0 | 12,231 (565 cached) |
| Completion tokens | 15,263 | 0 | 17,917 |
| Estimated cost, whole set | $0.067675 | $0.00 | $0.090814 |
| Estimated cost per report | $0.003384 | $0.00 | $0.004541 |

Dollar figures are estimates: Muse Spark standard rates from https://dev.meta.ai/docs/pricing-rate-limits (checked 10 November 2026), $1.25 / 1M input, $0.15 / 1M cached input, $4.25 / 1M output, times the `usage` object on each response, summed, then divided by 20. They are not an invoice.

Hybrid is the grounded path. On the twelve symptoms that already name the catalog words, it copied the right failure 12/12. On the eight held-out paraphrases it was exact on 1/8. Retrieval often handed it the wrong machine: a CNC lathe, a clothes dryer, or a cooling tower. Those misses stay misses.

Catalog-only’s one held-out exact is `ho-drum-empty`. No failure word in that symptom matched, so the catalog emitted the boiler’s first listed failure, “Low drum water level”, which happens to contain “low” and “water”. That is a lucky string, not a reasoned match.

Model-only is often close (16/20 near-miss) and rarely on the catalog’s exact wording (5/20). Examples from this run: “Belt conveyor” / “Misaligned tail pulley” instead of “Belt mistracking”; “Shell and tube exchanger” / “Failed tube leaking product” instead of “Shell & tube heat exchanger”; “Boiler” / “Failed feedwater supply” instead of “Low water”; “pump starter” / “shorted motor winding overload” instead of “MCC panel” / “Breaker trip”.

Shaft job, from the seeded card, not from a laser: as-found vertical offset −0.56 mm is outside ±0.07 mm at 2,980 rpm. As-left +0.04 mm is inside that tolerance. A person has to approve each step before it is marked done.

## What we learned

One checkable job is easier to judge than a tour of every module. Grounding helps when the catalog is already looking at the right machine: hybrid went from 3/12 to 12/12 exact on the direct symptoms, for about $0.0045 a report instead of $0.0034. It does not help when retrieval is wrong. Held-out exact stayed at 1/8, the same as the catalog’s lucky string. A near-miss rate of 16/20 on the ungrounded model shows why the exact score has to stay on the page: “close” is not the label.

## What's next

- Keep the approve step in front of any SCADA write. This build still does not move a real valve.
- Replace the seeded P-101 readings with a laser the technician is looking at, and keep the same approve gate.
- Stop a held-out paraphrase from retrieving a lathe or a dryer before the model is asked to choose. The exact score stays either way.
- Point the public Devpost URL at this build only after someone promotes it. This document does not do that.

## Built with

Next.js, React, TypeScript, WebXR, three.js, @react-three/xr, Meta Model API (muse-spark-1.3), NVIDIA NIM (fallback only), Vercel, PGlite, jspdf

## Try it

Preview that produced the twenty-case table (Vercel Authentication is on for this hostname; production was not updated):

- https://fixline-meta-cerebralvalley-giaaq6kme-lulu-bird-technologies.vercel.app/
- https://fixline-meta-cerebralvalley-giaaq6kme-lulu-bird-technologies.vercel.app/xr?job=shaft
- https://fixline-meta-cerebralvalley-giaaq6kme-lulu-bird-technologies.vercel.app/benchmark
- https://fixline-meta-cerebralvalley-giaaq6kme-lulu-bird-technologies.vercel.app/glasses
- https://fixline-meta-cerebralvalley-giaaq6kme-lulu-bird-technologies.vercel.app/admin/demo

Pull request: https://github.com/engr-okoroafor/Fixline_Meta_CerebralValley/pull/10

Still the previous production builds, unchanged by this work:

- https://fixline-guardian.vercel.app — `engr-okoroafor/fixline` `main` @ `1b24bdab`
- https://fixline-meta-cerebralvalley.vercel.app — this repo’s `main`, before this pull request
