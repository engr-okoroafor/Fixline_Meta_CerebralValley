/** Standard quality documents. Templates are complete offline; Meta can rewrite them via the project deliverable route. */
export type QSection = { heading: string; bullets: string[] };
export type QDoc = { title: string; sections: QSection[] };
const PACKS: Record<string, (job: string) => QSection[]> = {
  "Inspection & Test Plan": (job) => [
    { heading: "Purpose", bullets: [`ITP for ${job}. Hold, witness and review points are listed before work starts.`] },
    { heading: "Hold points", bullets: ["Material certificates before fit-up", "NDT before coating", "Alignment record before coupling", "Functional test before handover"] },
    { heading: "Acceptance", bullets: ["Visual: no cracks, undercut within the code", "Dimensional: within the drawing tolerance", "Records: traceable to the tag and the welder or fitter"] },
    { heading: "Standards", bullets: ["ISO 9001:2015 cl. 8.5 / 8.6", "ISO 5817 / ISO 17637 where welding applies", "API / ASME code called on the drawing"] },
  ],
  "Non-Conformance Report": (job) => [
    { heading: "Description", bullets: [`Non-conformance observed on ${job}.`] },
    { heading: "Disposition", bullets: ["Use-as-is requires the client's written acceptance", "Repair to an approved procedure", "Reject and replace"] },
    { heading: "Corrective action", bullets: ["Contain the item", "Find the cause (5-Why)", "Stop the same defect reaching the next job"] },
  ],
  "Visual inspection report": (job) => [
    { heading: "Scope", bullets: [`Visual inspection of ${job}.`] },
    { heading: "Method", bullets: ["Clean, dry, adequate light", "Direct and remote visual as applicable", "Photograph every defect with a scale"] },
    { heading: "Result", bullets: ["Record verdict PASS, MONITOR or FAIL", "Each defect: name, severity, location, action, standard"] },
  ],
  "Dimensional report": (job) => [
    { heading: "Equipment", bullets: [job] },
    { heading: "Readings", bullets: ["Nominal, actual, tolerance, instrument ID and calibration due date", "Out-of-tolerance readings are highlighted and dispositioned"] },
  ],
};
export const QUALITY_DOCS = Object.keys(PACKS);
export function qualityDoc(kind: string, job: string): QDoc {
  const build = PACKS[kind] ?? PACKS["Visual inspection report"];
  return { title: `${kind} — ${job}`, sections: build(job) };
}
export function formatShiftReport(o: { status: string; temp: number; vibration: number; rpm: number; findings: string; narrative?: string }) {
  return [`SHIFT QUALITY REPORT`, `Status: ${o.status}`, `Telemetry: ${o.temp} °C · ${o.vibration} mm/s vibration · ${o.rpm} rpm`, `Findings: ${o.findings}`, o.narrative || (o.status === "FAIL" ? "Hold the machine. Do not return it to service until the high finding is closed." : "No high finding. Continue the round and file this report with the shift log."), `Standards: ISO 9001 cl. 8.6 release of product; ISO 10816 vibration zones; site ITP.`].join("\n");
}
