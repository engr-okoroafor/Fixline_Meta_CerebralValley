import { reason } from "@/lib/ai";
import { TELEMETRY } from "@/lib/demo";
export async function POST(req: Request) {
  const { defects = [] } = await req.json().catch(() => ({}));
  const late = TELEMETRY.slice(-5);
  const r = await reason([{ role: "system", content: "You are a manufacturing quality engineer. Correlate SAM 3.1 defects with telemetry and write a concise shift report with 3 concrete actions before next batch." }, { role: "user", content: JSON.stringify({ defects, telemetry: TELEMETRY }) }],
    () => `SHIFT REPORT — Line 2, Night\n\nDefects: ${defects.length || 14} flagged (scratch 57%, dent 29%, label 14%). Defect rate jumped after 19:00, coinciding with P-101 vibration rising to ${late.at(-1)?.vib} mm/s and flow dropping to ${late.at(-1)?.flow} m³/h.\n\nRoot cause (likely): conveyor-side vibration from P-101 coupling misalignment [M-5.1] transmitting into guide rails → scuffing.\n\nBefore next batch:\n1. Laser-align P-101 coupling to ≤0.05 mm [M-5.1].\n2. Inspect guide rail UHMW strips at station 4; replace if worn.\n3. Reduce line speed 8% until vibration < 4.5 mm/s, then restore.`);
  return Response.json(r);
}
