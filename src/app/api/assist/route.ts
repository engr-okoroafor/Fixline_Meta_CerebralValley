import { NextResponse } from "next/server";
import { z } from "zod";
import { currentUser } from "@/lib/auth";
import { rateLimit, clientKey, detectInjection, imageSchema } from "@/lib/security";
import { assist } from "@/lib/ai/harness";
import { getDb, schema } from "@/lib/db";
export const runtime = "nodejs"; export const maxDuration = 60;
const body = z.object({ text: z.string().min(1).max(600), session: z.string().max(64).default("anon"), image: imageSchema.optional(), lang: z.string().max(40).optional(), prefer: z.enum(["meta", "nvidia"]).optional() });
export async function POST(req: Request) {
  const u = await currentUser().catch(() => null); const who = clientKey(req, u?.id);
  if (!rateLimit(`assist:${who}`, u ? 30 : 15)) return NextResponse.json({ error: "rate limited" }, { status: 429 });
  const p = body.safeParse(await req.json().catch(() => null)); if (!p.success) return NextResponse.json({ error: "invalid input" }, { status: 400 });
  if (detectInjection(p.data.text)) return NextResponse.json({ error: "input rejected by prompt-injection filter" }, { status: 422 });
  const t0 = Date.now(); const out = await assist({ ...p.data, session: `${who}:${p.data.session}`, owner: who });
  try { const db = await getDb(); await db.insert(schema.agentTrace).values({ userId: u?.id ?? who, goal: p.data.text, steps: out.trace }); } catch { /* best-effort */ }
  return NextResponse.json({ ...out, ms: Date.now() - t0 });
}
