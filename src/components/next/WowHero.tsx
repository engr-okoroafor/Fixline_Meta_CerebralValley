"use client";
import { SHAFT_SAMPLE, inTolerance } from "@/lib/shaft-job";
import { tolFor } from "@/lib/alignment";

const tol = tolFor(SHAFT_SAMPLE.rpm);
const beforeOk = inTolerance(SHAFT_SAMPLE.before, SHAFT_SAMPLE.rpm);
const afterOk = inTolerance(SHAFT_SAMPLE.after, SHAFT_SAMPLE.rpm);

/** First screen: one job, the number, the human checkpoint. No 3D. */
export function WowHero() {
  return <section className="glass relative overflow-hidden p-6 md:p-8" aria-labelledby="wow-h">
    <p className="pill m-0" style={{ alignSelf: "flex-start" }}>Meta Quest · hands first · sample job P-101</p>
    <h1 id="wow-h" className="m-0 max-w-3xl text-3xl font-extrabold md:text-5xl">Pinch to approve the laser move. The step does not count until you do.</h1>
    <p className="m-0 max-w-2xl text-lg">Pump P-101 shaft, {SHAFT_SAMPLE.rpm} rpm. As found <b className="neon">V offset {SHAFT_SAMPLE.before.vOff} mm</b> ({beforeOk ? "in" : "outside"} ±{tol.off} mm). As left <b className="neon">V offset {SHAFT_SAMPLE.after.vOff > 0 ? "+" : ""}{SHAFT_SAMPLE.after.vOff} mm</b> ({afterOk ? "inside" : "outside"} tolerance). Then a timestamped report.</p>
    <ol className="wow-track m-0 grid gap-2 p-0 md:grid-cols-3" style={{ listStyle: "none" }}>
      <li className="wow-step rounded-2xl p-3" style={{ animationDelay: "0s", border: "1px solid color-mix(in oklab, var(--warn) 50%, transparent)" }}><b>1 · As found</b><div className="text-sm">V offset {SHAFT_SAMPLE.before.vOff} mm on the passthrough card.</div></li>
      <li className="wow-step rounded-2xl p-3" style={{ animationDelay: "3.3s", border: "1px solid color-mix(in oklab, var(--neon) 55%, transparent)" }}><b>2 · Approve or reject</b><div className="text-sm">Pinch or say “approve”. “Done” only opens the checkpoint.</div></li>
      <li className="wow-step rounded-2xl p-3" style={{ animationDelay: "6.6s", border: "1px solid color-mix(in oklab, var(--neon) 55%, transparent)" }}><b>3 · Report</b><div className="text-sm">Before, the shim move, and as-left, with the time you approved.</div></li>
    </ol>
    <div className="row">
      <a className="btn btn-primary" href="/xr?job=shaft" style={{ minHeight: 56, fontSize: "1.05rem" }}>Start laser alignment</a>
      <a className="btn" href="/benchmark">Measured benchmark</a>
      <a className="btn" href="/glasses">Glasses HUD</a>
      <a className="btn" href="/admin/demo">Admin demo</a>
    </div>
    <p className="m-0 text-xs muted">{SHAFT_SAMPLE.notice} Project plans still cover project management with frameworks such as PMP and PRINCE2.</p>
  </section>;
}
