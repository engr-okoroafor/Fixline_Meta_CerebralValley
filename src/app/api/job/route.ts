// Job close gate: refuses to close unless LOTO, every step camera-confirmed, and QA checklist recorded.
import { LOTO, QUALITY, REPAIR_STEPS } from "@/lib/demo";
export async function POST(req: Request) {
  const { loto = [], confirmed = [], quality = [], readings = {} } = await req.json().catch(() => ({}));
  const missing: string[] = [];
  LOTO.forEach((s, i) => !loto[i] && missing.push(`LOTO: ${s}`));
  REPAIR_STEPS.forEach((s, i) => !confirmed[i] && missing.push(`Step ${s.id} not camera-confirmed`));
  QUALITY.forEach((s, i) => !quality[i] && missing.push(`QA: ${s}`));
  const t = Number(readings.torque); if (readings.torque != null && (t < 23 || t > 27)) missing.push(`Out of tolerance: torque ${t} N·m (spec 25±2)`);
  const v = Number(readings.vibration); if (readings.vibration != null && v > 4.5) missing.push(`Out of tolerance: vibration ${v} mm/s (≤4.5)`);
  return Response.json({ canClose: missing.length === 0, missing, closedAt: missing.length ? null : new Date().toISOString() }, { status: missing.length ? 409 : 200 });
}
