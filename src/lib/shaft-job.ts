import { corrections, tolFor, type Reading } from "./alignment";

/** Seeded laser-alignment job. Readings are sample data a technician confirms. They are not a live laser capture. */
export const SHAFT_SAMPLE = {
  id: "P-101",
  asset: "Pump P-101 / motor M-101",
  title: "Laser-align pump P-101",
  notice: "Sample job. As-found and as-left readings are seeded. The technician confirms them on the card. FixLine did not read a laser.",
  rpm: 2980,
  cToF: 180,
  fToR: 420,
  before: { hAng: 0.42, hOff: 0.31, vAng: -0.28, vOff: -0.56 } satisfies Reading,
  after: { hAng: 0.02, hOff: 0.03, vAng: -0.01, vOff: 0.04 } satisfies Reading,
};

export const SHAFT_STEPS: { id: string; text: string; seconds: number }[] = [
  { id: "loto", seconds: 45, text: "Stop P-101, open the disconnect, apply your lock and tag, and prove zero voltage with live-dead-live." },
  { id: "softfoot", seconds: 40, text: "Loosen each hold-down bolt in turn. Shim any foot that springs more than 0.05 mm before you align." },
  { id: "asfound", seconds: 40, text: "Mount the laser on the motor and the sensor on the pump. Read the as-found card aloud, then ask for approval." },
  { id: "moves", seconds: 50, text: "Shim the vertical corrections and push the motor by the horizontal corrections. Do not mark this done until someone agrees the move matches the card." },
  { id: "remeasure", seconds: 40, text: "Sweep again. Approve only if offset and angularity are inside the tolerance shown for this speed." },
  { id: "sign", seconds: 30, text: "Approve to stamp the report. Reject if the coupling guard is still off or the as-left reading was not checked." },
];

export function inTolerance(r: Reading, rpm: number) {
  const t = tolFor(rpm);
  return Math.abs(r.hOff) <= t.off && Math.abs(r.vOff) <= t.off && Math.abs(r.hAng) <= t.ang && Math.abs(r.vAng) <= t.ang;
}

const fmt = (r: Reading) => `H angularity ${r.hAng} mm/100 mm, H offset ${r.hOff} mm, V angularity ${r.vAng} mm/100 mm, V offset ${r.vOff} mm`;

export type ShaftAttempt = { step: number; decision: "approved" | "rejected"; at: string };

export function shaftReport(o: { attempts: ShaftAttempt[]; completedAt: string }) {
  const t = tolFor(SHAFT_SAMPLE.rpm);
  const move = corrections(SHAFT_SAMPLE.before, SHAFT_SAMPLE.cToF, SHAFT_SAMPLE.fToR);
  const lines = [
    "# FixLine repair report — laser alignment",
    "",
    SHAFT_SAMPLE.notice,
    "",
    `- Asset: ${SHAFT_SAMPLE.asset}`,
    `- Completed: ${o.completedAt}`,
    `- Speed: ${SHAFT_SAMPLE.rpm} rpm`,
    `- Tolerance: offset ±${t.off} mm, angularity ±${t.ang} mm/100 mm`,
    `- Dimensions: coupling to front feet ${SHAFT_SAMPLE.cToF} mm, front to rear feet ${SHAFT_SAMPLE.fToR} mm`,
    "",
    "## As found (seeded sample, confirmed on the card)",
    "",
    fmt(SHAFT_SAMPLE.before),
    "",
    `Inside tolerance: ${inTolerance(SHAFT_SAMPLE.before, SHAFT_SAMPLE.rpm) ? "yes" : "no"}.`,
    "",
    "## Prescribed foot moves",
    "",
    `Vertical front ${move.vFront} mm, vertical rear ${move.vRear} mm, horizontal front ${move.hFront} mm, horizontal rear ${move.hRear} mm.`,
    "Positive vertical means add shim. Positive horizontal means move the movable machine toward the plus side.",
    "",
    "## As left (seeded sample, confirmed on the re-measure step)",
    "",
    fmt(SHAFT_SAMPLE.after),
    "",
    `Inside tolerance: ${inTolerance(SHAFT_SAMPLE.after, SHAFT_SAMPLE.rpm) ? "yes" : "no"}.`,
    "",
    "## Checkpoints",
    "",
    ...SHAFT_STEPS.map((s, i) => {
      const attempts = o.attempts.filter((a) => a.step === i);
      const last = attempts[attempts.length - 1];
      const trail = attempts.map((a) => `${a.decision} at ${a.at}`).join("; ") || "no decision recorded";
      return `${i + 1}. ${s.text} — ${last?.decision === "approved" ? "approved" : "not approved"} (${trail})`;
    }),
    "",
    "A step is marked done only after a person approves it. Voice or a pinch can ask for that checkpoint. Neither one skips it.",
  ];
  return lines.join("\n");
}
