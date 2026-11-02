import { NextResponse } from "next/server";
import { z } from "zod";
import { currentUser } from "@/lib/auth";
import { rateLimit, clientKey, imageSchema } from "@/lib/security";
import { chat } from "@/lib/ai/router";
import { getDb, schema } from "@/lib/db";
export const runtime = "nodejs"; export const maxDuration = 60;
// Autonomous visual inspector (ISO 17637 visual weld / general asset condition). Returns defects with severity + verdict.
const body = z.object({ image: imageSchema.unwrap(), kind: z.enum(["weld", "corrosion", "electrical", "rotating", "general", "product"]).default("general"), note: z.string().max(300).optional() });
export type Inspection = { verdict: "PASS" | "MONITOR" | "FAIL"; score: number; defects: { name: string; severity: "low" | "medium" | "high"; where: string; action: string; standard?: string }[]; summary: string; model: string };
const CRIT: Record<string, string> = { weld: "ISO 17637 / ISO 5817 / AWS D1.1: cracks, porosity, undercut, incomplete fusion, spatter, overlap, misalignment", corrosion: "API 571/API 570: general/pitting/CUI, coating breakdown, wall loss", electrical: "NFPA 70B/IEC 60364: overheating discolouration, loose/burnt terminals, missing covers, cable damage", rotating: "API 610/ISO 10816: leaks at seals, guard missing, misalignment signs, oil level, corrosion of baseplate", general: "housekeeping, leaks, missing guards, damaged insulation, corrosion", product: "ISO 2859 sampling defects: scratches, dents, contamination, label/print errors" };
export async function POST(req: Request) {
  const u = await currentUser().catch(() => null); const who = clientKey(req, u?.id);
  if (!rateLimit(`in:${who}`, u ? 15 : 5)) return NextResponse.json({ error: "rate limited" }, { status: 429 });
  const p = body.safeParse(await req.json().catch(() => null)); if (!p.success) return NextResponse.json({ error: "invalid image" }, { status: 400 });
  let out: Inspection;
  try {
    if (!process.env.MODEL_API_KEY && !process.env.NVIDIA_API_KEY) throw new Error("no key");
    const r = await chat([{ role: "system", content: `You are an autonomous certified visual inspector. Criteria: ${CRIT[p.data.kind]}. Return ONLY JSON {"verdict":"PASS"|"MONITOR"|"FAIL","score":0-100,"defects":[{"name","severity":"low|medium|high","where","action","standard"}],"summary":string}. Only report what is visible; say if image quality is insufficient.` }, { role: "user", content: [{ type: "text", text: `Inspect (${p.data.kind}). ${p.data.note ? `<note>${p.data.note}</note>` : ""}` }, { type: "image_url", image_url: { url: p.data.image } }] }], 1500, 40000);
    const j = JSON.parse(r.text.match(/\{[\s\S]*\}/)?.[0] ?? "{}");
    out = { verdict: ["PASS", "MONITOR", "FAIL"].includes(j.verdict) ? j.verdict : "MONITOR", score: Math.max(0, Math.min(100, Number(j.score) || 50)), defects: (Array.isArray(j.defects) ? j.defects : []).slice(0, 12).map((d: Record<string, string>) => ({ name: String(d.name ?? "").slice(0, 80), severity: ["low", "medium", "high"].includes(d.severity) ? d.severity : "medium", where: String(d.where ?? "").slice(0, 120), action: String(d.action ?? "").slice(0, 200), standard: d.standard ? String(d.standard).slice(0, 60) : undefined })), summary: String(j.summary ?? "").slice(0, 600), model: r.model };
  } catch { out = { verdict: "MONITOR", score: 0, defects: [], summary: `AI inspector offline — use the manual checklist (${CRIT[p.data.kind]}).`, model: "offline" }; }
  if (u) { const db = await getDb(); await db.insert(schema.auditLog).values({ userId: u.id, action: "inspection", detail: { kind: p.data.kind, verdict: out.verdict, score: out.score } }).catch(() => null); }
  return NextResponse.json(out);
}
