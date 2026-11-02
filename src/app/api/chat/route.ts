import { reason, SYSTEM } from "@/lib/ai";
import { REPAIR_STEPS } from "@/lib/demo";
export async function POST(req: Request) {
  const { question = "", part = "", step = 0, lang = "en" } = await req.json().catch(() => ({}));
  const s = REPAIR_STEPS[Math.min(step, REPAIR_STEPS.length - 1)];
  const r = await reason(
    [{ role: "system", content: SYSTEM + `\nReply in language code: ${lang}.` }, { role: "user", content: `Part in view (SAM 3.1): ${part || "unknown"}. Technician asks: ${question}` }],
    () => `Likely fault: mechanical seal wear on P-101 [M-4.2] — drip rate matches the September seal history and vibration is trending to 5.9 mm/s [M-5.1]. Step ${s.id}: ${s.say} Then: ${s.confirm}`,
  );
  return Response.json({ ...r, diagnosis: "Mechanical seal wear (M-4.2), secondary: coupling misalignment watch (M-5.1)", confidence: 0.86, citations: ["M-4.2", "M-5.1"] });
}
